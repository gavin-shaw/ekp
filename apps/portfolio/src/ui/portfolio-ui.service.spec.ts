import { CurrencyService } from '@app/sdk';
import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioUiService } from './portfolio-ui.service';

describe('PortfolioUiService', () => {
  let service: PortfolioUiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortfolioUiService],
    })
      .useMocker((token) => {
        if (token === CurrencyService) {
          return {};
        }
      })
      .compile();

    service = module.get<PortfolioUiService>(PortfolioUiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
