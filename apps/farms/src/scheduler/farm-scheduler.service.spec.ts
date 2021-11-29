import { Test, TestingModule } from '@nestjs/testing';
import { FarmMetaService, FarmPersistService, FarmSchedulerService } from '..';

describe('SchedulerService', () => {
  let service: FarmSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmSchedulerService],
    })
      .useMocker((token) => {
        if (token === FarmPersistService) {
          return {};
        }
        if (token === FarmMetaService) {
          return {};
        }
      })
      .compile();

    service = module.get<FarmSchedulerService>(FarmSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
