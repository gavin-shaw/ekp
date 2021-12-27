export interface TokenPlItem {
  readonly blockNumber: number;
  readonly description: string;
  readonly fiatRate: number;
  readonly gas: number;
  readonly gasFiat: number;
  readonly realized: number;
  readonly realizedPc: number;
  readonly timestamp: number;
  readonly token: {
    readonly coidId: string;
    readonly decimals: number;
    readonly name: string;
    readonly symbol: string;
  };
  readonly value: number;
  readonly valueFiat: number;
}
