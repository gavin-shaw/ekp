import { RecordDto, BigNumberDto } from '@app/sdk';

export interface CollectionRecord extends RecordDto {
  balance: BigNumberDto;
  balanceFiat?: BigNumberDto;
  chain: {
    id: string;
    logo: string;
    name: string;
  };
  contractAddress: string;
  floorPrice?: BigNumberDto;
  floorPriceFiat?: BigNumberDto;
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
