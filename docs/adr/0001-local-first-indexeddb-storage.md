# ADR 0001: Local-First Persistence via Client IndexedDB

## Status
**Accepted**

## Context
Traditional collaborative whiteboard applications (Figma, Miro) require immediate user authentication and stream all element mutations to central servers. When network connectivity degrades or drops, users face degraded experiences, lockouts, or data loss.

Zenithsui is designed as a thinking and napkin-sketching tool. Users expect instant document creation without sign-up friction, complete offline autonomy, and privacy for personal ideation.

## Decision
We adopted a **Local-First Architecture** utilizing browser-native **IndexedDB** (`zenithsui_db`) as the primary source of truth:
1. Documents and binary assets are written directly to IndexedDB.
2. Cloud synchronization (Supabase) is optional and decoupled from local editing.
3. Canvas mutations update memory instantly and flush asynchronously via a 150ms debounced atomic transaction.

## Consequences
### Positive
- Zero network latency for all drawing, dragging, and zooming operations.
- 100% offline functionality out of the box with zero configuration.
- Total privacy: user sketches never leave the browser unless explicitly shared.
### Negative / Trade-offs
- Users who clear browser site data risk losing local documents unless exported. (Mitigated by prominent Export reminders and Desktop app builds).
- Cross-device sync requires explicit cloud share links or Wi-Fi peer synchronization.
