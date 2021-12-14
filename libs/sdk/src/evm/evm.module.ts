import { Module } from '@nestjs/common';
import Moralis from 'moralis/node';
import { LoggerModule } from '../logger/logger.module';
import { EvmNftService } from './nft';
import { EvmProviderService } from './provider';
import { EvmRpcService } from './rpc';
import { EvmTokenService } from './token';

@Module({
  imports: [LoggerModule],
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
