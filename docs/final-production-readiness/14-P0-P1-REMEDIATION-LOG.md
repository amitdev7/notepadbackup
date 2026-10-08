# 14 — P0 & P1 Remediation Log

| Defect ID | Priority | Subsystem | Description & Root Cause | Resolution & Verification |
|---|---|---|---|---|
| **REM-01** | **P0** | Collaboration | `viewer-client.tsx` failed to hydrate `initialDoc` into `useSquig` store, rendering blank canvas for viewers. | Added `useSquig.getState().loadDoc(initialDoc)` and `setEffectiveRole()`. Verified in shared view tests. |
| **REM-02** | **P0** | Storage | `lib/files.ts` silently dropped oldest files in a `while (!stored)` loop on quota errors. | Eliminated destructive loop; routed durable saves to IndexedDB via `saveLocalDocument()`. |
| **REM-03** | **P0** | Clipboard | `lib/clipboard-payload.ts` dropped `sticky`, `frame`, `embed`, and `diamond` nodes during copy/paste. | Expanded `NODE_TYPES` and schema validation for all 10 node types. Verified round-trip in test suite. |
| **REM-04** | **P0** | Geometry | Rhombus (`diamond`) and ellipse hit-testing incorrectly captured bounding box corners. | Implemented normalized distance checks in `hitsPoint` and `hitsInterior`. Verified in `test-production-hardening.ts`. |
| **REM-05** | **P0** | Diagramming | Cloning connected arrows and nodes left arrows pointing to original elements rather than cloned counterparts. | Remapped `ArrowBinding.elementId` in `cloneNodes` using an ID remap table. Verified in test suite. |
| **REM-06** | **P1** | Security | OAuth callback at `/api/auth/callback` blindly redirected to unsanitized `next` URL. | Added strict URL sanitizer rejecting protocol-relative and external domains. Verified in test suite. |
| **REM-07** | **P1** | Routes | Missing Next.js App Router error and loading boundaries. | Created `app/error.tsx`, `app/not-found.tsx`, and `app/loading.tsx`. |
| **REM-08** | **P1** | Database | DDL column drift between code and Supabase migrations (`document_versions`, `documents`, RLS). | Authored migration `20261008000005_fix_rls_and_schema_drift.sql` and synchronized TypeScript types. |
| **REM-09** | **P1** | UI Controls | Frame, Sticky, Search, and Stats lacked granular user visibility toggles. | Added 26-control toggle matrix in `lib/shell-store.ts` and `components/shell/settings-dialog.tsx`. |
| **REM-10** | **P1** | LAN P2P | Wi-Fi publishing probe cancellation unhandled when toggled rapidly. | Added probe cancellation checks and strict type signatures in `lib/lan/session.ts`. |
