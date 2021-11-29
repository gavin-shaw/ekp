import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { Transaction } from './transaction/transaction.entity';
import { BlockchainProviderService } from './provider/blockchain-provider.service';
import { BlockchainTokenService } from './token/blockchain-token.service';
import { BlockchainTransactionService } from './transaction/blockchain-transaction.service';
import { EtherscanService } from './etherscan/etherscan.service';
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
