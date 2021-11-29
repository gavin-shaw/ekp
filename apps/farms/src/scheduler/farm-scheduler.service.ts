import { Injectable } from '@nestjs/common';
import { FarmMetaService } from '../meta';
import { FarmPersistService } from '../persist';

@Injectable()
export class FarmSchedulerService {
  constructor(
    private farmPersistService: FarmPersistService,
    private farmMetaService: FarmMetaService,
  ) {}

  async onApplicationBootstrap() {
    await this.farmPersistService.loadStarterFarms();

    const farms = await this.farmPersistService.getEnabledFarms();

    this.farmMetaService.updateMeta(farms);
  }
}
