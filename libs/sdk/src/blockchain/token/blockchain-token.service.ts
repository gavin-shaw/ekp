import { formatUnits } from '@ethersproject/units';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import Moralis from 'moralis/node';
import * as moralis from '../moralis';
import { BlockchainProviderService } from '../provider';
import erc20abi from './erc20.json';
import { TokenBalance } from './token-balance';
import { TokenMetaData } from './token-meta-data';

@Injectable()
export class BlockchainTokenService {
  constructor(private blockchainProviderService: BlockchainProviderService) {}

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

    const balances: TokenBalance[] = result.map((it) => ({
      address: it.token_address,
      balance: formatUnits(it.balance, it.decimals),
      balanceRaw: it.balance,
      decimals: Number(it.decimals),
      logo: it.logo,
      name: it.name,
      owner: address,
      symbol: it.symbol,
    }));

    const nativeResult = await Moralis.Web3API.account.getNativeBalance({
      address,
      chain,
    });

    // TODO: find a better way to populate these by chain or move to its own service

    let nativeAddress: string;
    let nativeDecimals: number;
    let nativeLogo: string;
    let nativeName: string;
    let nativeSymbol: string;

    switch (chain) {
      case 'bsc':
        (nativeAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
          (nativeName = 'Binance Coin');
        nativeDecimals = 18;
        nativeSymbol = 'BNB';
        nativeLogo =
          'https://cryptologos.cc/logos/thumbs/binance-coin.png?v=014';
        break;
      default:
        nativeAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        nativeName = 'Ethereum';
        nativeDecimals = 18;
        nativeSymbol = 'ETH';
        nativeLogo = 'https://cryptologos.cc/logos/thumbs/ethereum.png?v=014';
        break;
    }

    const nativeTokenBalance: TokenBalance = {
      address: nativeAddress,
      balanceRaw: nativeResult.balance,
      balance: formatUnits(nativeResult.balance, nativeDecimals),
      decimals: nativeDecimals,
      logo: nativeLogo,
      name: nativeName,
      owner: address,
      symbol: nativeSymbol,
    };

    return [...balances, nativeTokenBalance];
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
