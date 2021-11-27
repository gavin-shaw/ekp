import { CurrencyService } from '@app/sdk';
import { Test, TestingModule } from '@nestjs/testing';
import { UiService } from './ui.service';

describe('UiService', () => {
  let service: UiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UiService],
    })
      .useMocker((token) => {
        if (token === CurrencyService) {
          return {};
        }
      })
      .compile();

    service = module.get<UiService>(UiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
