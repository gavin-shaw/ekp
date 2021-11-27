import { Test, TestingModule } from '@nestjs/testing';
import { FarmContractService } from '../farm-contract.service';
import { FarmService } from './farm.service';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulerService],
    })
      .useMocker((token) => {
        if (token === FarmService) {
          return {};
        }
        if (token === FarmContractService) {
          return {};
        }
      })
      .compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
