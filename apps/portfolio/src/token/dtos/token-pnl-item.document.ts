export interface TokenPnlItem {
  readonly blockNumber: number;
  readonly description: string;
  readonly chainName: string;
  readonly chainFiatRate: number;
  readonly gas: number;
  readonly gasFiat: number;
  readonly fiatSymbol: string;
  readonly links: {
    readonly transaction: string;
  };
  readonly realized: number;
  readonly realizedPc: number;
  readonly timestamp: number;
  // TODO: generisize or optimize this duplicate token info
  readonly token: {
    readonly coinId: string;
    readonly decimals: number;
    readonly name: string;
    readonly symbol: string;
  };
  readonly fiatRate: number;
  readonly value: number;
  readonly valueFiat: number;
}
