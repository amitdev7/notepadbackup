# ZENITHSUI — UI/UX Specification
## Document 00: Executive Product Summary

---

### 1. Product Overview
**Zenithsui** is a high-performance, local-first infinite whiteboard and design ideation environment built around an early-web **risograph aesthetic** (tactile duotone saturated ink on warm paper) coupled with a **flat document node model** and rich **academic/student study tools**.

Unlike generic whiteboards (Miro, Mural) that optimize for corporate slide presentations, and unlike traditional vector tools (Figma, Illustrator) that demand rigid pixel precision, Zenithsui is engineered for the **napkin stage of creation**—where ideas are explored rapidly through hand-drawn wireframes, quick geometric primitives, connected diagrams, attached documents, and interactive widgets.

At the same time, Zenithsui features a deep **Local-First & Academic Engine** that supports structured syllabus tracking, spaced repetition flashcards (SM-2 algorithm), mistake logs, functional calendar agendas, mock exam analytics, local Wi-Fi peer discovery, and end-to-end encrypted cloud collaboration.

---

### 2. Product Pillars & Dual Identity

```
                                  ZENITHSUI
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼                                                         ▼
   APPLICATION CHROME                                        CANVAS EXPERIENCE
 • Calm, macOS-inspired floating dock                     • Tactile Risograph Duotone Ink
 • Neutral dark/light surface framing                     • Warm textured paper (#FBFAF5)
 • System typography (Inter / Geist)                      • Hand-drawn Rough.js geometry
 • Unobtrusive floating toolbars                          • 3-Tone Shading Ladder (paper/light/strong)
 • Non-destructive undo/redo history                      • Sketch typography (Patrick Hand)
 • Instant local-first IndexedDB storage                  • Interactive embedded components
```

1. **The Infinite Risograph Canvas**:
   - Zero-latency infinite 2D canvas with arbitrary panning and zooming (10% to 400%).
   - Flat vector geometry rendered via **Rough.js** with stable pseudo-random seeds (drawings never re-wobble on pan/zoom).
   - Strict 3-tone shading ladder (`paper`, `light`, `strong`) derived programmatically as an 8% and 20% ink wash into the paper substrate.
   - 6 curated Risograph ink themes: *Internet Blue*, *Riso Red*, *Terminal Green*, *Purple Drizzle*, *Dirty Blond*, and *Hipster Black*.

2. **The Local-First Architecture**:
   - Zero-account, zero-login friction. Instant creation on first load.
   - Continuous zero-loss snapshotting to browser IndexedDB (`zenithsui:documents`).
   - Private in-memory clipboard and undo/redo stacks that never pollute system clipboard or document state.
   - Seamless offline availability backed by Service Workers and PWA manifest.

3. **Academic Student Hub & Functional Tools**:
   - Built-in interactive components (e.g. `FunctionalCalendar` rendered directly onto the infinite canvas).
   - Comprehensive study hub supporting syllabus progress, exam milestones, revision planning, and spaced-repetition flashcards.
   - Local Wi-Fi / LAN classroom broadcasting allowing instructors to share live canvas sessions peer-to-peer without internet connectivity.

4. **Multi-Tier Organization**:
   - Top-level Workspaces and Projects.
   - Flat-canvas documents with support for **First-Class Nested Folders / Child Whiteboards** allowing hierarchical sub-boards without recursive JSON bloat.

---

### 3. Implementation Status Matrix

The following matrix documents the ground truth of Zenithsui's codebase as audited directly from runtime execution and source inspection:

| System / Capability | Implementation Status | Evidence / Location |
| :--- | :---: | :--- |
| **Infinite Canvas Engine** | `CONFIRMED` | `components/canvas/canvas.tsx`, `components/canvas/sketch.tsx` |
| **Rough.js Vector Sketching** | `CONFIRMED` | `lib/sketch/node-prims.ts`, `lib/sketch/kit.ts` |
| **Flat Document Node Model** | `CONFIRMED` | `lib/types.ts` (`SquigDoc`, `SquigNode`, `BaseNode`) |
| **IndexedDB Local Storage** | `CONFIRMED` | `lib/storage/documents.ts`, `lib/storage/db.ts` |
| **Local-First Autosave** | `CONFIRMED` | `lib/store.ts` (`flushSave`, continuous snapshotting) |
| **Bottom Floating Dock** | `CONFIRMED` | `components/shell/bottom-dock.tsx` |
| **Top Navigation Bar & Breadcrumbs** | `CONFIRMED` | `components/shell/top-bar.tsx` |
| **Selection & Multi-Select Engine** | `CONFIRMED` | `lib/selection.ts`, `lib/canvas/transform.ts` |
| **Selection Inspector Panel** | `CONFIRMED` | `components/chrome/inspector.tsx` |
| **Unified Component Library (168 defs)**| `CONFIRMED` | `lib/library/registry.ts`, `components/chrome/library-panel.tsx` |
| **Kitchen Sink Visual Registry** | `CONFIRMED` | `app/kitchen-sink/page.tsx` |
| **Canvas Search (⌘F)** | `CONFIRMED` | `components/canvas/canvas-search.tsx` |
| **Canvas Statistics (⌘/)** | `CONFIRMED` | `components/canvas/canvas-stats.tsx` |
| **Command Palette (⌘K)** | `CONFIRMED` | `components/chrome/command-palette.tsx` |
| **Shortcuts Cheat Sheet (?)** | `CONFIRMED` | `components/chrome/shortcuts-sheet.tsx` |
| **macOS-Style Settings Dialog** | `CONFIRMED` | `components/shell/settings-dialog.tsx` (15 sections) |
| **First-Class Document / PDF Nodes** | `CONFIRMED` | `components/canvas/document-canvas-item.tsx`, `lib/pdf/` |
| **PDF-to-Canvas Converter** | `CONFIRMED` | `components/canvas/pdf-to-canvas-dialog.tsx`, `lib/pdf/pdf-to-canvas.ts` |
| **Nested Folders / Whiteboards** | `CONFIRMED` | `lib/canvas/board-hierarchy.ts`, `scripts/test-nested-boards.ts` |
| **Interactive Functional Calendar** | `CONFIRMED` | `components/calendar/functional-calendar.tsx` |
| **Academic Study Engine (Backend/Logic)** | `CONFIRMED` | `lib/academic/` (Syllabus, SM-2 Flashcards, Mistakes, Planner) |
| **Dashboard Route (`/dashboard`)** | `CONFIRMED` | `app/dashboard/page.tsx` (Recent, Projects, Shared, Trash) |
| **Local Wi-Fi / LAN Sync** | `CONFIRMED` | `lib/lan/`, `components/chrome/wifi-publish-dialog.tsx` |
| **Supabase Cloud Sync & Auth** | `CONFIRMED` | `lib/supabase/`, `lib/sync/engine.ts`, `app/api/documents/` |
| **Encrypted Public Sharing (`/share`)** | `CONFIRMED` | `app/share/[token]/page.tsx`, `lib/security/share-crypto.ts` |
| **Trash & Document Recovery** | `CONFIRMED` | `components/chrome/trash-dialog.tsx`, `lib/storage/documents.ts` |
| **Version History Rollback** | `CONFIRMED` | `components/chrome/version-history-panel.tsx`, `lib/cloud/versions.ts` |
| **Full UI Academic Hub Integration** | `PARTIAL` | Academic engine tests & store exist; UI is currently in `/dashboard` + canvas calendar |
| **Realtime Multi-Cursor Presence** | `PARTIAL` | LAN session identity and Supabase channel exist; UI cursor overlay wired for laser |

---

### 4. Specification Scope & Intended Use
This specification package provides an **exhaustive, implementation-independent design blueprint** for the entire Zenithsui product. It is tailored for:
1. **Design System Engineers & Product Designers** building out component libraries, Figma component sets, and token registries.
2. **AI Design Agents & Code Generators** (such as v0, Figma AI, Claude, and design-to-code pipelines) requiring complete context to render any screen or modal with zero ambiguity.
3. **Engineering Architects** implementing responsive adaptations, accessibility compliance (WCAG 2.1 AA), and interaction lifecycles.
