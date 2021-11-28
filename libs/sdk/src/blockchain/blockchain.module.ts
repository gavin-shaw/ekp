import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { Transaction } from './entity/transaction.entity';
import { BlockchainProviderService } from './service/blockchain-provider.service';
import { BlockchainTokenService } from './service/blockchain-token.service';
import { BlockchainTransactionService } from './service/blockchain-transaction.service';
import { EtherscanService } from './service/etherscan.service';
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
export class BlockchainModule {}
