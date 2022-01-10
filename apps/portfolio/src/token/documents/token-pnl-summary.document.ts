import { DocumentDto } from '@app/sdk';

export interface TokenPnlSummaryDocument extends DocumentDto {
  readonly chainId: string;
  readonly chainLogo: string;
  readonly chainName: string;
  readonly costBasisFiat: number;
  readonly fiatSymbol: string;
  readonly links: {
    readonly details: string;
  };
  readonly realizedGainFiat: number;
  readonly realizedGainPc: number;
  readonly realizedValueFiat: number;
  readonly tokenLogo: string;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly unrealizedCostFiat: number;
}
