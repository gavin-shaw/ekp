import { DocumentDto } from '@app/sdk';

export interface TokenPnlEvent extends DocumentDto {
  readonly blockNumber: number;
  readonly chain: {
    readonly id: string;
    readonly logo: string;
    readonly name: string;
  };
  // TODO: make this DRY, it is also used when constructing the document
  readonly costBasis: {
    fiat: number;
    token: number;
  };
  readonly description: string;
  readonly gas: number;
  readonly gasFiat: number;
  readonly fiatSymbol: string;
  readonly links: {
    readonly transaction: string;
  };
  readonly nativePrice: number; // TODO: normalize use of price vs fiat vs rate
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly timestamp: number;
  // TODO: make this DRY, token details are used in many locations
  readonly token: {
    readonly address: string;
    readonly coinId: string;
    readonly decimals: number;
    readonly logo: string;
    readonly name: string;
    readonly symbol: string;
  };
  readonly tokenPrice: number;
  readonly unrealizedCost: number;
  readonly value: number;
  readonly valueFiat: number;
}
