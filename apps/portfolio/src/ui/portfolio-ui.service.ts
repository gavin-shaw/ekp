import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import morphism, { StrictSchema } from 'morphism';
import { TokenDto } from '../gateway';
import { Token } from '../token';
import { CurrencyService, ClientStateDto, formatters } from '@app/sdk';

@Injectable()
export class PortfolioUiService {
  constructor(private currencyService: CurrencyService) {}

  async formatTokens(
    tokens: Token[],
    clientState: ClientStateDto,
  ): Promise<TokenDto[]> {
    const fiatId = clientState.currency?.id ?? 'usd';
    const fiatSymbol = clientState.currency?.symbol ?? '$';

    const schema: StrictSchema<TokenDto, Token> = {
      balance: 'balance',
      balanceFormatted: {
        path: 'balance',
        fn: (value) => formatters.tokenValue(value),
      },
      fiatValue: 'fiatValue',
      name: 'name',
      symbol: 'symbol',
      tokenAddress: 'tokenAddress',
      walletAddress: 'walletAddress',
    };

    const tokenDtos: TokenDto[] = morphism(schema, tokens);

    const tokenDtosWithFiatValues = await this.addFiatValuesToTokens(
      tokenDtos,
      fiatId,
    );

    return tokenDtosWithFiatValues.map((it) => {
      const tokenDto: TokenDto = {
        ...it,
        allowBurnToken: isNaN(it.fiatValue),
        allowSwap: !isNaN(it.fiatValue),
        description: `${it.balanceFormatted} ${it.symbol}`,
        fiatValueFormatted: formatters.currencyValue(it.fiatValue, fiatSymbol),
        swapLink: `https://poocoin.app/swap?inputCurrency=${it.tokenAddress}`,
        tokenLink: `https://bscscan.com/token/${it.tokenAddress}`,
        walletTokenLink: `https://bscscan.com/token/${it.tokenAddress}?a=${clientState.walletAddress}`,
      };
      return tokenDto;
    });
  }

  private async addFiatValuesToTokens(
    tokens: TokenDto[],
    fiatId: string,
  ): Promise<TokenDto[]> {
    validate([tokens, fiatId], ['Array.<*>', 'string']);

    const tokenAddresses = tokens.map((token) => token.tokenAddress);

    const currencyRates = await this.currencyService.fetchRates(
      tokenAddresses,
      fiatId,
    );

    return tokens.map((token) => {
      const coinId = currencyRates.find(
        (it) => it.coinAddress === token.tokenAddress,
      )?.coinId;

      return {
        ...token,
        coinLink: !!coinId
          ? `https://www.coingecko.com/en/coins/${coinId}`
          : undefined,
        fiatValue: this.currencyService.convertCurrency(
          token.balance,
          token.tokenAddress,
          fiatId,
          currencyRates,
        ),
      };
    });
  }
}
