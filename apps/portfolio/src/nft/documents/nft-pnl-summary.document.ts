import { DocumentDto } from '@app/sdk';

export interface NftPnlSummaryDocument extends DocumentDto {
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
  readonly nftCollection: {
    readonly contractId: string;
    readonly logo: string;
    readonly name: string;
    readonly symbol: string;
  };
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly unrealizedCost: number;
}
