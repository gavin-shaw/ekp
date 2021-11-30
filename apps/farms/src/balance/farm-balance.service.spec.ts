import { Test, TestingModule } from '@nestjs/testing';
import { FarmBalanceService } from './farm-balance.service';
import { BlockchainProviderService, BlockchainTokenService } from '@app/sdk';
import { Logger } from '@nestjs/common';

describe('BalanceService', () => {
  let service: FarmBalanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmBalanceService],
    })
      .useMocker((token) => {
        if (token === BlockchainTokenService) {
          return {};
        }
        if (token === BlockchainProviderService) {
          return {};
        }
        if (token === Logger) {
          return {};
        }
      })
      .compile();

    service = module.get<FarmBalanceService>(FarmBalanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
