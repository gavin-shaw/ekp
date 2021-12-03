export interface TokenDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: number;
  balanceFormatted: string;
  coinLink?: string;
  description?: string;
  fiatValue?: number;
  fiatValueFormatted?: string;
  name: string;
  swapLink?: string;
  symbol: string;
  tokenAddress: string;
  tokenLink?: string;
  walletAddress: string;
  walletTokenLink?: string;
}
