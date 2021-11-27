import { BlockchainTransactionService, EtherscanService } from '@app/sdk';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FarmContractService } from './farm-contract.service';

describe('ContractService', () => {
  let service: FarmContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmContractService],
    })
      .useMocker((token) => {
        if (token === Logger) {
          return {};
        }
        if (token === BlockchainTransactionService) {
          return {};
        }
        if (token === EtherscanService) {
          return {};
        }
      })
      .compile();

    service = module.get<FarmContractService>(FarmContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
