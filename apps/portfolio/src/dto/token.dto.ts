export interface TokenDto {
  allowBurnToken?: boolean;
  allowSwap?: boolean;
  balance: number;
  balanceFormatted: string;
  burnTxRpc?: Record<string, unknown>;
  chainLogo?: string;
  coinLink?: string;
  decimals: number;
  fiatValue?: number;
  fiatValueFormatted?: string;
  logo?: string;
  name: string;
  price?: number;
  priceFormatted?: string;
  swapLink?: string;
  symbol: string;
  thumbnail?: string;
  tokenAddress: string;
  tokenLink?: string;
  walletAddress: string;
  walletTokenLink?: string;
}
