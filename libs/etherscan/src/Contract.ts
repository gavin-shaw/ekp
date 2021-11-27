import { Query, RequestConfig } from './Query';

export interface SourceCode {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export class Contract {
  constructor(private query: Query) {}

  getContractAbi(address: string, requestConfig?: RequestConfig) {
    return this.query.execute<string>(
      {
        address,
        module: 'contract',
        action: 'getabi',
      },
      requestConfig,
    );
  }

  getContractSourceCode(address: string, requestConfig?: RequestConfig) {
    return this.query.execute<SourceCode[]>(
      {
        address,
        module: 'contract',
        action: 'getsourcecode',
      },
      requestConfig,
    );
  }
}
