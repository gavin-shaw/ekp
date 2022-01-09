import {
  chainIds,
  chains,
  ClientStateChangedEvent,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  EventService,
  LayerDto,
  logger,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { stringify } from 'querystring';
import * as Rx from 'rxjs';
import { NFT_BALANCE_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { logErrors } from '../util/logErrors';
import { NftBalanceDocument } from './documents/nft-balance.document';

interface Context {
  readonly clientId: string;
  readonly coinPrices?: CoinPrice[];
  readonly documents?: NftBalanceDocument[];
  readonly selectedCurrency: CurrencyDto;
  readonly nftOwners?: moralis.NftOwner[];
  readonly watchedAddresses: string[];
}

@Processor(NFT_BALANCE_QUEUE)
export class NftBalanceProcessor {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventService: EventService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) { }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    try {
      await Rx.lastValueFrom(
        this.validateEvent(job.data).pipe(
          this.addNftOwners(),
          this.addCoinPrices(),
          this.mapNftBalanceDocuments(),
          this.addLogosAndLatestPricing(),
          this.emitNftBalanceDocuments(),
          logErrors(),
        ),
      );
    } catch (error) {
      logger.error(error, error.stack);
    }
  }

  private validateEvent(event: ClientStateChangedEvent) {
    const clientId = validate(event.clientId, 'string');

    const selectedCurrency = validate(
      event.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      event.state?.client.watchedWallets,
      'Array.<object>',
    );

    return Rx.from([
      {
        clientId,
        selectedCurrency,
        watchedAddresses: watchedWallets.map((it: { address: string }) =>
          it.address.toLowerCase(),
        ),
      },
    ]);
  }

  private addNftOwners() {
    return Rx.mergeMap(async (context: Context) => {
      const requestPromises = [];

      for (const chainId of chainIds) {
        for (const address of context.watchedAddresses) {
          requestPromises.push(this.moralisService.nftsOf(chainId, address));
        }
      }

      const nftOwners: moralis.NftOwner[] = _.flatten(
        await Promise.all(requestPromises),
      );

      return <Context>{
        ...context,
        nftOwners,
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
        context.documents.map(async (contract: NftBalanceDocument) => {
          let updatedContract = contract;

          const latestTransfers =
            await this.moralisService.nftContractTransfersOf(
              contract.chain.id,
              contract.contractAddress,
            );

          if (!!Array.isArray(latestTransfers) && latestTransfers.length > 0) {
            const nativePrice = _.min(
              latestTransfers
                .filter((it) => !!it.value && it.value !== '0')
                .map((it) => Number(ethers.utils.formatEther(it.value))),
            );

            const chainMetadata = chains[contract.chain.id];

            const chainCoinPrice = context.coinPrices.find(
              (it) => it.coinId === chainMetadata.token.coinId,
            );

            updatedContract = {
              ...updatedContract,
              updated: moment(latestTransfers[0].block_timestamp).unix(),
              nativePrice,
              tokenValue: {
                tokenAmount: updatedContract.balance * nativePrice,
                tokenSymbol: chainMetadata.token.symbol,
                tokenPrice: chainCoinPrice.price,
                fiatSymbol: context.selectedCurrency.symbol,
                fiatAmount:
                  updatedContract.balance *
                  nativePrice *
                  chainCoinPrice.price || 0,
              },
            };
          }

          if (contract.chain.id === 'eth') {
            const metadata = await this.openseaService.metadataOf(
              contract.contractAddress,
            );

            updatedContract = {
              ...updatedContract,
              logo: metadata?.image_url ?? defaultLogo,
            };
          } else {
            updatedContract = {
              ...updatedContract,
              logo: defaultLogo,
            };
          }

          return updatedContract;
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
          collectionName: 'nft_balances',
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

        const chainMetadata = chains[nfts[0].chain_id];

        return <NftBalanceDocument>{
          id,
          balanceNfts: balance,
          chainId: chainMetadata.id,
          chainLogo: chainMetadata.logo,
          chainName: chainMetadata.name,
          links: {
            details: '',
            explorer: `${chainMetadata.explorer}token/${nfts[0].token_address}`,
          },
          nftCollectionAddress: nfts[0].token_address,
          nftCollectionName: nfts[0].name,
          nftCollectionSymbol: nfts[0].symbol,
        };
      });

      return <Context>{
        ...context,
        documents,
      };
    });
  }
}
