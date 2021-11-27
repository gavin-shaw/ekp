export interface ClientStateDto {
  currency?: string;
  walletAddress?: string;
  entityHeads: { [entityName: string]: number };
}
