import * as etherscan from '@app/etherscan';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { Moralis } from 'moralis/types';
import { Repository } from 'typeorm';
import { BlockchainProviderService } from '../provider/blockchain-provider.service';
import { Transaction } from './transaction.entity';
import * as moralis from '../moralis';

@Injectable()
export class BlockchainTransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private blockchainProviderService: BlockchainProviderService
  ) { }

  async getReceipt(
    transaction: Transaction,
    chainId = 56,
  ): Promise<ethers.providers.TransactionReceipt> {
    return this.blockchainProviderService.scheduleRpc(
      (provider) => provider.getTransactionReceipt(transaction.hash),
      chainId,
    );
  }


  async findFirstWithMethodSig({ address, methodSig, limit, chain }: {
    address: string,
    methodSig: string,
    limit?: number,
    chain: moralis.Chain
  }) {
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


    // We don't have the transaction locally, so we need to scan the chain
    // options.limit will limit how many transactions we will scan for the method sig
    const firstTransactionsCollection: moralis.TransactionCollection = await Moralis.Web3API.account.getTransactions({ chain, address, limit });

    if (!firstTransactionsCollection?.total) {
      return undefined;
    }

    // Search for the seed transaction
    for (const transaction of firstTransactionsCollection.result) {
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
    transaction: ,
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
