import { RecordDto, BigNumberDto, ChainId } from '@app/sdk';

export interface CollectionRecord extends RecordDto {
  balance: BigNumberDto;
  balanceFiat?: BigNumberDto;
  chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  contractAddress: string;
  floorPrice?: {
    value?: number;
    display?: string;
  };
  floorPriceFiat?: {
    value?: number;
    display?: string;
  };
  floorPriceToken?: {
    contractAddress: string;
    name: string;
  };
  logo?: string;
  name: string;
  nfts?: {
    tokenId: string;
  }[];
  ownerAddresses: string[];
}
