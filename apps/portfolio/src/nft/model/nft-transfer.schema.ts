import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NftTransferDocument = NftTransfer & Document;

@Schema()
export class NftTransfer {
  @Prop()
  id: string;
  @Prop()
  amount: number;
  @Prop()
  blockHash: string;
  @Prop()
  blockNumber: number;
  @Prop()
  blockTimestamp: number;
  @Prop()
  chainId: string;
  @Prop()
  contractAddress: string;
  @Prop()
  contractId: string;
  @Prop()
  contractType?: string;
  @Prop()
  cursor?: string;
  @Prop()
  fromAddress?: string;
  @Prop()
  logIndex: number;
  @Prop()
  tokenId: number;
  @Prop()
  toAddress: string;
  @Prop()
  transactionHash: string;
  @Prop()
  value: number;
}

const NftTransferSchema = SchemaFactory.createForClass(NftTransfer);

NftTransferSchema.index({ id: 1 });
NftTransferSchema.index({ contractId: 1 });
NftTransferSchema.index({ contractId: 1, blockTimestamp: -1 });
NftTransferSchema.index({ contractId: 1, value: 1, blockTimestamp: -1 });
NftTransferSchema.index({ blockTimestamp: -1 });
NftTransferSchema.index({ value: 1 });

export { NftTransferSchema };
