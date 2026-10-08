# ZENITHSUI — COMPREHENSIVE EXECUTION TOPOLOGY

> **Status:** Audited & Optimized  
> **Date:** October 2026  
> **Architecture Target:** Zero-Jank, 60/120 FPS Infinite Canvas, Memory-Efficient, Distributed Workloads

---

## 1. Executive Topology Overview

Zenithsui is an infinite canvas and academic workspace designed around the **Local-First, Zero-Network Critical Path** principle:

```
[USER INPUT]
     │ (Pointer / Keyboard / Touch)
     ▼
[MAIN BROWSER THREAD]
     │ ─── Latency Critical Path (< 4ms) ───
     ├─► [LOCAL REACT & ZUSTAND STORE] (lib/store.ts, lib/shell-store.ts)
     ├─► [GPU COMPOSITOR LAYER] (will-change: transform, translate3d)
     └─► [IMMEDIATE 60/120 FPS SCREEN UPDATE]
     │
     │ ─── Asynchronous Background Offload Path (Non-blocking) ───
     ├─► [WEB WORKER BRIDGE] (public/workers/canvas-worker.js)
     │     ├─ JSON Document Serialization
     │     ├─ Tokenized Full-Text Search Indexing
     │     └─ Heavy Spatial Bounding Box Calculations
     │
     ├─► [LOCAL PERSISTENCE] (lib/storage/indexeddb.ts, localStorage)
     │     └─ Debounced Auto-Save (900ms burst cooldown)
     │
     └─► [CLOUD & SYNC] (Supabase Postgres, Realtime WebSockets)
           └─ Batch-debounced asynchronous synchronization
```

---

## 2. Master Execution Topology Matrix

| Operation | Current Execution Location | CPU Cost | GPU Cost | RAM Cost | Network Cost | Server Cost | Latency Impact | Frequency | Bottleneck | Target Optimized Location | Rationale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pointer Move (Freehand Inking)** | Main Thread (RAF Coalesced) | Very Low (< 1ms) | Low | Low | 0 | 0 | < 2ms | 60Hz / 120Hz | Raw event flood on 1000Hz mice | Main Thread + RAF Latch | Direct pointer response is latency-critical. RAF coalescing prevents React re-render thrashing. |
| **Canvas Pan & Zoom** | Main Thread + GPU Compositor | Low | Moderate | Low | 0 | 0 | < 4ms | Per frame | DOM reflow during transform changes | GPU Composited Layer (`translate3d`) | Hardware layer promotion eliminates repaint passes during panning and zooming. |
| **Node Selection & Marquee** | Main Thread (hit-test) | Low (< 2ms) | None | Very Low | 0 | 0 | < 3ms | On drag | Large scene polygon checks | Local Hit-Test + Viewport Culling | Only evaluates visible and candidate elements, avoiding global iteration. |
| **SVG Node Rendering** | DOM / SVG Layer | Low–Moderate | Low | Low | 0 | 0 | < 8ms | On scene change | SVG DOM node explosion (>1,000 nodes) | Viewport-Culled SVG (`visibleOrder`) | Culled offscreen elements are excluded from SVG DOM, reducing render tree by up to 90%. |
| **Document JSON Serialization** | Web Worker (`public/workers/canvas-worker.js`) | Offloaded | 0 | Low | 0 | 0 | 0ms UI impact | On save / export | Main thread event loop blockage | Web Worker Background Thread | Offloading `JSON.stringify` and byte calculations prevents frame drops during auto-save. |
| **Canvas Search Indexing** | Web Worker | Offloaded | 0 | Low | 0 | 0 | 0ms UI impact | Debounced | Text parsing on 5,000 nodes | Web Worker Background Thread | Tokenizing text blocks runs in background, returning indexed token maps without jank. |
| **IndexedDB Persistence** | Browser Background I/O | Low | 0 | Low | 0 | 0 | < 1ms async | Debounced (900ms) | Synchronous disk writes (localStorage) | IndexedDB Storage Layer | IndexedDB operations are asynchronous and transaction-isolated, preventing UI lockups. |
| **Cloud Sync & Snapshot Push** | Supabase REST / WebSocket | Very Low | 0 | Low | Low (compressed JSON) | Low | Asynchronous | Debounced (2000ms) | Synchronous network blocking | Async Cloud Queue | Never block local interaction on network handshakes. Local store acts as source of truth. |
| **Preferences & Theme Switching** | Zustand + LocalStorage | Very Low | None | Very Low | 0 | 0 | < 1ms | Infrequent | DOM class recalculation | Main Thread + CSS Custom Properties | Theme switching modifies CSS variables; zero path recalculation or re-rendering needed. |
| **Live Telemetry HUD (`PerfHud`)** | Main Thread RAF loop | Minimal (< 0.2ms) | Minimal | Low | 0 | 0 | 0ms | 500ms sample interval | Rolling array allocations | Main Thread (Optimized Rolling Loop) | Rolling timestamp comparisons avoid object allocation and GC pauses. |

---

## 3. Resource Allocation Breakdown

### A. User CPU (Main Browser Thread)
- **Role:** High-priority user input handling, instantaneous React state updates, gesture calculations, DOM reconciliation.
- **Budget:** < 8.3ms per frame on 120Hz displays, < 16.6ms on 60Hz displays.
- **Safeguards:** `requestAnimationFrame` latches for all continuous pointer gestures (`move`, `draw`, `resize`, `pan`).

### B. User GPU (Compositor & WebGL/Canvas2D)
- **Role:** Matrix transforms, scaling, viewport panning, and rough.js rendered element compositing.
- **Optimizations:**
  - `transform: translate3d(0, 0, 0)` applied to outer canvas container.
  - `will-change: transform` dynamically activated during active gestures (`gestureKind`).
  - `backface-visibility: hidden` to prevent composite tearing.

### C. Web Workers (Background CPU)
- **Role:** Heavy computational tasks isolated from the 60fps event loop.
- **Tasks Handled:**
  1. `SERIALIZE_DOCUMENT`: Deep JSON cloning, stringification, blob sizing.
  2. `INDEX_SEARCH`: Tokenization and inverted index generation for fast canvas text search.
  3. `CALCULATE_BOUNDS`: Multi-thousand node bounding box aggregations.
- **Graceful Fallback:** Automatic timeout fallback to main thread if Web Workers are disabled or unavailable.

### D. Local Storage & IndexedDB (Offline-First Storage)
- **Role:** Immediate persistence of documents, calendar events, revision decks, and student metadata.
- **Guarantees:** No interaction waits for disk writes; writes are debounced and coalesced.

### E. Cloud & Network Infrastructure (Vercel & Supabase)
- **Role:** Long-term archival, multi-device synchronization, LAN/Wi-Fi peer collaboration, public share links.
- **Guarantees:** The critical interaction path NEVER waits for network round-trips. Offline-first optimistic local updates are always authoritative.
