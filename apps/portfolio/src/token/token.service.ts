import {
  chainIds,
  chains,
  ClientStateDto,
  CurrencyDto,
  CurrencyService,
  EvmTokenService,
  formatters,
  TokenBalance,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { TokenRecord } from './dtos';
@Injectable()
export class TokenService {
  constructor(
    private evmTokenService: EvmTokenService,
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
    ownerAddresses: string[],
  ): Promise<TokenRecord[]> {
    validate([ownerAddresses], ['Array.<string>']);

    if (ownerAddresses.length === 0) {
      return [];
    }

    const requestPromises = [];

    for (const chainId of chainIds) {
      for (const ownerAddress of ownerAddresses) {
        requestPromises.push(
          this.evmTokenService.allBalancesOf(chainId, ownerAddress),
        );
      }
    }

    const tokenBalances: TokenBalance[] = _.flatten(
      await Promise.all(requestPromises),
    );

    const tokensById = _.groupBy(
      tokenBalances,
      (tokenBalance) =>
        `${tokenBalance.chainId}_${tokenBalance.contractAddress}`,
    );

    const now = moment().unix();

    return Object.entries(tokensById).map(([id, tokens]) => {
      const balanceValue = _.sumBy(tokens, (token) =>
        Number(ethers.utils.formatUnits(token.balance, token.decimals)),
      );
      const chainMetadata = chains[tokens[0].chainId];

      return {
        id,
        created: now,
        updated: now,
        balance: {
          display: formatters.tokenValue(balanceValue),
          value: balanceValue,
        },
        chain: {
          id: chainMetadata.chainId,
          logo: chainMetadata.logo,
          name: chainMetadata.name,
        },
        contractAddress: tokens[0].contractAddress,
        decimals: tokens[0].decimals,
        links: {
          swap: `https://poocoin.app/swap?inputCurrency=${tokens[0].contractAddress}`,
          token: `https://bscscan.com/token/${tokens[0].contractAddress}`,
        },
        logo: tokens[0].logo,
        name: tokens[0].name,
        owners: tokens.map((token) => token.ownerAddress),
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

    return tokenRecords
      .map((token) => {
        const currencyRate = currencyRates.find(
          (it) =>
            it.coinAddress.toLowerCase() ===
            token.contractAddress.toLowerCase(),
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
            display: formatters.currencyValue(
              balanceFiatValue,
              currency.symbol,
            ),
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
      })
      .filter((it) => !isNaN(it.balanceFiat.value));
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
