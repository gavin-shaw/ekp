import { RecordDto } from '@app/sdk';
import { BigNumberDto } from './bignumber.dto';

export interface TokenRecord extends RecordDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: BigNumberDto;
  balanceFiat?: BigNumberDto;
  chain: {
    id: string;
    logo: string;
    name: string;
  };
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
