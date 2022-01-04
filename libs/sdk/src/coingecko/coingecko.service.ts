import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import _ from 'lodash';
import moment from 'moment';
import { LimiterService } from '../limiter.service';
import { ChainId, logger } from '../util';
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
    this.limiter = limiterService.createLimiter('coingecko-limiter', {
      minTime: 250,
      maxConcurrent: 25,
      reservoir: 50,
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60000,
    });
  }

  limiter: Bottleneck;

  private platforms = {
    eth: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
  };

  coinIdOf(chainId: ChainId, contractAddress: string) {
    validate([chainId, contractAddress], ['string', 'string']);
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

  async historicPriceOf(
    coinId: string,
    fiatId: string,
    date: string,
  ): Promise<CoinPrice> {
    validate([coinId, fiatId, date], ['string', 'string', 'string']);

    const url = `${BASE_URL}/coins/${coinId}/history?date=${date}`;
    const cacheKey = `coingecko.historicPriceOf['${coinId}']['${fiatId}']['${date}']`;

    const cachedValues = this.cache.get(cacheKey);
    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug('GET ' + url);

            const response = await axios.get(url);

            if (!response?.data) {
              throw new Error('Failed to fetch currency rates from coingecko');
            }

            if (!response.data?.market_data?.current_price[fiatId]) {
              return null;
            }

            const id = `${coinId}_${fiatId}_${date}`;

            const price = response.data.market_data.current_price[fiatId];

            return {
              id,
              coinId,
              fiatId,
              price,
            };
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${url}`),
          },
        ),
      {
        ttl: 0,
      },
    );
  }

  async dailyPricesOf(coinId: string, fiatId: string): Promise<CoinPrice[]> {
    validate([coinId, fiatId], ['string', 'string']);

    const cacheKey = `coingecko.dailyPricesOf['${coinId}']['${fiatId}']`;

    const cachedValues: CoinPrice[] = await this.cache.get(cacheKey);

    let from = 1262044800; //Tuesday, 29 December 2009 00:00:00
    const to = moment().unix();

    if (Array.isArray(cachedValues)) {
      if (cachedValues.length === 0) {
        return cachedValues;
      }
      from = _.chain(cachedValues).map('timestamp').max().value();
    }

    if (from > moment().startOf('day').unix()) {
      return cachedValues;
    }

    const url = `${BASE_URL}/coins/${coinId}/market_chart/range?vs_currency=${fiatId}&from=${from}&to=${to}`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug('GET ' + url);

            const response = await axios.get(url);

            if (!response?.data) {
              throw new Error('Failed to fetch currency rates from coingecko');
            }

            const prices: number[][] = response.data?.prices;

            if (!prices) {
              return cachedValues ?? [];
            }

            const newCoinPrices = _.chain(prices)
              .map(
                ([timestamp, price]) =>
                  <CoinPrice>{
                    id: `${coinId}_${fiatId}_${Math.floor(timestamp / 1000)}`,
                    coinId,
                    fiatId,
                    timestamp: Math.floor(timestamp / 1000),
                    price,
                  },
              )
              .value();

            return [...(cachedValues ?? []), ...newCoinPrices];
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${url}`),
          },
        ),
      {
        ttl: 0,
      },
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
