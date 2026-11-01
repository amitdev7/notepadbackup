# Zenithsui Configuration & Environment Reference

This document provides a comprehensive reference for all environment variables, runtime flags, and configuration files supported by **Zenithsui**.

> [!NOTE]
> Zenithsui is architected with a **local-first philosophy**. If zero environment variables are configured, the application functions with 100% feature parity using client-side IndexedDB storage and client-side encryption. External variables are required only for optional cloud sync, authentication, or remote media hosting.

---

## Environment Variables Matrix

| Variable Name | Scope | Required | Default / Fallback | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client) | No | `null` | Supabase project API endpoint URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (Client) | No | `null` | Supabase modern publishable client key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client) | No | `null` | Supabase anonymous client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (Server) | No | `null` | Supabase admin service-role key for backend document operations |
| `SUPABASE_SECRET_KEY` | Secret (Server) | No | `null` | Server-side cryptographic secret key for signing payloads |
| `SUPABASE_JWKS_URL` | Secret (Server) | No | `null` | Endpoint URL for JSON Web Key Set verification |
| `DATABASE_URL` | Secret (Server) | No | `null` | PostgreSQL pooled connection string for serverless API routes |
| `DIRECT_URL` | Secret (Server) | No | `null` | Direct PostgreSQL connection string |
| `SHARE_SESSION_SECRET` | Secret (Server) | Recommended | Insecure dev fallback | 32+ character secret used to sign HMAC-SHA256 share session tokens |
| `BLOB_READ_WRITE_TOKEN` | Secret (Server) | No | `null` | Vercel Blob access token for uploading images/PDFs |
| `NEXT_PUBLIC_SITE_URL` | Public (Client) | No | `window.location.origin` / Vercel auto | Canonical base URL used for generating absolute share and invitation URLs |
| `ZENITHSUI_GATEWAY_PORT` | Secret (Server) | No | `8787` | Port for local peer-to-peer Wi-Fi collaboration gateway |
| `ZENITHSUI_GATEWAY_HOST` | Secret (Server) | No | `0.0.0.0` | Bind host address for local Wi-Fi gateway |
| `ZENITHSUI_GATEWAY_SECRET` | Secret (Server) | Recommended | Insecure dev fallback | Pre-shared key for authorizing local network peer sync operations |

---

## Detailed Variable Descriptions

### 1. Supabase Cloud Configuration
Used in `lib/db/supabase-server.ts` and `app/api/documents/`:
- `NEXT_PUBLIC_SUPABASE_URL`: The base URL of your Supabase project (e.g., `https://xyzcompany.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Client-side tokens for interacting with Supabase Auth and Row-Level Security (RLS) tables.
- `SUPABASE_SERVICE_ROLE_KEY`: Privileged server-only token used in API routes to create documents and invite records bypassing RLS. **Never expose this variable to client code.**

### 2. Cryptographic Share Sessions
Used in `lib/crypto/` and `app/api/share/`:
- `SHARE_SESSION_SECRET`: A high-entropy 32-byte secret used to sign and verify temporary session tickets and invitation tokens.
- Generate a strong secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Vercel Blob Storage
Used in `app/api/blob/upload/`:
- `BLOB_READ_WRITE_TOKEN`: Automatically injected by Vercel when connecting a Vercel Blob store. Enables uploading images and PDFs larger than standard browser IndexedDB quotas.

### 4. Local Wi-Fi Gateway
Used in `lib/lan/` and `app/api/wifi-sync/`:
- `ZENITHSUI_GATEWAY_PORT`: Port on which the local collaboration gateway listens (default `8787`).
- `ZENITHSUI_GATEWAY_SECRET`: Shared secret preventing unauthorized devices on the same Wi-Fi network from tampering with collaborative canvas states.

---

## Security Invariants

- All variables prefixed with `NEXT_PUBLIC_` are baked into client JavaScript bundles during `pnpm build`. Do not place sensitive secrets in variables prefixed with `NEXT_PUBLIC_`.
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SHARE_SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`) are accessible exclusively inside serverless API routes (`app/api/*`).
- `.env.local`, `.env.production`, and any `.pem` or credential files are explicitly ignored in `.gitignore`.
