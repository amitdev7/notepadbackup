# ZENITHSUI — WEB WORKER BACKGROUND OFFLOAD ARCHITECTURE
## 07-WORKERS.md

> **Target Standard:** Zero Main-Thread Freezes, Asynchronous Heavy Compute, Automatic Fallback  
> **Core Files:** `public/workers/canvas-worker.js`, `lib/worker-bridge.ts`  
> **Status:** Hardened & Verified

---

## 1. Web Worker Architecture Overview

To protect the browser's 60/120 FPS UI thread from CPU-heavy operations (deep JSON serialization, full-text search tokenization, large spatial queries), Zenithsui implements a dedicated **Background Web Worker Bridge**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WORKER BRIDGE TOPOLOGY                          │
├────────────────────────────────────────────────────────────────────────┤
│ Main UI Thread (`lib/worker-bridge.ts`)                                │
│   - Receives request: `workerBridge.serializeDocument(payload)`        │
│   - Checks user preferences (`preferences.performanceSettings`)       │
│   - Dispatches message with correlation ID: `{ id, type, payload }`    │
│   - Manages 2500ms timeout with automatic synchronous fallback         │
├────────────────────────────────────────────────────────────────────────┤
│ Background Worker Thread (`public/workers/canvas-worker.js`)           │
│   - `SERIALIZE_DOCUMENT`: Deep JSON stringify & Blob byte measurement  │
│   - `INDEX_SEARCH`: Tokenize node text & labels for fuzzy search       │
│   - `CALCULATE_BOUNDS`: Union bounding-box calculation for 1000s of    │
│     nodes                                                              │
│   - Posts response: `{ id, success: true, result }`                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Supported Worker Operations

### A. Document Serialization (`SERIALIZE_DOCUMENT`)
When saving a large canvas or creating a version history checkpoint, serializing thousands of node objects into JSON can cause 50ms–150ms of main-thread execution freeze.
- **Worker Action:** Serializes the state dictionary off-thread and measures binary blob payload sizes.
- **Result:** Main thread continues rendering active mouse gestures without dropping a single frame.

### B. Full-Text Search Tokenization (`INDEX_SEARCH`)
- **Worker Action:** Extracts text runs from `text`, `label`, `title`, and `sticky` nodes, lowercases, tokenizes, and dedupes tokens into an inverted index dictionary.
- **Result:** Instant search filtering with zero typing latency.

### C. Spatial Bounding Box Aggregation (`CALCULATE_BOUNDS`)
- **Worker Action:** Iterates thousands of nodes to compute aggregate bounding rectangles:
  $$\text{minX} = \min(n.x), \quad \text{maxX} = \max(n.x + n.w)$$
  $$\text{minY} = \min(n.y), \quad \text{maxY} = \max(n.y + n.h)$$
- **Result:** Selection bounding-box calculation scales to 10,000+ objects.

---

## 3. Resilience, Timeout & Fallback Guarantees

1. **Environment Awareness:** If running in an SSR environment or a browser without Web Worker support, tasks execute synchronously on the main thread via pure inline fallbacks.
2. **User Preference Toggle:** If the user disables Web Workers in Settings (`useWebWorkers: false`), the bridge routes all tasks to synchronous execution without instantiating workers.
3. **2500ms Timeout Guard:** Every worker request initiates a 2.5-second timer. If the worker hangs or terminates unexpectedly, the bridge resolves the promise via the fallback implementation, guaranteeing that document saves never hang or lose data.
4. **Lifecycle & Memory Control:** The worker operates as a stateless singleton, preventing multiple competing threads or orphaned background workers.
