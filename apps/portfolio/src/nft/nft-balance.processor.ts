import {
  ChainId,
  chainIds,
  chains,
  CoingeckoService,
  CoinPrice,
  EventService,
  LayerDto,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { AbstractProcessor, BaseContext } from '../abstract.processor';
import { NFT_BALANCES, NFT_BALANCE_MILESTONES } from '../collectionNames';
import { NFT_BALANCE_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { NftBalanceDocument } from './documents/nft-balance.document';

@Processor(NFT_BALANCE_QUEUE)
export class NftBalanceProcessor extends AbstractProcessor<Context> {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventService: EventService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) {
    super();
  }

  pipe(source: Rx.Observable<Context>): Rx.Observable<Context> {
    return source
      .pipe(
        this.emitMilestones(),
        this.addNftOwners(),
        this.emitMilestones(),
        this.addCoinPrices(),
        this.emitMilestones(),
        this.addNftPrices(),
      )
      .pipe(
        this.emitMilestones(),
        this.addNftLogos(),
        this.emitMilestones(),
        this.mapNftBalanceDocuments(),
        this.emitNftBalanceDocuments(),
        this.removeMilestones(),
      );
  }

  private addNftLogos() {
    return Rx.mergeMap(async (context: Context) => {
      const nftLogos = await _.chain(context.nftOwners)
        .filter((nftOwner) => nftOwner.chain_id === 'eth')
        .map((nftOwner) =>
          this.openseaService
            .metadataOf(nftOwner.token_address)
            .then((metadata) => ({
              chainId: nftOwner.chain_id,
              contractAddress: nftOwner.token_address,
              imageUrl: metadata?.image_url,
            })),
        )
        .thru((promises) => Promise.all(promises))
        .value();

      return <Context>{
        ...context,
        nftLogos,
      };
    });
  }

  private addNftPrices() {
    return Rx.mergeMap(async (context: Context) => {
      const now = moment().unix();

      const nftPrices = await _.chain(context.nftOwners)
        .map((nftOwner) =>
          this.moralisService
            .nftContractTransfersOf(
              nftOwner.chain_id as ChainId,
              nftOwner.token_address,
            )
            .then((moralisTransfers) => {
              return _.chain(moralisTransfers)
                .filter(
                  (transfer) => !!transfer.value && transfer.value !== '0',
                )
                .map((moralisTransfer) => {
                  const transfer: NftTransfer = {
                    amount: Number(moralisTransfer.amount),
                    blockHash: moralisTransfer.amount,
                    blockNumber: Number(moralisTransfer.block_number),
                    blockTimestamp: moment(
                      moralisTransfer.block_timestamp,
                    ).unix(),
                    fromAddress: moralisTransfer.from_address,
                    logIndex: Number(moralisTransfer.log_index),
                    toAddress: moralisTransfer.to_address,
                    tokenAddress: moralisTransfer.token_address,
                    tokenId: Number(moralisTransfer.token_id),
                    transactionHash: moralisTransfer.transaction_hash,
                    transactionIndex: Number(moralisTransfer.transaction_index),
                    value: Number(
                      ethers.utils.formatEther(moralisTransfer.value),
                    ),
                  };

                  return transfer;
                })
                .thru((transfers) => {
                  if (transfers.length === 0) {
                    return {
                      chainId: nftOwner.chain_id,
                      contractAddress: nftOwner.token_address,
                      price: 0,
                      updated: undefined,
                    };
                  }

                  const updated = _.chain(transfers)
                    .map((it) => it.blockTimestamp)
                    .max()
                    .value();

                  const last24HourTransfers = _.chain(transfers)
                    .filter((transfer) => now - transfer.blockTimestamp < 86400)
                    .value();

                  let price = 0;

                  if (last24HourTransfers.length > 0) {
                    price = _.chain(last24HourTransfers)
                      .sumBy((transfer) => transfer.value / transfer.amount)
                      .thru((sum) => sum / transfers.length)
                      .value();
                  } else {
                    price = _.chain(transfers)
                      .sumBy((transfer) => transfer.value / transfer.amount)
                      .thru((sum) => sum / transfers.length)
                      .value();
                  }

                  const nftPrice: NftPrice = {
                    chainId: nftOwner.chain_id,
                    contractAddress: nftOwner.token_address,
                    price,
                    updated,
                  };

                  return nftPrice;
                })
                .value();
            }),
        )
        .thru((promises) => Promise.all(promises))
        .value();

      return <Context>{
        ...context,
        nftPrices,
      };
    });
  }

  private addNftOwners() {
    return Rx.mergeMap(async (context: Context) => {
      const requestPromises = [];

      for (const chainId of context.chainIds) {
        for (const address of context.watchedAddresses) {
          requestPromises.push(this.moralisService.nftsOf(chainId, address));
        }
      }

      const nftOwners: moralis.NftOwner[] = _.flatten(
        await Promise.all(requestPromises),
      );

      return <Context>{
        ...context,
        nftOwners: nftOwners.filter((it) => !!it.name),
      };
    });
  }

  private addCoinPrices() {
    return Rx.mergeMap(async (context: Context) => {
      const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

      const coinPrices = await this.coingeckoService.latestPricesOf(
        chainCoinIds,
        context.selectedCurrency.id,
      );

      return <Context>{
        ...context,
        coinPrices,
      };
    });
  }

  private addLogosAndLatestPricing() {
    return Rx.mergeMap(async (context: Context) => {
      const updatedDocuments = await Promise.all(
        context.documents.map(async (document: NftBalanceDocument) => {
          let updatedDocument = document;

          const latestTransfers =
            await this.moralisService.nftContractTransfersOf(
              document.chainId as ChainId,
              document.nftCollectionAddress,
            );

          if (!!Array.isArray(latestTransfers) && latestTransfers.length > 0) {
            const nftPrice = _.min(
              latestTransfers
                .filter((it) => !!it.value && it.value !== '0')
                .map((it) => Number(ethers.utils.formatEther(it.value))),
            );

            updatedDocument = {
              ...updatedDocument,
              updated: moment(latestTransfers[0].block_timestamp).unix(),
              balanceFiat:
                updatedDocument.balanceNfts *
                nftPrice *
                document.saleTokenPrice,
              nftPrice,
            };
          }

          if (document.chainId === 'eth') {
            const metadata = await this.openseaService.metadataOf(
              document.nftCollectionAddress,
            );

            updatedDocument = {
              ...updatedDocument,
              nftCollectionLogo: metadata?.image_url ?? defaultLogo,
            };
          } else {
            updatedDocument = {
              ...updatedDocument,
              nftCollectionLogo: defaultLogo,
            };
          }

          return updatedDocument;
        }),
      );

      return <Context>{
        ...context,
        documents: updatedDocuments,
      };
    });
  }

  private emitNftBalanceDocuments() {
    return Rx.tap((context: Context) => {
      const layers = <LayerDto[]>[
        {
          id: `nft-balances-layer`,
          collectionName: NFT_BALANCES,
          set: context.documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private mapNftBalanceDocuments() {
    return Rx.map((context: Context) => {
      const byContractAddress = _.groupBy(
        context.nftOwners,
        (nft) => `${nft.chain_id}_${nft.token_address}`,
      );

      const documents = Object.entries(byContractAddress).map(([id, nfts]) => {
        const balance = _.sumBy(nfts, (it) => Number(it.amount));

        const chainId = nfts[0].chain_id;
        const contractAddress = nfts[0].token_address;
        const chainMetadata = chains[chainId];
        const nftPrice = context.nftPrices.find(
          (it) =>
            it.chainId === chainId && it.contractAddress === contractAddress,
        );
        const nftLogo = context.nftLogos.find(
          (it) =>
            it.chainId === chainId && it.contractAddress === contractAddress,
        );
        const chainCoinPrice = context.coinPrices.find(
          (it) => it.coinId === chainMetadata.token.coinId,
        );

        const document: NftBalanceDocument = {
          id,
          balanceNfts: balance,
          updated: nftPrice?.updated,
          balanceFiat: balance * nftPrice?.price * chainCoinPrice.price,
          nftPrice: nftPrice?.price,
          chainId: chainMetadata.id,
          chainLogo: chainMetadata.logo,
          chainName: chainMetadata.name,
          links: {
            details: '',
            explorer: `${chainMetadata.explorer}token/${nfts[0].token_address}`,
          },
          fiatSymbol: context.selectedCurrency.symbol,
          saleTokenPrice: chainCoinPrice.price,
          saleTokenSymbol: chainMetadata.token.symbol,
          nftCollectionAddress: nfts[0].token_address,
          nftCollectionName: nfts[0].name,
          nftCollectionSymbol: nfts[0].symbol,
          nftCollectionLogo: nftLogo?.imageUrl ?? defaultLogo,
        };

        return document;
      });

      return <Context>{
        ...context,
        documents,
      };
    });
  }

  private emitMilestones() {
    return Rx.tap((context: Context) => {
      const documents = [
        {
          id: '1-balances',
          status: !context.nftOwners ? 'progressing' : 'complete',
          label: !context.nftOwners
            ? 'Fetching your nfts'
            : `Fetched ${context.nftOwners.length} nft balances`,
        },
        {
          id: '2-token-prices',
          status: !context.coinPrices ? 'progressing' : 'complete',
          label: !context.coinPrices
            ? 'Fetching token prices'
            : `Fetched pricing for ${context.coinPrices.length} tokens`,
        },
        {
          id: '3-nft-prices',
          status: !context.nftPrices ? 'pending' : 'complete',
          label: !context.nftPrices
            ? 'Fetching nft prices'
            : `Fetched last prices for ${context.nftOwners.length} nfts`,
        },
        {
          id: '4-nft-logos',
          status: !context.nftLogos ? 'pending' : 'complete',
          label: !context.nftLogos
            ? 'Fetching nft logos'
            : `Fetched logos for ${context.nftOwners.length} nfts`,
        },
        {
          id: '5-final',
          status: !context.documents ? 'pending' : 'complete',
          label: !context.documents ? 'Combining the data' : `Done 👍`,
        },
      ];

      const layers = [
        {
          id: NFT_BALANCE_MILESTONES,
          collectionName: NFT_BALANCE_MILESTONES,
          set: documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private removeMilestones() {
    return Rx.tap((context: Context) => {
      const removeMilestonesQuery = {
        id: NFT_BALANCE_MILESTONES,
      };

      this.eventService.removeLayers(context.clientId, removeMilestonesQuery);
    });
  }
}

interface Context extends BaseContext {
  readonly coinPrices?: CoinPrice[];
  readonly documents?: NftBalanceDocument[];
  readonly nftLogos?: NftLogo[];
  readonly nftPrices?: NftPrice[];
  readonly nftOwners?: moralis.NftOwner[];
}

interface NftLogo {
  readonly chainId: string;
  readonly contractAddress: string;
  readonly imageUrl: string;
}

interface NftTransfer {
  amount?: number;
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number;
  fromAddress?: string;
  logIndex: number;
  toAddress: string;
  tokenAddress: string;
  tokenId: number;
  transactionHash: string;
  transactionIndex?: number;
  value?: number;
}

interface NftPrice {
  readonly chainId: string;
  readonly contractAddress: string;
  readonly price: number;
  readonly updated: number;
}
