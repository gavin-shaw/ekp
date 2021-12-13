import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  readonly client: {
    readonly selectedWallet?: string;
    readonly connectedWallets: string[];
    readonly currency: CurrencyDto;
  };
  [key: string]: any;
}
