import { ChainId, DocumentDto, TokenMetadata } from '@app/sdk';

export interface TokenBalanceDocument extends DocumentDto {
  readonly chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  readonly links: {
    swap: string;
    explorer: string;
  };
  readonly token: TokenMetadata;
}
