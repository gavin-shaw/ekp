export interface TokenDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: number;
  balanceFormatted: string;
  coinLink?: string;
  created: number;
  decimals: number;
  description?: string;
  fiatValue?: number;
  fiatValueFormatted?: string;
  logo?: string;
  name: string;
  swapLink?: string;
  symbol: string;
  thumbnail?: string;
  tokenAddress: string;
  tokenLink?: string;
  updated: number;
  walletAddress: string;
  walletTokenLink?: string;
}
