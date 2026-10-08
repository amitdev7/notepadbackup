# 05 — Sharing & Collaboration Audit

## 1. Cryptographic Sharing Model
- Document sharing utilizes URL tokens generated with cryptographic entropy (`nanoid` / CSPRNG) and hashed with SHA-256 before database insertion in `share_links`.
- Optional password protection uses PBKDF2 / SHA-256 password hashing.
- Share permissions support:
  - `viewer`: Read-only access with canvas tool palette restricted.
  - `editor`: Collaborative write access.
  - Granular export & duplicate permissions (`allow_export`, `allow_duplicate`).

---

## 2. Viewer Canvas Hydration (P0 Remediation)
- **Previous Defect**: `app/share/[token]/viewer-client.tsx` failed to hydrate the incoming `initialDoc` into the canvas store, causing shared viewers to render an empty canvas or whatever stale local document was cached in their browser.
- **Remediation**:
  - `viewer-client.tsx` now calls `useSquig.getState().loadDoc(initialDoc)` immediately upon mount.
  - Sets `useSquig.getState().setEffectiveRole(role)`.
  - Disables mutation actions, autosave flushing, and editing tools when operating in `viewer` mode.

---

## 3. Version History Snapshots
- `lib/cloud/versions.ts` provides immutable version history snapshots:
  - Captures full `CanvasDocumentJson` snapshots with auto-incrementing `version_number`.
  - Supports version restoration with forward-stepping non-destructive rollback.
  - Strictly aligned with Supabase schema types (`snapshot`, `label`, `version_number`, `created_by`).
