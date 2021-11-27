import { Global, Module } from '@nestjs/common';
import { ethers } from 'ethers';

const bscProviderFactory = {
  provide: ethers.providers.Provider,
  useFactory: () => {
    return new ethers.providers.JsonRpcProvider(
      'https://bsc-dataseed1.ninicoin.io/',
    );
  },
};

@Global()
@Module({
  providers: [bscProviderFactory],
  exports: [ethers.providers.Provider],
})
export class GlobalModule {}
