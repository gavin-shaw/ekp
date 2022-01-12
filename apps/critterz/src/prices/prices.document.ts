import { DocumentDto } from '@app/sdk';

export interface PricesDocument extends DocumentDto {
  readonly blockPrice: number;
  readonly scritterzPrice: number;
  readonly fiatSymbol: number;
}
