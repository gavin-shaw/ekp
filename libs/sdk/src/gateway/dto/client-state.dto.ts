import { TrackedRecordDto } from '.';

export interface ClientStateDto {
  readonly connectedWallet?: string;
  readonly currency?: { id: string; symbol: string };
  readonly currentPath: string;
  readonly lastServerUpdate?: number;
  readonly shared?: { [key: string]: TrackedRecordDto[] };
}
