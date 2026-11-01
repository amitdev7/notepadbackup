# Zenithsui Testing & Quality Assurance Runbook

Zenithsui features an extensive, zero-dependency automated testing architecture composed of **37 specialized test suites** validating mathematical invariants, memory safety, collision geometry, cryptographic sharing, database security, and offline sync mechanics.

---

## 1. Running Tests

### Execute All 37 Test Suites
```bash
pnpm test
```
All suites execute sequentially in headless Node.js using native TypeScript type stripping (`--experimental-strip-types`) and the custom ESM loader (`scripts/register-loader.mjs`).

### Execute an Individual Test Suite
Run any single suite directly with Node:
```bash
node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-clock-location.ts
node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-geometry.ts
node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-hover-notes.ts
```

---

## 2. Test Suites Catalog (37 Suites)

### Canvas Math, Geometry & Interaction
1. `scripts/test-geometry.ts`: 67 bounding box, intersection, coordinate conversion, and rotation checks.
2. `scripts/test-selection.ts`: 21 marquee hit-test, multi-selection, and group traversal checks.
3. `scripts/test-clipboard.ts`: 29 copy/cut/paste, serialized MIME, and spatial paste-in-place checks.
4. `scripts/test-text.ts`: 27 text node measurement, inline wrapping, and font metric checks.
5. `scripts/test-image-border-text-zoom.ts`: 71 image border custom styles and zoom-aware text sizing checks.
6. `scripts/test-viewport-memory.ts`: 53 persistent viewport camera coordinates, zoom state, and home view tests.
7. `scripts/test-temporary-elements.ts`: 23 auto-expiring temporary canvas elements, urgency states, and archive tests.
8. `scripts/test-canvas-parity.ts`: Excalidraw element property parity and bidirectional conversion tests.
9. `scripts/test-canvas-full-features.ts`: Full canvas tools, laser pointer physics, and HUD inspector verification.
10. `scripts/test-regression.ts`: 13 core canvas invariant checks protecting against state regressions.

### Security, Cryptography & Networking
11. `scripts/test-security.ts`: 110 input sanitization, XSS evasion, and content security checks.
12. `scripts/test-asset-proxy-security.ts`: 16 SSRF vector checks (RFC 1918 subnets, AWS metadata, localhost).
13. `scripts/test-phase2-permissions.ts`: 24 document permission hierarchy and privilege escalation tests.
14. `scripts/test-phase2-sharing.ts`: 31 AES-256-GCM token encryption, key rotation, and HMAC integrity tests.
15. `scripts/test-phase2-invitations.ts`: Direct document invitation tokens, expiration, and acceptance tests.
16. `scripts/test-phase2-public.ts`: Public web publishing slug generation and read-only view restrictions.
17. `scripts/test-wifi-auto-sync-consent.ts`: Explicit user consent verification for Wi-Fi auto-sync broadcasting.
18. `scripts/test-lan.ts`: 9 peer-to-peer Wi-Fi collaboration, packet validation, and viewer isolation checks.

### Storage, Sync & Database
19. `scripts/test-database.ts`: 29 PostgreSQL schema and Supabase Row-Level Security (RLS) policy checks.
20. `scripts/test-sync.ts`: 14 offline sync, atomic transaction, and conflict resolution tests.
21. `scripts/test-document-switching-race.ts`: Async race condition prevention when rapidly switching active documents.
22. `scripts/test-production-hardening.ts`: Memory leak prevention, unbounded array protection, and heap stability.

### Media, Files & PDF Processing
23. `scripts/test-document-attachments.ts`: Document binary attachment validation, SHA-256 integrity, and hit-testing.
24. `scripts/test-pdf-service.ts`: PDF rendering pipeline, page extraction, and memory disposal tests.

### UI Systems & Theming
25. `scripts/test-hover-notes.ts`: 14 hover note theme configurations, card physics, and spring-lerp GPU calculations.
26. `scripts/test-clock-location.ts`: 29 real-time clock, NTP calibration, timezone resolution, and location fallback tests.

### Academic OS Workstation
27. `scripts/test-academic-analytics.ts`: Academic progress metrics, syllabus completion percentages, and study velocity.
28. `scripts/test-academic-syllabus.ts`: Course hierarchy, topic trees, and milestone dependencies.
29. `scripts/test-academic-planner.ts`: Study sessions scheduling, task priorities, and deadline warnings.
30. `scripts/test-academic-guardian.ts`: Focus mode enforcement, session time bounds, and distraction prevention.
31. `scripts/test-academic-db.ts`: Academic database store CRUD operations and local schema integrity.
32. `scripts/test-phase3-revision.ts`: Spaced repetition Leitner box schedules and forgetting curve algorithms.
33. `scripts/test-phase3-practice.ts`: Active recall quiz tracking, score distributions, and attempt history.
34. `scripts/test-phase3-recommender.ts`: Intelligent topic recommendation engine based on weak retention areas.
35. `scripts/test-student-hub.ts`: Student Hub dashboard integration and cross-module state coordination.
36. `scripts/test-functional-calendar.ts`: 4-mode calendar (Month, Week, Day, Agenda) and collision detection.

### Native Desktop & Auto-Updater
37. `scripts/test-desktop-updater.ts`: 30 Electron native bridge, auto-update checking, and NSIS setup tests.

---

## 3. How to Write a New Test Suite

1. Create a new test file: `scripts/test-<name>.ts`.
2. Structure tests using assertions and self-validating report blocks:
   ```typescript
   import assert from "node:assert/strict";

   console.log("=== Testing My Feature ===");

   // 1. Arrange & Act
   const result = calculateBounds({ x: 10, y: 10, width: 100, height: 100 });

   // 2. Assert
   assert.equal(result.maxX, 110, "maxX must equal x + width");

   console.log("✓ All checks passed!");
   ```
3. Add the test file to `package.json` under `"scripts"."test"`.
4. Run `pnpm test` and verify that CI passes cleanly.
