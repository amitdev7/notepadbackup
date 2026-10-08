# ZENITHSUI — REACT 19 & ZUSTAND REACTIVITY ARCHITECTURE
## 04-REACT-ZUSTAND.md

> **Target Standard:** Zero Render Cascades, Sub-Millisecond Store Dispatch, Zero State Tearing  
> **Engines:** React 19, Zustand v5, React Compiler  
> **Status:** Hardened & Verified

---

## 1. Store Partitioning & Domain Boundaries

To prevent global application re-render cascades, Zenithsui strictly isolates state into four decoupled Zustand stores:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DECOUPLED STORE TOPOLOGY                        │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Store               │ Domain & Subscription Scope                      │
├─────────────────────┼──────────────────────────────────────────────────┤
│ `useSquig`          │ Canvas graph: nodes, order, viewport, tool,      │
│ (lib/store.ts)      │ selection, undo/redo history, clipboard.         │
├─────────────────────┼──────────────────────────────────────────────────┤
│ `useShellStore`     │ Chrome UI: toolbar dock controls, preferences,   │
│ (lib/shell-store.ts)│ performance profile, laser/draw/text settings.   │
├─────────────────────┼──────────────────────────────────────────────────┤
│ `useAuthStore`      │ Cloud credentials, user session, sync status.    │
│ (lib/auth-store.ts) │ Completely detached from canvas gesture loops.   │
├─────────────────────┼──────────────────────────────────────────────────┤
│ `useWifiSessionStore`│ LAN peer discovery, Wi-Fi publishing, WebRTC.    │
└─────────────────────┴──────────────────────────────────────────────────┘
```

### Critical Decoupling Invariants
1. **Settings / Dialogs do NOT trigger Canvas Redraws:** Opening Settings, changing the accent color, or updating laser beam width updates `useShellStore` and DOM CSS variables without dispatching any updates to `useSquig`.
2. **Canvas Panning / Inking does NOT trigger Chrome Re-renders:** Viewport changes during continuous pan/zoom update only canvas subscribers (`viewport`), leaving the outer app header, sidebar, and dock completely idle.

---

## 2. Zustand Fine-Grained Selectors

Components must never subscribe to the root store object. Every component specifies precise atomic selectors:

```tsx
// ❌ ANTI-PATTERN: Re-renders on ANY store mutation (including unrelated node moves)
const store = useSquig()

// ✅ ZENITHSUI PATTERN: Subscribes ONLY to required slice
const order = useSquig((s) => s.order)
const selection = useSquig((s) => s.selection)
const tool = useSquig((s) => s.tool)
const perfSettings = useShellStore((s) => s.preferences.performanceSettings)
```

For imperative gesture updates that run at 60/120Hz (e.g., auto-pan ticks, hit-testing), code uses `useSquig.getState()` to sample current state without establishing a React component subscription.

---

## 3. History Stack & Undo/Redo Memory Management

Canvas document undo/redo stacks (`past` and `future`) maintain full checkpoints:
- **Depth Cap:** Capped at `MAX_HISTORY = 100` snapshots to prevent unbounded RAM growth.
- **Structural Sharing:** Checkpoints store snapshots of the node dictionary; unmutated nodes retain object identity.
- **Nudge Coalescing:** Consecutive keyboard arrow nudges on the same selection are coalesced into a single undo step using a 900ms timer (`nudgeRef`), preventing a sequence of 50 single-pixel nudges from consuming 50 history slots.
- **Ephemeral State Exclusion:** Ephemeral gestures (live ink point preview, marquee rectangle, hover box, laser trails) are never committed to the undo stack.

---

## 4. React 19 & React Compiler Compliance

All canvas and shell components adhere to React 19's purity standards:
- **Zero Ref Access During Render:** Viewport size calculations use tracked React state (`canvasSize`) rather than accessing `containerRef.current` inside `useMemo`.
- **Pure Effect Hooks:** Time measurements in `PerfHud` initialize `useRef(0)` and sample `performance.now()` strictly inside `useEffect` and RAF loops, satisfying the `react-hooks/purity` compiler rule.
- **Strict Memoization Preservation:** All complex memos (`visibleOrder`, `selectedNodes`) declare exhaustive, stable dependency arrays without inferred object drift.
