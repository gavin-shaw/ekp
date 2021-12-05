import {
  BlockchainTokenService,
  CurrencyService,
  TokenBalance,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { morphism, StrictSchema } from 'morphism';
import { Token } from './token';

@Injectable()
export class PortfolioTokenService {
  constructor(
    private blockchainTokenService: BlockchainTokenService,
    private currencyService: CurrencyService,
  ) {}

  async getTokensWithBalances(walletAddress: string): Promise<Token[]> {
    validate([walletAddress], ['string']);

    const tokenBalances = await this.blockchainTokenService.getTokenBalances({
      chain: 'bsc', // TODO: support multiple chains,
      address: walletAddress,
    });

    const schema: StrictSchema<Token, TokenBalance> = {
      balance: (it) => Number(it.balance),
      chain: 'bsc',
      decimals: 'decimals',
      logo: 'logo',
      name: 'name',
      symbol: 'symbol',
      thumbnail: 'thumbnail',
      tokenAddress: 'address',
      walletAddress: () => walletAddress,
    };

    return morphism(schema, tokenBalances);
  }

  async addLogosToTokens(tokens: Token[]): Promise<Token[]> {
    validate([tokens], ['Array.<*>']);

    return await Promise.all(
      tokens.map(async (token) => ({
        ...token,
        logo: await this.currencyService.getImageUrl(token.tokenAddress),
      })),
    );
  }

  async addPricingToTokens(tokens: Token[], fiatId: string): Promise<Token[]> {
    validate([tokens, fiatId], ['Array.<*>', 'string']);

    const tokenAddresses = tokens.map((token) => token.tokenAddress);

    const currencyRates = await this.currencyService.fetchRates(
      tokenAddresses,
      fiatId,
    );

    return tokens.map((token) => {
      const currencyRate = currencyRates.find(
        (it) => it.coinAddress === token.tokenAddress,
      );

      return {
        ...token,
        coinLink: !!currencyRate?.coinId
          ? `https://www.coingecko.com/en/coins/${currencyRate?.coinId}`
          : undefined,
        fiatValue: this.currencyService.convertCurrency(
          token.balance,
          token.tokenAddress,
          fiatId,
          currencyRates,
        ),
        price: currencyRate?.rate,
      };
    });
  }
}
