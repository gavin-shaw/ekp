import { components } from 'moralis/types/generated/web3Api';
import { ChainId } from '@app/sdk';

export type ChainList = components['schemas']['chainList'];
export type NativeBalance = components['schemas']['nativeBalance'];
export type NftOwner = components['schemas']['nftOwner'] & { chain_id: string };
export type NftOwnerCollection = components['schemas']['nftOwnerCollection'];
export type NftTransfer = components['schemas']['nftTransfer'] & {
  chain_id: string;
};
export type TokenBalance = components['schemas']['erc20TokenBalance'] & {
  chain_id: ChainId;
};
export type Transaction = components['schemas']['transaction'];
export type TransactionCollection =
  components['schemas']['transactionCollection'];
export interface TokenMetadata {
  address: string;
  decimals: string;
  logo?: string;
  name: string;
  symbol: string;
  validated?: string;
}
