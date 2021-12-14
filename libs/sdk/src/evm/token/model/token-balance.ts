import { BigNumber } from 'ethers';
import { ChainId } from '../../utils';

export interface TokenBalance {
  readonly contractAddress: string;
  readonly balance: BigNumber;
  readonly chainId: ChainId;
  readonly decimals: number;
  readonly logo: string;
  readonly name: string;
  readonly ownerAddress: string;
  readonly symbol: string;
}
