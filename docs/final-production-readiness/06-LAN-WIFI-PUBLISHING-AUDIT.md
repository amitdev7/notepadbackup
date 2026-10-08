# 06 — LAN / Wi-Fi Publishing Audit

## 1. Local Network Collaboration Architecture
Zenithsui provides zero-cloud, peer-to-peer local network canvas sharing designed for classrooms, offline study groups, and local Wi-Fi environments.

```
[Host Browser] ── WebSocket ──→ [Local Gateway daemon or Direct P2P]
                                       │
                       ┌───────────────┴───────────────┐
                       ▼                               ▼
               [Student Tablet 1]              [Student Laptop 2]
```

---

## 2. Security & Discovery Model
- **Network ID & Cryptography**: Subnet discovery hashes the network gateway fingerprint to prevent cross-network leaking.
- **Role Enforcement**:
  - Host grants `viewer` or `editor` roles to connected peers.
  - Inbound operations from unauthorized viewers are dropped at the protocol layer (`[zenithsui-lan] Dropped unauthorized doc_op from viewer`).
- **Graceful Lifecycle**:
  - `startPublishing()` probes local gateway with cancellation safety.
  - `stopPublishing()` broadcasts session termination, closes WebSockets, and purges peer states.
