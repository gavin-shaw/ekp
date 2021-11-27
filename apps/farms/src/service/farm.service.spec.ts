import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Farm } from '../entity/farm.entity';
import { FarmService } from './farm.service';

describe('FarmService', () => {
  let service: FarmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmService],
    })
      .useMocker((token) => {
        if (token === getRepositoryToken(Farm)) {
          return {};
        }
      })
      .compile();

    service = module.get<FarmService>(FarmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
