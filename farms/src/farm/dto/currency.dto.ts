/**
 * @typedef CurrencyDto
 * @property {string} [address] the contract address of the erc20 / bep20 token (undefined if ETH or BNB)
 * @property {string} name the name of the token as per its contract
 * @property {number} decimals the number of decimals as per its contract (usually 18)
 */

export interface CurrencyDto {
  address?: string;
  name: string;
  decimals: number;
}
