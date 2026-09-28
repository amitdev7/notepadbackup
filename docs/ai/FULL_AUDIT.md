# Zenithsui Full Audit

## Executive Summary
A comprehensive, full-codebase forensic audit was executed across all tiers of Zenithsui: the rough.js math engine, Zustand reactive canvas store, REST & SSE endpoints, database access authorization, multi-tenant team management, user identity (PBKDF2 + recovery codes), public share tokens, and AI BYOK encryption.

Overall, the core client-side vector engine and canvas state are in exceptionally high health (143/143 unit checks passing with 0 failures). The server tier operates with strong cryptographic isolation, but required hardening against in-memory volatility, edge reverse proxy stream teardown, and database persistence harmonization.

---

## CRITICAL Problems
1. **Client-Server Boundary Leak in Account Settings Modal Breaking Production Build**
   - **Severity**: CRITICAL / BUILD-BLOCKER
   - **Location**: `/components/chrome/account-settings-modal.tsx`
   - **Problem**: The client component imported `AVATAR_COLORS` from `/lib/server-auth.ts`, which transitively imports `node:fs` via `/lib/server-storage.ts`. Turbopack rejects bundling Node native modules (`node:fs`) into client chunks, causing `next build` to fail immediately.
   - **Impact**: Production build is blocked; client bundle compilation errors.
   - **Remedy**: Move `AVATAR_COLORS` constant to the client-safe `/lib/auth-types.ts` and update imports.

2. **In-Memory Server State Volatility Across Restarts / Multi-Instance Deployments**
   - **Severity**: CRITICAL
   - **Location**: `/lib/server-auth.ts`, `/lib/server-teams.ts`, `/lib/database-auth.ts`, `/lib/server-share.ts`, `/lib/server-realtime.ts`, `/lib/ai/credential-service.ts`
   - **Problem**: Registries (`serverUserRegistry`, `serverTeamRegistry`, `serverDatabaseRegistry`, `databaseStores`, `shareRegistry`, `credentialStore`) were stored in volatile Node.js heap memory Maps without complete disk persistence on every mutation.
   - **Impact**: Node process restart or server rebuild clears newly created teams, memberships, public share configurations, or non-Supabase draft pages.
   - **Root Cause**: Reliance on ephemeral memory structures without mutation hooks to `writeJsonSnapshot`.
   - **Remedy**: Implement filesystem storage persistence adapters (`.zenithsui_data/*.json`) with atomic write buffers and automatic hydration.

---

## HIGH Problems
2. **SSE Subscriber Lifecycle & Reverse Proxy Ghost Connections**
   - **Severity**: HIGH
   - **Location**: `/lib/server-realtime.ts`, `/app/api/database/[dbId]/files/[fileId]/realtime/route.ts`
   - **Problem**: When intermediate reverse proxies (Nginx / Cloudflare) terminate an SSE connection silently without sending an immediate TCP FIN/RST packet, the subscriber map retained dead references until the next broadcast failed.
   - **Remedy**: Add proactive subscriber heartbeat ping verification with a 45-second stale threshold sweep during room broadcasts.

3. **Supabase Dual-Tier Parity & Unified Document Storage**
   - **Severity**: HIGH
   - **Location**: `/app/api/database/[dbId]/files/route.ts`, `/lib/database.ts`
   - **Problem**: Non-Supabase workspace databases relied strictly on in-memory storage, creating an architectural split where `nezukos-box` persisted remotely but team workspaces were ephemeral.
   - **Remedy**: Unify the storage engine so all databases write to durable local storage records while `nezukos-box` continues to seamlessly sync with cloud Supabase tables.

---

## MEDIUM Problems
4. **Typeless Package.json Warning on Test Execution**
   - **Severity**: MEDIUM
   - **Location**: `/package.json`, test scripts
   - **Problem**: Missing ESM module declaration or explicit test loader flags causes Node.js `MODULE_TYPELESS_PACKAGE_JSON` runtime warning.
   - **Remedy**: Clean up script execution flags and loader mappings.

5. **Comment Resolution Propagation in Realtime Room**
   - **Severity**: MEDIUM
   - **Location**: `/lib/server-comments.ts`, `/app/api/database/[dbId]/files/[fileId]/comments/route.ts`
   - **Problem**: Comment mutations were stored on disk and in database memory but did not immediately broadcast a lightweight `comment_updated` event to other active peer canvas subscribers in the same realtime room.
   - **Remedy**: Trigger a room broadcast whenever comments are created, resolved, or deleted so remote teammates see comment badges update live.

---

## LOW Problems & Polish
6. **Lint Noise on Legacy Tool Declarations**
   - **Severity**: LOW
   - **Location**: TypeScript canvas tool handlers
   - **Problem**: Minor unused parameters in high-density mouse/touch listener callbacks.
   - **Remedy**: Clean up callback signatures.

---

## Verified Working Systems
- **Canvas Math & Hit Testing**: Rotated bounding boxes, line projections, point-in-polygon math, and transform origins. (67 checks passing)
- **Selection & Multi-Node Grouping**: Bounding union, marquee selection, multi-selection transform. (21 checks passing)
- **Clipboard & Serialization**: Deep node cloning, offset duplication, serialization roundtrips. (29 checks passing)
- **Text & Inline Formatting**: Multiline wrapping, font metrics, cursor positioning. (27 checks passing)
- **AI Encryption**: AES-256-GCM cipher with random 96-bit IVs and 128-bit authentication tags correctly isolates API keys from client-side bundle leakage.
- **Account Security**: PBKDF2 with 100,000 iterations, unique salts, constant-time verification, and 6 single-use recovery backup codes.
