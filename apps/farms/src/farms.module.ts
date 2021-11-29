import { DatabaseModule, GlobalModule, LoggerModule } from '@app/sdk';
import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmBalanceService } from './balance';
import { FarmGateway } from './gateway';
import { FarmMetaService } from './meta';
import { Farm, FarmPersistService } from './persist';
import { FarmSchedulerService } from './scheduler';
import { FarmUiService } from './ui';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    DatabaseModule,
    GlobalModule,
    LoggerModule,
    TypeOrmModule.forFeature([Farm]),
  ],
  providers: [
    FarmGateway,
    FarmMetaService,
    FarmPersistService,
    FarmSchedulerService,
    FarmUiService,
    FarmBalanceService,
  ],
})
export class FarmsModule {}
