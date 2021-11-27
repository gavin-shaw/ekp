import { Query, QueryParams, RequestConfig } from './Query';

export type AccountQueryParams = Omit<
  QueryParams,
  'address' | 'contractAddress' | 'txhash' | 'module' | 'action'
>;

export interface BlockRange {
  startBlock?: number;
  endBlock: number;
}

export interface AddressBalance {
  account: string;
  balance: string;
}

export interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export interface InternalTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}

export interface TokenTransferEvent {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export class Account {
  constructor(private query: Query) {}
  getBnbBalance(
    address: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<string>(
      {
        ...queryOptions,
        address,
        module: 'account',
        action: 'balance',
        tag: 'latest',
      },
      requestConfig,
    );
  }

  getBnbBalanceForMultipleAddresses(
    addresses: string[],
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<AddressBalance[]>(
      {
        ...queryOptions,
        address: addresses.join(','),
        module: 'account',
        action: 'balancemulti',
        tag: 'latest',
      },
      requestConfig,
    );
  }

  getInternalTransactionsByAddress(
    address: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<InternalTransaction[]>(
      {
        ...queryOptions,
        address,
        module: 'account',
        action: 'txlistinternal',
      },
      requestConfig,
    );
  }

  getInternalTransactionsByHash(
    txhash: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<InternalTransaction[]>(
      {
        ...queryOptions,
        txhash,
        module: 'account',
        action: 'txlistinternal',
      },
      requestConfig,
    );
  }

  getInternalTransactionsByBlockRange(
    blockRange: BlockRange,
    queryOptions?: Omit<AccountQueryParams, 'startBlock' | 'endBlock'>,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<InternalTransaction[]>(
      {
        ...queryOptions,
        ...blockRange,
        module: 'account',
        action: 'txlistinternal',
      },
      requestConfig,
    );
  }

  getTokenTransferEventsByAddress(
    address: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<TokenTransferEvent[]>(
      {
        ...queryOptions,
        address,
        module: 'account',
        action: 'tokentx',
      },
      requestConfig,
    );
  }

  getTokenTransferEventsByContractAddress(
    contractAddress: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<TokenTransferEvent[]>(
      {
        ...queryOptions,
        contractAddress,
        module: 'account',
        action: 'tokentx',
      },
      requestConfig,
    );
  }

  getTokenTransferEventsByAddressAndContractAddress(
    address: string,
    contractAddress: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<TokenTransferEvent[]>(
      {
        ...queryOptions,
        address,
        contractAddress,
        module: 'account',
        action: 'tokentx',
      },
      requestConfig,
    );
  }

  getTransactions(
    address: string,
    queryOptions?: AccountQueryParams,
    requestConfig?: RequestConfig,
  ) {
    return this.query.execute<Transaction[]>(
      {
        ...queryOptions,
        address,
        module: 'account',
        action: 'txlist',
      },
      requestConfig,
    );
  }
}
