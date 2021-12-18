import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import { BigNumber, ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { MoralisService } from '../../moralis';
import * as moralis from '../../moralis/model';
import { OpenseaService } from '../../opensea';
import { ChainId } from '../utils';
import {
  NftCollection,
  NftCollectionFloorPrice,
  NftCollectionMetadata,
  NftTransfer,
} from './model';

@Injectable()
export class EvmNftService {
  constructor(
    private openseaService: OpenseaService,
    private moralisService: MoralisService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async metadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<NftCollectionMetadata> {
    if (chainId === 'eth') {
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

    const metadata = this.moralisService.nftMetadataOf(
      chainId,
      contractAddress,
    );

    if (!metadata) {
      return undefined;
    }

    return {
      chainId,
      contractAddress,
      // TODO: move this one layer higher, into the portfolio module, doesn't belong in the SDK
      logo: 'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
    };
  }

  async transfersOf(
    chainId: ChainId,
    contractAddress: string,
    options: { afterTimestamp?: number; afterBlock?: number },
  ) {
    validate(
      [chainId, contractAddress, options?.afterTimestamp, options?.afterBlock],
      ['string', 'string', 'number=', 'number='],
    );

    const cacheKey = `nft.transfers['${chainId}']['${contractAddress}']`;

    const cached = ((await this.cache.get(cacheKey)) as {
      cursor?: string;
      transfers: NftTransfer[];
    }) ?? {
      cursor: undefined,
      transfers: [],
    };

    const { cursor, transfers } =
      await this.moralisService.nftContractTransfersOf(
        chainId,
        contractAddress,
        cached.cursor,
      );

    const mappedTransfers: NftTransfer[] = transfers.map(
      (transfer: moralis.NftTransfer): NftTransfer => ({
        amount:
          transfer.amount !== undefined ? Number(transfer.amount) : undefined,
        blockNumber: Number(transfer.block_number),
        blockTimestamp: Number(transfer.block_timestamp),
        chainId,
        contractAddress,
        fromAddress: transfer.from_address,
        toAddress: transfer.to_address,
        tokenId: Number(transfer.token_id),
        transactionHash: transfer.transaction_hash,
        value:
          transfer.value !== undefined
            ? BigNumber.from(transfer.value)
            : undefined,
      }),
    );

    const combinedTransfers = [...cached.transfers, ...mappedTransfers];

    const newCached = {
      cursor,
      transfers: combinedTransfers,
    };

    await this.cache.set(cacheKey, newCached, { ttl: 0 });

    return combinedTransfers.filter((transfer) => {
      if (!options) {
        return true;
      }

      let include = true;

      if (options.afterTimestamp !== undefined) {
        include = include && transfer.blockTimestamp > options.afterTimestamp;
      }
      if (options.afterBlock !== undefined) {
        include = include && transfer.blockNumber > options.afterBlock;
      }

      return include;
    });
  }

  async floorPriceOf(
    collectionMetadata: NftCollectionMetadata,
  ): Promise<NftCollectionFloorPrice> {
    const now = moment().unix();

    const transfers = await this.transfersOf(
      collectionMetadata.chainId,
      collectionMetadata.contractAddress,
      { afterTimestamp: now - 3600 },
    );

    let minValue = BigNumber.from(0);

    for (const transfer of transfers) {
      const value = transfer.value as BigNumber;

      if (!!value || value.isZero()) {
        continue;
      }

      if (value.gt(minValue)) {
        minValue = value;
      }
    }

    return {
      chainId: collectionMetadata.chainId,
      contractAddress: collectionMetadata.contractAddress,
      decimals: 18, // TODO: there is an assumption here that all chains we use have a native coin with 18 decimals
      price: minValue,
    };

    // TODO: disabling opensea for now, it is missing some of its own collection slugs
    if (false) {
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
  }

  async allCollectionsOf(
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<NftCollection[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const result = await this.moralisService.nftsOf(chainId, ownerAddress);

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
