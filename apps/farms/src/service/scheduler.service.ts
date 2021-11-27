import { Injectable } from '@nestjs/common';
import { FarmService } from './farm.service';
import { ContractService } from '../farm-contract.service';

@Injectable()
export class SchedulerService {
  constructor(
    private farmService: FarmService,
    private contractService: ContractService,
  ) {}

  async onApplicationBootstrap() {
    await this.farmService.loadStarterFarms();
    const farms = await this.farmService.getCurrentFarms();
    this.contractService.getFarmsWithContractDetails(farms);
  }
}
