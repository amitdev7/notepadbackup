# Zenithsui Security Architecture & Threat Model

This document outlines the security architecture, threat model, cryptographic algorithms, and defensive controls implemented in **Zenithsui**.

---

## 1. Threat Model & Security Boundaries

```
[Untrusted Web / External Media]
            │
            ▼ (SSRF Filter & MIME Verification)
[Asset Proxy: /api/assets/proxy]
            │
            ▼ (Secure Ingestion)
[Client Browser / IndexedDB Sandbox]
            ▲
            │ (AES-256-GCM Encrypted Payloads)
[Cloud Share Service / Supabase PostgreSQL]
```

### Trust Zones
1. **Client Browser Sandbox**: The user's device and local IndexedDB store are considered trusted local execution environments.
2. **Serverless API Layer**: Next.js API endpoints run statelessly with minimal privilege.
3. **Public Network / External Media**: External websites, uploaded images, and untrusted peers are treated as potentially hostile.

---

## 2. Cryptographic Architecture (AES-256-GCM)

Zenithsui implements end-to-end client-side encryption for document sharing:
- **Algorithm**: `AES-GCM` with a 256-bit key length and 128-bit authentication tag.
- **Initialization Vector (IV)**: 12-byte cryptographically secure random bytes (`crypto.getRandomValues`) generated per document save.
- **Key Derivation & Transport**:
  - The secret key is never transmitted to the host server in plain text.
  - The key is embedded in the URL fragment:
    `https://zenithsui.sh/share/<token>#key=<base64-key>`
  - RFC 3986 specifies that URL fragments are handled strictly by the browser and are never transmitted in HTTP `Host` or `Referer` headers.

---

## 3. Server-Side Request Forgery (SSRF) Protection

When users embed external images or documents via URL, requests are routed through `/api/assets/proxy`. The proxy enforces the following controls:

### IP Range & Address Validation
- Resolves DNS hostnames to IPv4/IPv6 addresses before issuing requests.
- Rejects loopback (`127.0.0.0/8`, `::1`).
- Rejects RFC 1918 private subnets:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- Rejects cloud provider instance metadata services (`169.254.169.254`, `fd00:ec2::254`).
- Rejects broadcast and multicast addresses.

### Content Type & Size Restrictions
- Validates the `Content-Type` header against strict media allowlists:
  `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `application/pdf`.
- Enforces a 25 MB maximum payload size to prevent denial-of-service via resource exhaustion.

---

## 4. Electron Desktop Security Hardening

For desktop builds, Electron is hardened against remote code execution:
- `contextIsolation: true`: Isolates the preload script execution context from the website DOM.
- `nodeIntegration: false`: Renderer code cannot access Node.js primitives or native modules.
- `webSecurity: true`: Enforces same-origin policy and CORS restrictions.
- `sandbox: true`: Runs renderer processes in Chromium's OS-level sandbox.
- **Safe External Navigation**: All external navigation events (`window.open`, link clicks) are intercepted and delegated to the system default browser via `shell.openExternal`.
