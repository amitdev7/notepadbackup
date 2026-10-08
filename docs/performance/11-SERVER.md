# ZENITHSUI — SERVER & CLOUD INFRASTRUCTURE ARCHITECTURE
## 11-SERVER.md

> **Target Standard:** Sub-50ms Serverless API Execution, Edge Global Distribution  
> **Platform:** Vercel Serverless Functions, Edge Middleware, Next.js 15 App Router  
> **Status:** Hardened & Verified

---

## 1. Server Workload Classification

In accordance with Zenithsui's workload distribution principles, server resources are strictly reserved for operations that require centralized authority or trust:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SERVER WORKLOAD BOUNDARIES                        │
├────────────────────────────┬───────────────────────────────────────────┤
│ Server-Bound Tasks         │ Client-Bound Tasks                        │
├────────────────────────────┼───────────────────────────────────────────┤
│ • Authentication & JWT     │ • Canvas rendering & inking               │
│ • Secure share token auth  │ • Zoom/pan matrix calculations            │
│ • RLS authorization checks │ • Undo/redo history management            │
│ • Storage signed URLs      │ • Local document persistence              │
│ • Edge middleware routing  │ • Full-text fuzzy search indexing         │
└────────────────────────────┴───────────────────────────────────────────┘
```

---

## 2. API Route Performance & Cold Starts

All API routes in `app/api/**` follow low-latency patterns:
- **Zero Heavy Native Dependencies:** Serverless routes avoid heavy image/PDF rendering libraries, offloading document rendering to client workers.
- **Edge Middleware (`proxy.ts` / `middleware.ts`):** Lightweight request validation and route rewriting execute at edge locations nearest to the end user.
- **Payload Verification:** Incoming JSON payloads are parsed and validated with zero runtime overhead before database queries execute.
