import { DatabaseModule, GlobalModule } from '@app/sdk';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from './entity/farm.entity';
import { ContractService } from './farm-contract.service';
import { FarmGateway } from './farm.gateway';
import { FarmService } from './service/farm.service';
import { SchedulerService } from './service/scheduler.service';
import { UiService } from './service/ui.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true }),
    GlobalModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Farm]),
  ],
  providers: [
    ContractService,
    FarmGateway,
    FarmService,
    SchedulerService,
    UiService,
  ],
})
export class FarmsModule {}
