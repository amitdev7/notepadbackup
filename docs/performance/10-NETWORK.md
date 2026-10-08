# ZENITHSUI — NETWORK & DATA TRANSFER OPTIMIZATION
## 10-NETWORK.md

> **Target Standard:** Zero-Network Interactive Loop, Batched Sync Backpressure, Offline-First  
> **Infrastructure:** Vercel Edge CDN, HTTP/2 & HTTP/3, Supabase REST  
> **Status:** Hardened & Verified

---

## 1. Zero-Network Interactive Guarantee

The core canvas drawing, shape creation, text editing, and panning loops operate with a **strict zero-network invariant**:

```
[POINTER INPUT] ──► [LOCAL STATE] ──► [LOCAL RENDER] ──► [DISPLAY UPDATE]
                                                               │
                                         (Non-blocking async)  ▼
                                      [BACKGROUND SYNC QUEUE (900ms-2000ms)]
```

No network call (REST, WebSocket, or RPC) is ever dispatched synchronously in response to user canvas gestures. If the user disconnects their network cable or enters an elevator, the entire application continues operating at 100% capacity.

---

## 2. Sync Backpressure & Mutation Batching

When network synchronization is active (cloud sync or multi-user sharing):
- **Rate-Limiting & Deduplication:** 100 consecutive local edits to a shape's position collapse into a single synchronization patch containing the final coordinates.
- **Batched Payloads:** Multi-node mutations are transmitted in consolidated JSON arrays rather than separate HTTP requests per node.
- **Exponential Backoff:** If the cloud endpoint returns 429 (Rate Limit) or 503 (Unavailable), the sync queue engages randomized exponential backoff with jitter (500ms, 1000ms, 2000ms, up to 10s max) to prevent network congestion.

---

## 3. Asset Compression & Edge Caching

Static routes and assets deployed to Vercel include optimized HTTP cache headers:
- Immutable static assets (`/_next/static/*`): `Cache-Control: public, max-age=31536000, immutable`
- Dynamic API routes: `Cache-Control: no-cache, no-store, must-revalidate`
- Payloads are compressed using modern **Brotli (br)** and **Gzip** at the Vercel Edge network.
