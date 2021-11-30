import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  currency?: CurrencyDto;
  walletAddress?: string;
  entityHeads: { [entityName: string]: number };
}
