import { ServerStateDto } from '../dto';

export const SERVER_STATE = 'server-state';
export interface ServerStateEvent {
  clientId: string;
  state: ServerStateDto;
}
