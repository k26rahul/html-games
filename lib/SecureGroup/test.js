// Ensure Web Crypto API is available globally in Node.js (for compatibility)
import * as nodeCrypto from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto.webcrypto;
}

// Import our classes
import { SecureHost, SecureGuest } from './SecureGroup.js';

// Helper to truncate long Base64 strings for cleaner console output
const truncate = str => `${str.substring(0, 15)}...${str.substring(str.length - 10)}`;

async function runTests() {
  console.log('🔐 Starting SecureGroup (TOFU) Handshake & State Tests...\n');

  // ==========================================
  // SETUP: Initialize Host and get Invite
  // ==========================================
  console.log('--- Initializing Host ---');

  // Create a host that allows a maximum of 2 guests
  let host = new SecureHost(2);
  await host.init();

  const invite = await host.getInviteDetails();

  console.log(`🏠 Host Public Key : ${truncate(invite.hostPubKey)}`);
  console.log(`🎟️  Invitation Code : ${invite.inviteCode}\n`);

  let alice; // Lifted to outer scope so we can export her state later

  // ==========================================
  // TEST 1: The "Happy Path" (Sleek Handshake)
  // ==========================================
  console.log('▶️ TEST 1: Normal Operation (Alice joins successfully)');

  try {
    alice = new SecureGuest();
    await alice.init();

    // Step 1: Alice creates the join request (nonce is auto-generated inside)
    const joinReq = await alice.createJoinRequest(invite.hostPubKey, invite.inviteCode);
    console.log(`   [Alice -> Host] Encrypted Join Request sent.`);

    // Step 2: Host processes the request and sends the Group Key + mirrored Nonce
    const joinRes = await host.processJoinRequest(
      joinReq.guestPubKey,
      joinReq.encryptedPayload,
    );
    console.log(`   [Host -> Alice] Join verified. Encrypted Group Key sent.`);

    // Step 3: Alice processes response, implicitly verifying the nonce
    await alice.processJoinResponse(joinRes);
    console.log(`✅ Success! Alice securely extracted the group key.\n`);

    // Quick Chat Test
    const msg = await alice.encrypt({ user: 'Alice', text: 'Hello Group!' });
    const decrypted = await host.decrypt(msg);
    console.log(`   💬 Alice says to group: "${decrypted.text}" (Decrypted by Host)`);
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
  }
  console.log('\n');

  // ==========================================
  // TEST 2: Invalid Invitation Code
  // ==========================================
  console.log('▶️ TEST 2: Hacker tries to guess the code');

  try {
    const hacker = new SecureGuest();
    await hacker.init();

    // Hacker uses the correct Host Pub Key, but guesses the code
    const badReq = await hacker.createJoinRequest(invite.hostPubKey, 'WRONG!');

    await host.processJoinRequest(badReq.guestPubKey, badReq.encryptedPayload);

    console.error('❌ Test 2 Failed: Host accepted an invalid code!');
  } catch (err) {
    console.log(`✅ Success! Host blocked the hacker. Error caught: "${err.message}"`);
  }
  console.log('\n');

  // ==========================================
  // TEST 3: Room Capacity & Replay Defense
  // ==========================================
  console.log('▶️ TEST 3: Room Capacity limits');

  try {
    // We already have Alice (1 guest). Let's add Bob to hit the max limit of 2.
    const bob = new SecureGuest();
    await bob.init();
    const bobReq = await bob.createJoinRequest(invite.hostPubKey, invite.inviteCode);
    await host.processJoinRequest(bobReq.guestPubKey, bobReq.encryptedPayload);
    console.log('   Bob joined successfully. Room is now FULL (2/2 guests).');

    // Now Charlie tries to join
    const charlie = new SecureGuest();
    await charlie.init();
    const charlieReq = await charlie.createJoinRequest(
      invite.hostPubKey,
      invite.inviteCode,
    );

    console.log('   Charlie is attempting to join...');
    await host.processJoinRequest(charlieReq.guestPubKey, charlieReq.encryptedPayload);

    console.error('❌ Test 3 Failed: Host allowed Charlie into a full room!');
  } catch (err) {
    console.log(`✅ Success! Host blocked Charlie. Error caught: "${err.message}"`);
  }
  console.log('\n');

  // ==========================================
  // TEST 4: State Persistence (Import/Export)
  // ==========================================
  console.log('▶️ TEST 4: Browser Reload Survival (Import/Export State)');

  try {
    // 1. Export both states to JSON strings (simulating saving to localStorage)
    const hostJson = await host.exportState();
    const aliceJson = await alice.exportState();
    console.log(`   Host State JSON length: ${hostJson.length} chars`);
    console.log(`   Alice State JSON length: ${aliceJson.length} chars`);

    // 2. Destroy the old instances (simulating a browser refresh)
    host = null;
    alice = null;

    // 3. Create fresh instances and import the state
    const newHost = new SecureHost();
    await newHost.importState(hostJson);

    const newAlice = new SecureGuest();
    await newAlice.importState(aliceJson);
    console.log(`   Both instances successfully resurrected from JSON.`);

    // 4. Test if they can still communicate using the resurrected keys
    const msg = await newHost.encrypt({ text: 'Welcome back, Alice!' });
    const dec = await newAlice.decrypt(msg);

    console.log(
      `   💬 Resurrected Host says: "${dec.text}" (Decrypted by Resurrected Alice)`,
    );
    console.log(`✅ Success! Cryptographic state survived the simulation.\n`);
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
  }

  // ==========================================
  // TEST 5: Nonce Replay Attack Defense
  // ==========================================
  console.log('▶️ TEST 5: Guest verifies Nonce (Catching a Replay/Bad Host)');

  try {
    const dave = new SecureGuest();
    await dave.init();

    // Dave sends a legitimate request
    const daveReq = await dave.createJoinRequest(invite.hostPubKey, invite.inviteCode);

    // To simulate a bad host or an attacker replaying an old response,
    // we bypass the normal host flow and manually encrypt a payload with a BAD nonce.
    // (We use a temporary 1-to-1 key just like the protocol does to make the AES-GCM math valid).
    const fakeHandshakeKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: await crypto.subtle.importKey(
          'spki',
          Buffer.from(daveReq.guestPubKey, 'base64'),
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          [],
        ),
      },
      host.ecdhKeyPair.privateKey, // Using host's private key just to make the envelope valid
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    // Encrypting a valid group key but the WRONG nonce
    const maliciousPayload = await host._encryptPayload(fakeHandshakeKey, {
      groupKey: 'fakeBase64GroupKeyData',
      nonce: 'WRONG-NONCE-1234',
    });

    console.log('   Dave receives a Host response with a mismatched nonce...');
    await dave.processJoinResponse(maliciousPayload);

    console.error('❌ Test 5 Failed: Dave accepted a response with a bad nonce!');
  } catch (err) {
    console.log(`✅ Success! Dave rejected the payload. Error caught: "${err.message}"`);
  }
  console.log('\n');

  console.log('🏁 All SecureGroup tests completed.');
}

runTests();
