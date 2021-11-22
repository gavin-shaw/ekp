# Earnkeeper

## Plugins

Earnkeeper supports 3rd party plugins to provide data for display.

Each plugin is a microservice that must be hosted by the developer of the plugin.

The microservice will expose a socket.io websocket, which the user will configure in their web app.

For example:

```
https://farms.cr.earnkeeper.io/socket
```

Earnkeeper will communicate with the plugin over this socket.

The lifecycle of the communication is as follows.

| Event             | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| Connect           | The client connects to the socket                                                    |
| Send Client State | The client sends all current state variables, for the plugin to use as needed        |
| Join Rooms        | Join rooms required by the application (See the rooms sections for more information) |
| Emit              | The plugin emits data in rooms whenever it changes, for the client to consume        |

## Examples

### Send Client State

Client state is sent from the client to the plugin with event name:

`client-state`

The body of the event will contain an object which is a sub class of the following:

```typescript
export interface ClientState {
    currency?: string
    walletAddress?: string
    walletChainId?: number
}
```

### Joining Rooms

Joining rooms allows the client to receive realtime updates from the plugin whenever data changes.

The event name for joining a room is:

`join`

The event data is an array of the following interface:

```typescript
export interface JoinRequest {
    name: string
    lastUpdated?: number
}
```

The supported room names are defined by the earn keeper client, and the plugin is responsible for emitting appropriate data to them.

The events and data formats supported for each room are defined here.

The plugin should join the client to the room, and emit directly to the client any data that has been emitted to the room since the lastUpdated date given in the request.

Here is an example for the `#farms` room:

Client sends:

```json
{
  "event": "join",
  "data": [
    {
      "room": "farms",
      "lastUpdated": 1637057719
    }
  ]
}
```

Plugin joins the client to the room, responds with success, and then emits directly to the client:

```json
{
  "event": "join",
  "data": [
    {
      "room": "farms",
      "lastUpdated": 1637057719,
      "history": [ { ... }, ... ] 
    }
  ]
}
```

