import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Farm, FarmPersistService } from '..';

describe('FarmService', () => {
  let service: FarmPersistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmPersistService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(Farm)) {
          return {};
        }
      })
      .compile();

    service = module.get<FarmPersistService>(FarmPersistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
