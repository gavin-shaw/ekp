import { validate } from 'bycontract';

export function nftContractId(chainId: string, contractAddress: string) {
  validate([chainId, contractAddress], ['string', 'string']);

  return `${chainId}_${contractAddress}`;
}

export function tokenContractId(chainId: string, contractAddress: string) {
  validate([chainId, contractAddress], ['string', 'string']);

  return `${chainId}_${contractAddress?.toLowerCase()}`;
}
