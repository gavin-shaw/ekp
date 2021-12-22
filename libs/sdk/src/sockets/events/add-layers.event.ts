export const ADD_LAYERS = 'add-layers';
import { LayerDto } from '../dtos';

export interface AddLayersEvent {
  readonly clientId: string;
  readonly pluginId: string;
  readonly layers: LayerDto[];
}
