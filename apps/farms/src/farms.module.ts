import { DatabaseModule, GlobalModule } from '@app/sdk';
import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from './entity/farm.entity';
import { FarmContractService } from './farm-contract.service';
import { FarmGateway } from './farm.gateway';
import { FarmService } from './service/farm.service';
import { SchedulerService } from './service/scheduler.service';
import { UiService } from './service/ui.service';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    GlobalModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Farm]),
  ],
  providers: [
    FarmContractService,
    FarmGateway,
    FarmService,
    SchedulerService,
    UiService,
  ],
})
export class FarmsModule {}
