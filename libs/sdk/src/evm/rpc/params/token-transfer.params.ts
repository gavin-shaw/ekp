import { BigNumber } from 'ethers';

export interface TokenTransferParams {
  amount: string | BigNumber;
  chainId?: string;
  contractAddress: string;
  recipient: string;
  walletAddress: string;
}
