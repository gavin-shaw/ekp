import { DocumentDto } from '@app/sdk';

export interface NftPnlEventDocument extends DocumentDto {
  readonly blockNumber: number;
  readonly blockTimestamp: number;
  readonly chainId: string;
  readonly chainLogo: string;
  readonly chainName: string;
  readonly costBasisFiat: number;
  readonly description: string;
  readonly fromAddress: string;
  readonly gasNativeToken: number;
  readonly gasFiat: number;
  readonly icon: string;
  readonly links: {
    readonly explorer: string;
  };
  readonly nativeTokenPrice: number;
  readonly nativeTokenSymbol: string;
  readonly nftLogo: string;
  readonly nftCollectionAddress: string;
  readonly nftCollectionId: string;
  readonly nftCollectionLogo: string;
  readonly nftCollectionName: string;
  readonly nftCollectionSymbol: string;
  readonly nftPriceToken: number;
  readonly nftPriceFiat: number;
  readonly realizedGainFiat: number;
  readonly realizedGainPc: number;
  readonly realizedValueFiat: number;
  readonly saleTokenPrice: number;
  readonly saleTokenSymbol: string;
  readonly toAddress: string;
  readonly tokenId: string;
  readonly unrealizedCostFiat: number;
}
