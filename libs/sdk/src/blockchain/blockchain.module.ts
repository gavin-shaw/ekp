import { Module } from '@nestjs/common';
import Moralis from 'moralis/node';
import { LoggerModule } from '../logger/logger.module';
import { EtherscanService } from './etherscan/etherscan.service';
import { BlockchainProviderService } from './provider/blockchain-provider.service';
import { RpcService } from './rpc';
import { BlockchainTokenService } from './token/blockchain-token.service';
import { BlockchainTransactionService } from './transaction/blockchain-transaction.service';

@Module({
  imports: [LoggerModule],
  providers: [
    BlockchainProviderService,
    BlockchainTokenService,
    BlockchainTransactionService,
    EtherscanService,
    RpcService,
  ],
  exports: [
    BlockchainProviderService,
    BlockchainTokenService,
    BlockchainTransactionService,
    EtherscanService,
    RpcService,
  ],
})
export class BlockchainModule {
  constructor() {
    if (!!process.env.MORALIS_SERVER_URL && !!process.env.MORALIS_APP_ID) {
      Moralis.start({
        serverUrl: process.env.MORALIS_SERVER_URL,
        appId: process.env.MORALIS_APP_ID,
      });
    }
  }
}
