# CommitReveal.js

A zero-dependency ES module providing a cryptographic Commit-Reveal Scheme. Designed for peer-to-peer (P2P) multiplayer games to ensure fair, deterministic, and un-cheatable random number generation (like dice rolls) without relying on a central authoritative server.

## The Concept

In a serverless P2P architecture, clients cannot be trusted to generate their own random numbers. The Commit-Reveal scheme solves this using cryptography:

1. **Commit:** Every participant generates a secret random seed. They hash this seed using SHA-256 and broadcast _only the hash_ to the room. This locks in their choice without revealing it.
2. **Reveal:** Once all hashes are received, participants broadcast their actual raw seeds.
3. **Verify & Combine:** Every client verifies that the raw seeds match the originally broadcasted hashes. If everyone is honest, the seeds are deterministically combined and hashed together to produce a single, unpredictable **Final Seed** shared by all clients.

Because the final outcome depends on all seeds combined, no single participant can manipulate the final result, provided at least one participant is honest.

## API Reference

The module exports a default class with two static utilities utilizing the native Web Crypto API.

### `generateCommitment()`

Generates 32 bytes of cryptographically secure randomness and computes its SHA-256 hash.

- **Returns:** `Promise<{ seed: string, hash: string }>` (Base64 encoded strings)

### `verifyAndCombine(participants)`

Deterministically sorts participants, verifies their revealed seeds against their committed hashes, and generates the final shared seed.

- **Parameters:** `participants` - An array of objects: `{ label: string, seed: string, hash: string }`
- **Returns:** `Promise<{ success: boolean, finalSeed?: string, error?: string }>`

## Usage Example

```javascript
import CommitReveal from './CommitReveal.js';

async function performFairRoll() {
  // 1. Generate local commitment and broadcast `myData.hash` to peers
  const myData = await CommitReveal.generateCommitment();

  // ---> Network Phase: Exchange Hashes, then Exchange Seeds <---

  // 2. Collect the revealed data from all participants
  const roomData = [
    { label: 'Player_1', seed: myData.seed, hash: myData.hash },
    { label: 'Player_2', seed: '...', hash: '...' },
    { label: 'Player_3', seed: '...', hash: '...' },
    { label: 'Player_4', seed: '...', hash: '...' },
  ];

  // 3. Verify integrity and combine into the final shared seed
  const result = await CommitReveal.verifyAndCombine(roomData);

  if (!result.success) {
    console.error('Game Halted. Cheating detected:', result.error);
    return;
  }

  console.log('Un-cheatable Final Seed:', result.finalSeed);

  // Use `result.finalSeed` to seed your PRNG (e.g., Mulberry32)
}
```

## Testing

A comprehensive test suite is included to verify deterministic ordering, valid payload processing, and cheater detection.

Ensure your `package.json` includes `"type": "module"`, then run:

```bash
node test.js

```
