import { Test, TestingModule } from '@nestjs/testing';
import { FarmBalanceService } from './farm-balance.service';
import { BlockchainProviderService, BlockchainTokenService } from '@app/sdk';

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
      })
      .compile();

    service = module.get<FarmBalanceService>(FarmBalanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
