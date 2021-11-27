import { ClientStateDto } from '../dto/client-state.dto';

export interface ClientStateEvent {
  clientId: string;
  state: ClientStateDto;
}
