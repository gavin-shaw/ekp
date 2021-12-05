export interface Token {
  readonly balance: number;
  readonly balanceRaw: string;
  readonly chain: string;
  readonly decimals: number;
  readonly fiatValue?: number;
  readonly logo?: string;
  readonly name: string;
  readonly price?: number;
  readonly symbol: string;
  readonly thumbnail?: number;
  readonly tokenAddress: string;
  readonly walletAddress: string;
}
