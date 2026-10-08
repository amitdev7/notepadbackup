# ZENITHSUI — PDF & DOCUMENT ATTACHMENT PERFORMANCE
## 14-PDF.md

> **Target Standard:** Progressive Page Rendering, Memory-Safe Binary Parsing, Fast First Page  
> **Core Files:** `lib/canvas/pdf-service.ts`, `components/canvas/document-canvas-item.tsx`  
> **Status:** Hardened & Verified

---

## 1. PDF Pipeline Architecture

Embedding multi-page PDFs directly onto an infinite canvas can easily cause browser memory exhaustion if every page is rendered into DOM or high-resolution canvas bitmaps simultaneously.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PDF PIPELINE TOPOLOGY                           │
├────────────────────────────────────────────────────────────────────────┤
│ Binary Ingestion (`lib/canvas/pdf-service.ts`)                          │
│   - Validate Magic Bytes (`%PDF-`)                                     │
│   - Compute SHA-256 binary hash                                        │
│   - Store raw binary in IndexedDB attachment store                     │
├────────────────────────────────────────────────────────────────────────┤
│ Progressive Page Rendering (`DocumentCanvasItem`)                     │
│   - First Page Thumbnail generated immediately for canvas preview      │
│   - Subsequent pages rendered lazily upon opening Document Viewer      │
│   - Unused page render contexts evicted on modal close                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Memory Lifecycle & Worker Offloading

- **Off-Thread Page Parsing:** Heavy PDF document structure parsing is offloaded to Web Workers.
- **Canvas Bitmap Eviction:** When a document node moves offscreen and is culled by the viewport engine, its rasterized canvas backing store is reclaimed by the garbage collector.
- **Zero Memory Retention on Delete:** Deleting a `DocumentNode` purges its blob references and dispatches an asynchronous cleanup transaction to the attachments store.
