export const ADD_LAYERS = 'add-layers';
import { DocumentDto } from '../dtos';
export interface AddLayersEvent {
  readonly clientId: string;
  readonly pluginId: string;
  readonly layers: {
    readonly collectionName: string;
    readonly id: string;
    readonly set?: DocumentDto[];
    readonly patch?: {
      path: string;
      value: any;
    }[];
    readonly tags?: string[];
    readonly timestamp: number;
  }[];
}
