import { BigNumber } from 'ethers';
import { ChainId } from '../../utils';

export interface NftCollectionFloorPrice {
  readonly chainId: ChainId;
  readonly contractAddress: string;
  readonly coinId?: string;
  readonly decimals: number;
  readonly price: BigNumber;
}
