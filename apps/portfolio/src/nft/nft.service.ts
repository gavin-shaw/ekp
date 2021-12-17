import {
  chainIds,
  chains,
  ClientStateDto,
  CoingeckoService,
  CurrencyDto,
  EvmNftService,
  formatters,
  NftCollection,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
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
    selectedCurrency: CurrencyDto,
    watchedWallets: { address: string }[],
  ): Promise<CollectionRecord[]> {
    if (!Array.isArray(watchedWallets)) {
      return [];
    }

    const collectionsWithBalances = await this.getCollectionsWithBalances(
      watchedWallets.map((it) => it.address),
    );

    const collectionsWithPrices = await this.addCollectionPrices(
      collectionsWithBalances,
      selectedCurrency,
    );

    return collectionsWithPrices;
  }

  private async addCollectionPrices(
    collections: CollectionRecord[],
    currency: CurrencyDto,
  ): Promise<CollectionRecord[]> {
    const withMetaData: CollectionRecord[] = await Promise.all(
      collections.map(async (collection) => {
        const metadata = await this.evmNftService.metadataOf(
          collection.chain.id,
          collection.contractAddress,
        );

        if (!metadata) {
          return collection;
        }

        const floorPrice = await this.evmNftService.floorPriceOf(metadata);

        if (!floorPrice?.price) {
          return {
            ...collection,
            logo: metadata.logo,
          };
        }

        return {
          ...collection,
          logo: metadata.logo,
          floorPrice: {
            value: Number(ethers.utils.formatEther(floorPrice.price)),
          },
        };
      }),
    );

    const chainCoinIds = Object.values(chains).map((it) => it.token.coinId);

    const chainCoinPrices = await this.coingeckoService.latestPricesOf(
      chainCoinIds.filter((it) => !!it),
      currency.id,
    );

    return withMetaData.map((collection) => {
      let floorPriceFiatValue = 0;

      if (!!collection.floorPrice?.value) {
        const chainCoinPrice = chainCoinPrices.find(
          (it) => it.coinId === chains[collection.chain.id].token.coinId,
        );

        if (!!chainCoinPrice) {
          floorPriceFiatValue =
            collection.floorPrice?.value * chainCoinPrice.price;
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
          value: collection.floorPrice?.value,
          display: formatters.tokenValue(collection.floorPrice?.value),
        },
        floorPriceFiat: {
          value: floorPriceFiatValue,
          display: formatters.currencyValue(
            floorPriceFiatValue,
            currency.symbol,
          ),
        },
        logo:
          collection.logo ??
          'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
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
