import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { Transaction } from './transaction/transaction.entity';
import { BlockchainProviderService } from './provider/blockchain-provider.service';
import { BlockchainTokenService } from './token/blockchain-token.service';
import { BlockchainTransactionService } from './transaction/blockchain-transaction.service';
import { EtherscanService } from './etherscan/etherscan.service';
import Moralis from 'moralis/types';
@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), LoggerModule],

  providers: [
    BlockchainProviderService,
    BlockchainTransactionService,
    EtherscanService,
    BlockchainTokenService,
  ],
  exports: [
    BlockchainProviderService,
    BlockchainTransactionService,
    EtherscanService,
    BlockchainTokenService,
  ],
})
export class BlockchainModule {
  constructor() {
    if (!!process.env.MORALIS_SERVER_URL && !!process.env.MORALIS_APP_ID) {
      Moralis.start({ serverUrl: process.env.MORALIS_SERVER_URL, appId: process.env.MORALIS_APP_ID });
    }
  }
}
