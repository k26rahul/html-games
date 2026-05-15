# EventEmitter.js

A lightweight, zero-dependency ES module implementing the Publish-Subscribe (Pub/Sub) pattern. Designed for modern JavaScript applications to decouple components, manage custom events, and facilitate a clean, event-driven architecture.

## The Concept

In complex front-end or peer-to-peer applications, direct hardcoding of function calls between modules creates tight coupling and makes code difficult to maintain. The `EventEmitter` solves this by acting as a central communication bus. Modules can broadcast ("emit") events without needing to know who is listening, and other modules can listen ("on") for those events without needing to know who fired them.

## API Reference

The module exports a default `EventEmitter` class.

### `on(eventName, listener)`

Subscribes a listener function to a specific event. The listener will be executed every time the event is emitted.

### `once(eventName, listener)`

Subscribes to an event, but automatically unbinds the listener after it fires exactly once. Ideal for single-occurrence network responses or initialization logic.

### `off(eventName, listener)`

Unsubscribes a specific listener function from an event.

### `emit(eventName, data)`

Broadcasts an event, synchronously triggering all subscribed listeners and passing the provided `data` payload to them.

### `removeAllListeners(eventName = null)`

Cleans up memory. If an `eventName` is provided, it removes all listeners for that specific event. If left empty, it safely wipes all events and listeners across the entire instance.

## Usage Example

```javascript
import EventEmitter from './EventEmitter.js';

// 1. Initialization
const emitter = new EventEmitter();

// 2. Define a listener function
const onUserLogin = user => {
  console.log(`Welcome, ${user.name}!`);
};

// 3. Subscribe to events
emitter.on('login', onUserLogin);

emitter.once('system:ready', () => {
  console.log('System initialized. This will only run once.');
});

// 4. Emit events (triggering the listeners)
emitter.emit('system:ready');
emitter.emit('system:ready'); // Ignored, because it was bound with .once()

emitter.emit('login', { name: 'Alice' });
emitter.emit('login', { name: 'Bob' });

// 5. Cleanup
emitter.off('login', onUserLogin); // Remove specific listener
emitter.removeAllListeners(); // Nuke everything
```

## Testing

A native Node.js test suite is included to verify all subscription routing, single-execution guarantees (`once`), and memory cleanup. Ensure your environment supports ES Modules (`"type": "module"` in `package.json`), then run:

```bash
node EventEmitter.test.js

```
