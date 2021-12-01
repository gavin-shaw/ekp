import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import morphism, { StrictSchema } from 'morphism';
import { TokenDto } from '../gateway';
import { Token } from '../token';
import { CurrencyService, ClientStateDto } from '@app/sdk';

@Injectable()
export class PortfolioUiService {
  constructor(private currencyService: CurrencyService) {}

  async formatTokens(
    tokens: Token[],
    clientState: ClientStateDto,
  ): Promise<TokenDto[]> {
    const fiatId = clientState.currency?.id ?? 'usd';

    const schema: StrictSchema<TokenDto, Token> = {
      balance: 'balance',
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

    return tokenDtosWithFiatValues;
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

    return tokens.map((token) => ({
      ...token,
      fiatValue: this.currencyService.convertCurrency(
        token.balance,
        token.tokenAddress,
        fiatId,
        currencyRates,
      ),
    }));
  }
}
