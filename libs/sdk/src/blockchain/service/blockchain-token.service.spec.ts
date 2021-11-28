import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainTokenService } from './blockchain-token.service';

describe('BlockchainTokenService', () => {
  let service: BlockchainTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockchainTokenService],
    }).compile();

    service = module.get<BlockchainTokenService>(BlockchainTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
