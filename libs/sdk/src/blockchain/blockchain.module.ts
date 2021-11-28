import { Module } from '@nestjs/common';
import { BlockchainProviderService } from './service/blockchain-provider.service';
import { BlockchainTransactionService } from './service/blockchain-transaction.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entity/transaction.entity';
import { EtherscanService } from './service/etherscan.service';
import { BlockchainTokenService } from './service/blockchain-token.service';
@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],

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
