export const UPDATE_STORAGE = 'update-storage';
import { RecordDto } from '../dtos';

export interface UpdateStorageEvent {
  readonly clientId: string;
  readonly pluginId: string;
  readonly tables: {
    [tableName: string]: {
      readonly add?: RecordDto[];
      readonly delete?: string[];
      readonly clear?: boolean;
    };
  };
}
