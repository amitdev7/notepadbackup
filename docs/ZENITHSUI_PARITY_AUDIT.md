# Zenithsui — Excalidraw Parity & Superset Master Audit

## Mission & Executive Summary
This document provides the definitive architectural audit, capability comparison, and verification record of Zenithsui's Excalidraw feature parity and superset implementation.

Zenithsui preserves its distinct risograph paper-and-ink visual identity, local-first storage foundation, and academic study platform while integrating all high-value user-facing capabilities pioneered in Excalidraw.

---

## 1. Feature-by-Feature Parity Matrix

| Capability | Excalidraw Baseline | Zenithsui Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Drawing Primitives** | Rect, Ellipse, Diamond, Line, Arrow, Freehand, Text, Image | Rect, Ellipse, Diamond (`ShapeNode`), Line (`ArrowNode`), Arrow (`ArrowNode`), Freehand (`DrawNode`), Text (`TextNode`), Image (`ImageNode`), Document (`DocumentNode`), Sticky (`StickyNoteNode`), Frame (`FrameNode`), Embed (`EmbedNode`), Library (`ComponentNode`) | **SUPERSET** |
| **Arrow & Binding** | Dynamic ray-casting perimeter binding to elements | Ray-casting perimeter ray-box, ray-ellipse, and ray-diamond intersections (`lib/canvas/arrow-binding.ts`). Real-time coordinate updates on node drag; clean unlinking on target deletion; arrow center label card | **SUPERSET** |
| **Laser Pointer** | Ephemeral glowing laser trail during presentations | `<LaserOverlay />` real-time RAF loop with dual-layer neon risograph glow, tapering stroke weight, and ~850ms exponential decay | **PARITY** |
| **Search & Find** | In-canvas element search | `<CanvasSearch />` live modal (`⌘F`). Indexed across Text, Stickies, Frames, Embeds, Documents, Components, and Shapes. Jump-to-element viewport animation | **SUPERSET** |
| **Element Locking** | Lock elements against drag/edit (`⌘L`) | `locked?: boolean` on `BaseNode`. Immutability enforced across drag, resize, alignment, distribution, flip, and deletion. Toggle via Inspector, context menu, and `⌘L` | **PARITY** |
| **Rounded Corners** | Roundness toggle on rectangles | `roundness?: boolean` on `ShapeNode`. Renders rounded rect in `node-prims.ts` and rough.js path generation | **PARITY** |
| **Canvas HUD / Stats** | Zen Mode & Stats HUD | `<CanvasStats />` floating HUD (`⌘/`). Tracks total nodes, per-kind breakdown, selected count, bounding box px, zoom %, history depth (undo/redo), and JSON payload size | **SUPERSET** |
| **Sticky Notes** | Colored notes with folded corners | `StickyNoteNode` with tonal paper/ink palette (`yellow`, `blue`, `green`, `pink`, `orange`), wrapped text lines, and dog-ear corner fold | **SUPERSET** |
| **Frames & Containers** | Structural framing containers | `FrameNode` with dashed borders, top-left frame label `# Name`, and multi-element containment | **PARITY** |
| **Web Embeds** | Embed interactive iframe/links | `EmbedNode` with title, destination URL, and custom web container card | **PARITY** |
| **PDF & Documents** | Basic asset insert | `DocumentNode` + `lib/pdf/pdf-to-canvas.ts` multi-page exploding grid, 1.5x/2x/3x render resolutions, IndexedDB asset blob cache, and full in-canvas PDF viewer | **SUPERSET** |
| **Hand (Pan) & Eraser** | Dedicated Hand and Eraser tools | Hand tool (`h`) and Eraser tool (`e`). Integrated in toolbar, canvas pointer handler, and bottom dock | **PARITY** |

---

## 2. Architecture & Invariants

1. **Local-First Zero-Latency Foundation**:
   All state lives in Zustand (`lib/store.ts`) with immediate local IndexedDB persistence and optional Supabase/LAN sync. No network roundtrip is required for drawing, arrow binding, locking, or searching.

2. **Single-Ink Risograph Aesthetic**:
   Zenithsui avoids conflicting color schemes. Fills, strokes, sticky notes, and laser trails respect the curated theme tokens (`--sq-ink`, `--sq-bg`, `--sq-accent`, `--sq-grid`).

3. **Safe Eraser & Lock Semantics**:
   Locked elements are completely immune to destructive shortcuts (`Backspace`, `Delete`), bulk alignment, distribution, and nudging.

---

## 3. Automated Test Verification
- `scripts/test-excalidraw-parity.ts` asserts:
  - Box perimeter ray intersection math.
  - Ellipse perimeter ray intersection math.
  - Diamond perimeter ray intersection math.
  - Moved-node dynamic arrow patching.
  - Deletion unlinking of bindings.
  - Perimeter snap candidate detection.
  - Node locking immutability invariants.
  - Sticky note, frame, and embed structure integrity.
