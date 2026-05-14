/**
 * CommitReveal.js
 *
 * An ES Module for a mathematically fair Commit-Reveal Scheme.
 * Generates an un-cheatable, shared random seed for P2P applications.
 */

export default class CommitReveal {
  /**
   * Helper: Converts a Uint8Array or ArrayBuffer to a Base64 string.
   * This makes the binary data easy to send over WebSockets (JSON).
   * @param {Uint8Array|ArrayBuffer} buffer
   * @returns {string} Base64 string
   */
  static #encodeBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Helper: Converts a Base64 string back to a Uint8Array.
   * @param {string} base64
   * @returns {Uint8Array}
   */
  static #decodeBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generates a 32-byte random seed and its SHA-256 hash (Commitment).
   * Call this when it's time for a new round/dice roll.
   *
   * @returns {Promise<{seed: string, hash: string}>} The Base64 encoded seed and hash.
   */
  static async generateCommitment() {
    // 1. Generate 32 bytes of cryptographically secure randomness
    const seedBytes = crypto.getRandomValues(new Uint8Array(32));

    // 2. Hash the seed using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', seedBytes);

    // 3. Return both as strings for easy transmission
    return {
      seed: this.#encodeBase64(seedBytes),
      hash: this.#encodeBase64(hashBuffer),
    };
  }

  /**
   * Verifies all participants' seeds against their original hashes.
   * If everyone is honest, it combines them deterministically into a final seed.
   *
   * @param {Array<{label: string, seed: string, hash: string}>} participants
   * @returns {Promise<{success: boolean, finalSeed?: string, error?: string}>}
   */
  static async verifyAndCombine(participants) {
    // 1. Sort participants by label to guarantee deterministic ordering.
    // If we don't sort, clients might combine seeds in different orders
    // depending on network latency, resulting in different final seeds!
    const sortedParticipants = [...participants].sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    // Array to hold the validated raw seed bytes
    const validSeedBytes = [];

    // 2. Verify every participant
    for (const p of sortedParticipants) {
      if (!p.seed || !p.hash || !p.label) {
        return {
          success: false,
          error: 'Missing required properties (label, seed, hash) on a participant.',
        };
      }

      const seedBytes = this.#decodeBase64(p.seed);

      // Hash their revealed seed
      const computedHashBuffer = await crypto.subtle.digest('SHA-256', seedBytes);
      const computedHash = this.#encodeBase64(computedHashBuffer);

      // Moment of truth: Does it match the hash they committed to earlier?
      if (computedHash !== p.hash) {
        return {
          success: false,
          error: `Cheater Detected: ${p.label} submitted a seed that does not match their commitment.`,
        };
      }

      validSeedBytes.push(seedBytes);
    }

    // 3. All participants are honest! Combine the seeds.
    // Calculate total length (usually 32 bytes * number of players)
    const totalLength = validSeedBytes.reduce((acc, bytes) => acc + bytes.length, 0);
    const combinedBytes = new Uint8Array(totalLength);

    let offset = 0;
    for (const bytes of validSeedBytes) {
      combinedBytes.set(bytes, offset);
      offset += bytes.length;
    }

    // 4. Hash the combined seeds to create the un-cheatable Final Seed
    const finalHashBuffer = await crypto.subtle.digest('SHA-256', combinedBytes);

    return {
      success: true,
      finalSeed: this.#encodeBase64(finalHashBuffer), // Base64 string, ready to seed your PRNG
    };
  }
}
