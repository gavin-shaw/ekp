import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import Moralis from 'moralis/node';
import { logger } from '../utils';
import { ChainList, NftOwner, NftTransfer } from './model';

const BASE_URL = 'https://deep-index.moralis.io/api/v2';

@Injectable()
export class MoralisService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  limiter = new Bottleneck({
    minTime: 250,
    maxConcurrent: 8,
  });

  async nftsOf(chainId: ChainList, ownerAddress: string): Promise<NftOwner[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftsByOwner['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTs('${chainId}', '${ownerAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getNFTs({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.result?.map((nft) => ({
              ...nft,
              chain_id: chainId,
            }));
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 5000,
      },
    );
  }

  async nftMetadataOf(chainId: ChainList, contractAddress: string) {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.metadata['${chainId}']['${contractAddress}']`;

    const debugMessage = `Web3API > getNFTMetadata('${chainId}', '${contractAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            return await Moralis.Web3API.token.getNFTMetadata({
              address: contractAddress,
              chain: chainId,
            });
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      { ttl: 3600000 },
    );
  }

  async nextTransfersOf(
    chainId: ChainList,
    contractAddress: string,
    cursor?: string,
  ): Promise<{ cursor: string; transfers: NftTransfer[] }> {
    validate(
      [chainId, contractAddress, cursor],
      ['string', 'string', 'string='],
    );

    if (!process.env.MORALIS_API_KEY) {
      throw new Error('Environment variable MORALIS_API_KEY is required');
    }

    let url = `${BASE_URL}/nft/${contractAddress}/transfers?chain=${chainId}&format=decimal`;

    if (!!cursor) {
      url += `&cursor=${cursor}`;
    }

    const debugMessage = `GET ${url}`;

    return retry(
      this.limiter.wrap(async () => {
        logger.debug(debugMessage);

        const response = await axios.get(url, {
          headers: {
            'X-API-Key': process.env.MORALIS_API_KEY,
          },
        });

        if (!response?.data) {
          return undefined;
        }

        return {
          cursor: response.data.cursor,
          transfers: response.data.result?.map((it: NftTransfer) => ({
            ...it,
            chain_id: chainId,
          })),
        };
      }),
      {
        onRetry: (error) =>
          logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
      },
    );
  }

  async nftContractTransfersOf(
    chainId: ChainList,
    contractAddress: string,
    cursor?: string,
  ): Promise<{ cursor: string; transfers: NftTransfer[] }> {
    const transfers: NftTransfer[] = [];

    // Uncached, use cursor instead

    let nextCursor = cursor;

    while (true) {
      const url =
        `${BASE_URL}/nft/${contractAddress}/transfers?chain=${chainId}&format=decimal` +
        (!nextCursor ? '' : `&cursor=${nextCursor}`);

      const transfersResponse = await retry(
        this.limiter.wrap(async () => {
          logger.debug(`GET ${url}`);

          return axios.get(url, {
            headers: {
              'X-API-Key': process.env.MORALIS_API_KEY,
            },
          });
        }),
        {
          onRetry: (error) =>
            logger.warn(`Retry due to ${error.message}: ${url}`),
        },
      );
      const data = transfersResponse?.data;

      if (!data || !data.cursor) {
        return {
          cursor: nextCursor,
          transfers,
        };
      }

      nextCursor = data.cursor;

      const newTransfers = transfersResponse?.data?.result;

      if (!Array.isArray(newTransfers) || newTransfers.length === 0) {
        return {
          cursor: nextCursor,
          transfers,
        };
      }

      transfers.push(data.result);
    }
  }
}
