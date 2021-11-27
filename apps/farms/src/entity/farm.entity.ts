import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('farm')
export class Farm {
  @PrimaryColumn()
  readonly contractAddress: string;

  @Column({ nullable: true })
  readonly created?: number;

  @Column({ nullable: true })
  readonly updated?: number;

  @Column({ nullable: true })
  readonly audit?: string;

  @Column({ nullable: true })
  readonly auditReason?: string;

  @Column({ nullable: true, type: 'decimal', scale: 18, precision: 36 })
  readonly balance?: number;

  @Column({ nullable: true, type: 'text' })
  readonly contractAbi?: string;

  @Column({ type: 'boolean', default: false })
  readonly contractFetched?: boolean;

  @Column({ nullable: true })
  readonly contractName?: string;

  @Column({ nullable: true, type: 'text' })
  readonly contractSource?: string;

  @Column({ nullable: true })
  readonly currencyAddress?: string;

  @Column({ nullable: true })
  readonly currencyName?: string;

  @Column({ nullable: true })
  readonly currencyDecimals?: number;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  readonly dailyRoi?: number;

  @Column({ default: false })
  readonly disabled: boolean;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  readonly fee?: number;

  @Column({ nullable: true })
  readonly psn?: number;

  @Column({ nullable: true })
  readonly psnh?: number;

  @Column({ nullable: true })
  readonly name?: string;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  readonly referralBonus?: number;

  @Column({ nullable: true })
  readonly seedBlock?: number;

  @Column({ nullable: true })
  readonly seedTimestamp?: number;

  @Column({ type: 'boolean', default: false })
  readonly seedTransactionFetched: boolean;

  @Column({ nullable: true })
  readonly websiteUrl?: string;

  @Column({ nullable: true })
  readonly visibility?: string;
}
