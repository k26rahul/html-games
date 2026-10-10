// Ensure Web Crypto API is available globally in Node.js (for compatibility)
import * as nodeCrypto from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto.webcrypto;
}

// Import our class
import CommitReveal from './CommitReveal.js';

// Helper function to simulate a slight delay (mimics network latency)
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTests() {
  console.log('🎲 Starting Commit-Reveal Tests...\n');

  // ==========================================
  // SETUP: Generate 4 Players and Commitments
  // ==========================================
  console.log('--- Generating Commitments ---');

  const p1 = await CommitReveal.generateCommitment();
  const p2 = await CommitReveal.generateCommitment();
  const p3 = await CommitReveal.generateCommitment();
  const p4 = await CommitReveal.generateCommitment();

  const originalRoomData = [
    { label: 'Player_A_Host', seed: p1.seed, hash: p1.hash },
    { label: 'Player_B_Bob', seed: p2.seed, hash: p2.hash },
    { label: 'Player_C_Alice', seed: p3.seed, hash: p3.hash },
    { label: 'Player_D_Charlie', seed: p4.seed, hash: p4.hash },
  ];

  console.table(originalRoomData);
  console.log('\n');

  let baselineFinalSeed = '';

  // ==========================================
  // TEST 1: Normal Operation (Everything is valid)
  // ==========================================
  console.log('▶️ TEST 1: Normal Operation');
  const result1 = await CommitReveal.verifyAndCombine(originalRoomData);

  if (result1.success) {
    console.log('✅ Success! The final seed is:');
    console.log(`   ${result1.finalSeed}`);
    baselineFinalSeed = result1.finalSeed;
  } else {
    console.error('❌ Test 1 Failed:', result1.error);
  }
  console.log('\n');

  // ==========================================
  // TEST 2: Deterministic Ordering (Network scramble)
  // ==========================================
  console.log('▶️ TEST 2: Scrambled Network Arrival Order');

  // Simulate packets arriving in a totally random order
  const scrambledRoomData = [
    originalRoomData[3], // Charlie arrives first
    originalRoomData[1], // Then Bob
    originalRoomData[0], // Then Host
    originalRoomData[2], // Alice is lagging and arrives last
  ];

  const result2 = await CommitReveal.verifyAndCombine(scrambledRoomData);

  if (result2.success && result2.finalSeed === baselineFinalSeed) {
    console.log(
      '✅ Success! The final seed matched the baseline exactly, despite the scrambled order.',
    );
  } else {
    console.error('❌ Test 2 Failed: Seeds did not match or verification failed!');
    console.log('Baseline:', baselineFinalSeed);
    console.log('Got     :', result2.finalSeed);
  }
  console.log('\n');

  // ==========================================
  // TEST 3: Cheater Detection (Changed Seed)
  // ==========================================
  console.log('▶️ TEST 3: Cheater Modifies Their Seed Before Reveal');

  // Deep copy the array so we don't ruin the original
  const tamperedRoomData = JSON.parse(JSON.stringify(originalRoomData));

  // Alice tries to be sneaky and generates a completely different seed for her reveal
  const fakeAliceCommitment = await CommitReveal.generateCommitment();
  tamperedRoomData[2].seed = fakeAliceCommitment.seed;

  const result3 = await CommitReveal.verifyAndCombine(tamperedRoomData);

  if (!result3.success) {
    console.log('✅ Success! Cheater was successfully blocked.');
    console.log(`   Caught Error: "${result3.error}"`);
  } else {
    console.error('❌ Test 3 Failed: The system accepted a tampered seed!');
  }
  console.log('\n');

  // ==========================================
  // TEST 4: Malformed Payload (Missing Data)
  // ==========================================
  console.log('▶️ TEST 4: Malformed WebSocket Payload');

  const malformedRoomData = JSON.parse(JSON.stringify(originalRoomData));
  // Bob's client crashes and sends an undefined hash
  delete malformedRoomData[1].hash;

  const result4 = await CommitReveal.verifyAndCombine(malformedRoomData);

  if (!result4.success) {
    console.log('✅ Success! System gracefully rejected malformed data.');
    console.log(`   Caught Error: "${result4.error}"`);
  } else {
    console.error('❌ Test 4 Failed: System tried to process malformed data!');
  }
  console.log('\n');

  console.log('🏁 All tests completed.');
}

runTests();
