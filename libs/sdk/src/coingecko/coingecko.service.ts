import { Injectable } from '@nestjs/common';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import _ from 'lodash';
import { cacheable } from '../cacheable.decorator';
import { ChainId } from '../evm';
import { logger } from '../utils';
import { CoinPrice } from './model/coin-price';
import retry from 'async-retry';
const BASE_URL = 'https://api.coingecko.com/api/v3';

interface GeckoCoin {
  id: string;
  symbol: string;
  platforms: { [name: string]: string };
}

const limiter = new Bottleneck({
  maxConcurrent: 10,
  reservoir: 10,
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: 1000,
});

@Injectable()
export class CoingeckoService {
  private platforms = {
    eth: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
  };

  private allCoins: GeckoCoin[];

  async onModuleInit() {
    this.allCoins = await this.fetchGeckoCoins();
  }

  async coinIdOf(chainId: ChainId, contractAddress: string) {
    const platform = this.platforms[chainId];
    return this.allCoins.find(
      (geckoCoin) =>
        geckoCoin.platforms[platform] === contractAddress?.toLowerCase(),
    )?.id;
  }

  private async fetchGeckoCoins(): Promise<GeckoCoin[]> {
    const url = `${BASE_URL}/coins/list?include_platform=true`;

    return retry(
      async () =>
        await limiter.schedule(async () => {
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
    );
  }

  @cacheable(3600)
  async getImageUrl(coinId: string) {
    validate([coinId], ['string']);
    const url = `${BASE_URL}/coins/${coinId}`;

    return retry(
      async () =>
        await limiter.schedule(async () => {
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
    );
  }

  @cacheable(300)
  async latestPricesOf(
    coinIds: string[],
    fiatId: string,
  ): Promise<CoinPrice[]> {
    validate([coinIds, fiatId], ['Array.<string>', 'string']);

    const url = `${BASE_URL}/simple/price?ids=${coinIds.join()}&vs_currencies=${fiatId}`;

    return retry(
      async () =>
        await limiter.schedule(async () => {
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
}
