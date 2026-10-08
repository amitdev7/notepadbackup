# 13 — Chaos & Failure Mode Audit

## 1. Adversarial Scenarios Evaluated

### Scenario A: Storage Quota Exhaustion
- **Failure Trigger**: User draws massive documents with large embedded base64 images exceeding browser localStorage quota limits.
- **System Behavior**: `saveLocalDocument` stores the document in IndexedDB (which supports hundreds of megabytes). `localStorage` only writes tiny index summaries. No documents are evicted or lost.

### Scenario B: Corrupted / Malformed Clipboard Paste
- **Failure Trigger**: User pastes foreign HTML, malformed JSON, or objects containing `NaN` / `Infinity` dimensions.
- **System Behavior**: `decodeNodes` checks strict type guards and finite numbers via `validNode()`. Degenerate nodes are discarded, preventing document wedging or store corruption.

### Scenario C: Network Disconnection During Cloud Sync
- **Failure Trigger**: User loses Wi-Fi while collaborating or autosaving.
- **System Behavior**: Canvas remains 100% interactive. Document is durably committed to local IndexedDB. Sync operations are queued in offline sync queue and resumed upon reconnection.

### Scenario D: Shared Link Hydration on Fresh Browser
- **Failure Trigger**: External viewer opens `/share/[token]` in incognito window with empty local storage.
- **System Behavior**: `viewer-client.tsx` hydrates `useSquig.getState().loadDoc(initialDoc)` immediately, rendering the complete canvas with read-only viewer protections.
