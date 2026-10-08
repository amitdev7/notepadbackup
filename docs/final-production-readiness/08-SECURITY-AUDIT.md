# 08 — Security & Vulnerability Audit

## 1. Threat Analysis & Hardening

### Open Redirect Defense
- **Vulnerability**: OAuth callback at `app/api/auth/callback/route.ts` previously redirected blindly to the incoming `next` query parameter.
- **Remediation**: Implemented strict URL validation:
  - Requires single leading slash `/`.
  - Rejects protocol-relative URLs (`//evil.com`).
  - Rejects backslash evasion attempts (`/\evil.com`).
  - Rejects foreign protocols (`https://`, `javascript:`).
  - Defaults safely to `/dashboard`.

### Supabase Row-Level Security (RLS)
- Authored migration `supabase/migrations/20261008000005_fix_rls_and_schema_drift.sql` enabling comprehensive RLS across:
  - `documents`: Owners and collaborators with valid membership or public links.
  - `document_members`: Strict owner-managed invitation and role modification.
  - `document_versions`: Read/write tied to document collaboration status.
  - `workspaces` and `projects`: Tenant isolation by workspace membership.

### Content & Attachment Sanitization
- Canvas text nodes and document names are sanitized against XSS injection.
- Image nodes restrict `src` strictly to `data:image/` base64 payloads, blocking malicious external tracking pixels and scripts.
- Embedded documents enforce MIME type verification and SHA-256 integrity validation.
