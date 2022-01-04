import { DocumentDto, ChainId, TokenValue } from '@app/sdk';

export interface NftPnlEventDocument extends DocumentDto {
  readonly blockNumber: number;
  readonly blockTimestamp: number;
  readonly chain: {
    readonly id: ChainId;
    readonly logo: string;
    readonly name: string;
  };
  readonly contractId: string;
  readonly costBasis: number;
  readonly description: string;
  readonly fromAddress: string;
  readonly gasValue: TokenValue;
  readonly icon: string;
  readonly links: {
    readonly explorer: string;
  };
  readonly nftCollection: {
    readonly contractId: string;
    readonly contractAddress: string;
    readonly logo: string;
    readonly name: string;
    readonly symbol: string;
  };
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly toAddress: string;
  readonly tokenId: string;
  readonly tokenValue: TokenValue;
  readonly unrealizedCost: number;
}
