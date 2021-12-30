import { DocumentDto } from '@app/sdk';

export interface TokenStatsDocument extends DocumentDto {
  fiatSymbol: string;
  totalValue: number;
}
