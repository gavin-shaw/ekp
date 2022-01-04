import { ChainId } from '@app/sdk';

export interface NftCollectionMetadata {
  readonly chainId: ChainId;
  readonly contractAddress: string;
  readonly logo: string;
  readonly name: string;
  readonly slug?: string;
  readonly symbol: string;
}
