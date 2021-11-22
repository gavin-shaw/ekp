import { Global, Module } from '@nestjs/common';
import { ethers } from 'ethers';

const bscProviderFactory = {
  provide: ethers.providers.Provider,
  useFactory: () => {
    if (process.env.BSC_PROVIDER_TYPE === undefined) {
      throw new Error('Must provide BSC_PROVIDER_TYPE');
    }
    if (process.env.BSC_PROVIDER_TYPE === 'WebSocket') {
      if (process.env.BSC_PROVIDER_URL === undefined) {
        throw new Error('Must provide BSC_PROVIDER_URL');
      }
      return new ethers.providers.WebSocketProvider(
        process.env.BSC_PROVIDER_URL,
      );
    }
    if (process.env.BSC_PROVIDER_TYPE === 'JsonRpc') {
      if (process.env.BSC_PROVIDER_URL === undefined) {
        throw new Error('Must provide BSC_PROVIDER_URL');
      }
      return new ethers.providers.JsonRpcProvider(process.env.BSC_PROVIDER_URL);
    }
    throw new Error(
      `Unknown BSC_PROVIDER_TYPE: ${process.env.BSC_PROVIDER_TYPE}`,
    );
  },
};

@Global()
@Module({
  providers: [bscProviderFactory],
  exports: [ethers.providers.Provider],
})
export class GlobalModule {}
