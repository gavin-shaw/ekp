import { Module } from '@nestjs/common';
import { FarmListener } from './farm.listener';
import { FarmConfigService } from './farm-config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from './entity/farm.entity';
import { Transaction } from './entity/transaction.entity';
import { FarmGateway } from './farm.gateway';
import { CurrencyService } from './currency.service';
import { Currency } from './entity/currency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Farm, Transaction, Currency])],
  providers: [FarmListener, FarmConfigService, FarmGateway, CurrencyService],
})
export class FarmModule {}
