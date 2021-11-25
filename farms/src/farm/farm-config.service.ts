import { formatEther, formatUnits } from '@ethersproject/units';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { account, contract } from 'bsc-scan';
import { Contract, ethers } from 'ethers';
import { Repository } from 'typeorm';
import bep20Abi from '../abi/bep20.json';
import { Farm } from './entity/farm.entity';
import { Transaction } from './entity/transaction.entity';
import Bottleneck from 'bottleneck';
import starterFarms from './entity/starter-farms';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqual = require('deep-equal');

const providerLimiter = new Bottleneck({
  minTime: 200,
  maxConcurrent: 5,
  reservoir: 5,
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 1000,
});

@Injectable()
export class FarmConfigService {
  constructor(
    @InjectRepository(Farm) private farmRepository: Repository<Farm>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @Inject(ethers.providers.Provider)
    private provider: ethers.providers.Provider,
    private eventEmitter: EventEmitter2,
  ) {}

  private logger: Logger = new Logger('AppGateway');

  async onApplicationBootstrap() {
    await this.loadStarterFarms();
    this.loadFarms();
  }

  async loadStarterFarms() {
    const farms = await this.farmRepository.find();
    const farmAddresses = farms.map((farm) => farm.contractAddress);

    const newStarterFarms = starterFarms.filter(
      (starterFarm) => !farmAddresses.includes(starterFarm),
    );

    if (newStarterFarms.length > 0) {
      await this.farmRepository.save(
        newStarterFarms.map((contractAddress) => ({
          contractAddress,
        })),
      );
    }
  }

  async loadFarms() {
    const farms = await this.farmRepository.find();

    for (const farm of farms) {
      if (!farm.disabled) {
        providerLimiter.schedule(() => this.updateConfig(farm));
      }
    }

    this.eventEmitter.emit('farm.updated', farms);
  }

  async updateConfig(farm: Farm) {
    if (!farm.contractAddress) {
      this.logger.warn('Could not update farm, no contract address');
      return;
    }

    const originalFarm = { ...farm };

    this.logger.debug(`Starting farm update: ${farm.contractName}`);

    if (!farm.contractSource) {
      const sourceCode = (await contract.getContractSourceCode(
        farm.contractAddress,
      )) as contract.SourceCode[];

      if (!!sourceCode && sourceCode.length > 0) {
        farm.contractAbi = sourceCode[0].ABI;
        farm.contractName = sourceCode[0].ContractName;
        farm.contractSource = sourceCode[0].SourceCode;

        if (!!farm.contractSource) {
          this.parseFeePc(farm);
          this.parseReferralPc(farm);
          this.parseDailyPc(farm);
          this.parsePsn(farm);
          this.parsePsnh(farm);
        }
      } else {
        this.logger.warn(
          'Could not retrieve source code for farm',
          farm.contractAddress,
        );
      }
    }

    if (farm.contractAbi === 'Contract source code not verified') {
      delete farm.contractAbi;
      delete farm.contractSource;
      farm.disabled = true;
      this.farmRepository.save(farm);
      return;
    }

    if (
      !farm.seedTimestamp ||
      !farm.seedBlock ||
      !farm.currencyAddress ||
      !farm.currencyName
    ) {
      const seedTransaction = await this.getSeedTransaction(farm);

      if (!!seedTransaction) {
        farm.seedTimestamp = seedTransaction.timeStamp;
        farm.seedBlock = seedTransaction.blockNumber;
        const receipt = await this.provider.getTransactionReceipt(
          seedTransaction.hash,
        );
        if (!!receipt) {
          if (!receipt.logs || receipt.logs.length === 0) {
            // No token transfer logs, this farm is in BNB
            farm.currencyAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
            farm.currencyName = 'BNB';
            farm.currencyDecimals = 18;
          } else {
            farm.currencyAddress = receipt.logs[0]?.address;

            const tokenAbi: string = (await contract.getContractAbi(
              farm.currencyAddress,
            )) as string;

            const tokenContract = new ethers.Contract(
              farm.currencyAddress,
              new ethers.utils.Interface(tokenAbi),
              this.provider,
            );

            try {
              farm.currencyDecimals = await tokenContract.decimals();
            } catch (error) {
              try {
                farm.currencyDecimals = await tokenContract._decimals();
              } catch {
                farm.currencyDecimals = 18;
              }
            }

            try {
              farm.currencyName = await tokenContract.symbol();
            } catch (error) {
              try {
                farm.currencyName = await tokenContract._symbol();
              } catch {
                this.logger.warn(
                  `Could not find symbol name for currency ${farm.currencyAddress}`,
                );
              }
            }
          }
        } else {
          this.logger.warn(
            'Could not get seed transaction receipt for farm',
            farm.contractAddress,
          );
        }
      } else {
        this.logger.warn(
          'Could not find seed transaction for farm',
          farm.contractAddress,
        );
      }
    }

    // if (!!farm.currencyAddress && !!farm.currencyDecimals) {
    //   const contract = new Contract(
    //     farm.currencyAddress,
    //     bep20Abi,
    //     this.provider,
    //   );

    //   const bn = await contract.balanceOf(farm.contractAddress);
    //   farm.balance = Number(formatUnits(bn, farm.currencyDecimals));
    // } else {
    //   const bn = await this.provider.getBalance(farm.contractAddress);
    //   farm.balance = Number(formatEther(bn));
    // }

    if (farm.contractName === '') {
      delete farm.contractName;
    }

    if (!deepEqual(originalFarm, farm)) {
      this.logger.log(`Updating farm ${farm.contractName}`);
      farm.updated = Math.floor(new Date().getTime() / 1000);
    }

    if (!farm.created) {
      farm.created = Math.floor(new Date().getTime() / 1000);
    }

    if (!farm.updated) {
      farm.updated = Math.floor(new Date().getTime() / 1000);
    }

    this.logger.debug(`Saving farm ${farm.contractName}`);

    await this.farmRepository.save(farm);
  }

  async getSeedTransaction(farm: Farm): Promise<Transaction> {
    // Check if we have a seed transaction in the database already
    const existingTransactions = await this.transactionRepository.find({
      where: {
        contractAddress: farm.contractAddress,
        methodName: 'seedMarket',
      },
    });

    if (!!existingTransactions && existingTransactions.length > 0) {
      return existingTransactions[0];
    }

    // If we don't have one

    // Get the first 10 transactions for the contract
    const firstTransactions = (await account.getTransactions(
      farm.contractAddress,
      {
        sort: 'asc',
        page: 1,
        offset: 10,
      },
    )) as account.Transaction[];

    // Search for the seed transaction
    for (const transaction of firstTransactions) {
      const methodName = this.getMethodName(transaction, farm.contractAbi);

      if (methodName === 'seedMarket') {
        // Save the transaction to the database first so we don't need to fetch it again
        const transactionEntity = new Transaction();
        Object.assign(transactionEntity, transaction);
        transactionEntity.methodName = methodName;
        await this.transactionRepository.save(transactionEntity);

        // Return the transaction
        return transactionEntity;
      }
    }

    // Return undefined if we couldn't find one
    return undefined;
  }

  getMethodName(transaction: account.Transaction, abi: string): string {
    if (!transaction || !abi) {
      return undefined;
    }
    try {
      const transactionDescription = new ethers.utils.Interface(
        abi,
      ).parseTransaction({
        data: transaction.input,
      });

      return transactionDescription.name;
    } catch (error) {
      return undefined;
    }
  }

  private parseFeePc(farm: Farm) {
    const methodRegexResult = /devFee\(uint256 [^\}]+\}/m.exec(
      farm.contractSource,
    );

    if (!!methodRegexResult) {
      const valueRegexResult = /SafeMath.mul\(amount,(\d+)\)/.exec(
        methodRegexResult[0],
      );
      if (!!valueRegexResult) {
        farm.fee = Number((Number(valueRegexResult[1]) / 100).toFixed(4));
      }
    }
  }

  private parseReferralPc(farm: Farm) {
    const regexResult =
      /claimedEggs\[referrals\[msg\.sender\]\],SafeMath.div\([^,]+,(\d+)\)/m.exec(
        farm.contractSource,
      );

    if (!!regexResult && !!regexResult[1]) {
      farm.referralBonus = Number((1 / Number(regexResult[1])).toFixed(4));
    }
  }

  private parseDailyPc(farm: Farm) {
    const regexResult = /uint256 public EGGS_TO_HATCH_1MINERS\=(\d+);/m.exec(
      farm.contractSource,
    );

    if (!!regexResult && !!regexResult[1]) {
      farm.dailyRoi = Number((86400 / Number(regexResult[1])).toFixed(4));
    }
  }

  private parsePsn(farm: Farm) {
    const regexResult = /uint256 PSN\=(\d+);/m.exec(farm.contractSource);

    if (!!regexResult && !!regexResult[1]) {
      farm.psn = Number(regexResult[1]);
    }
  }

  private parsePsnh(farm: Farm) {
    const regexResult = /uint256 PSNH\=(\d+);/m.exec(farm.contractSource);

    if (!!regexResult && !!regexResult[1]) {
      farm.psnh = Number(regexResult[1]);
    }
  }
}
