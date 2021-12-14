import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { BigNumber, ethers } from 'ethers';
import { erc20abi } from '../abi';
import { TokenTransferParams } from './params';

@Injectable()
export class EvmRpcService {
  erc20Interface = new ethers.utils.Interface(erc20abi);

  tokenTransfer({
    amount,
    chainId = '0x38',
    contractAddress,
    recipient,
    walletAddress,
  }: TokenTransferParams) {
    validate(
      [amount, chainId, contractAddress, recipient, walletAddress],
      ['string|BigNumber', 'string', 'string', 'string', 'string'],
    );

    const data = this.erc20Interface.encodeFunctionData('transfer', [
      recipient,
      typeof amount === 'string' ? BigNumber.from(amount) : amount,
    ]);

    return {
      method: 'eth_sendTransaction',
      params: [
        {
          chainId,
          data,
          from: walletAddress,
          to: contractAddress,
        },
      ],
    };
  }
}
