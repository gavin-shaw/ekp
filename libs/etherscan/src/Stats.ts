import { Query, RequestConfig } from './Query';

export type Validator = {
  validatorAddress: string;
  validatorName: string;
  validatorStatus: string;
  validatorVotingPower: string;
  validatorVotingPowerProportion: string;
};

export class Stats {
  constructor(private query: Query) {}

  getBnbTotalSupply(requestConfig?: RequestConfig) {
    return this.query.execute<string>(
      {
        module: 'stats',
        action: 'bnbsupply',
      },
      requestConfig,
    );
  }

  getValidatorsList(requestConfig?: RequestConfig) {
    return this.query.execute<Validator[]>(
      {
        module: 'stats',
        action: 'validators',
      },
      requestConfig,
    );
  }
}
