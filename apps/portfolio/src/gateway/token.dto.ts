export interface TokenDto {
  balance: number;
  fiatValue?: number;
  name: string;
  symbol: string;
  tokenAddress: string;
  walletAddress: string;
}
