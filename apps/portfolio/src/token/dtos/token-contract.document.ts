import { DocumentDto, ChainId } from '@app/sdk';

export interface TokenContractDocument extends DocumentDto {
  readonly allowBurnToken?: boolean;
  readonly allowSwap?: boolean;
  readonly balance: number;
  readonly chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  readonly coinId?: string;
  readonly contractAddress: string;
  readonly decimals: number;
  readonly links: {
    swap: string;
    token: string;
  };
  readonly logo?: string;
  readonly name: string;
  readonly priceFiat?: number;
  readonly rpc?: {
    burnTokenBalance: {
      [key: string]: any;
    };
  };
  readonly symbol: string;
  readonly valueFiat?: any;
}
