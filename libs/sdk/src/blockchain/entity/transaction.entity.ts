import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction')
export class Transaction {
  @Column()
  readonly blockHash: string;

  @Column()
  readonly blockNumber: number;

  @Column()
  readonly confirmations: string;

  @Column()
  readonly contractAddress: string;

  @Column()
  readonly cumulativeGasUsed: string;

  @Column()
  readonly from: string;

  @Column()
  readonly gas: string;

  @Column()
  readonly gasPrice: string;

  @Column()
  readonly gasUsed: string;

  @PrimaryColumn()
  readonly hash: string;

  @Column()
  readonly input: string;

  @Column()
  readonly isError: string;

  @Column({ nullable: true })
  readonly methodSig?: string;

  @Column()
  readonly nonce: string;

  @Column()
  readonly timeStamp: number;

  @Column()
  readonly to: string;

  @Column()
  readonly transactionIndex: string;

  @Column()
  readonly txreceipt_status: string;

  @Column()
  readonly value: string;
}
