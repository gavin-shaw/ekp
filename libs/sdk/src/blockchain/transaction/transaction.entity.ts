import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction')
export class Transaction {
  @Column()
  readonly blockHash: string;

  @Column()
  readonly blockNumber: number;

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
  readonly receiptStatus: string;

  @Column()
  readonly value: string;
}
