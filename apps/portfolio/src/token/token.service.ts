import {
  BlockchainTokenService,
  ClientStateDto,
  CurrencyDto,
  CurrencyService,
  formatters,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { TokenRecord } from './dtos';

@Injectable()
export class TokenService {
  constructor(
    private blockchainTokenService: BlockchainTokenService,
    private currencyService: CurrencyService,
  ) {}

  async getAllTokens(clientState: ClientStateDto): Promise<TokenRecord[]> {
    validate([clientState], ['object']);

    if (!Array.isArray(clientState.watchedAddresses)) {
      return [];
    }

    validate([clientState.client?.currency], ['object']);

    const tokensWithBalances = await this.getTokensWithBalances(
      clientState.watchedAddresses,
    );

    const tokensWithPrices = await this.addTokenPrices(
      tokensWithBalances,
      clientState.client.currency,
    );

    const tokensWithLogos = await this.addTokenLogos(tokensWithPrices);

    return tokensWithLogos;
  }

  private async getTokensWithBalances(
    addresses: string[],
  ): Promise<TokenRecord[]> {
    validate([addresses], ['Array.<string>']);

    if (addresses.length === 0) {
      return [];
    }

    const tokenBalances = _.flatten(
      await Promise.all(
        addresses.map((address) =>
          this.blockchainTokenService.getTokenBalances({
            chain: 'bsc', // TODO: support multiple chains,
            address,
          }),
        ),
      ),
    );

    const tokensByAddress = _.groupBy(tokenBalances, 'address');

    const now = moment().unix();

    return Object.entries(tokensByAddress).map(([address, tokens]) => {
      const balanceValue = _.sumBy(tokens, (token) => Number(token.balance));
      return {
        id: address,
        created: now,
        updated: now,
        balance: {
          display: formatters.tokenValue(balanceValue),
          value: balanceValue,
        },
        chain: {
          id: 'bsc',
          logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=014',
          name: 'Binance Smart Chain',
        },
        contractAddress: address,
        decimals: tokens[0].decimals,
        links: {
          swap: `https://poocoin.app/swap?inputCurrency=${address}`,
          token: `https://bscscan.com/token/${address}`,
        },
        logo: tokens[0].logo,
        name: tokens[0].name,
        owners: tokens.map((token) => token.owner),
        symbol: tokens[0].symbol,
      };
    });
  }

  private async addTokenPrices(
    tokenRecords: TokenRecord[],
    currency: CurrencyDto,
  ): Promise<TokenRecord[]> {
    validate([tokenRecords, currency], ['Array.<object>', 'object']);

    const contractAddresses = tokenRecords.map(
      (token) => token.contractAddress,
    );

    const currencyRates = await this.currencyService.fetchRates(
      contractAddresses,
      currency.id,
    );

    return tokenRecords.map((token) => {
      const currencyRate = currencyRates.find(
        (it) =>
          it.coinAddress.toLowerCase() === token.contractAddress.toLowerCase(),
      );

      const balanceFiatValue = this.currencyService.convertCurrency(
        token.balance.value,
        token.contractAddress,
        currency.id,
        currencyRates,
      );

      return {
        ...token,
        allowSwap: !isNaN(balanceFiatValue),
        allowBurnToken: isNaN(balanceFiatValue),
        balanceFiat: {
          display: formatters.currencyValue(balanceFiatValue, currency.symbol),
          value: balanceFiatValue,
        },
        links: {
          ...token.links,
          token: !!currencyRate?.coinId
            ? `https://www.coingecko.com/en/coins/${currencyRate?.coinId}`
            : token.links.token,
        },
        price: {
          display: formatters.currencyValue(
            currencyRate?.rate,
            currency.symbol,
          ),
          value: currencyRate?.rate,
        },
      };
    });
  }

  private async addTokenLogos(tokenRecords: TokenRecord[]) {
    validate([tokenRecords], ['Array.<object>']);

    return await Promise.all(
      tokenRecords.map(async (token) => ({
        ...token,
        logo:
          (await this.currencyService.getImageUrl(token.contractAddress)) ??
          'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
      })),
    );
  }
}
