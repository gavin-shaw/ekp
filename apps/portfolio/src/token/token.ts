export interface Token {
  readonly balance: number;
  readonly chain: string;
  readonly decimals: number;
  readonly logo?: number;
  readonly name: string;
  readonly symbol: string;
  readonly thumbnail?: number;
  readonly tokenAddress: string;
  readonly walletAddress: string;
}
