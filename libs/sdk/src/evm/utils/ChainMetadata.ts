import { ChainId } from './ChainId';

export interface ChainMetadata {
  readonly chainId: ChainId;
  readonly logo: string;
  readonly name: string;
  readonly token: {
    readonly contractAddress: string;
    readonly decimals: number;
    readonly name: string;
    readonly symbol: string;
  };
}
