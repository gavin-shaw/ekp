import { DocumentDto } from '@app/sdk';

export interface PricesDocument extends DocumentDto {
  readonly blockPrice: number;
  readonly fiatSymbol: string;
  readonly scritterzPrice: number;
}
