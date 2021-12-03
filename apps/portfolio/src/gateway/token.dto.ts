export interface TokenDto {
  allowBurnToken?: boolean;
  balance: number;
  balanceFormatted: string;
  coinLink?: string;
  description?: string;
  fiatValue?: number;
  fiatValueFormatted?: string;
  name: string;
  symbol: string;
  tokenAddress: string;
  walletAddress: string;
}
