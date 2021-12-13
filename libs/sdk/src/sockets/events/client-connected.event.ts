import { ClientStateDto } from '../dtos';

export const CLIENT_CONNECTED = 'client-connected';

export interface ClientConnectedEvent {
  readonly clientId: string;
  readonly state: ClientStateDto;
}

export interface ClientConnectedResponse {
  readonly pluginId: string;
  readonly pluginName: string;
}
