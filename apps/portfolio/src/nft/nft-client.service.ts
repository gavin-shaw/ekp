import {
  ADD_LAYERS,
  chainIds,
  chains,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  CoingeckoService,
  CoinPrice,
  CurrencyDto,
  JOIN_ROOM,
  logger,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { defaultLogo } from '../util/constants';
import { NftContractDocument } from './dto';
import { NftDatabaseService } from './nft-database.service';
import { NFT_PRICE_QUEUE } from './queues';

@Injectable()
export class NftClientService {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventEmitter: EventEmitter2,
    private moralisService: MoralisService,
    private nftDatabaseService: NftDatabaseService,
    @InjectQueue(NFT_PRICE_QUEUE) private nftPriceQueue: Queue,
    private openseaService: OpenseaService,
  ) {}

  @OnEvent(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    try {
      //#region validate input
      const clientId = validate(clientStateChangedEvent.clientId, 'string');

      const selectedCurrency = validate(
        clientStateChangedEvent.state?.client.selectedCurrency,
        'object',
      );

      const watchedWallets = validate(
        clientStateChangedEvent.state?.client.watchedWallets,
        'Array.<object>',
      );
      //#endregion

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

      const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

      const chainCoinPrices = await this.coingeckoService.latestPricesOf(
        chainCoinIds,
        selectedCurrency.id,
      );

      let contracts = this.mapNftContractDocuments(
        nfts,
        selectedCurrency,
        chainCoinPrices,
      );
      //#endregion

      //#region add logos for eth contracts
      contracts = await Promise.all(
        contracts.map(async (contract) => {
          const price = await this.nftDatabaseService.priceOf(contract.id);

          const latestTransfer = await this.nftDatabaseService.latestTransferOf(
            contract.id,
          );

          if (contract.chain.id !== 'eth') {
            return {
              ...contract,
              fetchTimestamp: latestTransfer?.blockTimestamp,
              logo: defaultLogo,
              price,
            };
          }

          const metadata = await this.openseaService.metadataOf(
            contract.contractAddress,
          );

          if (!metadata?.image_url) {
            return contract;
          }

          return {
            ...contract,
            fetchTimestamp: latestTransfer?.blockTimestamp,
            logo: metadata.image_url,
            price,
          };
        }),
      );
      //#endregion

      //#region emit nft contracts to the client
      const layers = [
        {
          id: 'nft-contracts-layer',
          collectionName: 'nfts',
          patch: contracts,
        },
      ];

      this.eventEmitter.emit(ADD_LAYERS, {
        channelId: clientId,
        layers,
      });
      //#endregion

      //#region join the client to the rooms for the contract

      for (const contract of contracts) {
        this.eventEmitter.emit(JOIN_ROOM, {
          clientId,
          roomName: contract.id,
        });
      }

      //#endregion

      //#region add nft price updates to the bull queue
      for (const contract of contracts) {
        this.nftPriceQueue.add({
          selectedCurrency,
          contract,
        });
      }
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
          token: `${chainMetadata.explorer}address/${nfts[0].token_address}`,
        },
        nfts: nfts.map((nft) => ({ tokenId: nft.token_id })),
        name: nfts[0].name,
        ownerAddresses: nfts.map((nft) => nft.owner_of),
        symbol: nfts[0].symbol,
        priceFiat: {
          _eval: true,
          scope: {
            price: '$.price',
            rate: chainCoinPrice.price,
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
            rate: chainCoinPrice.price,
          },
          expression: 'rate * value',
        },
      };
    });
  }
}
