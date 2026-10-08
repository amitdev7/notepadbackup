# 04 — Persistence & Storage Architecture Audit

## 1. Unified Local-First Storage Architecture
Zenithsui formerly exhibited a storage split-brain between `localStorage` (used by canvas autosave) and `IndexedDB` (used by the cloud sync queue and academic suite).

### Hardened Unified Pipeline
```
[Canvas Edit] 
      ↓
[flushSave() in useSquig]
      ↓
┌───────────────────────────────┐
│  saveLocalDocument(IndexedDB) │  (Durable primary storage)
└───────────────────────────────┘
      │
      ├─→ [Update localStorage index metadata]
      └─→ [Queue Offline Cloud Mutation if logged in]
```

---

## 2. Elimination of Destructive Quota Eviction
- **Previous Hazard**: `lib/files.ts` contained a `while (!stored) { dropOldestFile() }` loop that silently deleted the user's oldest local canvases whenever `localStorage` exceeded browser quota limits (typically 5MB).
- **Remediation**:
  - Eliminated the destructive deletion loop entirely.
  - Full document JSONs are saved into IndexedDB, which has gigabyte-scale storage limits.
  - `localStorage` retains only lightweight metadata (document names, IDs, timestamps) and falls back to IndexedDB for document payload hydration if omitted.

---

## 3. History Stack Memory Safety
- Past and future history stacks in `useSquig` are now strictly bounded to `MAX_HISTORY = 50`.
- History updates are executed immutably without in-place array mutation, ensuring React and Zustand subscribers react deterministically.
