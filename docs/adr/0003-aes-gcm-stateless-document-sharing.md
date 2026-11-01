# ADR 0003: Stateless AES-256-GCM End-to-End Cryptographic Sharing

## Status
**Accepted**

## Context
When sharing wireframes and diagrams with clients or collaborators, users require high confidentiality. Storing plain-text documents on central databases exposes user proprietary wireframes to database breaches, infrastructure administrators, or unauthorized indexing.

## Decision
We implemented **Client-Side AES-256-GCM End-to-End Encryption**:
1. When generating a share link, the client generates a 256-bit symmetric key (`crypto.subtle.generateKey`).
2. The client encrypts the document payload locally using AES-GCM with a 12-byte random IV.
3. The encrypted ciphertext is stored on the server under a random share token.
4. The decryption key is appended strictly to the URL hash fragment (`#key=<base64-key>`).
5. Browsers never transmit URL hash fragments in HTTP requests (RFC 3986), ensuring the host server never sees the plaintext key or unencrypted canvas.

## Consequences
### Positive
- Zero-knowledge storage: The server operator cannot read user documents.
- Anyone with the full share link (including the `#key` fragment) can decrypt and view the document instantly.
### Negative / Trade-offs
- If the sender truncates the link and omits `#key=...`, the recipient cannot decrypt the document.
- Server-side search on document contents is impossible by design.
