import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  readonly client: {
    readonly lastTimestamp?: number;
    readonly selectedCurrency: CurrencyDto;
    readonly watchedWallets: { address: string }[];
  };
  // [key: string]: any;
}
