import { DocumentDto, TokenMetadata } from '@app/sdk';

export interface TokenPnlSummaryDocument extends DocumentDto {
  readonly chain: {
    readonly id: string;
    readonly logo: string;
    readonly name: string;
  };
  readonly costBasis: number;
  readonly fiatSymbol: string;
  readonly links: {
    readonly details: string;
  };
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly token: TokenMetadata;
}
