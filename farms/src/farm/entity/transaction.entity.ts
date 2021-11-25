import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction')
export class Transaction {
  @Column()
  blockHash: string;
  @Column()
  blockNumber: number;
  @Column()
  confirmations: string;
  @Column()
  contractAddress: string;
  @Column()
  cumulativeGasUsed: string;
  @Column()
  from: string;
  @Column()
  gas: string;
  @Column()
  gasPrice: string;
  @Column()
  gasUsed: string;
  @PrimaryColumn()
  hash: string;
  @Column()
  input: string;
  @Column()
  isError: string;
  @Column({ nullable: true })
  methodName?: string;
  @Column()
  nonce: string;
  @Column()
  timeStamp: number;
  @Column()
  to: string;
  @Column()
  transactionIndex: string;
  @Column()
  txreceipt_status: string;
  @Column()
  value: string;
}
