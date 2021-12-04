import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import Moralis from 'moralis/node';
import { EtherscanService } from '../etherscan';
import * as moralis from '../moralis';
import { BlockchainProviderService } from '../provider';
import erc20abi from './erc20.json';
import { TokenMetaData } from './token-meta-data';
import { TokenBalance } from './token-balance';
import { morphism, StrictSchema } from 'morphism';
import { formatUnits } from '@ethersproject/units';

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

  async getTokenBalances({
    address,
    chain,
  }: {
    address: string;
    chain: moralis.Chain;
  }): Promise<TokenBalance[]> {
    validate([address, chain], ['string', 'string']);

    const result: moralis.TokenBalance[] =
      await Moralis.Web3API.account.getTokenBalances({
        address,
        chain,
      });

    const schema: StrictSchema<TokenBalance, moralis.TokenBalance> = {
      address: 'token_address',
      balance: {
        path: 'balance',
        fn: (value, source) => formatUnits(value, source.decimals),
      },
      decimals: 'decimals',
      logo: 'logo',
      name: 'name',
      symbol: 'symbol',
      thumbnail: 'thumbnail',
    };

    return morphism(schema, result);
  }

  async getTokenMetaData({
    address,
    chain,
  }: {
    address: string;
    chain: moralis.Chain;
  }): Promise<TokenMetaData> {
    validate([address, chain], ['string', 'string']);

    const result = await Moralis.Web3API.token.getTokenMetadata({
      addresses: [address],
      chain,
    });

    if (!Array.isArray(result) || result.length === 0) {
      return undefined;
    }

    return {
      ...result[0],
    };
  }
}
