import assert from 'node:assert';
import Achex from './Achex.js';

// ==========================================
// MOCK WEBSOCKET (For deterministic testing)
// ==========================================
class MockWebSocket {
  // Standard WebSocket readyState constants
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sentMessages = [];

    // Simulate async connection delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, wasClean: true });
  }

  // Helper to simulate receiving a message from the Achex server
  simulateServerMessage(jsonObject) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(jsonObject) });
  }
}

// Inject mock into global scope so Achex.js can use it
globalThis.WebSocket = MockWebSocket;

// ==========================================
// TESTS
// ==========================================
async function runAchexTests() {
  console.log('🌐 Starting Achex API Tests...\n');

  try {
    // TEST 1: Initialization & Defaults
    const client = new Achex();
    assert.strictEqual(
      client.url,
      Achex.CLOUD_URLS.STOLOTO,
      'TEST 1 Failed: Default URL incorrect.',
    );
    assert.ok(
      client.username.startsWith('user_'),
      'TEST 1 Failed: Auto-username failed.',
    );
    console.log('✅ TEST 1 Passed: Initialization & Defaults');

    // TEST 2: Successful Connection & Authentication
    const authClient = new Achex({ username: 'TestUser' });

    // Start connection but don't await yet, so we can simulate the server's response
    const connectPromise = authClient.connect();

    // Wait slightly for Mock socket to "open" and send auth
    await new Promise(r => setTimeout(r, 20));

    // Verify it sent the exact legacy auth string required by Achex
    assert.deepStrictEqual(
      authClient.ws.sentMessages[0],
      { auth: 'TestUser', passwd: 'none' },
      'TEST 2a Failed: Auth string incorrect.',
    );

    // Simulate server replying with OK
    authClient.ws.simulateServerMessage({ auth: 'OK', SID: 999 });

    const sid = await connectPromise;
    assert.strictEqual(
      sid,
      999,
      'TEST 2b Failed: Connect promise did not resolve with SID.',
    );
    assert.ok(
      authClient._pingInterval !== null,
      'TEST 2c Failed: Heartbeat did not start.',
    );
    console.log('✅ TEST 2 Passed: Connection, Handshake & Promise Resolution');

    authClient.disconnect(); // Cleanup

    // TEST 3: Connection Rejection (Network Error)
    const failClient = new Achex();
    const failPromise = failClient.connect();

    await new Promise(r => setTimeout(r, 20));

    // Simulate a network failure before auth completes
    failClient.ws.onerror(new Error('Simulated Drop'));

    await assert.rejects(
      failPromise,
      /WebSocket Connection Failed/,
      'TEST 3 Failed: Promise did not reject on error.',
    );
    console.log('✅ TEST 3 Passed: Promise rejects correctly on network error');

    // TEST 4: Message Routing
    const msgClient = new Achex();
    const msgPromise = msgClient.connect();

    await new Promise(r => setTimeout(r, 20));
    msgClient.ws.simulateServerMessage({ auth: 'OK', SID: 123 }); // Authenticate
    await msgPromise;

    let caughtHubMsg = null;
    let caughtUserMsg = null;

    msgClient.on('message:hub', data => {
      caughtHubMsg = data;
    });
    msgClient.on('message:user', data => {
      caughtUserMsg = data;
    });

    // Simulate incoming server traffic
    msgClient.ws.simulateServerMessage({
      FROM: 'Alice',
      toH: 'Room1',
      payload: 'hello room',
    });
    msgClient.ws.simulateServerMessage({
      FROM: 'Bob',
      to: msgClient.username,
      payload: 'hello you',
    });

    assert.strictEqual(
      caughtHubMsg.payload,
      'hello room',
      'TEST 4a Failed: Hub routing failed.',
    );
    assert.strictEqual(
      caughtUserMsg.payload,
      'hello you',
      'TEST 4b Failed: User routing failed.',
    );
    console.log('✅ TEST 4 Passed: JSON parsing and Event Routing');

    msgClient.disconnect(); // Cleanup

    // TEST 5: Outbound Sending Methods
    const sendClient = new Achex();
    const sendPromise = sendClient.connect();

    await new Promise(r => setTimeout(r, 20));
    sendClient.ws.simulateServerMessage({ auth: 'OK', SID: 456 });
    await sendPromise;

    sendClient.joinHub('LudoRoom');
    sendClient.sendToHub('LudoRoom', 'move_pawn');
    sendClient.sendToSession(456, 'secret');

    const sent = sendClient.ws.sentMessages;
    assert.deepStrictEqual(
      sent[1],
      { joinHub: 'LudoRoom' },
      'TEST 5a Failed: joinHub incorrect',
    );
    assert.deepStrictEqual(
      sent[2],
      { toH: 'LudoRoom', payload: 'move_pawn' },
      'TEST 5b Failed: sendToHub incorrect',
    );
    assert.deepStrictEqual(
      sent[3],
      { toS: 456, payload: 'secret' },
      'TEST 5c Failed: sendToSession incorrect',
    );
    console.log('✅ TEST 5 Passed: Outbound API generates correct Achex commands');

    // TEST 6: Graceful Disconnect
    sendClient.disconnect();
    assert.strictEqual(
      sendClient.ws.readyState,
      MockWebSocket.CLOSED,
      'TEST 6a Failed: Socket did not close.',
    );
    assert.strictEqual(
      sendClient._pingInterval,
      null,
      'TEST 6b Failed: Heartbeat was not stopped.',
    );
    console.log('✅ TEST 6 Passed: Disconnection cleans up memory and stops heartbeat');

    console.log('\n🏁 All Achex Network tests passed successfully!\n');
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

runAchexTests();
