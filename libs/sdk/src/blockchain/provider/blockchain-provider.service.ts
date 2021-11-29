import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainProviderService {
  static RPC_PROVIDER_URLS = [
    {
      chainId: 56,
      url: 'https://bsc-dataseed1.ninicoin.io/',
    },
  ];

  private limiter = new Bottleneck({
    minTime: 100,
  });

  async scheduleRpc<T>(
    fn: (provider: ethers.providers.Provider) => Promise<T>,
    chainId = 56,
  ) {
    return this.limiter.schedule(() => fn(this.getRpcProvider(chainId)));
  }

  private getRpcProvider(chainId: number) {
    const provider = BlockchainProviderService.RPC_PROVIDER_URLS.find(
      (it) => it.chainId === chainId,
    );

    if (!provider?.url) {
      throw new Error('Could not find RPC provider for chain id: ' + chainId);
    }

    return new ethers.providers.JsonRpcProvider(provider.url);
  }
}
