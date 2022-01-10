import { DocumentDto } from '@app/sdk';

export interface TokenPnlEventDocument extends DocumentDto {
  readonly amountToken: number;
  readonly amountFiat: number;
  readonly blockNumber: number;
  readonly blockTimestamp: number;
  readonly chainId: string;
  readonly chainLogo: string;
  readonly chainName: string;
  readonly costBasisFiat: number;
  readonly description: string;
  readonly fiatSymbol: string;
  readonly gasNativeToken: number;
  readonly gasFiat: number;
  readonly icon: string;
  readonly links: {
    readonly explorer: string;
  };
  readonly nativeTokenPrice: number;
  readonly nativeTokenSymbol: string;
  readonly realizedGainFiat: number;
  readonly realizedGainPc: number;
  readonly realizedValueFiat: number;
  readonly tokenAddress: string;
  readonly tokenLogo: string;
  readonly tokenName: string;
  readonly tokenPrice: number;
  readonly tokenSymbol: string;
  readonly unrealizedCostFiat: number;
}
