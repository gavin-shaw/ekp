import * as etherscan from '@app/etherscan';
import {
  BlockchainTokenService,
  BlockchainTransactionService,
  EtherscanService,
  Transaction,
} from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import moment from 'moment';
import { FarmPersistService, Farm } from '../persist';

@Injectable()
export class FarmMetaService {
  constructor(
    private blockchainTokenService: BlockchainTokenService,
    private blockchainTransactionService: BlockchainTransactionService,
    private etherscanService: EtherscanService,
    private logger: Logger,
    private farmPersistService: FarmPersistService,
  ) {}

  private contractDetailsLimiter = new Bottleneck({
    maxConcurrent: 10,
  });

  async updateMeta(farms: Farm[]) {
    return await Promise.all(
      farms.map((farm) => {
        return this.contractDetailsLimiter.schedule(async () => {
          try {
            const updatedFarm = await this.getFarmWithContractDetails(farm);
            await this.farmPersistService.save([updatedFarm]);
          } catch (error) {
            this.logger.error(error);
            return farm;
          }
        });
      }),
    );
  }

  async getFarmWithContractDetails(farm: Farm) {
    if (farm.seedTransactionFetched && farm.contractFetched) {
      // Nothing more to fetch, no need to reprocess
      return farm;
    }

    if (!farm.contractAddress) {
      this.logger.warn('Could not update farm, no contract address');
      return {
        ...farm,
        disabled: true,
        disabledReason: 'Missing contract address',
      };
    }

    this.logger.log(`Checking for updates to contract`, {
      contractName: farm.contractName,
      contractAddress: farm.contractAddress,
    });

    const farmWithSourceDetails = await this.parseContractSource(farm);

    if (
      !farmWithSourceDetails.contractFetched ||
      farmWithSourceDetails.disabled
    ) {
      return farmWithSourceDetails;
    }

    const farmWithSeedDetails = await this.parseContractSeedTransaction(
      farmWithSourceDetails,
    );

    return farmWithSeedDetails;
  }

  private async parseContractSeedTransaction(farm: Farm): Promise<Farm> {
    if (farm.seedTransactionFetched) {
      return farm;
    }

    const seedTransaction = await this.getSeedTransaction(farm);

    if (!seedTransaction) {
      this.logger.warn('Could not find seed transaction for farm', {
        contractAddress: farm.contractAddress,
      });

      const ageSeconds = moment().unix() - farm.created;

      if (ageSeconds > 86400) {
        this.logger.warn(
          'Disabling farm after trying to find seed transaction for 24 hours',
          { contractAddress: farm.contractAddress },
        );
        return {
          ...farm,
          disabled: true,
          disabledReason:
            'Could not find seed transaction after waiting 24 hours',
        };
      }
    }

    const farmWithSeedTransaction = {
      ...farm,
      seedBlock: seedTransaction.blockNumber,
      seedHash: seedTransaction.hash,
      seedTimestamp: seedTransaction.timeStamp,
    };

    const receipt = await this.blockchainTransactionService.getReceipt(
      seedTransaction,
    );

    if (!receipt) {
      this.logger.warn('Could not fetch logs for seed transaction for farm', {
        contractAddress: farmWithSeedTransaction.contractAddress,
        transactionHash: seedTransaction.hash,
      });

      return {
        ...farmWithSeedTransaction,
        disabled: true,
        disabledReason: 'Failed to read logs for seed transaction',
      };
    }

    if (!receipt.logs || receipt.logs.length === 0) {
      // No token transfer logs, the farm currency is BNB
      return {
        ...farmWithSeedTransaction,
        currencyAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
        currencyName: 'BNB',
        currencyDecimals: 18,
        seedTransactionFetched: true,
      };
    } else {
      const tokenAddress = receipt.logs[0]?.address;

      if (!tokenAddress) {
        this.logger.warn('Could not find token address in seed transcaction', {
          contractAddress: farm.contractAddress,
          transactionHash: receipt.transactionHash,
        });
        return {
          ...farmWithSeedTransaction,
          disabled: true,
          disabledReason: 'No token address in seed transaction',
        };
      }

      const tokenDetails = await this.blockchainTokenService.getTokenDetails(
        tokenAddress,
      );

      if (!tokenDetails) {
        this.logger.warn('Could not fetch token details', {
          contractAddress: farm.contractAddress,
          tokenAddress: tokenAddress,
        });
        return {
          ...farm,
          currencyAddress: tokenAddress,
          disabled: true,
          disabledReason: 'Failed to fetch token details',
        };
      }

      return {
        ...farm,
        currencyAddress: tokenDetails.tokenAddress,
        currencyName: tokenDetails.symbol,
        currencyDecimals: Number(tokenDetails.decimals),
        seedTransactionFetched: true,
      };
    }
  }

  private async getSeedTransaction(farm: Farm): Promise<Transaction> {
    return await this.blockchainTransactionService.findFirstWithMethodSig({
      address: farm.contractAddress,
      methodSig: '3b653755',
      limit: 10,
    });
  }

  private async parseContractSource(farm: Farm): Promise<Farm> {
    if (farm.contractFetched) {
      return farm;
    }

    const api = this.etherscanService.getApi();

    const sourceCodeWrappers = await api.contract.getContractSourceCode(
      farm.contractAddress,
    );

    if (!sourceCodeWrappers || !sourceCodeWrappers[0].SourceCode) {
      // Without any contract info or source code, we can't find out further information about the farm
      // Its a dangerous farm anyway
      this.logger.warn('Could not retrieve source code for farm', {
        contractAddress: farm.contractAddress,
      });

      return {
        ...farm,
        disabled: true,
        disabledReason: 'Failed to retrieve source code',
      };
    }

    // TODO: there is a potential for a bug here if a contract has multiple source code responses from BSC scan
    // This has not happened yet, so this is being triaged, but should not be forgotten
    // I don't know yet how to choose which source code index to use for parsing, or maybe I need to parse all of them
    const result = this.parseContractInfo(farm, sourceCodeWrappers[0]);

    return { ...farm, ...result, contractFetched: true };
  }

  private parseContractInfo(
    farm: Farm,
    sourceCodeWrapper: etherscan.SourceCode,
  ): Farm {
    let verified = true;

    try {
      JSON.parse(sourceCodeWrapper.ABI);
    } catch {
      verified = false;
    }

    if (!verified) {
      // If the contract source code has not been verified, disable this farm, it is dangerous
      this.logger.warn('Contract is unverified, disabling', {
        contractAddress: farm.contractAddress,
      });

      return {
        ...farm,
        disabled: true,
        disabledReason: 'Contract is unverified',
      };
    }

    return {
      ...farm,
      contractAbi: JSON.parse(sourceCodeWrapper.ABI),
      contractName: sourceCodeWrapper.ContractName,
      contractSource: sourceCodeWrapper.SourceCode,
      fee: this.getFeePc(sourceCodeWrapper.SourceCode, farm.contractAddress),
      referralBonus: this.getReferralPc(
        sourceCodeWrapper.SourceCode,
        farm.contractAddress,
      ),
      dailyRoi: this.getDailyPc(
        sourceCodeWrapper.SourceCode,
        farm.contractAddress,
      ),
      psn: this.getPsn(sourceCodeWrapper.SourceCode, farm.contractAddress),
      psnh: this.getPsnh(sourceCodeWrapper.SourceCode, farm.contractAddress),
    };
  }

  private getFeePc(
    contractSource: string,
    contractAddress: string,
  ): number | undefined {
    const methodRegexResult = /devFee\(uint256 [^\}]+\}/m.exec(contractSource);

    if (!methodRegexResult) {
      this.logger.warn('Could not find FeePc in contract sournce', {
        contractAddress,
      });
      return undefined;
    }

    const valueRegexResult = /SafeMath.mul\(amount,(\d+)\)/.exec(
      methodRegexResult[0],
    );

    if (!valueRegexResult) {
      this.logger.warn('Could not find FeePc in contract sournce', {
        contractAddress,
      });
      return undefined;
    }

    return Number((Number(valueRegexResult[1]) / 100).toFixed(4));
  }

  private getReferralPc(
    contractSource: string,
    contractAddress: string,
  ): number | undefined {
    const regexResult =
      /claimedEggs\[referrals\[msg\.sender\]\],SafeMath.div\([^,]+,(\d+)\)/m.exec(
        contractSource,
      );

    if (!regexResult || !regexResult[1]) {
      this.logger.warn('Could not find ReferralPc in contract source', {
        contractAddress,
      });
      return undefined;
    }

    return Number((1 / Number(regexResult[1])).toFixed(4));
  }

  private getDailyPc(
    contractSource: string,
    contractAddress: string,
  ): number | undefined {
    const regexResult = /uint256 public EGGS_TO_HATCH_1MINERS\=(\d+);/m.exec(
      contractSource,
    );

    if (!regexResult || !regexResult[1]) {
      this.logger.warn('Could not find DailyPc in contract source', {
        contractAddress,
      });
      return undefined;
    }

    return Number((86400 / Number(regexResult[1])).toFixed(4));
  }

  private getPsn(
    contractSource: string,
    contractAddress: string,
  ): number | undefined {
    const regexResult = /uint256 PSN\=(\d+);/m.exec(contractSource);

    if (!regexResult || !regexResult[1]) {
      this.logger.warn('Could not find Psn in contract source.', {
        contractAddress,
      });
      return undefined;
    }

    return Number(regexResult[1]);
  }

  private getPsnh(
    contractSource: string,
    contractAddress: string,
  ): number | undefined {
    const regexResult = /uint256 PSNH\=(\d+);/m.exec(contractSource);

    if (!regexResult || !regexResult[1]) {
      this.logger.warn('Could not find Psnh in contract source', {
        contractAddress,
      });
      return undefined;
    }

    return Number(regexResult[1]);
  }
}
