import { DocumentDto } from '@app/sdk';

export interface TokenPnlSummary extends DocumentDto {
  readonly chain: {
    readonly id: string;
    readonly logo: string;
    readonly name: string;
  };
  readonly costBasis: {
    readonly token: number;
    readonly fiat: number;
  };
  readonly links: {
    readonly pnlDetails: string;
  };
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly token: {
    readonly address: string;
    readonly coinId: string;
    readonly decimals: number;
    readonly logo: string;
    readonly name: string;
    readonly symbol: string;
  };
}
