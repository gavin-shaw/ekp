import { DocumentDto } from '@app/sdk';

export interface NftPnlSummaryDocument extends DocumentDto {
  readonly chainId: string;
  readonly chainLogo: string;
  readonly chainName: string;
  readonly chainSymbol: string;
  readonly costBasisFiat: number;
  readonly fiatSymbol: string;
  readonly links: {
    readonly details: string;
  };
  readonly nftCollectionId: string;
  readonly nftCollectionLogo: string;
  readonly nftCollectionName: string;
  readonly nftCollectionSymbol: string;
  readonly realizedGainFiat: number;
  readonly realizedGainPc: number;
  readonly realizedValueFiat: number;
  readonly unrealizedCostFiat: number;
}
