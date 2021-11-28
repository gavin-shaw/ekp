import { Query, RequestConfig } from './Query';

export interface TokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenType: string;
  totalSupply: string;
  blueCheckmark: string;
  description: string;
  website: string;
  email: string;
  blog: string;
  reddit: string;
  slack: string;
  facebook: string;
  twitter: string;
  bitcointalk: string;
  github: string;
  telegram: string;
  wechat: string;
  linkedin: string;
  discord: string;
  whitepaper: string;
  tokenPriceUSD: string;
}

export class Token {
  constructor(private query: Query) {}

  getTokenSupplyByContractAddress(
    contractAddress: string,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<string>(
      {
        contractAddress,
        module: 'stats',
        action: 'tokensupply',
      },
      requestConfig,
    );
  }

  getCirculatingSupplyByContractAddress(
    contractAddress: string,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<string>(
      {
        contractAddress,
        module: 'stats',
        action: 'tokenCsupply',
      },
      requestConfig,
    );
  }

  getAccountBalanceForTokenContractAddress(
    address: string,
    contractAddress: string,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<string>(
      {
        address,
        contractAddress,
        module: 'account',
        action: 'tokenbalance',
        tag: 'latest',
      },
      requestConfig,
    );
  }

  getHistoricalAccountBalanceForTokenContractAddress(
    address: string,
    contractAddress: string,
    blockno: number,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<string>(
      {
        address,
        contractAddress,
        module: 'account',
        action: 'tokenbalancehistory',
        blockno,
        tag: 'latest',
      },
      requestConfig,
    );
  }

  getTokenInfoByContractAddress(
    contractAddress: string,
    requestConfig?: RequestConfig,
  ): Promise<TokenInfo> {
    return this.query.execute<TokenInfo>(
      {
        contractAddress,
        module: 'token',
        action: 'tokeninfo',
      },
      requestConfig,
    );
  }
}
