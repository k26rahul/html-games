/**
 * SecureGroup.js
 *
 * Trust-on-First-Use (TOFU) Encrypted Group Communication.
 * Implements an Elliptic Curve Diffie-Hellman (ECDH) handshake to securely
 * distribute an AES-GCM group key over an untrusted channel.
 */

// ==========================================
// 1. BASE CLASS (Core Cryptography)
// ==========================================

export class SecureP2PBase {
  // Shared state variables
  ecdhKeyPair = null;
  groupKey = null;

  /**
   * Helper: Convert Uint8Array to Base64
   */
  static _toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Helper: Convert Base64 to Uint8Array
   */
  static _fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generates the temporary ECDH key pair for the handshake.
   */
  async _generateECDH() {
    this.ecdhKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true, // extractable (so we can send the public key and save state)
      ['deriveKey'],
    );
  }

  /**
   * Exports a public ECDH key to a Base64 string for network transport.
   */
  async _exportPublicKey(publicKey) {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return SecureP2PBase._toBase64(new Uint8Array(exported));
  }

  /**
   * Imports a Base64 ECDH public key received from the network.
   */
  async _importPublicKey(base64Str) {
    const buffer = SecureP2PBase._fromBase64(base64Str);
    return await crypto.subtle.importKey(
      'spki',
      buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
  }

  /**
   * Derives a temporary AES-GCM key for 1-to-1 communication (Handshake phase).
   */
  async _deriveSharedSecret(myPrivateKey, theirPublicKeyBase64) {
    const theirPublicKey = await this._importPublicKey(theirPublicKeyBase64);
    return await crypto.subtle.deriveKey(
      { name: 'ECDH', public: theirPublicKey },
      myPrivateKey,
      { name: 'AES-GCM', length: 256 },
      false, // Do not allow this derived key to be extracted
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Core Encryption: Wraps data in AES-GCM.
   * Automatically prepends a 12-byte IV and returns a single Base64 string.
   */
  async _encryptPayload(key, payloadObject) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(payloadObject));

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );

    // Combine IV (12 bytes) + Ciphertext into one array
    const combined = new Uint8Array(12 + ciphertextBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertextBuffer), 12);

    return SecureP2PBase._toBase64(combined);
  }

  /**
   * Core Decryption: Extracts the IV and decrypts the AES-GCM payload.
   */
  async _decryptPayload(key, encryptedBase64) {
    const combined = SecureP2PBase._fromBase64(encryptedBase64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  }

  /**
   * Public API: Encrypts data for the whole group.
   */
  async encrypt(dataObject) {
    if (!this.groupKey) throw new Error('Group key not established.');
    return await this._encryptPayload(this.groupKey, dataObject);
  }

  /**
   * Public API: Decrypts data from the group.
   */
  async decrypt(encryptedBase64) {
    if (!this.groupKey) throw new Error('Group key not established.');
    return await this._decryptPayload(this.groupKey, encryptedBase64);
  }
}

// ==========================================
// 2. HOST CLASS (Manager)
// ==========================================

export class SecureHost extends SecureP2PBase {
  #maxMembers;
  #invitationCode;
  #members = new Set(); // Stores Guest Public Keys to prevent Replay DoS

  constructor(maxMembers = 4) {
    super();
    this.#maxMembers = maxMembers;
  }

  /**
   * Initializes the Host: Generates ECDH, the Group Secret Key, and an Invite Code.
   */
  async init() {
    await this._generateECDH();

    // Generate the final Group Secret Key
    this.groupKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // Extractable, so we can save state and send to guests
      ['encrypt', 'decrypt'],
    );

    this.regenerateInvitationCode();
  }

  regenerateInvitationCode() {
    // Generate a simple, random 6-character hex code
    const randomBytes = crypto.getRandomValues(new Uint8Array(3));
    this.#invitationCode = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  /**
   * Returns the data needed to generate the QR Code or invite link.
   */
  async getInviteDetails() {
    return {
      hostPubKey: await this._exportPublicKey(this.ecdhKeyPair.publicKey),
      inviteCode: this.#invitationCode,
    };
  }

  /**
   * Step 2: Host receives Join Request, verifies code and nonce, and returns the Group Key.
   */
  async processJoinRequest(guestPubKeyBase64, encryptedJoinRequest) {
    // 1. Derive the 1-to-1 handshake key
    const handshakeKey = await this._deriveSharedSecret(
      this.ecdhKeyPair.privateKey,
      guestPubKeyBase64,
    );

    // 2. Decrypt the request
    let requestData;
    try {
      requestData = await this._decryptPayload(handshakeKey, encryptedJoinRequest);
    } catch (e) {
      throw new Error('Decryption failed. Invalid handshake or corrupted data.');
    }

    // 3. Verify the Invitation Code
    if (requestData.inviteCode !== this.#invitationCode) {
      throw new Error('Invalid invitation code.');
    }

    // 4. Enforce member limits (tracking by Public Key to prevent replays)
    this.#members.add(guestPubKeyBase64);
    if (this.#members.size > this.#maxMembers) {
      this.#members.delete(guestPubKeyBase64); // Rollback
      throw new Error('Room is full.');
    }

    // 5. Export the Group Key to raw format so it can be sent
    const exportedGroupKey = await crypto.subtle.exportKey('raw', this.groupKey);
    const groupKeyBase64 = SecureP2PBase._toBase64(new Uint8Array(exportedGroupKey));

    // 6. Encrypt the Group Key and mirror the nonce back to the guest
    return await this._encryptPayload(handshakeKey, {
      groupKey: groupKeyBase64,
      nonce: requestData.nonce,
    });
  }

  /**
   * Exports the complete Host state as a JSON string for persistence (e.g., localStorage).
   */
  async exportState() {
    const state = {
      maxMembers: this.#maxMembers,
      invitationCode: this.#invitationCode,
      members: Array.from(this.#members),
      ecdhPublicKey: await crypto.subtle.exportKey('jwk', this.ecdhKeyPair.publicKey),
      ecdhPrivateKey: await crypto.subtle.exportKey('jwk', this.ecdhKeyPair.privateKey),
      groupKey: this.groupKey
        ? await crypto.subtle.exportKey('jwk', this.groupKey)
        : null,
    };
    return JSON.stringify(state);
  }

  /**
   * Imports a previously exported JSON state to resume the Host session.
   */
  async importState(jsonString) {
    const state = JSON.parse(jsonString);
    this.#maxMembers = state.maxMembers;
    this.#invitationCode = state.invitationCode;
    this.#members = new Set(state.members);

    const pubKey = await crypto.subtle.importKey(
      'jwk',
      state.ecdhPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const privKey = await crypto.subtle.importKey(
      'jwk',
      state.ecdhPrivateKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey'],
    );
    this.ecdhKeyPair = { publicKey: pubKey, privateKey: privKey };

    if (state.groupKey) {
      this.groupKey = await crypto.subtle.importKey(
        'jwk',
        state.groupKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
    }
  }
}

// ==========================================
// 3. GUEST CLASS (Participant)
// ==========================================

export class SecureGuest extends SecureP2PBase {
  #hostPubKeyBase64;
  #handshakeKey;
  #joinNonce; // Used to prevent replay attacks during the join phase

  /**
   * Initializes the Guest: Generates their local ECDH keypair.
   */
  async init() {
    await this._generateECDH();
  }

  /**
   * Step 1: Guest creates the encrypted Join Request.
   */
  async createJoinRequest(hostPubKeyBase64, inviteCode) {
    this.#hostPubKeyBase64 = hostPubKeyBase64;

    // Generate a secure nonce for replay protection
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    this.#joinNonce = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 1. Derive the 1-to-1 handshake key
    this.#handshakeKey = await this._deriveSharedSecret(
      this.ecdhKeyPair.privateKey,
      hostPubKeyBase64,
    );

    // 2. Encrypt the invitation code and nonce with the handshake key
    const encryptedPayload = await this._encryptPayload(this.#handshakeKey, {
      inviteCode: inviteCode,
      nonce: this.#joinNonce,
    });

    // 3. Return the payload AND the guest's public key (so the host can derive the secret)
    return {
      guestPubKey: await this._exportPublicKey(this.ecdhKeyPair.publicKey),
      encryptedPayload: encryptedPayload,
    };
  }

  /**
   * Step 3: Guest receives the Host's response, verifies the nonce, and extracts the Group Key.
   */
  async processJoinResponse(encryptedResponse) {
    if (!this.#handshakeKey) throw new Error('Handshake key not initialized.');

    // 1. Decrypt using the 1-to-1 key
    const responseData = await this._decryptPayload(
      this.#handshakeKey,
      encryptedResponse,
    );

    // 2. Verify the nonce to ensure freshness and prevent replay attacks
    if (responseData.nonce !== this.#joinNonce) {
      throw new Error('Nonce verification failed! Possible replay attack.');
    }

    if (!responseData.groupKey) {
      throw new Error('Host did not provide a group key.');
    }

    // 3. Import the raw Group Key into the subtle crypto engine
    const groupKeyBuffer = SecureP2PBase._fromBase64(responseData.groupKey);
    this.groupKey = await crypto.subtle.importKey(
      'raw',
      groupKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      true, // Extractable, so the guest can persist their state across reloads
      ['encrypt', 'decrypt'],
    );

    // Handshake 1-to-1 key is no longer needed
    this.#handshakeKey = null;
    this.#joinNonce = null;
  }

  /**
   * Exports the Guest state as a JSON string for persistence.
   */
  async exportState() {
    const state = {
      ecdhPublicKey: this.ecdhKeyPair
        ? await crypto.subtle.exportKey('jwk', this.ecdhKeyPair.publicKey)
        : null,
      ecdhPrivateKey: this.ecdhKeyPair
        ? await crypto.subtle.exportKey('jwk', this.ecdhKeyPair.privateKey)
        : null,
      groupKey: this.groupKey
        ? await crypto.subtle.exportKey('jwk', this.groupKey)
        : null,
    };
    return JSON.stringify(state);
  }

  /**
   * Imports a previously exported JSON state to resume the Guest session.
   */
  async importState(jsonString) {
    const state = JSON.parse(jsonString);

    if (state.ecdhPublicKey && state.ecdhPrivateKey) {
      const pubKey = await crypto.subtle.importKey(
        'jwk',
        state.ecdhPublicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        [],
      );
      const privKey = await crypto.subtle.importKey(
        'jwk',
        state.ecdhPrivateKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey'],
      );
      this.ecdhKeyPair = { publicKey: pubKey, privateKey: privKey };
    }

    if (state.groupKey) {
      this.groupKey = await crypto.subtle.importKey(
        'jwk',
        state.groupKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
    }
  }
}
