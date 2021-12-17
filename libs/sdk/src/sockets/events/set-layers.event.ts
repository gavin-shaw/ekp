export const SET_LAYERS = 'set-layers';
import { RecordDto } from '../dtos';

export interface SetLayersEvent {
  readonly clientId: string;
  readonly pluginId: string;
  readonly timestamp: number;
  readonly tables: {
    [tableName: string]: {
      readonly add?: RecordDto[];
      readonly delete?: string[];
      readonly clear?: boolean;
    };
  };
}
