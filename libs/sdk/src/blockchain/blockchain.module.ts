import { Module } from '@nestjs/common';
import { BlockchainProviderService } from './service/blockchain-provider.service';
import { BlockchainTransactionService } from './service/blockchain-transaction.service';

@Module({
  providers: [BlockchainProviderService, BlockchainTransactionService],
  exports: [BlockchainProviderService, BlockchainTransactionService],
})
export class BlockchainModule {}
