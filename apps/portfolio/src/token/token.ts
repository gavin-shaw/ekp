export interface Token {
  readonly balance: number;
  readonly chain: string;
  readonly name: string;
  readonly symbol: string;
  readonly tokenAddress: string;
  readonly walletAddress: string;
}
