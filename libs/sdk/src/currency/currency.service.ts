import { Injectable } from '@nestjs/common';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import _ from 'lodash';
import { cacheable } from '../cacheable.decorator';
import { CurrencyRate } from './model/currency-rate';
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
export class CurrencyService {
  @cacheable(3600)
  private async fetchGeckoCoins(): Promise<GeckoCoin[]> {
    return await limiter.schedule(async () => {
      const url = `${BASE_URL}/coins/list?include_platform=true`;
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
    });
  }

  static WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

  @cacheable(300)
  async getImageUrl(tokenAddress: string, platform = 'binance-smart-chain') {
    validate([tokenAddress], ['string']);

    return await limiter.schedule(async () => {
      const geckoCoins = await this.fetchGeckoCoins();

      const coinId = geckoCoins.find(
        (geckoCoin) =>
          geckoCoin.platforms[platform] === tokenAddress?.toLowerCase(),
      )?.id;

      if (!coinId) {
        return undefined;
      }

      const response = await axios.get(`${BASE_URL}/coins/${coinId}`);

      if (!response?.data) {
        throw new Error('Failed to fetch token image for: ' + tokenAddress);
      }

      return response.data?.image?.small;
    });
  }

  @cacheable(300)
  async fetchRates(
    tokenAddresses: string[],
    fiatId: string,
    platform = 'binance-smart-chain',
  ): Promise<CurrencyRate[]> {
    validate(
      [tokenAddresses, fiatId, platform],
      ['Array.<string>', 'string', 'string'],
    );

    // TODO: how to make this multichain?

    return await limiter.schedule(async () => {
      const geckoCoins = await this.fetchGeckoCoins();

      tokenAddresses.push(CurrencyService.WBNB_ADDRESS);

      const coinIds = tokenAddresses
        .map(
          (address) =>
            geckoCoins.find(
              (geckoCoin) =>
                geckoCoin.platforms[platform] === address?.toLowerCase(),
            )?.id,
        )
        .filter((id) => !!id);

      const response = await axios.get(
        `${BASE_URL}/simple/price?ids=${coinIds.join()}&vs_currencies=${fiatId}`,
      );

      if (!response?.data) {
        throw new Error('Failed to fetch currency rates from coingecko');
      }

      const currencies = _.keys(response.data).map((id) => {
        const address = geckoCoins.find((geckoCoin) => geckoCoin.id === id)
          ?.platforms[platform];

        if (!address) {
          return undefined;
        }

        return {
          id: `${id}_${fiatId}`,
          coinAddress: address,
          coinId: id,
          fiatId,
          rate: response.data[id][fiatId.toLowerCase()],
        };
      });

      return currencies;
    });
  }

  convertCurrency(
    value: number,
    tokenAddress: string,
    fiatId: string,
    currencyRates: CurrencyRate[],
  ): number {
    const currency = currencyRates.find(
      (c) =>
        c.coinAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        c.fiatId === fiatId,
    );

    if (!currency?.rate) {
      return undefined;
    }

    return value * currency.rate;
  }
}
