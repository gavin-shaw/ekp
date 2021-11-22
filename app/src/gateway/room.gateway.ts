import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JoinRequest } from './dto/join-request.dto';

@WebSocketGateway()
export class RoomGateway {
  @SubscribeMessage('join')
  handleMessage(client: Socket, payload: any): string {
    const joinRequests: JoinRequest[] = JSON.parse(payload);
    for (const joinRequest of joinRequests) {
      client.join(joinRequest.room);
    }
    return payload;
  }
}
