import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import _ from 'lodash';
import moment from 'moment';
import { Repository } from 'typeorm';
import { Currency } from './entity/currency.entity';

const BASE_URL = 'https://api.coingecko.com/api/v3';

interface GeckoCoin {
  id: string;
  symbol: string;
  platforms: { [name: string]: string };
}

@Injectable()
export class CurrencyService {
  private geckoCoins: GeckoCoin[];

  constructor(
    @InjectRepository(Currency)
    private currencyRepository: Repository<Currency>,
  ) {}

  async updateGeckoCoins() {
    if (!!this.geckoCoins) {
      return;
    }

    const url = `${BASE_URL}/coins/list?include_platform=true`;
    const response = await axios.get(url);

    if (!Array.isArray(response.data)) {
      throw new Error(`Could not retrieve coin list from coingecko`);
    }

    this.geckoCoins = response.data.map((it) => ({
      id: it.id,
      symbol: it.symbol,
      platforms: it.platforms,
    }));
  }

  static WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

  async updateCurrencies(
    coinAddresses: string[],
    fiatSymbol: string,
    platform = 'binance-smart-chain',
  ): Promise<Currency[]> {
    await this.updateGeckoCoins();

    coinAddresses.push(CurrencyService.WBNB_ADDRESS);

    const coinIds = coinAddresses
      .map(
        (address) =>
          this.geckoCoins.find(
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
      const currency = new Currency();
      const address = this.geckoCoins.find((geckoCoin) => geckoCoin.id === id)
        ?.platforms[platform];

      if (!address) {
        return undefined;
      }

      currency.id = `${id}_${fiatSymbol}`;
      currency.coinAddress = address;
      currency.coinId = id;
      currency.fiatSymbol = fiatSymbol;
      currency.created = moment().unix();
      currency.updated = moment().unix();
      currency.rate = response.data[id][fiatSymbol];
      console.log(response.data[id]);
      return currency;
    });

    await this.currencyRepository.save(currencies);

    console.log(currencies);
    return currencies;
  }
}
