import { DocumentDto, ChainId } from '@app/sdk';

export interface NftContractDocument extends DocumentDto {
  readonly balance: number;
  readonly chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  readonly contractAddress: string;
  readonly fetchTimestamp?: number;
  readonly fiatSymbol: string;
  readonly links: { token: string };
  readonly logo?: string;
  readonly name: string;
  readonly nfts: { tokenId: string }[];
  readonly ownerAddresses: string[];
  readonly price?: any;
  readonly priceFiat?: any;
  readonly priceSymbol: any;
  readonly rateFiat?: number;
  readonly value?: any;
  readonly valueFiat?: any;
}
