import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { BigNumber, ethers } from 'ethers';
import Moralis from 'moralis/node';
import { ChainId, chains } from '../utils';
import * as moralis from '../moralis';
import { TokenBalance, TokenMetadata } from './model';

@Injectable()
export class EvmTokenService {
  async nativeBalanceOf(
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<TokenBalance> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const result: moralis.NativeBalance =
      await Moralis.Web3API.account.getNativeBalance({
        address: ownerAddress,
        chain: chainId,
      });

    if (result?.balance === undefined || result?.balance === null) {
      return undefined;
    }

    const chainMetadata = chains[chainId];

    if (!chainMetadata) {
      throw new Error(`Sorry ${chainId} not ready yet, file an issue!`);
    }

    return {
      ...chainMetadata,
      balance: BigNumber.from(result.balance),
      chainId: chainMetadata.chainId,
      contractAddress: chainMetadata.token.contractAddress,
      decimals: chainMetadata.token.decimals,
      logo: chainMetadata.logo,
      name: chainMetadata.token.name,
      ownerAddress,
      symbol: chainMetadata.token.symbol,
    };
  }

  async allBalancesOf(
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<TokenBalance[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const result: moralis.TokenBalance[] =
      await Moralis.Web3API.account.getTokenBalances({
        address: ownerAddress,
        chain: chainId,
      });

    const balances: TokenBalance[] = result.map((it) => ({
      contractAddress: it.token_address,
      balance: BigNumber.from(it.balance),
      chainId,
      decimals: Number(it.decimals),
      logo: it.logo,
      name: it.name,
      ownerAddress,
      symbol: it.symbol,
    }));

    const nativeBalance = await this.nativeBalanceOf(chainId, ownerAddress);

    return [...balances, nativeBalance];
  }

  async metadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<TokenMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const result = await Moralis.Web3API.token.getTokenMetadata({
      addresses: [contractAddress],
      chain: chainId,
    });

    if (!Array.isArray(result) || result.length === 0) {
      return undefined;
    }

    return {
      ...result[0],
    };
  }
}
