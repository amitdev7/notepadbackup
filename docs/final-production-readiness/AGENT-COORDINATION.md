# Multi-Agent Coordination Protocol

## Communication & Verification Protocol
All agents operated under the following operational guidelines:

1. **Zero Assumption Policy**: Previous claims of completion were disregarded without live file inspection and runtime execution.
2. **Strict Test First / Test Verified**: Any architectural fix was accompanied by automated assertions verifying root-cause resolution.
3. **Cross-System Non-Interference**:
   - Canvas state mutations routed through `useSquig`.
   - Shell preferences and dock visibilities isolated in `useShellStore`.
   - IndexedDB operations abstracted through `lib/storage/documents.ts`.
4. **Peer Review & Verification**:
   - `ARCH-01` verified route boundaries.
   - `ARCH-02` identified clipboard data loss and DDL drift.
   - `ARCH-03` identified localStorage eviction hazards.
   - Independent test runners executed `pnpm test`, `pnpm tsc --noEmit`, `pnpm lint`, and `pnpm build`.
