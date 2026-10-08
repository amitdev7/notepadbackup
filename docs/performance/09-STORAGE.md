# ZENITHSUI — STORAGE & PERSISTENCE ARCHITECTURE
## 09-STORAGE.md

> **Target Standard:** Asynchronous Non-Blocking I/O, Sub-5ms Commit Latency, Zero Data Loss  
> **Core Files:** `lib/storage/indexeddb.ts`, `lib/storage/documents.ts`, `lib/academic/db.ts`  
> **Status:** Hardened & Verified

---

## 1. Local-First Storage Topology

Zenithsui employs a two-tier local storage architecture designed to guarantee sub-millisecond responsiveness while preventing synchronous disk writes from interrupting 60/120 FPS canvas interactions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOCAL STORAGE TOPOLOGY                          │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Storage Layer       │ Content & Performance Profile                    │
├─────────────────────┼──────────────────────────────────────────────────┤
│ LocalStorage        │ App shell preferences: theme, accent color, dock │
│ (Synchronous)       │ visibility, performance settings (~4 KB).        │
│                     │ Hydrated immediately on startup before paint.    │
├─────────────────────┼──────────────────────────────────────────────────┤
│ IndexedDB           │ High-capacity document graph, academic syllabus, │
│ (Asynchronous I/O)  │ flashcard decks, planner schedules, attachments. │
│                     │ Non-blocking transactions run off the main event │
│                     │ loop.                                            │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

## 2. Asynchronous Save Debouncing & Coalescing

In an interactive whiteboard, dragging a shape produces hundreds of coordinate changes per second. Persisting every intermediate state to disk would cause severe I/O thrashing and battery drain.

Zenithsui enforces **Two-Phase Coalescing**:
1. **Interactive Phase:** High-frequency updates during dragging or freehand drawing mutate memory state (`useSquig`) at 60/120 FPS. Disk persistence is completely paused.
2. **Commit Phase (`finishGesture`):** Upon releasing the pointer or finishing a text edit, the final state is scheduled for persistence.
3. **Save Debouncer:** Writes to IndexedDB are debounced over a 900ms cooldown window. Bursts of rapid edits (typing multiple characters, nudge key sequences) collapse into a single atomic IndexedDB transaction.

---

## 3. Atomic Transaction Isolation

All document operations in `lib/storage/documents.ts` use read-write object store transactions (`IDBTransaction`).
- If browser termination or tab closure occurs mid-transaction, IndexedDB automatically rolls back to the prior consistent checkpoint.
- Binary document attachments (PDFs, images) are stored as raw Blobs in a dedicated `attachments` object store, keeping document metadata indexing fast and lightweight.
