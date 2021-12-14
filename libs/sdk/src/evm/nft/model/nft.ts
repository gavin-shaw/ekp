export interface Nft {
  readonly amount?: number;
  readonly metadata?: string;
  readonly mintedBlockNumber?: number;
  readonly tokenId: string;
  readonly tokenUri?: string;
}
