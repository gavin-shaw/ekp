import {
  AbstractProcessor,
  BaseContext,
  ChainId,
  chains,
  CoingeckoService,
  CoinPrice,
  EthersService,
  LayerDto,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { BigNumber, ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { NFT_BALANCES, NFT_BALANCE_MILESTONES } from '../util/collectionNames';
import { defaultLogo } from '../util/constants';
import { NFT_BALANCE_QUEUE } from '../util/queue.names';
import { NftBalanceDocument } from './documents/nft-balance.document';

@Processor(NFT_BALANCE_QUEUE)
export class NftBalanceProcessor extends AbstractProcessor<Context> {
  constructor(
    private coingeckoService: CoingeckoService,
    private ethersService: EthersService,
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
        this.emitMilestones(),
      )
      .pipe(
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
      const nftPrices = await _.chain(context.nftOwners)
        .map(async (nftOwner) => {
          const nftTransfers = await this.moralisService.nftContractTransfersOf(
            nftOwner.chain_id as ChainId,
            nftOwner.token_address,
            10,
          );

          if (nftTransfers.length === 0) {
            return {
              chainId: nftOwner.chain_id,
              contractAddress: nftOwner.token_address,
              price: 0,
              updated: undefined,
            };
          }

          const transfers = await _.chain(nftTransfers)
            .map(async (nftTransfer) => {
              if (nftTransfer.value === '0') {
                const receipt = await this.ethersService.transactionReceiptOf(
                  nftOwner.chain_id,
                  nftTransfer.transaction_hash,
                );

                if (!!receipt) {
                  const logs = receipt.receipt?.logs;
                  const fromAddress = `0x000000000000000000000000${nftTransfer.from_address
                    .toLowerCase()
                    .substring(2)}`;

                  const tokenTransferLog: ethers.providers.Log = logs?.find(
                    (it) =>
                      it.topics[0]?.toLowerCase() ===
                        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                      it.topics[2]?.toLowerCase() === fromAddress,
                  );

                  if (!!tokenTransferLog) {
                    if (!['', '0x'].includes(tokenTransferLog.data)) {
                      const amount = ethers.BigNumber.from(
                        tokenTransferLog.data,
                      );

                      const valueTokenAddress = tokenTransferLog.address;

                      const price = await this.moralisService.tokenPriceOf(
                        nftTransfer.chain_id as ChainId,
                        valueTokenAddress,
                        tokenTransferLog.blockNumber,
                      );

                      if (!!price) {
                        nftTransfer.value = amount
                          .mul(price.nativePrice.value)
                          .div(
                            BigNumber.from(10).pow(price.nativePrice.decimals),
                          )
                          .toString();
                      }
                    }
                  }
                }
              }

              return <NftTransfer>{
                amount: Number(nftTransfer.amount),
                blockHash: nftTransfer.amount,
                blockNumber: Number(nftTransfer.block_number),
                blockTimestamp: moment(nftTransfer.block_timestamp).unix(),
                fromAddress: nftTransfer.from_address,
                logIndex: Number(nftTransfer.log_index),
                toAddress: nftTransfer.to_address,
                tokenAddress: nftTransfer.token_address,
                tokenId: Number(nftTransfer.token_id),
                transactionHash: nftTransfer.transaction_hash,
                transactionIndex: Number(nftTransfer.transaction_index),
                value: Number(ethers.utils.formatEther(nftTransfer.value ?? 0)),
              };
            })
            .thru((promises) => Promise.all(promises))
            .value();

          const updated = _.chain(transfers)
            .map((it) => it.blockTimestamp)
            .max()
            .value();

          // const last24HourTransfers = _.chain(transfers)
          //   .filter((transfer) => now - transfer.blockTimestamp < 86400)
          //   .value();

          const price =
            _.chain(transfers)
              .filter((it) => it.value > 0)
              .map((it) => it.value)
              .first()
              .value() ?? 0;

          // if (last24HourTransfers.length > 0) {
          //   price = _.chain(last24HourTransfers)
          //     .filter((transfer) => transfer.value > 0)
          //     .map((transfer) => transfer.value / transfer.amount)
          //     .min()
          //     .value();
          // } else {
          //   price = _.chain(transfers)
          //     .filter((transfer) => transfer.value > 0)
          //     .sumBy((transfer) => transfer.value / transfer.amount)
          //     .thru((sum) => sum / transfers.length)
          //     .value();
          // }

          const nftPrice: NftPrice = {
            chainId: nftOwner.chain_id,
            contractAddress: nftOwner.token_address,
            price,
            updated,
          };

          return nftPrice;
        })
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

  protected emitMilestones() {
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

  protected removeMilestones() {
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
  valueTokenAddress?: string;
}

interface NftPrice {
  readonly chainId: string;
  readonly contractAddress: string;
  readonly price: number;
  readonly updated: number;
}
