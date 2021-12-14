import { ChainId } from '@app/sdk';
import { Nft } from './nft';

export interface NftCollection {
  readonly contractAddress: string;
  readonly contractType: string;
  readonly chainId: ChainId;
  readonly name: string;
  readonly nfts?: Nft[];
  readonly ownerAddress: string;
  readonly symbol: string;
}
