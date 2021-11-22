import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('farm')
export class Farm {
  @PrimaryColumn()
  contractAddress: string;

  @Column({ nullable: true })
  created?: number;

  @Column({ nullable: true })
  updated?: number;

  @Column({ nullable: true, type: 'decimal', scale: 18, precision: 36 })
  balance?: number;

  @Column({ nullable: true, type: 'text' })
  contractAbi?: string;

  @Column({ nullable: true })
  contractName?: string;

  @Column({ nullable: true, type: 'text' })
  contractSource?: string;

  @Column({ nullable: true })
  currencyAddress?: string;

  @Column({ nullable: true })
  currencyName?: string;

  @Column({ nullable: true })
  currencyDecimals?: number;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  dailyRoi?: number;

  @Column({ default: false })
  disabled: boolean;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  fee?: number;

  @Column({ nullable: true })
  psn?: number;

  @Column({ nullable: true })
  psnh?: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true, type: 'decimal', scale: 3, precision: 5 })
  referralBonus?: number;

  @Column({ nullable: true })
  seedBlock?: number;

  @Column({ nullable: true })
  seedTimestamp?: number;

  @Column({ nullable: true })
  websiteUrl?: string;

  @Column({ nullable: true })
  visibility?: string;
}
