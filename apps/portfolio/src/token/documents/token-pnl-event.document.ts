import { DocumentDto, TokenMetadata, TokenValue } from '@app/sdk';

export interface TokenPnlEventDocument extends DocumentDto {
  readonly blockNumber: number;
  readonly blockTimestamp: number;
  readonly chain: {
    readonly id: string;
    readonly logo: string;
    readonly name: string;
  };
  readonly costBasis: number;
  readonly description: string;
  readonly gasValue: TokenValue;
  readonly links: {
    readonly explorer: string;
  };
  readonly realizedGain: number;
  readonly realizedGainPc: number;
  readonly realizedValue: number;
  readonly token: TokenMetadata;
  readonly tokenValue: TokenValue;
  readonly unrealizedCost: number;
}
