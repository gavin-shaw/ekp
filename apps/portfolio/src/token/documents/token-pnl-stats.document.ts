import { DocumentDto } from '@app/sdk';

export interface TokenPnlStatsDocument extends DocumentDto {
  fiatSymbol: string;
  costBasis: number;
  realizedValue: number;
  realizedGain: number;
}
