# 01 — Architecture & Structural Audit

## 1. Next.js App Router Architecture
Zenithsui is built on Next.js 16.2.12 utilizing the App Router with Turbopack and React 19.

### Route Inventory
| Route Path | Type | Render Target | Purpose |
|---|---|---|---|
| `/` | Page (Static) | Client Hydrated | Core infinite whiteboard canvas |
| `/dashboard` | Page (Static) | Client Hydrated | Document organizer, projects, workspaces, academic modules |
| `/kitchen-sink` | Page (Static) | Client Hydrated | Risograph design system catalog & component testing |
| `/share/[token]` | Page (Dynamic) | Server + Client | Cryptographically shared canvas viewer |
| `/p/[slug]` | Page (Dynamic) | Server + Client | Public vanity URL document viewer |
| `/invite/[token]` | Page (Dynamic) | Server + Client | Workspace & document collaboration invite acceptance |
| `/lan/view/[sessionId]` | Page (Dynamic) | Client Hydrated | LAN/Wi-Fi peer collaboration viewer |
| `/api/auth/callback` | API Handler | Server | OAuth authentication callback with redirect sanitization |
| `/api/documents` | API Handler | Server | REST CRUD for cloud-synchronized documents |
| `/api/share` | API Handler | Server | Cryptographic share link creation & management |
| `/api/wifi-sync` | API Handler | Server | Local subnet discovery signaling |

---

## 2. Server vs. Client Boundaries
- **Server Components**: Handle authentication verification, token verification, and initial metadata assembly before streaming to client components.
- **Client Components**: All canvas manipulation, mouse/pointer event dispatching, Rough.js ink rendering, and IndexedDB access are isolated in `'use client'` components.
- **Proxy/Middleware**: `proxy.ts` (Next.js middleware) intercepts authenticated routes, ensuring sessions are refreshed and unauthorized requests are directed to appropriate flows.

---

## 3. Resilience & Boundaries
- Added global `app/error.tsx` catching client-side render exceptions with an interactive `reset()` and home navigation link.
- Added `app/not-found.tsx` for graceful 404 handling.
- Added `app/loading.tsx` providing an instant skeleton loader during page transitions.
