import {
  chainIds,
  ClientStateDto,
  CoingeckoService,
  EvmNftService,
  NftCollection,
  chains,
  NftCollectionFloorPrice,
  formatters,
  CurrencyDto,
} from '@app/sdk';
import { ethers } from 'ethers';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { CollectionRecord } from './dtos';

@Injectable()
export class NftService {
  constructor(
    private evmNftService: EvmNftService,
    private coingeckoService: CoingeckoService,
  ) {}

  async allCollectionsOf(
    clientState: ClientStateDto,
  ): Promise<CollectionRecord[]> {
    validate([clientState], ['object']);

    if (!Array.isArray(clientState.client?.watchedWallets)) {
      return [];
    }

    validate([clientState.client?.currency], ['object']);

    const collectionsWithBalances = await this.getCollectionsWithBalances(
      clientState.client.watchedWallets.map((it) => it.address),
    );

    const collectionsWithPrices = await this.addCollectionPrices(
      collectionsWithBalances,
      clientState.client.currency,
    );

    return collectionsWithPrices;
  }

  private async addCollectionPrices(
    collections: CollectionRecord[],
    currency: CurrencyDto,
  ): Promise<CollectionRecord[]> {
    const floorPrices: NftCollectionFloorPrice[] = await Promise.all(
      collections.map((collection) =>
        this.evmNftService.floorPriceOf(
          collection.chain.id,
          collection.contractAddress,
        ),
      ),
    );

    const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

    const chainCoinPrices = await this.coingeckoService.latestPricesOf(
      chainCoinIds.filter((it) => !!it),
      currency.id,
    );

    return collections.map((collection) => {
      const floorPrice = floorPrices
        .filter((it) => !!it)
        .find(
          (it) =>
            it.chainId === collection.chain.id &&
            it.contractAddress === collection.contractAddress,
        )?.price;

      let floorPriceValue = 0;

      if (!!floorPrice) {
        floorPriceValue = Number(ethers.utils.formatEther(floorPrice));
      }

      let floorPriceFiatValue = 0;

      if (!!floorPriceValue) {
        const chainCoinPrice = chainCoinPrices.find(
          (it) => it.coinId === chains[collection.chain.id].token.coinId,
        );

        if (!!chainCoinPrice) {
          floorPriceFiatValue = floorPriceValue * chainCoinPrice.price;
        }
      }

      return {
        ...collection,
        balanceFiat: {
          value: collection.balance.value * floorPriceFiatValue,
          display: formatters.currencyValue(
            collection.balance.value * floorPriceFiatValue,
            currency.symbol,
          ),
        },
        floorPrice: {
          value: floorPriceValue,
          display: formatters.tokenValue(floorPriceValue),
        },
        floorPriceFiat: {
          value: floorPriceFiatValue,
          display: formatters.currencyValue(
            floorPriceFiatValue,
            currency.symbol,
          ),
        },
      };
    });
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
        chain: {
          id: chainMetadata.id,
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
