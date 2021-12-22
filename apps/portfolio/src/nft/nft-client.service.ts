import {
  chainIds,
  chains,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  EventsService,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { Queue } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { NftContractDocument } from './dto';
import { NFT_PRICE_QUEUE } from './queues';

@Injectable()
export class NftClientService {
  constructor(
    private moralisService: MoralisService,
    @InjectQueue(NFT_PRICE_QUEUE) private nftPriceQueue: Queue,
    private eventsService: EventsService,
    private openseaService: OpenseaService,
  ) {}

  @EventPattern(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
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

    let contracts = this.mapNftContractDocuments(nfts);
    //#endregion

    //#region add logos for eth contracts
    contracts = await Promise.all(
      contracts
        .filter((it) => it.chain.id === 'eth')
        .map(async (contract) => {
          const metadata = await this.openseaService.metadataOf(
            contract.contractAddress,
          );
          if (!metadata?.image_url) {
            return contract;
          }
          return {
            ...contract,
            logo: metadata.image_url,
          };
        }),
    );
    //#endregion

    //#region emit nft contracts to the client
    const layers = [
      {
        id: 'nft-contracts-layer',
        collectionName: 'nft-contracts',
        set: contracts,
      },
    ];

    this.eventsService.emitLayers(clientId, layers);
    //#endregion

    //#region add nft price updates to the bull queue
    for (const contract of contracts) {
      this.nftPriceQueue.add({
        selectedCurrency,
        contract,
      });
    }
    //#endregion
  }

  private mapNftContractDocuments(
    nfts: moralis.NftOwner[],
  ): NftContractDocument[] {
    const byContractAddress = _.groupBy(
      nfts,
      (nft) => `${nft.chain_id}_${nft.token_address}`,
    );

    const now = moment().unix();

    return Object.entries(byContractAddress).map(([id, nfts]) => {
      const balance = _.sumBy(nfts, 'amount');

      const chainMetadata = chains[nfts[0].chain_id];

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
        nfts: nfts.map((nft) => ({ tokenId: nft.token_id })),
        price: 0,
        priceFormatted: '?',
        name: nfts[0].name,
        ownerAddresses: nfts.map((nft) => nft.owner_of),
        symbol: nfts[0].symbol,
        value: 0,
        valueFormatted: 'Price ?',
        valueFiat: 0,
        valueFiatFormatted: 'Price ?',
      };
    });
  }
}
