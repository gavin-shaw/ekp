import { ChainId } from '../../utils';

export interface NftCollectionMetadata {
  readonly chainId: ChainId;
  readonly contractAddress: string;
  readonly logo: string;
  readonly slug?: string;
}
