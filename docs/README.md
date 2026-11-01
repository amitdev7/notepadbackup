# Zenithsui Technical Documentation

Welcome to the **Zenithsui** technical documentation portal. This directory contains detailed architectural specifications, runtime guides, storage internals, mathematical invariants, and operational runbooks for developers and contributors.

---

## Documentation Directory

| Document | Description |
|---|---|
| [**Architecture & System Design**](ARCHITECTURE.md) | High-level system topology, module relationships, and Mermaid architectural diagrams. |
| [**Development Guide**](DEVELOPMENT.md) | Local development setup, toolchain requirements, debugging tips, and coding conventions. |
| [**Installation Runbook**](INSTALLATION.md) | Step-by-step setup instructions for web, Docker container, and native Electron desktop. |
| [**Configuration Reference**](CONFIGURATION.md) | Complete directory of environment variables (Supabase, Vercel Blob, LAN Gateway, Secrets). |
| [**Deployment Guide**](DEPLOYMENT.md) | Production build pipeline, Vercel edge deployment, Docker containerization, and Electron releases. |
| [**Testing Runbook**](TESTING.md) | Guide to Zenithsui's 37 automated test suites, testing philosophy, and writing new tests. |
| [**Storage & Persistence**](STORAGE.md) | IndexedDB database schema (`zenithsui_db`), document store lifecycle, and autosave mechanics. |
| [**Canvas Engine & Math**](CANVAS-ENGINE.md) | Coordinate spaces (`worldToScreen` / `screenToWorld`), Rough.js seed determinism, and spatial tree indexing. |
| [**Data Flow & State Topology**](DATA-FLOW.md) | Zustand stores hierarchy, gesture collapsing, atomic undo/redo stack, and event dispatching. |
| [**Security Policy & Threat Model**](SECURITY.md) | Client-side AES-256-GCM token encryption, SSRF protection on asset proxy, and Electron IPC hardening. |
| [**Project Management & Governance**](PROJECT-MANAGEMENT.md) | Issue label taxonomy, milestones, project boards, and branch protection runbook. |
| [**API Reference**](API.md) | Complete documentation of all 10 serverless endpoints in `/app/api/`. |
| [**Troubleshooting & FAQ**](TROUBLESHOOTING.md) | Practical fixes for common build, runtime, lockfile, and browser storage issues. |
| [**Architecture Decision Records (ADRs)**](adr/README.md) | Log of key architectural decisions made throughout project development. |

---

## Core Product Invariants

1. **Local-First Autonomy**: The infinite canvas functions with 100% feature parity with zero network connection. Local client-side IndexedDB is the primary source of truth.
2. **Deterministic Mathematical Rendering**: Visual nodes (shapes, scribbles, arrows) do not change their geometry, stroke paths, or procedural roughness across re-renders. Every node possesses a stable 32-bit integer `seed`.
3. **Strict Separation of Canvas & Chrome**: Chrome overlays (toolbars, docks, inspector, dialogs) carry `data-zenithsui-chrome` and do not propagate pointer events to the canvas coordinate system.
4. **Zero Layout-Shift Transitions on Canvas**: Drawing elements must never be subjected to CSS transitions that displace hitboxes or distort pointer event calculations.
