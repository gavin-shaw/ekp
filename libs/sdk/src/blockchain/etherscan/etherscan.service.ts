import { Injectable } from '@nestjs/common';
import { Api } from '@app/etherscan';

@Injectable()
export class EtherscanService {
  private api = new Api({
    url: 'https://api.bscscan.com',
    apiKey: process.env.BSCSCAN_API_KEY,
    maxRequestsPerSecond: 4, // use 4 instead of 5, there seems to be timing differences at bscscan
  });

  getApi(chainId = 56) {
    // TODO: switch by chain id, currently always returning bsc chain
    return this.api;
  }
}
