import axios, { AxiosRequestConfig } from 'axios';
import Bottleneck from 'bottleneck';
import _ from 'lodash';
import qs from 'querystring';
import { Config } from './Config';

export type Module = 'account' | 'contract' | 'stats' | 'token';

export type AccountAction =
  | 'balance'
  | 'balancemulti'
  | 'txlist'
  | 'txlistinternal'
  | 'tokentx'
  | 'getminedblocks';

export type ContractAction = 'getabi' | 'getsourcecode';

export type TokenAction = 'tokeninfo';

export type StatsAction =
  | 'tokensupply'
  | 'tokenCsupply'
  | 'tokenbalance'
  | 'tokenbalancehistory'
  | 'bnbsupply'
  | 'validators';

export type QueryParams = {
  module: Module;
  action: AccountAction | ContractAction | StatsAction | TokenAction;
  address?: string;
  contractAddress?: string;
  txhash?: string;
  startBlock?: number;
  endBlock?: number;
  blockno?: number;
  page?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
  tag?: string;
  apiKey?: string;
};

export type RequestConfig = {
  axiosConfig?: AxiosRequestConfig;
};

export type Response<T> = {
  status: '0' | '1';
  message: string;
  result: T;
};

export class Query {
  constructor(private config: Config) {}

  private limiter = new Bottleneck({
    minTime: Math.floor(1000 / this.config.maxRequestsPerSecond),
    maxConcurrent: this.config.maxRequestsPerSecond,
    reservoir: this.config.maxRequestsPerSecond,
    reservoirRefreshAmount: this.config.maxRequestsPerSecond,
    reservoirRefreshInterval: 1000,
  });

  async execute<T>(
    queryOptions: QueryParams,
    requestConfig?: RequestConfig,
  ): Promise<T> {
    const {
      address,
      contractAddress,
      txhash,
      module,
      action,
      startBlock = 0,
      endBlock = 99999999,
      page = undefined,
      offset = 10000,
      sort = 'asc',
      apiKey = this.config.apiKey,
    } = queryOptions;

    const queryParams = _.pickBy(
      {
        address,
        contractAddress,
        txhash,
        module,
        action,
        startBlock,
        endBlock,
        page,
        offset,
        sort,
        apiKey,
      },
      _.identity,
    );

    const { axiosConfig } = requestConfig || {};

    const query = qs.stringify(queryParams);

    return await this.limiter.schedule(async () => {
      const response = await axios.get<Response<T>>(
        `${this.config.url}/api?${query}`,
        axiosConfig,
      );

      const { status, result } = response.data as Response<T>;

      if (status === '0') {
        throw new Error(String(result));
      }

      return result;
    });
  }
}
