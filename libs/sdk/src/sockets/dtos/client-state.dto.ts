import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  readonly client: {
    readonly selectedCurrency: CurrencyDto;
    readonly watchedWallets: { address: string }[];
  };
  // [key: string]: any;
}
