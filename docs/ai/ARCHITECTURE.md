# Zenithsui Technical Architecture Reference

This document is the deep technical specification for the Zenithsui codebase. It details the boundaries, responsibilities, constraints, and dependencies of every major subsystem.

---

## 1. Application Layer
- **Code Locations**: `/app/page.tsx`, `/app/layout.tsx`, `/app/globals.css`
- **Responsibility**: Top-level Next.js App Router entry point. Mounts the main canvas, floating chrome UI, and modal dialogs.
- **Constraints / Must NOT Do**: Must not perform direct canvas geometry calculations or bypass Zustand state.
- **Dependencies**: Zustand store (`useSquig`), Canvas component, Chrome components.

---

## 2. Canvas & Viewport Subsystem
- **Code Locations**: `/components/canvas/canvas.tsx`, `/lib/types.ts` (`worldToScreen`, `screenToWorld`)
- **Responsibility**:
  - Manages the infinite SVG rendering surface.
  - Handles pointer gestures: selection marquee, dragging, pan (space/middle click), zoom (wheel/pinch), drawing, and transform handles.
  - Tracks resize and bounding box interactions with handles (`n`, `s`, `e`, `w`, `nw`, `ne`, `sw`, `se`).
- **Constraints / Must NOT Do**: Must not render arbitrary HTML inside nodes. Must use SVG primitives.
- **Dependencies**: `roughjs`, `lib/canvas/hit-test.ts`, `lib/canvas/transform.ts`, `lib/canvas/snap-engine.ts`.

---

## 3. Hit-Testing, Snapping & Geometry
- **Code Locations**:
  - `/lib/canvas/hit-test.ts`: Point-in-polygon, stroke distance calculation, transparent center clicks for hollow rectangles.
  - `/lib/canvas/transform.ts`: Multi-node resizing, aspect ratio locking, rotation, and bounding box unions.
  - `/lib/canvas/snap-engine.ts`: Real-time alignment guide calculation (edges, midpoints, spacing).
  - `/lib/canvas/duplicate.ts`: Stride repeat offset calculation (`repeatStep`).
- **Responsibility**: Pure mathematical calculations for geometry, selection collision, and snapping.
- **Constraints / Must NOT Do**: Must remain pure headless functions with zero DOM or React dependencies. Must be testable standalone in Node.js.
- **Dependencies**: `lib/types.ts`.

---

## 4. Document Model & Node Types
- **Code Locations**: `/lib/types.ts`
- **Responsibility**: Defines the serializable data structures:
  - `SquigDoc`: `{ nodes: Record<string, SquigNode>, order: string[] }`.
  - `SquigNode`: Union of `ComponentNode`, `ShapeNode`, `DrawNode`, `TextNode`, `ArrowNode`, `ImageNode`, `PdfNode`.
  - Look settings: `LookSettings` (`theme`, `font`, `paper`, `grid`).
- **Constraints / Must NOT Do**: Do not add circular references or DOM references to node objects. Nodes must remain JSON-serializable.
- **Dependencies**: None.

---

## 5. Rendering Engine & Sketch Primitives
- **Code Locations**:
  - `/components/canvas/sketch.tsx`: SVG renderer converting primitives into rough.js SVG paths and crisp icon vectors.
  - `/lib/sketch/kit.ts`: Stroke, fill, and color definitions.
  - `/lib/sketch/node-prims.ts`: Translation of `SquigNode` into abstract `Prim[]`.
- **Responsibility**: Translates document nodes into visual hand-drawn strokes while maintaining deterministic jitter through seeded random generators.
- **Constraints / Must NOT Do**: Must not introduce non-deterministic visual jitter on simple re-renders (always use node `seed`).
- **Dependencies**: `roughjs`, Phosphor icons.

---

## 6. Component & Block Library
- **Code Locations**: `/lib/library/registry.ts`, `/lib/library/types.ts`, `/lib/library/break-apart.ts`
- **Responsibility**:
  - Defines 40+ parametric components and wireframe blocks with customizable props.
  - Provides `def.render(props, w, h)` yielding geometric primitives (`Prim[]`).
  - Implements `breakApart` to convert any parametric component into raw editable sketch shapes and text lines.
- **Constraints / Must NOT Do**: Components must never produce DOM markup; they only return `Prim[]`.
- **Dependencies**: `lib/sketch/kit.ts`.

---

## 7. Zustand State Management
- **Code Locations**: `/lib/store.ts`
- **Responsibility**:
  - Central reactive state store for document mutations, selection, viewport, tools, history undo/redo stacks, and UI overlays.
  - Exposes actions: `addNodes`, `updateNode`, `moveSelection`, `resizeSelection`, `deleteSelected`, `undo`, `redo`, `setTool`, `serialize`, `loadDoc`, `patchNodes`.
- **Constraints / Must NOT Do**: Must not mutate state directly outside of set calls; must preserve immutability for history tracking.
- **Dependencies**: `zustand`, `nanoid`, `lib/selection.ts`, `lib/files.ts`, `lib/database.ts`.

---

## 8. Local File Persistence
- **Code Locations**: `/lib/files.ts`
- **Responsibility**:
  - Manages browser `localStorage` document storage under `zenithsui:file:<id>`.
  - Maintains LRU index `zenithsui:files:v1` (max 40 files).
  - Handles auto-recovery, file renaming, duplication, and quota eviction safeguards.
- **Constraints / Must NOT Do**: Must not crash when `localStorage` quota is exceeded; must evict oldest file or warn.
- **Dependencies**: `lib/types.ts`.

---

## 9. Remote Database & Storage
- **Code Locations**:
  - Client: `/lib/database.ts`, `/lib/supabase-client.ts`
  - Server: `/lib/supabase-server.ts`, `/app/api/database/[dbId]/files/route.ts`, `/app/api/database/[dbId]/files/[fileId]/route.ts`
- **Responsibility**:
  - Maps database IDs (`nezukos-box`, `primary-db`) to persistent storage (Supabase / In-Memory).
  - Provides document CRUD, metadata listing, and password verification.
- **Constraints / Must NOT Do**: Must not expose private database credentials or password hashes to the client.
- **Dependencies**: `@supabase/supabase-js`, `lib/security.ts`.

---

## 10. Real-Time Collaboration Hub
- **Code Locations**:
  - Server: `/lib/server-realtime.ts`, `/app/api/database/[dbId]/files/[fileId]/realtime/route.ts`
  - Client: `/lib/collaboration-client.ts`, `/components/chrome/collab-status.tsx`
- **Responsibility**:
  - Coordinates active collaborative sessions over Server-Sent Events (SSE).
  - Manages presence heartbeats, revision sequence numbers, and delta patch broadcasting.
- **Constraints / Must NOT Do**: Must not allow out-of-order patches to corrupt document state; tracks revision numbers.
- **Dependencies**: `lib/security.ts`.

---

## 11. Permissions, Security & Password Protection
- **Code Locations**:
  - Server: `/lib/security.ts`, `/app/api/database/[dbId]/files/[fileId]/auth/route.ts`
  - Client UI: `/components/chrome/page-password-modal.tsx`, `/components/chrome/unlock-modal.tsx`
- **Responsibility**:
  - Enforces password protection via PBKDF2 hashing with unique salts.
  - Issues and verifies signed HMAC SHA-256 tokens (`x-zenithsui-edit-token`).
  - Enforces 3-strike brute-force lockout per session.
- **Constraints / Must NOT Do**: Never allow document mutations (`POST`, `PUT`, `DELETE`, `/realtime`, `/versions`) on protected pages without a valid HMAC token.
- **Dependencies**: Node.js `crypto`.

---

## 12. Version History Engine
- **Code Locations**:
  - Server: `/lib/server-versions.ts`, `/app/api/database/[dbId]/files/[fileId]/versions/route.ts`
  - Client UI: `/components/chrome/version-history-modal.tsx`, `/components/chrome/version-preview-banner.tsx`
- **Responsibility**:
  - Captures named and automatic snapshot versions on significant document changes.
  - Supports non-destructive restoration (restoring creates a new forward version).
  - Provides read-only version preview mode without altering current canvas state.
- **Constraints / Must NOT Do**: Never destructively overwrite or delete past version logs.
- **Dependencies**: `lib/types.ts`, `lib/security.ts`.

---

## 13. Autosave & Background Sync
- **Code Locations**: `/lib/store.ts` (autosave debounce), `/components/chrome/save-flash.tsx`
- **Responsibility**:
  - Automatically debounces and writes document changes to `localStorage` (for local files) or database API (for shared files).
  - Displays transient visual save/sync indicators.
- **Constraints / Must NOT Do**: Must not trigger high-frequency network requests on every mousemove drag (debounces saves to 400ms after interaction ends).
- **Dependencies**: `lib/files.ts`, `lib/database.ts`.

---

## 14. Clipboard Subsystem
- **Code Locations**: `/lib/clipboard.ts`, `/lib/clipboard-payload.ts`
- **Responsibility**:
  - Serializes selected layers to HTML/JSON clipboard payloads for cross-tab copy/paste.
  - Vets and deserializes external images, PDFs, and plain text.
  - Auto-wraps long text paragraphs into readable multi-line text boxes.
- **Constraints / Must NOT Do**: Must sanitize all incoming HTML/JSON payloads against XSS and malformed structures.
- **Dependencies**: `lib/types.ts`, `lib/canvas/text-metrics.ts`, `lib/canvas/text-reflow.ts`.

---

## 15. Export Subsystem (PNG, SVG, PDF, JSON)
- **Code Locations**: `/lib/export-image.ts`, `/lib/file-io.ts`
- **Responsibility**:
  - Constructs standalone, self-contained SVG strings with inlined base64 fonts and resolved color variables.
  - Renders to PNG via hidden offscreen canvas rasterization.
  - Generates vector-scaled PDF files using `jspdf`.
  - Exports native `.zenithsui.json` document files.
- **Constraints / Must NOT Do**: Must not rely on external network stylesheets or un-inlined fonts during SVG rasterization.
- **Dependencies**: `jspdf`, `lib/theme.ts`, `lib/selection.ts`.

---

## 16. UI Chrome & Floating Panels
- **Code Locations**:
  - Rail & Toolbars: `/components/chrome/left-rail.tsx`, `/components/chrome/top-corner.tsx`, `/components/chrome/align-row.tsx`, `/components/chrome/ink-picker.tsx`
  - Inspectors: `/components/chrome/inspector/`, `/components/chrome/file-name.tsx`
  - Overlays: `/components/chrome/command-palette.tsx`, `/components/chrome/library-panel.tsx`, `/components/chrome/database-modal.tsx`
- **Responsibility**: Accessible floating control surfaces styled with Zenithsui design tokens.
- **Constraints / Must NOT Do**: Must not block canvas interactions outside their immediate hit areas.
- **Dependencies**: `@base-ui/react`, Phosphor icons, `lib/store.ts`.

---

## 17. Automated Testing Suite
- **Code Locations**:
  - `/scripts/test-geometry.ts`: 67 geometry & hit-testing assertions.
  - `/scripts/test-selection.ts`: 21 selection & grouping assertions.
  - `/scripts/test-clipboard.ts`: 29 clipboard serialization assertions.
  - `/scripts/test-text.ts`: 27 text reflow & metrics assertions.
  - `/scripts/register-loader.mjs`: Standalone TypeScript loader for node test execution.
- **Responsibility**: Fast, zero-dependency Node.js test execution validating mathematical invariants.
- **Constraints / Must NOT Do**: Tests must run standalone without requiring browser or bundler environments.
- **Dependencies**: Native Node.js test runner with `--experimental-strip-types`.

---

### 18. Zenith AI — Study Copilot & In-Website AI Provider Setup System
- **Key Files**:
  - `/lib/ai/types.ts`: TypeScript contracts for messages, providers, routing modes, student actions, and canvas proposals.
  - `/lib/ai/encryption.ts`: Server-side AES-256-GCM authenticated encryption service for secrets at rest.
  - `/lib/ai/credential-service.ts`: Provider credential lifecycle management, SSRF checks, health checking, and client-safe serialization.
  - `/lib/ai/byok-vault.ts`: Vault facade providing effective credentials to backend routers.
  - `/lib/ai/model-registry.ts`: Provider registry and capability flags for Gemini, OpenAI, Claude, DeepSeek, Perplexity, Hugging Face, Azure, and OpenAI-Compatible.
  - `/lib/ai/router.ts`: Multi-provider execution engine with auto-fallback to Gemini.
  - `/lib/ai/student-mode.ts`: Prompts for Explain, Simplify, Step-by-Step, Mind Maps, Flowcharts, Flashcards, and Revision Sheets.
  - `/lib/ai/action-schema.ts` & `/lib/ai/action-executor.ts`: Strict schema validator and transactional canvas modifier with undo checkpoints.
  - `/lib/ai/ai-store.ts`: Client-side Zustand store managing chat streaming, proposals, and provider settings.
  - `/app/api/ai/providers/`: REST endpoints for listing client-safe providers and saving encrypted credentials.
  - `/app/api/ai/providers/[id]/`: PATCH and DELETE endpoints for updating/revoking credentials.
  - `/app/api/ai/test/`: Live connection health check endpoint.
  - `/app/api/ai/chat/`: Server-Sent Events (SSE) and JSON execution endpoint with canvas context.
  - `/components/chrome/zenith-ai-settings-modal.tsx`: In-website provider and key management modal.
  - `/components/chrome/zenith-ai-panel.tsx`: Canvas Study Copilot side-panel.
- **Responsibility**: Provides safe, end-to-end, multi-provider AI assistance for learning and diagramming on Zenithsui canvases while guaranteeing zero secret leakage.
- **Security & Privacy**:
  - API keys are AES-256-GCM encrypted server-side with random IVs and authenticated tags.
  - Raw API keys are never stored in localStorage, Zustand, DOM, or document exports.
  - SSRF protection blocks custom endpoints from querying internal/loopback IPs.

