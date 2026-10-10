# Achex.js

A robust, Promise-based ES module wrapper for the Achex Cloud WebSocket infrastructure. It abstracts away legacy protocol quirks, handles connection states, manages automatic heartbeats, implements auto-reconnection, and routes incoming network data into a clean, event-driven API.

## The Achex Infrastructure

[Achex.ca](https://achex.ca/) provides a free, zero-configuration public WebSocket relay. It acts as a "dumb pipe"—a publish/subscribe messaging bus that blindly moves text strings from Point A to Point B without requiring API keys or account registration.

Because it is a legacy infrastructure, it comes with a few quirks that this wrapper abstracts away:

- **The Password Myth:** The authentication step requires a `passwd` field, but it is completely useless. It is likely an abandoned feature from when they considered building an auth system. Our class automatically handles this handshake behind the scenes.
- **Public and Unencrypted:** Any data sent over Achex is readable by anyone listening on the server. For this reason, sensitive payloads should be cryptographically encrypted by your application _before_ they are sent over the Achex network.
- **Idle Kicks:** Achex aggressively disconnects idle sessions. This wrapper automatically runs a background heartbeat (ping) every 25 seconds to keep your connection alive.
- **Network Instability:** Connections over public websockets can drop unexpectedly. This wrapper includes a customizable auto-reconnect feature to seamlessly restore the session without requiring a page reload.

## Core Concepts

Achex routes messages using three primary identifiers:

1. **Usernames:** A string alias you choose (or auto-generate) when connecting. Multiple sessions can share the same username so that they can all receive messages when sent to that username.
2. **Sessions (SID):** A unique integer assigned to you by the server upon successful connection. This is your true, unique network identity.
3. **Hubs:** Essentially "Chat Rooms." Multiple users can join a Hub. Any message sent to a Hub is automatically broadcasted to every Session ID currently inside that Hub.

## API Reference

The `Achex` class extends `EventEmitter`, inheriting methods like `.on()`, `.once()`, and `.off()`.

### Initialization

- **`new Achex(options)`**:
- `url`: Defaults to `wss://cloud.achex.ca/stoloto.ru.net` (the highest capacity cloud instance).
- `username`: Defaults to a randomly generated string.
- `autoReconnect`: Automatically attempts to reconnect if the connection drops unexpectedly. Defaults to `true`.
- `reconnectInterval`: Delay in milliseconds between reconnection attempts. Defaults to `3000`.

### Connection Management

- **`await connect()`**: Initializes the WebSocket, performs the legacy authentication handshake, starts the heartbeat interval, and returns a Promise that resolves with your unique `sessionID`.
- **`disconnect()`**: Gracefully closes the WebSocket, halts background heartbeats, and intentionally prevents auto-reconnection.

### Hub Management

- **`joinHub(hubName)`**: Subscribes your session to a specific hub.
- **`leaveHub(hubName)`**: Unsubscribes your session from a hub.

### Broadcasting / Sending

- **`sendToHub(hubName, payload)`**: Broadcasts a string payload to everyone in the specified hub.
- **`sendToUser(username, payload)`**: Sends a payload to all sessions sharing that specific username.
- **`sendToSession(sessionID, payload)`**: Sends a payload directly to a specific, unique session.

### Emitted Events

You can listen to these events using `.on('eventName', callback)`.

**Connection Events:**

- `'connected'` - Fired when the WebSocket successfully authenticates and receives a Session ID.
- `'disconnected'` - Fired when the WebSocket connection drops or is gracefully closed.
- `'reconnecting'` - Fired when the auto-reconnect sequence initiates after an unexpected drop.
- `'error'` - Fired when a WebSocket or network error occurs.

**Hub Events:**

- `'hub:joined'` - Fired when your session successfully joins a Hub.
- `'hub:left'` - Fired when your session successfully leaves a Hub.
- `'hub:user_left'` - Fired when another user disconnects or leaves a Hub you are currently in.

**Message Events:**

- `'message:hub'` - Fired when data arrives via a Hub broadcast.
- `'message:user'` - Fired when data is sent to your shared Username.
- `'message:session'` - Fired when data is sent directly to your unique SID.

## Usage Example

```javascript
import Achex from './Achex.js';

async function startNetwork() {
  // 1. Initialize with auto-reconnect enabled (default)
  const network = new Achex({ reconnectInterval: 3000 });

  // 2. Setup Listeners
  network.on('message:hub', data => {
    console.log(`[${data.FROM}] says: ${data.payload}`);
  });

  network.on('hub:user_left', data => {
    console.log(`${data.username} left the room.`);
  });

  network.on('reconnecting', () => {
    console.log('Connection dropped. Attempting to reconnect...');
  });

  // 3. Connect (Awaitable)
  try {
    const mySID = await network.connect();
    console.log(`Connected successfully! My SID is ${mySID}`);

    // 4. Join a Game Room and Broadcast
    network.joinHub('Ludo-Room-XYZ');

    // Make sure to encrypt your sensitive payloads first!
    network.sendToHub('Ludo-Room-XYZ', 'Hello everyone in the room!');
  } catch (error) {
    console.error('Network connection failed:', error);
  }
}

startNetwork();
```

## Testing

A comprehensive test suite utilizing a Mock WebSocket is included to deterministically verify connection promises, legacy handshake formatting, message routing, auto-reconnect behaviors, and graceful cleanup without spamming the live Achex servers.

Run the tests using:

```bash
node Achex.test.js

```
