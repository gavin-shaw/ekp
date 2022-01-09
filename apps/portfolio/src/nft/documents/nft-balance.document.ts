import { DocumentDto } from '@app/sdk';

export interface NftBalanceDocument extends DocumentDto {
  readonly balanceFiat: number;
  readonly balanceNfts: number;
  readonly chainId: string;
  readonly chainLogo: string;
  readonly chainName: string;
  readonly fiatSymbol: string;
  readonly links: { explorer: string; details: string };
  readonly nftPrice: number;
  readonly saleTokenPrice: number;
  readonly saleTokenSymbol: string;
  readonly nftCollectionAddress: string;
  readonly nftCollectionLogo: string;
  readonly nftCollectionName: string;
  readonly nftCollectionSymbol: string;
}
