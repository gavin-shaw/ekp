import { Module } from '@nestjs/common';
import { BlockchainProviderService } from './service/blockchain-provider.service';
import { BlockchainTransactionService } from './service/blockchain-transaction.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entity/transaction.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  providers: [BlockchainProviderService, BlockchainTransactionService],
  exports: [BlockchainProviderService, BlockchainTransactionService],
})
export class BlockchainModule {}
