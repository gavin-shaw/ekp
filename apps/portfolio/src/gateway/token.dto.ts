export interface TokenDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: number;
  balanceFormatted: string;
  coinLink?: string;
  created: number;
  description?: string;
  fiatValue?: number;
  fiatValueFormatted?: string;
  name: string;
  swapLink?: string;
  symbol: string;
  tokenAddress: string;
  tokenLink?: string;
  updated: number;
  walletAddress: string;
  walletTokenLink?: string;
}
