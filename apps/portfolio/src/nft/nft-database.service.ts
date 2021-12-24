import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { NftTransferDocument, NftTransfer } from './model';
import { moralis } from '@app/sdk';
import { ethers } from 'ethers';
import { validate } from 'bycontract';
import { NftContractDocument } from './dto';
import moment from 'moment';
import _ from 'lodash';

@Injectable()
export class NftDatabaseService {
  constructor(
    @InjectModel(NftTransfer.name)
    private nftTransferModel: Model<NftTransferDocument>,
  ) {}

  async priceOf(contractId: string): Promise<number> {
    validate([contractId], ['string']);

    const now = moment().unix();

    const lastHour = await this.nftTransferModel
      .find({
        contractId,
        value: { $gt: 0 },
        blockTimestamp: { $gt: now - 3600 },
      })
      .sort({ blockTimestamp: -1 })
      .exec();

    if (Array.isArray(lastHour) && lastHour.length > 0) {
      return _.minBy(lastHour, (it) => it.value).value;
    }

    const latest = await this.nftTransferModel
      .findOne({
        contractId,
        value: { $gt: 0 },
      })
      .sort({ blockTimestamp: -1 })
      .exec();

    return latest?.value;
  }

  async latestTransferOf(contractId: string): Promise<NftTransfer> {
    validate([contractId], ['string']);

    return this.nftTransferModel
      .findOne({
        contractId,
      })
      .sort({ blockTimestamp: -1 })
      .exec();
  }

  async transferCount(contractId: string): Promise<number> {
    validate([contractId], ['string']);

    return this.nftTransferModel
      .where({ contractId: contractId })
      .countDocuments();
  }

  async latestTransferWithValueOf(contractId: string): Promise<NftTransfer> {
    validate([contractId], ['string']);

    return this.nftTransferModel
      .findOne({
        contractId,
        value: { $gte: 0 },
      })
      .sort({ blockTimestamp: -1 })
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
      .sort({ blockTimestamp: -1 })
      .exec();
  }

  mapMoralisTransfers(
    contract: NftContractDocument,
    moralisTransfers: moralis.NftTransfer[],
  ): NftTransfer[] {
    validate([contract, moralisTransfers], ['object', 'Array.<object>']);

    return moralisTransfers.map((it) => ({
      id: `${it.transaction_hash}-${it.transaction_index}-${it.log_index}-${it.token_id}`,
      amount: Number(it.amount),
      blockHash: it.block_hash,
      blockNumber: Number(it.block_number),
      blockTimestamp: moment(it.block_timestamp).unix(),
      chainId: it.chain_id,
      contractAddress: it.token_address,
      contractId: contract.id,
      contractType: it.contract_type,
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

    try {
      await this.nftTransferModel.collection.bulkWrite(
        transfers.map((transfer) => ({
          updateOne: {
            filter: { id: transfer.id },
            update: { $set: transfer },
            upsert: true,
          },
        })),
      );
    } catch (error) {
      console.error(error);
    }
  }
}
