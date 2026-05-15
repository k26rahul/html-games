# SecureGroup.js

A zero-dependency ES module for establishing secure, encrypted peer-to-peer (P2P) group communication over untrusted networks (such as public WebSockets). It implements a Trust-on-First-Use (TOFU) architecture utilizing an Elliptic Curve Diffie-Hellman (ECDH) handshake to securely distribute a shared AES-GCM group key.

## The Concept

When relaying game data or chat messages over open, unauthenticated WebSocket servers, data is vulnerable to interception and tampering. This module solves this by establishing a secure perimeter:

1. **Host Setup:** A Host generates a cryptographic AES-GCM "Group Key", a temporary ECDH keypair, and an Invitation Code.
2. **Authorization vs. Routing:** The Host's Public Key acts as a routing address and can be published openly. The Invitation Code acts as the authorization password and should be shared securely out-of-band (e.g., via a QR code or private link). This separation ensures the room remains secure even if the Host's public key is widely known.
3. **The Handshake:** A Guest uses the Host's Public Key to derive a temporary, 1-to-1 encrypted channel. The Guest encrypts the Invitation Code alongside a cryptographic nonce and sends a join request.
4. **Key Distribution:** The Host verifies the Invitation Code. If valid, the Host encrypts the AES-GCM Group Key and the Guest's nonce using the 1-to-1 channel and sends it back to the Guest.
5. **Group Communication:** The Guest verifies the returned nonce (to prevent replay attacks), decrypts, and stores the Group Key. All subsequent group communication is encrypted using the shared AES-GCM key.

## API Reference

The module exports two primary classes extending a core cryptographic base (`SecureP2PBase`).

### `SecureHost(maxMembers)`

Manages the room capacity, verifies join requests, and distributes the group key.

- **`init()`**: Initializes the Host's ECDH keypair and generates the AES-GCM Group Key.
- **`getInviteDetails()`**: Returns `{ hostPubKey, inviteCode }` for sharing.
- **`processJoinRequest(guestPubKey, encryptedPayload)`**: Validates the invite code and returns an encrypted Group Key payload.
- **`exportState()`**: Serializes the cryptographic keys (JWK format) and room state into a JSON string to survive browser reloads.
- **`importState(jsonString)`**: Restores the Host's session from a previously exported JSON string.

### `SecureGuest()`

Requests access to a group and securely imports the distributed group key.

- **`init()`**: Initializes the Guest's local ECDH keypair.
- **`createJoinRequest(hostPubKey, inviteCode)`**: Generates an encrypted payload proving possession of the invite code.
- **`processJoinResponse(encryptedResponse)`**: Verifies the handshake nonce, extracts, and stores the AES-GCM Group Key.
- **`exportState()`**: Serializes the Guest's cryptographic keys (JWK format) into a JSON string to survive browser reloads.
- **`importState(jsonString)`**: Restores the Guest's session from a previously exported JSON string.

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

  // ---> Out-of-band transmission: invite.hostPubKey (routing) & invite.inviteCode (auth) <---

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

  // 4. Guest Imports Key
  await guest.processJoinResponse(joinRes);

  // ✅ Secure connection established!

  // 5. Encrypted Group Communication
  const secureMessage = await guest.encrypt({ move: 'e2-e4' });
  const decryptedData = await host.decrypt(secureMessage);
  console.log(decryptedData.move); // "e2-e4"
}
```

## Security & Architecture Features

- **Perfect Forward Secrecy (Handshake):** ECDH keys are temporary and used solely for the initial key distribution.
- **State Persistence:** Browser environments are volatile. The `exportState` and `importState` methods allow the application to seamlessly serialize the cryptographic context to `localStorage`, allowing users to survive page reloads without requiring a new handshake.
- **IV Rotation:** The `encrypt` method automatically generates a unique 12-byte IV for every message to prevent AES-GCM nonce reuse vulnerabilities.
- **Replay & DoS Defense:** - The Handshake utilizes a challenge-response nonce to guarantee the freshness of the Host's response, defeating man-in-the-middle replay attacks.
- The Host strictly manages room capacity and tracks members by Public Key fingerprints to prevent attackers from spamming join requests to exhaust member slots.

- **Authenticated Encryption:** Relies entirely on the native `crypto.subtle` API, utilizing AES-GCM to guarantee both confidentiality and data integrity.

## Testing

A comprehensive test suite is included to verify the STS protocol, State Persistence (Import/Export), Replay defenses, and error handling. Ensure your environment supports ES Modules (`"type": "module"` in `package.json`), then run:

```bash
node test.js

```
