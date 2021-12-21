import { DocumentDto, BigNumberDto, ChainId } from '@app/sdk';

export interface TokenRecord extends DocumentDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: BigNumberDto;
  balanceFiat?: BigNumberDto;
  chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  coinId?: string;
  contractAddress: string;
  decimals: number;
  links: {
    swap: string;
    token: string;
  };
  logo?: string;
  name: string;
  owners: string[];
  price?: BigNumberDto;
  rpc?: {
    burnTokenBalance: {
      [key: string]: any;
    };
  };
  symbol: string;
}
