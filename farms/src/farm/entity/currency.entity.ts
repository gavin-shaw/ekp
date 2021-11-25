import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('currency')
export class Currency {
  @PrimaryColumn()
  id: string;

  @Column()
  created: number;

  @Column()
  updated: number;

  @Column()
  coinAddress: string;

  @Column()
  coinId: string;

  @Column()
  fiatSymbol: string;

  @Column({ type: 'decimal', scale: 18, precision: 36 })
  rate: number;
}
