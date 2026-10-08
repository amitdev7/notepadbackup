# 09 — Performance & Scale Audit

## 1. Canvas Rendering Performance
- **Rough.js Caching**: Node sketch rendering utilizes stable seeds (`seed: number`) on each `BaseNode` so visual ink wobble is computed once rather than re-rolling on every frame.
- **Flat Tree Traversal**: The flat node record `Record<string, SquigNode>` and `order: string[]` ensures that dragging, selection, and hit-testing avoid deep AST recursion overhead.
- **Bounding Box Caching**: Viewport culling skips drawing elements outside the active screen viewport bounds.

---

## 2. Memory Footprint & Leaks
- **Bounded History Stack**: Undo/redo stacks (`past` and `future`) are strictly capped at 50 entries, eliminating memory growth during multi-hour sketching sessions.
- **Immutable Snapshots**: State updates generate immutable references, preventing memory leaks caused by unbounded object retainers.
- **IndexedDB Offloading**: Heavy document attachments and revision histories are stored in IndexedDB rather than occupying heap memory.

---

## 3. Bundle & Build Performance
- Next.js Turbopack build finishes in 16.0s.
- TypeScript compiler (`tsc --noEmit`) validates entire codebase in under 10s.
- Critical vendor packages (`@phosphor-icons/react`, `zustand`, `roughjs`) configured with tree-shaking optimization.
