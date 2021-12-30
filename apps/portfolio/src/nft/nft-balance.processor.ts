import {
  chainIds,
  chains,
  ClientStateChangedEvent,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  EventService,
  formatters,
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
import { NFT_BALANCE_QUEUE } from '../queues';
import { defaultLogo } from '../util/constants';
import { NftContractDocument } from './dto';

@Processor(NFT_BALANCE_QUEUE)
export class NftBalanceProcessor {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventService: EventService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) {}

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

    return {
      clientId,
      selectedCurrency,
      watchedWallets,
    };
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    try {
      //#region validate input
      const { clientId, selectedCurrency, watchedWallets } = this.validateEvent(
        job.data,
      );
      //#endregion

      logger.log(`Processing NFT_BALANCE_QUEUE for ${clientId}`);

      //#region get contracts for client
      const requestPromises = [];

      for (const chainId of chainIds) {
        for (const watchedWallet of watchedWallets) {
          const address = validate(watchedWallet.address, 'string');

          requestPromises.push(this.moralisService.nftsOf(chainId, address));
        }
      }

      const nfts: moralis.NftOwner[] = _.flatten(
        await Promise.all(requestPromises),
      );
      //#endregion

      //#region get coin pricing TODO: move this into its own client service
      const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

      const chainCoinPrices = await this.coingeckoService.latestPricesOf(
        chainCoinIds,
        selectedCurrency.id,
      );
      //#endregion

      //#region map the nfts into contract documents
      let contracts = this.mapNftContractDocuments(
        nfts,
        selectedCurrency,
        chainCoinPrices,
      );
      //#endregion

      //#region add logos and latest pricing to contracts
      contracts = await Promise.all(
        contracts.map(async (contract: NftContractDocument) => {
          let updatedContract = contract;

          const latestTransfers = await this.moralisService.nftTransfersOf(
            contract.chain.id,
            contract.contractAddress,
          );

          if (!!Array.isArray(latestTransfers) && latestTransfers.length > 0) {
            const price = _.min(
              latestTransfers
                .filter((it) => !!it.value && it.value !== '0')
                .map((it) => Number(ethers.utils.formatEther(it.value))),
            );

            updatedContract = {
              ...updatedContract,
              fetchTimestamp: moment(latestTransfers[0].block_timestamp).unix(),
              price,
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
      //#endregion

      //#region emit nft contracts to the client
      const totalValue = _.sumBy(
        contracts.filter((it) => !!it.balance && !!it.price && !!it.rateFiat),
        (it) => it.balance * it.price * it.rateFiat,
      );

      const layers = [
        {
          id: 'nft-contracts-layer',
          collectionName: 'nfts',
          patch: contracts,
        },
        {
          id: `nft-stats`,
          collectionName: 'portfolioStats',
          set: [
            {
              id: 'nft_value',
              name: 'Nft Value',
              value: formatters.currencyValue(
                totalValue,
                selectedCurrency.symbol,
              ),
            },
          ],
        },
      ];

      this.eventService.addLayers(clientId, layers);
      //#endregion
    } catch (error) {
      logger.error(`(NftClientService) Error occurred handling client state.`);
      logger.error(error);
    }
  }

  private mapNftContractDocuments(
    nfts: moralis.NftOwner[],
    selectedCurrency: CurrencyDto,
    chainCoinPrices: CoinPrice[],
  ): NftContractDocument[] {
    const byContractAddress = _.groupBy(
      nfts,
      (nft) => `${nft.chain_id}_${nft.token_address}`,
    );

    const now = moment().unix();

    return Object.entries(byContractAddress).map(([id, nfts]) => {
      const balance = _.sumBy(nfts, (it) => Number(it.amount));

      const chainMetadata = chains[nfts[0].chain_id];

      const chainCoinPrice = chainCoinPrices.find(
        (it) => it.coinId === chains[nfts[0].chain_id].token.coinId,
      );

      return {
        id,
        created: now, // TODO: set this according to the contract created date
        updated: now, // TODO: set this according to the contract last transfer timestamp
        balance,
        balanceFormatted: `${Math.floor(balance)} nfts`,
        chain: {
          id: chainMetadata.id,
          logo: chainMetadata.logo,
          name: chainMetadata.name,
        },
        contractAddress: nfts[0].token_address,
        fiatSymbol: selectedCurrency.symbol,
        links: {
          token: `${chainMetadata.explorer}token/${nfts[0].token_address}`,
        },
        nfts: nfts.map((nft) => ({ tokenId: nft.token_id })),
        name: nfts[0].name,
        ownerAddresses: nfts.map((nft) => nft.owner_of),
        symbol: nfts[0].symbol,
        rateFiat: chainCoinPrice.price,
        priceSymbol: chainMetadata.token.symbol,
        priceFiat: {
          _eval: true,
          scope: {
            price: '$.price',
            rate: '$.rateFiat',
          },
          expression: 'rate * price',
        },
        value: {
          _eval: true,
          scope: {
            price: '$.price',
            balance: '$.balance',
          },
          expression: 'balance * price',
        },
        valueFiat: {
          _eval: true,
          scope: {
            value: '$.value',
            rate: '$.rateFiat',
          },
          expression: 'rate * value',
        },
      };
    });
  }
}
