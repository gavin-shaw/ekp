import * as etherscan from '@app/etherscan';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { Transaction } from '../entity/transaction.entity';
import { BlockchainProviderService } from './blockchain-provider.service';
import { EtherscanService } from './etherscan.service';

@Injectable()
export class BlockchainTransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private blockchainProviderService: BlockchainProviderService,
    private etherscanService: EtherscanService,
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

  async findFirstWithMethodSig(options: {
    address: string;
    methodSig: string;
    limit?: number;
  }) {
    const existingTransaction = await this.transactionRepository.findOne({
      where: [
        { to: options.address, methodSig: options.methodSig },
        { from: options.address, methodSig: options.methodSig },
      ],
      order: {
        timeStamp: 'ASC',
      },
    });

    if (!!existingTransaction) {
      return existingTransaction;
    }

    const api = this.etherscanService.getApi();

    // We don't have the transaction locally, so we need to scan the chain
    // options.limit will limit how many transactions we will scan for the method sig
    const firstTransactions = await api.account
      .getTransactions(options.address, {
        sort: 'asc',
        page: 1,
        offset: options.limit || 1000,
      })
      .then((result) => result as etherscan.Transaction[]);

    // Search for the seed transaction
    for (const transaction of firstTransactions) {
      const transactionEntity = this.mapToTransactionEntity(transaction);

      if (transactionEntity.methodSig === options.methodSig) {
        // Save this transaction to the database so we don't need to find it again
        await this.transactionRepository.save(transactionEntity);

        // Return the transaction
        return transactionEntity;
      }
    }

    // Return undefined if we couldn't find one
    return undefined;
  }

  private mapToTransactionEntity(
    transaction: etherscan.Transaction,
  ): Transaction {
    return {
      ...transaction,
      blockNumber: Number(transaction.blockNumber),
      timeStamp: Number(transaction.timeStamp),
      methodSig: this.getMethodSig(transaction),
    };
  }

  private getMethodSig(transaction: etherscan.Transaction) {
    if (!transaction.input || transaction.input.length < 10) {
      return undefined;
    }

    return transaction.input.slice(2, 10);
  }
}
