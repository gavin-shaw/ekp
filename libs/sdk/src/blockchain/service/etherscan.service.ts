import { Injectable } from '@nestjs/common';
import { Api } from '@app/etherscan';

@Injectable()
export class EtherscanService {
  getApi(chainId = 56) {
    // TODO: switch by chain id, currently always returning bsc chain
    return new Api({
      url: 'https://api.bscscan.com',
      apiKey: process.env.BSCSCAN_API_KEY,
      maxRequestsPerSecond: 5,
    });
  }
}
