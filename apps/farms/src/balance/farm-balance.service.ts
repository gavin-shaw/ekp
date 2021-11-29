import { BlockchainProviderService, BlockchainTokenService } from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import moment from 'moment';
import { Farm } from '../persist';

@Injectable()
export class FarmBalanceService {
  constructor(
    private blockchainTokenService: BlockchainTokenService,
    private blockchainProviderService: BlockchainProviderService,
    private logger: Logger,
  ) {}

  async getTokenBalanceOf(
    tokenAddress: string,
    contractAddress: string,
    decimals: number,
  ): Promise<number> {
    validate(
      [tokenAddress, contractAddress, decimals],
      ['string', 'string', 'number'],
    );

    const balance = await this.blockchainTokenService.getBalanceOf(
      tokenAddress,
      contractAddress,
    );

    if (!balance) {
      return undefined;
    }

    return Number(ethers.utils.formatUnits(balance, decimals));
  }

  async getBalanceOf(contractAddress: string): Promise<number> {
    validate([contractAddress], ['string']);

    const balance = await this.blockchainProviderService.scheduleRpc(
      (provider) => provider.getBalance(contractAddress),
    );

    if (!balance || !(balance instanceof ethers.BigNumber)) {
      return undefined;
    }

    return Number(ethers.utils.formatEther(balance));
  }

  async getFarmsWithBalance(farms: Farm[]): Promise<Farm[]> {
    validate([farms], ['Array.<object>']);

    return await Promise.all(
      farms.map(async (farm) => {
        const now = moment().unix();

        const balanceAge = now - farm.balanceTimestamp;

        // Don't fetch balances that have been fetched in the last 5 minutes
        if (balanceAge < 300) {
          return farm;
        }

        if (farm.currencyName === 'BNB') {
          const balance = await this.getBalanceOf(farm.contractAddress);

          this.logger.debug('Retrieved BNB balance for farm', {
            contractName: farm.contractName,
            contractAddress: farm.contractAddress,
          });

          return {
            ...farm,
            balance,
            balanceTimestamp: now,
          };
        }

        if (!farm.currencyAddress || !farm.currencyDecimals) {
          return farm;
        }

        const balance = await this.getTokenBalanceOf(
          farm.currencyAddress,
          farm.contractAddress,
          farm.currencyDecimals,
        );

        this.logger.debug('Retrieved token balance for farm', {
          contractName: farm.contractName,
          contractAddress: farm.contractAddress,
          tokenName: farm.currencyName,
          tokenAddress: farm.currencyAddress,
        });

        return {
          ...farm,
          balance,
          balanceTimestamp: now,
        };
      }),
    );
  }
}
