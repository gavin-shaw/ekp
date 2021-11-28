import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainProviderService } from './blockchain-provider.service';
import { BlockchainTokenService } from './blockchain-token.service';
import { EtherscanService } from './etherscan.service';

describe('BlockchainTokenService', () => {
  let service: BlockchainTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockchainTokenService],
    })
      .useMocker((token) => {
        if (token === EtherscanService) {
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

    service = module.get<BlockchainTokenService>(BlockchainTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
