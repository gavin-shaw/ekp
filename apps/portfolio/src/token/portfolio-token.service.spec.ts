import { BlockchainTokenService } from '@app/sdk';
import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioTokenService } from './portfolio-token.service';

describe('PortfolioTokenService', () => {
  let service: PortfolioTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortfolioTokenService],
    })
      .useMocker((token) => {
        if (token === BlockchainTokenService) {
          return {};
        }
      })
      .compile();

    service = module.get<PortfolioTokenService>(PortfolioTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
