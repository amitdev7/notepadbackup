# Zenithsui Product Roadmap

This document outlines the features and milestones for Zenithsui. Features are only marked as `[COMPLETED]` when their implementation is verified in the codebase and tested.

---

## Roadmap Status Key
- `[COMPLETED]`: Implemented, tested, and fully functional in the codebase.
- `[IN PROGRESS]`: Currently under active development.
- `[NEXT]`: Next in line for implementation.
- `[PLANNED]`: Scheduled for future releases.
- `[BLOCKED]`: Waiting on prerequisites or external dependencies.

---

## Core Milestones

### 0. Student Components & Student Kit Library
- [COMPLETED] 20 native napkin-styled student components (`defs-student.ts`).
- [COMPLETED] Registration in `lib/library/registry.ts` under `STUDENT_DEFS` with `"Student"` group in components and blocks.
- [COMPLETED] Complete control definitions and inspector property hooks for all 20 components.
- [COMPLETED] Break-apart support into editable canvas primitives (`breakApart()`).
- [COMPLETED] Automated verification test suite (`scripts/test-student-components.ts`) covering 100%, 60%, and 150% scales.

### 1. Canvas & Napkin Drawing Engine
- [COMPLETED] Hand-drawn wireframing powered by rough.js primitives.
- [COMPLETED] Real-time shape, line, text, and component placement.
- [COMPLETED] Smart sketch recognition pipeline.
- [COMPLETED] Infinite canvas with pan, zoom, and multi-selection.

### 2. Study Copilot & AI Integration
- [COMPLETED] Server-side Gemini API study actions.
- [COMPLETED] Student mode canvas mutations and study schedule generation.
- [COMPLETED] Prompt-driven component placement.
