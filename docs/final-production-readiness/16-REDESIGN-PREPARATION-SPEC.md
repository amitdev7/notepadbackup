# 16 — UI / UX Redesign Preparation Specification

## 1. Non-Negotiable Architectural Contracts
The upcoming UI/UX redesign must adhere to the following foundational contracts:

1. **Flat Canvas Architecture**:
   - Canvas state MUST remain flat: `Record<string, SquigNode>` and `order: string[]`.
   - Do NOT introduce deeply nested AST node trees.
   - Folders and nested boards represent independent document boundaries, not canvas groups.
2. **Unified Persistence Contract**:
   - All document updates must trigger `saveLocalDocument()` in IndexedDB via `useSquig.flushSave()`.
   - Never reintroduce `while (!stored) dropOldestFile()` eviction loops.
3. **Risograph Design Language**:
   - Maintain the warm paper backgrounds (`#f8f6f0` / `#0E1015`) and authentic spot-ink color palette.
   - Retain the ink tonal ladder (`paper`, `light`, `strong`, `none`) for shape fills.
4. **Dock Visibility Contract**:
   - Preserve `DEFAULT_DOCK_CONTROLS` defaults (`toolFrame: false`, `toolSticky: false`, `actionSearch: false`, `actionStats: false`).
   - All new tools or action buttons must be registered in `DockControlsVisibility` in `lib/shell-store.ts` and surfaced in `Settings > Canvas & Toolbar`.
5. **Arrow Binding Semantics**:
   - Arrow endpoints bound to node perimeters store `elementId`, `focus`, and `gap`. Any cloning or duplication logic must remap bindings using `idMap`.
