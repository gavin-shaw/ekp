import {
  chainIds,
  chains,
  ClientStateDto,
  CurrencyDto,
  CoingeckoService,
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
    private coingeckoService: CoingeckoService,
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
          id: chainMetadata.id,
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

    const tokenRecordsWithCoinIds = await Promise.all(
      tokenRecords.map(async (tokenRecord) => ({
        ...tokenRecord,
        coinId: await this.coingeckoService.coinIdOf(
          tokenRecord.chain.id,
          tokenRecord.contractAddress,
        ),
      })),
    );

    const coinIds: string[] = tokenRecordsWithCoinIds.map((it) => it.coinId);

    const coinPrices = await this.coingeckoService.latestPricesOf(
      coinIds.filter((it) => !!it),
      currency.id,
    );

    return tokenRecordsWithCoinIds
      .map((token) => {
        const coinPrice = coinPrices.find(
          (it) => it.coinId.toLowerCase() === token.coinId,
        );

        let balanceFiatValue = undefined;

        if (!!coinPrice) {
          balanceFiatValue = coinPrice.price * token.balance.value;
        }

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
            token: !!token.coinId
              ? `https://www.coingecko.com/en/coins/${token.coinId}`
              : token.links.token,
          },
          price: {
            display: !!coinPrice
              ? formatters.currencyValue(coinPrice.price, currency.symbol)
              : '?',
            value: coinPrice?.price,
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
          (await this.coingeckoService.getImageUrl(token.coinId)) ??
          'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
      })),
    );
  }
}
