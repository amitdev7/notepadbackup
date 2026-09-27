# Next Task & Handoff Instructions

This file guides the next AI agent or developer picking up work on Zenithsui. Always consult this file first before starting any new task.

---

## Current Status
- **Dev Server**: Running and healthy on port 3000 (`HTTP/1.1 200 OK`). Base dependencies verified via `install_applet_dependencies`.
- **Student Components / Student Kit Library**: Completed & 100% Verified.
  - All 20 components defined in `lib/library/defs-student.ts` with complete `ComponentDef` structures, responsive vector rendering, inspector controls, and quick toggles.
  - Components 1–15 registered under category `"components"` (group: `"Student"`).
  - Components 16–20 registered under category `"blocks"` (group: `"Student"`).
  - Registered in `lib/library/registry.ts` via `STUDENT_DEFS` and added to `SOURCES` and `GROUPS`.
  - Tested across 100%, 60%, and 150% scaling without any calculation errors or NaN values.
  - Break-apart tested for all 20 components to ensure clean disassembling into native canvas sketch nodes.
  - 205 automated assertions passing in `scripts/test-student-components.ts`.
- **UI/UX Invariant**: Zero modifications made to Zenithsui's core visual theme, fonts, colors, toolbars, or napkin sketch aesthetic.

---

## Instructions for Next AI Agent
1. **Never alter the look, UI, UX, design, or theme**: Keep Zenithsui's signature napkin wireframe sketch aesthetic completely intact.
2. **Library Registry**: When adding new components, register them in `lib/library/registry.ts` and verify using `node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-student-components.ts`.
3. **Port 3000 Invariant**: Always ensure dev server runs on port 3000 and dependencies are kept up-to-date.
