import { ClientStateDto } from '../dto';
export const CLIENT_STATE = 'client-state';
export interface ClientStateEvent {
  readonly clientId: string;
  readonly state: ClientStateDto;
}
