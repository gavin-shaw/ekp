import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import _ from 'lodash';
import { LimiterService } from '../limiter.service';
import { ChainId, logger } from '../utils';
import { CoinPrice } from './model/coin-price';
const BASE_URL = 'https://api.coingecko.com/api/v3';

interface GeckoCoin {
  id: string;
  symbol: string;
  platforms: { [name: string]: string };
}

@Injectable()
export class CoingeckoService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    limiterService: LimiterService,
  ) {
    this.limiter = limiterService.createLimiter('coingecko-limiter', 10);
  }

  limiter: Bottleneck;

  private platforms = {
    eth: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
  };

  coinIdOf(chainId: ChainId, contractAddress: string) {
    const platform = this.platforms[chainId];
    return this.allCoins.find(
      (geckoCoin) =>
        geckoCoin.platforms[platform] === contractAddress?.toLowerCase(),
    )?.id;
  }

  async getImageUrl(coinId: string): Promise<string> {
    validate([coinId], ['string']);
    const url = `${BASE_URL}/coins/${coinId}`;
    const cacheKey = `coingecko.imageUrl['${coinId}']`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            if (!coinId) {
              return null;
            }

            logger.debug('GET ' + url);

            const response = await axios.get(url);

            if (!response?.data) {
              throw new Error('Failed to fetch token image for: ' + coinId);
            }

            return response.data?.image?.small;
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${url}`),
          },
        ),
      { ttl: 3600000 },
    );
  }

  async latestPricesOf(
    coinIds: string[],
    fiatId: string,
  ): Promise<CoinPrice[]> {
    validate([coinIds, fiatId], ['Array.<string>', 'string']);

    const url = `${BASE_URL}/simple/price?ids=${coinIds.join()}&vs_currencies=${fiatId}`;

    return retry(
      async () =>
        await this.limiter.schedule(async () => {
          logger.debug('GET ' + url);

          const response = await axios.get(url);

          if (!response?.data) {
            throw new Error('Failed to fetch currency rates from coingecko');
          }

          return _.keys(response.data).map((coinId) => {
            return {
              id: `${coinId}_${fiatId}`,
              coinId: coinId,
              fiatId,
              price: response.data[coinId][fiatId.toLowerCase()],
            };
          });
        }),
      {
        onRetry: (error) =>
          logger.warn(`Retry due to ${error.message}: ${url}`),
      },
    );
  }

  private allCoins: GeckoCoin[];

  async onModuleInit() {
    this.allCoins = await this.fetchGeckoCoins();
  }

  private async fetchGeckoCoins(): Promise<GeckoCoin[]> {
    const url = `${BASE_URL}/coins/list?include_platform=true`;
    const cacheKey = 'coingecko.coins';

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          async () =>
            await this.limiter.schedule(async () => {
              logger.debug('GET ' + url);

              const response = await axios.get(url);

              if (!Array.isArray(response.data)) {
                throw new Error(`Could not retrieve coin list from coingecko`);
              }

              const geckoCoins = response.data.map((it) => ({
                id: it.id,
                symbol: it.symbol,
                platforms: it.platforms,
              }));

              return geckoCoins;
            }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${url}`),
          },
        ),
      { ttl: 3600000 },
    );
  }
}
