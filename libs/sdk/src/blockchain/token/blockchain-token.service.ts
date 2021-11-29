import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { TokenDetails } from './token-details';
import { BlockchainProviderService } from '../provider/blockchain-provider.service';
import { EtherscanService } from '../etherscan/etherscan.service';
import { validate } from 'bycontract';
import erc20abi from './erc20.json';

@Injectable()
export class BlockchainTokenService {
  constructor(
    private blockchainProviderService: BlockchainProviderService,
    private etherscanService: EtherscanService,
    private logger: Logger,
  ) {}

  async getBalanceOf(
    tokenAddress: string,
    address: string,
  ): Promise<ethers.BigNumber> {
    validate([tokenAddress, address], ['string', 'string']);

    return await this.blockchainProviderService.scheduleRpc(
      async (provider) => {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20abi,
          provider,
        );

        const balance = await tokenContract.balanceOf(address);

        if (!balance || !(balance instanceof ethers.BigNumber)) {
          return undefined;
        }

        return balance;
      },
    );
  }

  async getTokenDetails(tokenAddress: string): Promise<TokenDetails> {
    const api = this.etherscanService.getApi();

    const tokenAbi: string = (await api.contract.getContractAbi(
      tokenAddress,
    )) as string;

    return this.blockchainProviderService.scheduleRpc(async (provider) => {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        new ethers.utils.Interface(tokenAbi),
        provider,
      );

      let decimals: number;
      let symbol: string;

      try {
        decimals = await tokenContract
          .decimals()
          .then((result: ethers.BigNumber) => result.toNumber());
      } catch (error) {
        try {
          decimals = await tokenContract
            ._decimals()
            .then((result: ethers.BigNumber) => result.toNumber());
        } catch {
          this.logger.warn('Could not fetch decimals for currency', {
            contractAddress: tokenAddress,
          });
          return undefined;
        }
      }

      try {
        symbol = await tokenContract
          .symbol()
          .then((result: ethers.BigNumber) => result.toNumber());
      } catch (error) {
        try {
          symbol = await tokenContract
            ._symbol()
            .then((result: ethers.BigNumber) => result.toNumber());
        } catch {
          this.logger.warn('Could not fetch decimals for currency', {
            contractAddress: tokenAddress,
          });
          return undefined;
        }
      }

      return {
        decimals,
        symbol,
        tokenAddress,
      };
    });
  }
}
