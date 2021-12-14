import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { ethers } from 'ethers';

@Injectable()
export class EvmProviderService {
  // TODO: make this multi-chain
  static RPC_PROVIDER_URLS = [
    {
      chainId: 56,
      url: 'https://bsc-dataseed1.ninicoin.io/',
    },
  ];

  // TODO: update this to the correct rate limit for rpc providers
  private limiter = new Bottleneck({
    minTime: 100,
  });

  async execute<T>(
    fn: (provider: ethers.providers.Provider) => Promise<T>,
    chainId = 56,
  ) {
    return this.limiter.schedule(() => fn(this.getProvider(chainId)));
  }

  private getProvider(chainId: number) {
    const provider = EvmProviderService.RPC_PROVIDER_URLS.find(
      (it) => it.chainId === chainId,
    );

    if (!provider?.url) {
      throw new Error('Could not find RPC provider for chain id: ' + chainId);
    }

    return new ethers.providers.JsonRpcProvider(provider.url);
  }
}
