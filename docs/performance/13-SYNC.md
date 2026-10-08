# ZENITHSUI — REALTIME SYNCHRONIZATION & COLLABORATION ARCHITECTURE
## 13-SYNC.md

> **Target Standard:** Sub-50ms LAN Latency, LWW Node Conflict Resolution, Zero UI Jitter  
> **Protocols:** WebRTC DataChannels, Local LAN Wi-Fi Sync, Supabase Realtime  
> **Status:** Hardened & Verified

---

## 1. Multi-Tier Synchronization Architecture

Zenithsui provides dual-tier collaboration: Local Network (LAN/Wi-Fi) peer-to-peer sync and Global Cloud Realtime:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYNC PROTOCOL TIERS                             │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Tier 1: LAN / Wi-Fi │ Zero cloud dependency. Direct HTTP/WebSocket     │
│ (`lib/wifi-session`)│ peer sync over local Wi-Fi. Latency < 15ms.      │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Tier 2: Cloud Sync  │ Supabase Realtime broadcast channels for global  │
│ (`lib/storage/sync`)│ remote collaboration. Latency < 80ms.            │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

## 2. Granular Conflict Resolution (Node-Level LWW)

To prevent remote collaborator edits from wiping out local changes:
- Synchronization messages transmit **per-node delta patches** rather than whole-document snapshots.
- Each node carries a monotonic update timestamp (`updated_at`).
- If two users edit different nodes concurrently, both edits merge losslessly.
- If two users edit the same node concurrently, Last-Write-Wins (LWW) with timestamp comparison resolves the conflict deterministically without split-brain state.

---

## 3. Ephemeral State Isolation

Presence data (collaborator cursors, laser pointer trails, live selections) is treated as ephemeral:
- Broadcast directly via lightweight transient messages.
- Never written to IndexedDB or PostgreSQL, eliminating database bloat and disk I/O contention during active collaboration sessions.
