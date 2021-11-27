import { Injectable } from '@nestjs/common';
import axios from 'axios';
import _ from 'lodash';
import { cacheable } from '../cache.decorator';
import { CurrencyRate } from './model/currency-rate';
const BASE_URL = 'https://api.coingecko.com/api/v3';

interface GeckoCoin {
  id: string;
  symbol: string;
  platforms: { [name: string]: string };
}

@Injectable()
export class CurrencyService {
  @cacheable(3600)
  async fetchGeckoCoins(): Promise<GeckoCoin[]> {
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
  }

  static WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

  @cacheable(300)
  async fetchRates(
    coinAddresses: string[],
    fiatSymbol: string,
    platform = 'binance-smart-chain',
  ): Promise<CurrencyRate[]> {
    const geckoCoins = await this.fetchGeckoCoins();

    coinAddresses.push(CurrencyService.WBNB_ADDRESS);

    const coinIds = coinAddresses
      .map(
        (address) =>
          geckoCoins.find(
            (geckoCoin) =>
              geckoCoin.platforms[platform] === address?.toLowerCase(),
          )?.id,
      )
      .filter((id) => !!id);

    const response = await axios.get(
      `${BASE_URL}/simple/price?ids=${coinIds.join()}&vs_currencies=${fiatSymbol}`,
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
        id: `${id}_${fiatSymbol}`,
        coinAddress: address,
        coinId: id,
        fiatSymbol: fiatSymbol,
        rate: response.data[id][fiatSymbol.toLowerCase()],
      };
    });

    return currencies;
  }

  async convertCurrency(
    value: number,
    coinAddress: string,
    fiatSymbol: string,
    currencies: CurrencyRate[],
  ): Promise<number> {
    const currency = currencies.find(
      (c) =>
        c.coinAddress.toLowerCase() === coinAddress.toLowerCase() &&
        c.fiatSymbol === fiatSymbol,
    );

    if (!currency?.rate) {
      return undefined;
    }

    return value * currency.rate;
  }
}
