import { ClientStateDto } from '../dto/client-state.dto';

export interface ServerStateEvent {
  clientId: string;
  state: ClientStateDto;
}
