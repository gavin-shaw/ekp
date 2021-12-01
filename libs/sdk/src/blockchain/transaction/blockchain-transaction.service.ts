import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import moment from 'moment';
import Moralis from 'moralis/node';
import { Repository } from 'typeorm';
import * as moralis from '../moralis';
import { BlockchainProviderService } from '../provider/blockchain-provider.service';
import { Transaction } from './transaction.entity';

@Injectable()
export class BlockchainTransactionService {
  constructor(
    @Optional()
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private blockchainProviderService: BlockchainProviderService,
  ) {}

  async getReceipt(
    transaction: Transaction,
    chainId = 56,
  ): Promise<ethers.providers.TransactionReceipt> {
    return this.blockchainProviderService.scheduleRpc(
      (provider) => provider.getTransactionReceipt(transaction.hash),
      chainId,
    );
  }

  async findFirstWithMethodSig({
    address,
    methodSig,
    limit,
    chain,
  }: {
    address: string;
    methodSig: string;
    limit?: number;
    chain: moralis.Chain;
  }) {
    if (!!this.transactionRepository) {
      const existingTransaction = await this.transactionRepository.findOne({
        where: [
          { to: address, methodSig: methodSig },
          { from: address, methodSig: methodSig },
        ],
        order: {
          timeStamp: 'ASC',
        },
      });

      if (!!existingTransaction) {
        return existingTransaction;
      }
    }

    // We don't have the transaction locally, so we need to scan the chain
    // options.limit will limit how many transactions we will scan for the method sig
    const firstTransactionsCollection: moralis.TransactionCollection =
      await Moralis.Web3API.account.getTransactions({ chain, address, limit });

    if (!firstTransactionsCollection?.total) {
      return undefined;
    }

    // Search for the seed transaction
    for (const transaction of firstTransactionsCollection.result) {
      const transactionEntity = this.mapToTransactionEntity(transaction);

      if (transactionEntity.methodSig === methodSig) {
        if (!!this.transactionRepository) {
          // Save this transaction to the database so we don't need to find it again
          await this.transactionRepository.save(transactionEntity);
        }

        // Return the transaction
        return transactionEntity;
      }
    }

    // Return undefined if we couldn't find one
    return undefined;
  }

  private mapToTransactionEntity(
    transaction: moralis.Transaction,
  ): Transaction {
    return {
      ...transaction,
      blockHash: transaction.block_hash,
      blockNumber: Number(transaction.block_number),
      cumulativeGasUsed: transaction.receipt_cumulative_gas_used,
      from: transaction.from_address,
      gasPrice: transaction.receipt_gas_used,
      gasUsed: transaction.receipt_gas_used,
      methodSig: this.getMethodSig(transaction),
      receiptStatus: transaction.receipt_status,
      timeStamp: moment(transaction.block_timestamp).unix(),
      to: transaction.to_address,
      transactionIndex: transaction.transaction_index,
    };
  }

  private getMethodSig(transaction: moralis.Transaction) {
    if (!transaction.input || transaction.input.length < 10) {
      return undefined;
    }

    return transaction.input.slice(2, 10);
  }
}
