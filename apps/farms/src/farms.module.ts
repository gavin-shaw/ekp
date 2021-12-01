import { DatabaseModule, GlobalModule } from '@app/sdk';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmBalanceService } from './balance';
import { FarmGateway } from './gateway';
import { FarmMetaService } from './meta';
import { Farm, FarmPersistService } from './persist';
import { FarmSchedulerService } from './scheduler';
import { FarmUiService } from './ui';

@Module({
  imports: [GlobalModule, DatabaseModule, TypeOrmModule.forFeature([Farm])],
  providers: [
    FarmBalanceService,
    FarmGateway,
    FarmMetaService,
    FarmPersistService,
    FarmSchedulerService,
    FarmUiService,
  ],
})
export class FarmsModule {}
