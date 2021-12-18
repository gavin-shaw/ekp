import { Module } from '@nestjs/common';
import Moralis from 'moralis/node';
import { EvmNftService } from './nft';
import { EvmProviderService } from './provider';
import { EvmRpcService } from './rpc';
import { EvmTokenService } from './token';
import { OpenseaModule } from '../opensea/opensea.module';
import { MoralisModule } from '../moralis/moralis.module';
@Module({
  imports: [MoralisModule, OpenseaModule],

  providers: [
    EvmNftService,
    EvmProviderService,
    EvmRpcService,
    EvmTokenService,
  ],
  exports: [EvmProviderService, EvmNftService, EvmRpcService, EvmTokenService],
})
export class EvmModule {
  constructor() {
    if (!!process.env.MORALIS_SERVER_URL && !!process.env.MORALIS_APP_ID) {
      Moralis.start({
        serverUrl: process.env.MORALIS_SERVER_URL,
        appId: process.env.MORALIS_APP_ID,
      });
    }
  }
}
