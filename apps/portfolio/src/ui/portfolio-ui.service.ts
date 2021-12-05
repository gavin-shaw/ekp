import { ClientStateDto, formatters } from '@app/sdk';
import { Injectable } from '@nestjs/common';
import moment from 'moment';
import morphism, { StrictSchema } from 'morphism';
import { TokenDto } from '../dto';
import { Token } from '../token';

@Injectable()
export class PortfolioUiService {
  async formatTokens(
    tokens: Token[],
    clientState: ClientStateDto,
  ): Promise<TokenDto[]> {
    const fiatSymbol = clientState.currency?.symbol ?? '$';

    const schema: StrictSchema<TokenDto, Token> = {
      allowBurnToken: (it) => isNaN(it.fiatValue),
      allowSwap: (it) => !isNaN(it.fiatValue),
      balance: 'balance',
      balanceFormatted: (it) =>
        formatters.tokenValue(it.balance) + ' ' + it.symbol,
      chainLogo: () =>
        'https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=014',
      decimals: 'decimals',
      fiatValue: 'fiatValue',
      fiatValueFormatted: (it) =>
        formatters.currencyValue(it.fiatValue, fiatSymbol),
      logo: (it) =>
        it.logo ??
        'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
      name: 'name',
      price: 'price',
      priceFormatted: (it) => formatters.currencyValue(it.price, fiatSymbol),
      swapLink: (it) =>
        `https://poocoin.app/swap?inputCurrency=${it.tokenAddress}`,
      symbol: 'symbol',
      tokenAddress: 'tokenAddress',
      tokenLink: (it) => `https://bscscan.com/token/${it.tokenAddress}`,
      walletAddress: 'walletAddress',
      walletTokenLink: (it) =>
        `https://bscscan.com/token/${it.tokenAddress}?a=${clientState.walletAddress}`,
    };

    return morphism(schema, tokens);
  }
}
