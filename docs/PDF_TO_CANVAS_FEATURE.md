# Zenithsui PDF-to-Canvas Feature Specification & Reference

## Overview
The **PDF-to-Canvas** feature in Zenithsui bridges linear document readers and spatial thinking by transforming multi-page PDF documents into first-class canvas `ImageNode`s organized in an interactive grid layout and auto-grouped under native Zenithsui grouping.

Inspired by the workflow pioneered in the Obsidian community plugin *PDF to Canvas* by Stefano Verrilli, this implementation is rebuilt natively for Zenithsui's local-first infinite canvas architecture (Next.js 16, React 19, Zustand, IndexedDB, Mozilla PDF.js).

---

## Architecture & Implementation

### 1. Extraction Engine (`lib/pdf/pdf-to-canvas.ts`)
- **Off-Screen Rendering**: Leverages `pdfjs-dist` to render pages onto off-screen HTML5 canvases.
- **Configurable Quality**:
  - `1.5x Fast`: Quick previews, lightweight.
  - `2.0x Crisp`: Default standard for crisp text.
  - `3.0x Ultra`: High-DPI publication quality.
- **Page Selection**: `parsePageRange(range, totalPages)` supports:
  - `"all"`: Extracts all pages.
  - Specific ranges: e.g. `"1-5, 8, 11-14"`.
  - Single pages: e.g. `"3"`.
  - Automatic clamping and deduplication.
- **Smart Grid Placement**:
  - Configurable columns (2, 3, 4, or 5 columns per row).
  - Standard spacing gap (48px).
  - Automatically positions new page grids to the right of existing canvas nodes or centers relative to the current viewport.
- **Native Grouping**:
  - Generates a unique group ID (`nanoid(8)`) and assigns `groupIds: [groupId]` to every generated `ImageNode`.
  - Enables moving, transforming, and resizing the entire document grid as a unit, or ungrouping with `Shift+Mod+G`.
- **Local-First Asset Storage**:
  - Defaults to caching rendered JPEG page blobs in IndexedDB (`STORES.ASSET_BLOBS` via `cacheAssetBlob`).
  - Stored nodes reference `src: "asset://${hash}"`, keeping `.zenithsui.json` document state lightweight and instantaneous to sync/save.
  - Optional `embedMode` generates data URLs directly when standalone portability is required.

### 2. User Interface (`components/canvas/pdf-to-canvas-dialog.tsx`)
- Configurable modal dialog styled with Zenithsui's paper/ink design tokens.
- Live progress feedback with percentage and page status.
- Real-time `AbortController` cancellation.
- File-picker fallback for importing external PDFs from disk.

### 3. Canvas Entry Points
- **Inspector Panel (`components/chrome/inspector.tsx`)**: "Extract pages to canvas" button appears whenever a PDF `DocumentNode` is selected.
- **Right-Click Context Menu (`components/chrome/context-menu.tsx`)**: "Extract pages to canvas…" item on right-clicking a PDF node.
- **Document Viewer Modal (`components/canvas/pdf-canvas-viewer.tsx`)**: "Extract to Canvas" button directly in the viewer top bar.
- **Command Palette `⌘K` (`components/chrome/command-palette.tsx`)**:
  - `"Import PDF as Canvas Pages…"`
  - `"Extract '[Document Name]' to Canvas Pages…"` (when a PDF document is selected).

---

## Verification & Self-Containment
All code is fully contained within `lib/`, `components/`, and `app/`. No runtime or build dependencies rely on external folders. The codebase passes:
- TypeScript type check (`pnpm tsc --noEmit`)
- ESLint checks (`pnpm lint`)
- Unit test suite (`pnpm test`)
- Next.js production build (`pnpm build`)
