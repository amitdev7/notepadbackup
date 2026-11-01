# Zenithsui API Reference

This document provides a reference for all serverless HTTP API routes available under `/app/api/` in **Zenithsui**.

---

## 1. Asset & Media Endpoints

### `GET /api/assets/proxy`
Fetches and proxies external images or PDFs for safe canvas rendering without exposing client IP addresses or violating Cross-Origin Resource Sharing (CORS).
- **Query Parameters**:
  - `url` (string, required): URL of the external asset to proxy.
- **Defensive Safeguards**:
  - Enforces SSRF checks: blocks loopback, private subnets (RFC 1918), and cloud metadata endpoints.
  - Whitelists safe MIME types (`image/*`, `application/pdf`).
  - Limits payload to 25 MB max.
- **Responses**:
  - `200 OK`: Binary image/PDF stream with `Cache-Control: public, max-age=86400`.
  - `400 Bad Request`: Missing or invalid URL parameter.
  - `403 Forbidden`: Blocked private IP or rejected protocol.

### `POST /api/blob/upload`
Uploads a binary media asset directly to Vercel Blob storage.
- **Headers**:
  - `Content-Type: multipart/form-data`
- **Responses**:
  - `200 OK`: `{ url: string, pathname: string, size: number }`
  - `401 Unauthorized`: Missing `BLOB_READ_WRITE_TOKEN`.

---

## 2. Health & Time Calibration

### `GET /api/time`
Returns accurate server timestamp and approximate geographic context to calibrate client clocks against drift.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "ok": true,
      "timestamp": 1793568400000,
      "timezone": "Asia/Kolkata",
      "location": {
        "city": "New Delhi",
        "region": "Delhi",
        "country": "India",
        "countryCode": "IN",
        "source": "headers"
      }
    }
    ```

### `GET /api/db/status`
Verifies database connectivity, active connection pool health, and schema migration state.
- **Responses**:
  - `200 OK`: `{ status: "healthy", latencyMs: 14, database: "postgresql" }`
  - `503 Service Unavailable`: Connection error or database unreachable.

---

## 3. Cryptographic Sharing & Invitations

### `POST /api/share`
Generates a cryptographic share link and stores the encrypted ciphertext payload.
- **Request Body**:
  ```json
  {
    "documentId": "doc_123",
    "encryptedPayload": "base64-aes-gcm-ciphertext",
    "iv": "base64-iv",
    "permission": "view" | "edit"
  }
  ```
- **Responses**:
  - `200 OK`: `{ token: "share_xyz", url: "https://zenithsui.sh/share/share_xyz" }`

### `GET /api/share/[token]`
Retrieves the encrypted ciphertext for a shared document.
- **Responses**:
  - `200 OK`: `{ encryptedPayload: string, iv: string, permission: string }`
  - `404 Not Found`: Expired or non-existent share token.

### `POST /api/invitations/[token]/accept`
Accepts a direct collaborator invitation and links document ownership in Supabase.
- **Responses**:
  - `200 OK`: `{ success: true, documentId: string, role: "editor" | "viewer" }`
  - `410 Gone`: Expired invitation token.

---

## 4. Local-Network Collaboration

### `POST /api/wifi-sync`
Transmits and receives collaborative document operations across peers connected to the same local Wi-Fi network.
- **Headers**:
  - `X-Zenithsui-Gateway-Secret`: Shared gateway authorization secret.
- **Request Body**:
  ```json
  {
    "sessionId": "wifi_sess_abc",
    "op": "doc_op",
    "sender": "peer_desktop_1",
    "payload": { ... }
  }
  ```
- **Responses**:
  - `200 OK`: `{ status: "received", peerCount: 3 }`
  - `403 Forbidden`: Invalid PIN or viewer privilege escalation attempt.
