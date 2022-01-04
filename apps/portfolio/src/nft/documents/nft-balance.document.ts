import { DocumentDto, ChainId, TokenValue } from '@app/sdk';

export interface NftBalanceDocument extends DocumentDto {
  readonly balance: number;
  readonly chain: {
    id: ChainId;
    logo: string;
    name: string;
  };
  readonly contractAddress: string;
  readonly links: { explorer: string; details: string };
  readonly logo?: string;
  readonly name: string;
  readonly nativePrice: number;
  readonly symbol: string;
  readonly tokenValue?: TokenValue;
}
