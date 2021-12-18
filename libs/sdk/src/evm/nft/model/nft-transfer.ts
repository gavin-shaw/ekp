import { ChainId } from '../../utils';
import { BigNumber } from 'ethers';

export interface NftTransfer {
  readonly amount?: number;
  readonly blockNumber: number;
  readonly blockTimestamp: number;
  readonly chainId: ChainId;
  readonly contractAddress: string;
  readonly fromAddress?: string;
  readonly toAddress?: string;
  readonly tokenId: number;
  readonly transactionHash: string;
  readonly value: BigNumber;
}
