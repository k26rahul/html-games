# SecureGroup.js

A zero-dependency ES module for establishing secure, encrypted peer-to-peer (P2P) group communication over untrusted networks (such as public WebSockets). It implements a Trust-on-First-Use (TOFU) architecture utilizing an Elliptic Curve Diffie-Hellman (ECDH) handshake to securely distribute a shared AES-GCM group key.

## The Concept

When relaying game data or chat messages over open, unauthenticated WebSocket servers, data is vulnerable to interception and tampering. This module solves this by establishing a secure perimeter:

1. **Host Setup:** A Host generates a cryptographic AES-GCM "Group Key", a temporary ECDH keypair, and an Invitation Code. The Host shares their Public Key and Invitation Code out-of-band (e.g., via a QR code or invite link).
2. **The Handshake:** A Guest uses the Host's Public Key to derive a temporary, 1-to-1 encrypted channel. The Guest encrypts the Invitation Code and sends a join request.
3. **Key Distribution:** The Host verifies the Invitation Code. If valid, the Host encrypts the AES-GCM Group Key using the 1-to-1 channel and sends it to the Guest.
4. **Group Communication:** The Guest decrypts and stores the Group Key. Both parties verify the connection via a cryptographic Hello/Welcome exchange. All subsequent group communication is encrypted using the shared AES-GCM key.

## API Reference

The module exports two primary classes extending a core cryptographic base (`SecureP2PBase`).

### `SecureHost(maxMembers)`

Manages the room capacity, verifies join requests, and distributes the group key.

- **`init()`**: Initializes the Host's ECDH keypair and generates the AES-GCM Group Key.
- **`getInviteDetails()`**: Returns `{ hostPubKey, inviteCode }` for out-of-band sharing.
- **`processJoinRequest(guestPubKey, encryptedPayload)`**: Validates the invite code and returns an encrypted Group Key.
- **`processHello(encryptedHello)`**: Responds to a guest's connection test to finalize trust.

### `SecureGuest()`

Requests access to a group and securely imports the distributed group key.

- **`init()`**: Initializes the Guest's local ECDH keypair.
- **`createJoinRequest(hostPubKey, inviteCode)`**: Generates an encrypted payload proving possession of the invite code.
- **`processJoinResponse(encryptedResponse)`**: Extracts and stores the AES-GCM Group Key.
- **`createHello()` / `processWelcome(payload)**`: Verifies the key works before allowing application-level data transmission.

### Shared Methods (Available on both Host and Guest)

- **`encrypt(dataObject)`**: Encrypts a JSON payload using the Group Key. Automatically prepends a secure, randomized Initialization Vector (IV). Returns a Base64 string.
- **`decrypt(encryptedBase64)`**: Extracts the IV and decrypts the Base64 string back into a JSON object.

## Usage Example

```javascript
import { SecureHost, SecureGuest } from './SecureGroup.js';

async function establishSecureConnection() {
  // 1. Host Initialization
  const host = new SecureHost(4); // Max 4 members
  await host.init();
  const invite = await host.getInviteDetails();

  // ---> Out-of-band transmission of invite.hostPubKey and invite.inviteCode <---

  // 2. Guest Initialization & Request
  const guest = new SecureGuest();
  await guest.init();
  const joinReq = await guest.createJoinRequest(invite.hostPubKey, invite.inviteCode);

  // ---> WebSocket Transmission: Guest sends joinReq to Host <---

  // 3. Host Verification & Key Distribution
  const joinRes = await host.processJoinRequest(
    joinReq.guestPubKey,
    joinReq.encryptedPayload,
  );

  // ---> WebSocket Transmission: Host sends joinRes back to Guest <---

  // 4. Guest Imports Key & Initiates Test
  await guest.processJoinResponse(joinRes);
  const helloMsg = await guest.createHello();

  // 5. Host Completes Test
  const welcomeMsg = await host.processHello(helloMsg);
  await guest.processWelcome(welcomeMsg);

  // ✅ Secure connection established!

  // 6. Encrypted Group Communication
  const secureMessage = await guest.encrypt({ move: 'e2-e4' });
  const decryptedData = await host.decrypt(secureMessage);
  console.log(decryptedData.move); // "e2-e4"
}
```

## Security Features

- **Perfect Forward Secrecy (Handshake):** ECDH keys are temporary and used solely for the initial key distribution.
- **IV Rotation:** The `encrypt` method automatically generates a unique 12-byte IV for every message to prevent AES-GCM nonce reuse vulnerabilities.
- **Replay & DoS Defense:** The Host strictly manages room capacity and tracks members by Public Key fingerprints to prevent attackers from spamming join requests to exhaust member slots.
- **Authenticated Encryption:** Relies entirely on the native `crypto.subtle` API, utilizing AES-GCM to guarantee both confidentiality and data integrity.

## Testing

A comprehensive test suite is included to verify the STS protocol, Replay defenses, and error handling. Ensure your environment supports ES Modules (`"type": "module"` in `package.json`), then run:

```bash
node test.js

```
