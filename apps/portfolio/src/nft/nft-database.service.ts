import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { NftTransferDocument, NftTransfer } from './model';
import { moralis } from '@app/sdk';
import { ethers } from 'ethers';
import { validate } from 'bycontract';
import { NftContractDocument } from './dto';

@Injectable()
export class NftDatabaseService {
  constructor(
    @InjectModel(NftTransfer.name)
    private nftTransferModel: Model<NftTransferDocument>,
  ) {}

  async latestTransferOf(contractId: string): Promise<NftTransfer> {
    validate([contractId], ['string']);

    return this.nftTransferModel
      .findOne({
        contractId,
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  async latestTransferWithValueOf(contractId: string): Promise<NftTransfer> {
    validate([contractId], ['string']);

    return this.nftTransferModel
      .findOne({
        contractId,
        value: { $gte: 0 },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  async latestTransfersWithValueOf(
    contractId: string,
    since: number,
  ): Promise<NftTransfer[]> {
    validate([contractId, since], ['string', 'contractAddress']);

    return this.nftTransferModel
      .find({
        contractId,
        blockTimestamp: { $gte: since },
        value: { $gte: 0 },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  mapMoralisTransfers(
    contract: NftContractDocument,
    moralisTransfers: moralis.NftTransfer[],
    cursor: string,
  ): NftTransfer[] {
    validate(
      [contract, moralisTransfers, cursor],
      ['object', 'Array.<object>', 'string='],
    );

    return moralisTransfers.map((it) => ({
      id: `${it.transaction_hash}-${it.transaction_index}-${it.log_index}`,
      amount: Number(it.amount),
      blockHash: it.block_hash,
      blockNumber: Number(it.block_number),
      blockTimestamp: Number(it.block_timestamp),
      chainId: it.chain_id,
      contractAddress: it.token_address,
      contractId: contract.id,
      contractType: it.contract_type,
      cursor,
      fromAddress: it.from_address,
      logIndex: Number(it.log_index),
      tokenId: Number(it.token_id),
      toAddress: it.to_address,
      transactionHash: it.transaction_hash,
      value: !!it.value ? Number(ethers.utils.formatEther(it.value)) : 0,
    }));
  }

  async saveTransfers(transfers: NftTransfer[]) {
    if (!Array.isArray(transfers) || transfers.length === 0) {
      return;
    }

    // https://stackoverflow.com/a/64853801/264078

    await this.nftTransferModel.collection.bulkWrite(
      transfers.map((transfer) => ({
        updateOne: {
          filter: { id: transfer.id },
          update: { $set: transfer },
          upsert: true,
        },
      })),
    );
  }
}
