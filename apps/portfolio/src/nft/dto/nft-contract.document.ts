import { DocumentDto, ChainId } from '@app/sdk';

export interface NftContractDocument extends DocumentDto {
  readonly balance: number;
  readonly chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  readonly contractAddress: string;
  readonly price?: number;
  readonly priceFiat?: number;
  readonly logo?: string;
  readonly name: string;
  readonly nfts: {
    tokenId: string;
  }[];
  readonly ownerAddresses: string[];
  readonly fetchTimestamp?: number;
  readonly value?: number;
  readonly valueFiat?: number;
}
