import { BlockchainTokenService, TokenBalance } from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import { morphism, StrictSchema } from 'morphism';
import { Token } from './token';

@Injectable()
export class PortfolioTokenService {
  constructor(private blockchainTokenService: BlockchainTokenService) {}

  async getTokensWithBalances(walletAddress: string): Promise<Token[]> {
    validate([walletAddress], ['string']);

    const tokenBalances = await this.blockchainTokenService.getTokenBalances({
      chain: 'bsc', // TODO: support multiple chains,
      address: walletAddress,
    });

    const schema: StrictSchema<Token, TokenBalance> = {
      balance: {
        path: 'balance',
        fn: (value) => Number(value),
      },
      chain: 'bsc',
      name: 'name',
      symbol: 'symbol',
      tokenAddress: 'address',
      walletAddress: () => walletAddress,
    };

    return morphism(schema, tokenBalances);
  }
}
