import { OpenseaService } from '../../opensea';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import cacheManager from 'cache-manager';
import { ethers } from 'ethers';
import _ from 'lodash';
import Moralis from 'moralis/node';
import * as moralis from '../moralis';
import { ChainId } from '../utils';
import {
  NftCollection,
  NftCollectionFloorPrice,
  NftCollectionMetadata,
} from './model';
import { logger } from '@app/sdk';

@Injectable()
export class EvmNftService {
  cache = cacheManager.caching({ store: 'memory', ttl: 0 });

  constructor(private openseaService: OpenseaService) {}

  // async allTransfersOf({ address, chain }) {
  //   const cacheKey = `nft_collections_${address}_${chain}`;

  //   const cachedCollections: {
  //     collections: { [contractAddress: string]: NftCollection[] };
  //     endBlock: number;
  //   } = await this.cache.get(cacheKey);

  //   let startBlock: number;
  //   let endBlock: number;

  //   let collections = {};

  //   if (!!cachedCollections) {
  //     collections = cachedCollections.collections;
  //     startBlock = cachedCollections.endBlock + 1;
  //   }

  //   const addressTransactions =
  //     await this.evmTransactionService.allTransactionsOf({
  //       address,
  //       chain,
  //       startBlock,
  //     });

  //   for (const transaction of addressTransactions) {
  //     endBlock = transaction.blockNumber;

  //     if (!this.isTransfer(transaction)) {
  //       continue;
  //     }

  //     const contractAddress = transaction.contractAddress;

  //     let collection = collections[contractAddress];

  //     if (!collection) {
  //       const nftContractDetails = await this.contractDetailsOf(
  //         transaction.contactAddress,
  //       );

  //       if (!nftContract) {
  //         continue;
  //       }

  //       collection = {
  //         // Map new collection details here
  //       };

  //       collections[contractAddress] = collection;
  //     }

  //     const tokenId = this.parseTokenId(transaction);

  //     if (transaction.fromAddress === address) {
  //       _.remove(collection.nfts, (nft) => nft.tokenId === tokenId);
  //     }

  //     if (transaction.toAddress === address) {
  //       collection.nfts.push({
  //         // map new nft here
  //       });
  //     }
  //   }

  //   await this.cache.set(cacheKey, {
  //     collections,
  //     endBlock,
  //   });

  //   return Object.values(collections);
  // }

  async metadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<NftCollectionMetadata> {
    if (chainId !== 'eth') {
      // TODO: implement other chains
      return undefined;
    }

    const metadata = await this.openseaService.metadataOf(contractAddress);

    if (!metadata) {
      return undefined;
    }

    return {
      chainId,
      contractAddress,
      logo: metadata.image_url,
      slug: metadata.slug,
    };
  }

  async floorPriceOf(
    collectionMetadata: NftCollectionMetadata,
  ): Promise<NftCollectionFloorPrice> {
    if (collectionMetadata.chainId !== 'eth') {
      // TODO: implement other chains
      return undefined;
    }

    const price = await this.openseaService.floorPriceOf(
      collectionMetadata.slug,
    );

    return {
      chainId: collectionMetadata.chainId,
      contractAddress: collectionMetadata.contractAddress,
      decimals: 18,
      price: !!price ? ethers.utils.parseEther(`${price}`) : undefined,
    };
  }

  async allCollectionsOf(
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<NftCollection[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const result: moralis.NftOwner[] = (
      await Moralis.Web3API.account.getNFTs({
        address: ownerAddress,
        chain: chainId,
      })
    )?.result;

    const collectionsByContractAddress = _.groupBy(result, 'token_address');

    const collections: NftCollection[] = Object.entries(
      collectionsByContractAddress,
    ).map(([contractAddress, nfts]) => ({
      chainId,
      contractAddress,
      contractType: nfts[0]?.contract_type,
      nfts: nfts.map((nft) => ({
        amount: Number(nft.amount),
        metadata: nft.metadata,
        mintedBlockNumber: Number(nft.block_number_minted),
        tokenId: nft.token_id,
        tokenUri: nft.token_uri,
      })),
      name: nfts[0]?.name,
      ownerAddress,
      symbol: nfts[0]?.symbol,
    }));

    return collections;
  }
}
