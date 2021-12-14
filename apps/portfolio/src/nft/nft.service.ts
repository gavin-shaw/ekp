import {
  chainIds,
  ClientStateDto,
  CurrencyService,
  EvmNftService,
  NftCollection,
  chains,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { CollectionRecord } from './dtos';

@Injectable()
export class NftService {
  constructor(
    private evmNftService: EvmNftService,
    private currencyService: CurrencyService,
  ) {}

  async allCollectionsOf(
    clientState: ClientStateDto,
  ): Promise<CollectionRecord[]> {
    validate([clientState], ['object']);

    if (!Array.isArray(clientState.watchedAddresses)) {
      return [];
    }

    validate([clientState.client?.currency], ['object']);

    const collectionsWithBalances = await this.getCollectionsWithBalances(
      clientState.watchedAddresses,
    );

    return collectionsWithBalances;
  }

  private async getCollectionsWithBalances(
    ownerAddresses: string[],
  ): Promise<CollectionRecord[]> {
    validate([ownerAddresses], ['Array.<string>']);

    if (ownerAddresses.length === 0) {
      return [];
    }

    const requestPromises = [];

    for (const chainId of chainIds) {
      for (const ownerAddress of ownerAddresses) {
        requestPromises.push(
          this.evmNftService.allCollectionsOf(chainId, ownerAddress),
        );
      }
    }

    const nftCollections: NftCollection[] = _.flatten(
      await Promise.all(requestPromises),
    );

    const collectionsById = _.groupBy(
      nftCollections,
      (nftCollection) =>
        `${nftCollection.chainId}_${nftCollection.contractAddress}`,
    );

    const now = moment().unix();

    const collectionRecords: CollectionRecord[] = Object.entries(
      collectionsById,
    ).map(([id, collections]) => {
      const balanceValue = _.sumBy(
        collections,
        (collection) => collection.nfts?.length ?? 0,
      );

      const chainMetadata = chains[collections[0].chainId];

      return {
        id,
        created: now,
        updated: now,
        balance: {
          value: balanceValue,
          display: `${Math.floor(balanceValue)} nfts`,
        },
        balanceFiat: {
          value: 0,
          display: 'Total value ?',
        },
        chain: {
          id: chainMetadata.chainId,
          logo: chainMetadata.logo,
          name: chainMetadata.name,
        },
        contractAddress: collections[0].contractAddress,
        floorPrice: {
          value: 0,
          display: '?',
        },
        floorPriceFiat: {
          value: 0,
          display: 'Floor price ?',
        },
        name: collections[0].name,
        ownerAddresses: collections.map(
          (collection) => collection.ownerAddress,
        ),
        symbol: collections[0].symbol,
      };
    });

    return collectionRecords;
  }
}
