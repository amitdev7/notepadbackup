# Zenithsui AI Context

## CRITICAL DIRECTIVE: Strict UI/UX, Design, Look & Feel Invariant
> **ABSOLUTE RULE**: Do NOT alter, redesign, restyle, refactor, or modernize the existing look, UI, UX, design system, theme, typography, color scheme, spatial layout, or aesthetic of Zenithsui. All existing canvas behaviors, toolbars, palettes, and menu arrangements are strictly frozen and preserved. Any new functional capabilities MUST conform 100% to the established Zenithsui design system.

## Project Identity
**Zenithsui** is a low-fidelity wireframing and sketch-canvas application designed for creators and developers who think by drawing. It bridges the gap between high-fidelity mockup suites (like Figma) and freehand sketch boards (like tldraw). Real UI components (buttons, inputs, selects, cards, dialogs, forms, layout blocks, app screens) render on an infinite canvas with a hand-drawn napkin aesthetic using rough.js, encouraging feedback on structural architecture, user flow, and interaction design rather than visual finish or cosmetic details.

## Technology Stack
- **Framework**: Next.js 16 (App Router, React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4, custom Zenithsui design tokens (`--radius-chrome-*`, `--spacing-ctl-*`, `--text-*`), Geist Sans, Patrick Hand (sketch), Source Serif 4
- **State Management**: Zustand 5 (`/lib/store.ts`)
- **Canvas Rendering**: SVG via `roughjs` 4.6.6 (`/components/canvas/sketch.tsx`, `/lib/sketch/kit.ts`, `/lib/sketch/node-prims.ts`)
- **Iconography**: Phosphor Icons (`@phosphor-icons/react`, `@phosphor-icons/core`)
- **UI Chrome & Primitives**: `@base-ui/react`, Radix UI accessible headless controls (`components/ui/*`, `components/chrome/*`)
- **PDF Generation & Export**: `jspdf` 4.2.1 (`/lib/export-image.ts`)
- **Backend & Storage**: Next.js App Router API endpoints (`/app/api/database/[dbId]/...`), Supabase Client (`@supabase/supabase-js`), Node.js crypto (HMAC SHA-256, PBKDF2) for document authentication and rate-limiting
- **Identifier Generation**: `nanoid`

## Current Architecture

### App Structure
- Single-page App Router architecture centered on `/app/page.tsx`.
- The application renders the interactive `<Canvas />` under floating chrome components (`<LeftRail />`, `<TopCorner />`, `<FileName />`, `<LibraryPanel />`, `<Inspector />`, `<CommandPalette />`, modal overlays).
- Developer tool `/app/kitchen-sink/page.tsx` renders all component and block definitions at 100% and scaled sizes for visual regression testing.

### Canvas & Coordinate System
- Infinite 2D Cartesian coordinate plane with viewport transformations: `worldToScreen(viewport, wx, wy)` and `screenToWorld(viewport, sx, sy)`.
- Viewport state (`x`, `y`, `zoom`) supports panning via spacebar-drag or middle-click drag, and zooming anchored at cursor location.
- Bounding box collision detection (`/lib/canvas/hit-test.ts`) calculates precise distance-to-stroke metrics, allowing transparent center clicks for hollow rectangles while still supporting click selection.
- Smart snapping engine (`/lib/canvas/snap-engine.ts`) calculates screen-space alignment guides across element edges and midpoints during drags and resizes.

### Document Model
- A document (`SquigDoc`) is a flat dictionary of nodes (`Record<string, SquigNode>`) and a z-order array (`order: string[]`).
- Node types:
  - `ComponentNode`: Parametric UI components with variant props defined in `/lib/library/registry.ts`.
  - `ShapeNode`: Geometric shapes (`rect`, `ellipse`) with stroke weight and tonal area fills (`none`, `paper`, `light`, `strong`).
  - `DrawNode`: Freehand pen strokes stored as array of relative offset points `[number, number][]`.
  - `TextNode`: Sketch typography with editable text, font sizing, auto-sizing vs fixed-width wrapping, alignment, bold/italic/underline, and wireframe links.
  - `ArrowNode`: Connectors and directional arrows with optional arrowheads.
  - `ImageNode`: Taped photo / screenshot with base64 data URL and natural dimension tracking.
  - `PdfNode`: Embedded PDF wireframe card with page metadata and asset data URL.

### Zustand State Management (`/lib/store.ts`)
- Centralized store `useSquig` manages:
  - Active document state (`nodes`, `order`, `fileName`, `docId`, `selectedDbId`).
  - Selection set (`selection: string[]`) and transform handles.
  - Undo/redo stacks (`past: DocSnapshot[]`, `future: DocSnapshot[]`).
  - Active tool (`select`, `shape`, `draw`, `text`, `arrow`).
  - Active look and aesthetic settings (`theme`, `font`, `paper`, `grid`).
  - Database status, permission role (`viewer`, `editor`, `owner`), password lockouts, and version history.
  - Real-time collaboration revision numbers and collaborator presence.

### Rendering Engine (`/components/canvas/sketch.tsx`)
- Components and shapes never compile to raw DOM HTML; they execute `def.render(props, w, h)` returning an array of geometric primitives (`rect`, `line`, `text`, `icon`, `poly`, `ellipse`, `pill`).
- Primitives are translated into SVG paths with seeded jitter (`seed`) via rough.js.
- Icons are rendered as crisp Phosphor vector paths rather than rough jitter to maintain legibility.

### Component System (`/lib/library/`)
- Registry (`registry.ts`) defines built-in components and multi-element blocks across categories (`components`, `blocks`):
  - Basic: Button, Input, Select, Checkbox, Switch, Badge, Avatar, Progress, Slider, Textarea.
  - Display: Card, Tabs, Breadcrumb, Table, Dialog, Alert, Toast, Tooltip.
  - Nav: Navbar, Sidebar, Pagination, Stepper.
  - Blocks: Hero, Features, Pricing, Testimonials, FAQ, Footer, AI Chat, Kanban, Checkout, Stats, Settings, Invoice List, Usage Meter.
  - Templates: Mobile App Screen, Dashboard Page, SaaS Landing Page.
- Break Apart (`/lib/library/break-apart.ts`): One-way conversion of parametric component instances into editable grouped sketch primitives.

### File System & Local Storage (`/lib/files.ts`)
- Local documents are saved in browser `localStorage` under `zenithsui:file:<id>` with an LRU index in `zenithsui:files:v1` (holds up to 40 recent files).
- Preferences (`theme`, `font`, `paper`, `grid`) persist across sessions in `zenithsui:prefs:v1`.

### Database Architecture (`/lib/database.ts` & `/lib/supabase-server.ts`)
- Model: Multiple databases can be registered in `AVAILABLE_DATABASES` (e.g. `nezukos-box` backed by Supabase, `primary-db` backed by server in-memory store).
- Shared files are accessed via `/api/database/[dbId]/files` and `/api/database/[dbId]/files/[fileId]`.
- Local browser cache maintains an offline replica (`zenithsui:db:<dbId>:file:<fileId>`) with optimistic background synchronization.

### Realtime Collaboration (`/lib/server-realtime.ts` & `/lib/collaboration-client.ts`)
- Server-authoritative room hub (`RealtimeRoom`) per document (`[dbId]:[fileId]`).
- Clients connect via Server-Sent Events (SSE) `/api/database/[dbId]/files/[fileId]/realtime` and receive presence updates and incremental delta patches (`CollaborationOp`).
- Operations are applied to the server document, incrementing `revision` and broadcasting to all subscribers.

### Permissions & Password Security (`/lib/security.ts` & `/app/api/database/[dbId]/files/[fileId]/auth/route.ts`)
- Password protection uses cryptographic PBKDF2 password hashing with individual salt.
- Client authentication generates signed HMAC SHA-256 edit tokens (`x-zenithsui-edit-token`).
- Protection against brute-force attacks: 3 failed attempts result in temporary lockout for the client session.
- Viewer mode renders canvas with read-only controls, disabling modification gestures while permitting pan/zoom and read-only inspection.

### Import / Export & Clipboard
- **File I/O**: Export/import native `.zenithsui.json` document format (`/lib/file-io.ts`).
- **Image & PDF Export**: Standalone SVG renderer inlines font-face base64 definitions and hex color palettes to generate crisp PNG, SVG, or vector PDF downloads (`/lib/export-image.ts`).
- **Clipboard**: System clipboard integration (`/lib/clipboard.ts`) handles copy/cut/paste of JSON layer payloads, image files (scaled & re-encoded), PDFs, and plain text.

## Current Features
- Infinite interactive wireframe canvas with pan/zoom/marquee selection.
- Full component & block library with property inspectors and variant switchers.
- Component "Break Apart" into raw primitives.
- Smart guide alignment snapping and duplicate stride repetition (⌥-drag / ⌘D).
- In-browser autosave with LRU eviction and export fallback.
- Shared multi-database connectivity (Supabase / in-memory).
- Password-protected page locking with HMAC SHA-256 tokens and 3-strike lockout.
- Server-authoritative page version history with full restore-as-new-version.
- Real-time collaboration over SSE with presence indicator.
- Export to `.zenithsui.json`, PNG, SVG, and PDF.
- Paste handler for screenshots, images, PDFs, and text snippets.
- ⌘K Command Palette for quick search of tools, components, and actions.
- Customizable ink palettes (Internet Blue, Blueprint, Noir, Forest, Coral, etc.) and paper shades.
- In-Website AI Provider Setup & AES-256 BYOK Vault for Gemini, OpenAI, Claude, DeepSeek, Perplexity, Hugging Face, Azure, and local Ollama.
- Zenith AI Study Copilot with streaming markdown, mind map/flowchart generation, and 1-click canvas diagram injection.

## Features Currently Being Implemented
- AI Project Memory System initialization and maintenance.

## Completed Features
- All core canvas primitives, transformations, and hit-testing.
- Library registry with over 40 components, blocks, and templates.
- Local and remote database file management.
- Cryptographic password protection and role permissions.
- Version history timeline and non-destructive snapshot restoration.
- Real-time collaboration room hub and SSE client.
- Multi-format import/export (JSON, PNG, SVG, PDF).
- Automated test suites for geometry, selection, clipboard, and text metrics.
- Multi-provider AI Copilot engine with AES-256-GCM BYOK Vault and In-Website Provider Setup.

## Product Direction
Zenithsui will remain a dedicated low-fidelity wireframing and visual thinking environment. Future work focuses on refining real-time collaboration UX, live cursor overlays, comments/annotations, presentation mode, and AI-assisted canvas wireframing—while strictly avoiding high-fidelity visual clutter or pixel-perfection traps.

## Important Product Rules
1. **Low Fidelity Invariant**: Everything drawn on the canvas must feel like a hand-drawn sketch (except icons, which remain crisp for readability). Never add high-fidelity gradient pickers, dropshadow dials, or photo filters.
2. **Component Indirection**: Components must never render directly as DOM HTML. They must render to geometric primitives via `ComponentDef.render()`.
3. **Figma Keyboard Parity**: Maintain Figma muscle memory for all canvas shortcuts (`V`, `R`, `O`, `P`, `T`, `L`, `⌘Z`, `⌘D`, `⌘G`, `⌘K`, etc.).
4. **Non-Destructive Version History**: Restoring an old version must create a new forward version snapshot rather than deleting intermediate revisions.

## Important UX Rules
- Chrome controls follow the Zenithsui chrome scale (`--radius-chrome-*`, `--spacing-ctl-*`, `--text-*`).
- No unsolicited redesigns or UI changes to the canvas, toolbar, rail, or menus.
- Clear notices for actions (save flash, export notice, password prompt).

## Security Rules
- Passwords must never be stored in plain text. Always use PBKDF2 with unique salts.
- Protected page mutations must verify HMAC SHA-256 signed edit tokens on the server.
- Failed password attempt thresholds (3 strikes) must trigger immediate lockouts.
- Never log or persist secrets, API keys, or private database credentials in client code or documentation.

## Deployment Information
- Runs as a standalone Next.js 16 App Router application on Node.js 22.
- Production build: `npm run build` with `NODE_ENV=production`.
- Dev server: binds to `0.0.0.0:3000`.
