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
  console.log('🔐 Starting SecureGroup (TOFU) Handshake Tests...\n');

  // ==========================================
  // SETUP: Initialize Host and get Invite
  // ==========================================
  console.log('--- Initializing Host ---');

  // Create a host that allows a maximum of 2 guests
  const host = new SecureHost(2);
  await host.init();

  const invite = await host.getInviteDetails();

  console.log(`🏠 Host Public Key : ${truncate(invite.hostPubKey)}`);
  console.log(`🎟️  Invitation Code : ${invite.inviteCode}\n`);

  // ==========================================
  // TEST 1: The "Happy Path" (Perfect Handshake)
  // ==========================================
  console.log('▶️ TEST 1: Normal Operation (Alice joins successfully)');

  try {
    const alice = new SecureGuest();
    await alice.init();

    // Step 1: Alice creates the join request
    const joinReq = await alice.createJoinRequest(invite.hostPubKey, invite.inviteCode);
    console.log(`   [Alice -> Host] Encrypted Join Request generated.`);

    // Step 2: Host processes the request and sends the Group Key
    const joinRes = await host.processJoinRequest(
      joinReq.guestPubKey,
      joinReq.encryptedPayload,
    );
    console.log(`   [Host -> Alice] Join verified. Encrypted Group Key sent.`);

    // Step 3: Alice processes response and sends a Hello
    await alice.processJoinResponse(joinRes);
    const helloPayload = await alice.createHello();
    console.log(`   [Alice -> Host] Group key loaded. Encrypted Hello sent.`);

    // Step 4: Host processes Hello and sends Welcome
    const welcomePayload = await host.processHello(helloPayload);
    console.log(`   [Host -> Alice] Hello verified. Encrypted Welcome sent.`);

    // Step 5: Alice verifies Welcome
    await alice.processWelcome(welcomePayload);
    console.log(`✅ Success! Alice has securely joined the group.\n`);

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
  // TEST 4: Malicious Host / MITM on Welcome
  // ==========================================
  console.log('▶️ TEST 4: Guest verifies Welcome (Catching a Bad Host)');

  try {
    const dave = new SecureGuest();
    await dave.init();

    // Assume Dave somehow got through the join process
    // Let's simulate Dave sending a Hello to test the group key
    await dave.createHello(); // This internally generates Dave's expected testBlob

    // But wait! An attacker (or broken server) sends a fake welcome message!
    // We will simulate this by having Dave's local base class encrypt a fake payload
    // using a dummy key, to mimic a mathematically valid AES-GCM envelope,
    // but containing the wrong blob.

    const fakeKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    dave.groupKey = fakeKey; // Injecting fake key just to simulate the decryption layer

    const maliciousWelcome = await dave.encrypt({ action: 'welcome', blob: 'bad-blob' });

    console.log('   Dave receives a Welcome payload with the wrong blob...');
    await dave.processWelcome(maliciousWelcome);

    console.error('❌ Test 4 Failed: Dave accepted a malicious welcome!');
  } catch (err) {
    console.log(`✅ Success! Dave rejected the Welcome. Error caught: "${err.message}"`);
  }
  console.log('\n');

  console.log('🏁 All SecureGroup tests completed.');
}

runTests();
