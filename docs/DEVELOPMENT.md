# Zenithsui Developer Guide

This document provides complete instructions for setting up, developing, debugging, and maintaining **Zenithsui**.

---

## 1. Development Prerequisites

Ensure the following tools are installed:

- **Node.js**: `20.x`, `22.x` (recommended), or `24.x`
- **pnpm**: `>= 10.4.0` (pinned to `10.4.1` in `package.json`)
- **Git**: `>= 2.30`

Check your versions:
```bash
node -v   # Expected: v20.x, v22.x, or v24.x
pnpm -v   # Expected: >= 10.4.0
```

---

## 2. Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/amitdev7/notepadbackup.git
   cd notepadbackup
   ```

2. **Install dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Set up local environment**:
   ```bash
   cp .env.example .env.local
   ```

4. **Launch development server**:
   ```bash
   pnpm dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 3. Package Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Starts the Next.js development server with Turbopack |
| `pnpm build` | Compiles an optimized Next.js production build |
| `pnpm start` | Starts the production server locally |
| `pnpm test` | Runs the full 37-suite test runbook |
| `pnpm lint` | Runs ESLint 9 checks |
| `pnpm exec tsc --noEmit` | Runs TypeScript compiler checks without emitting files |
| `pnpm desktop:dev` | Launches the Electron desktop app with live reload |
| `pnpm desktop:build` | Compiles Next.js standalone assets and prepares the Electron build |
| `pnpm desktop:dist:nsis` | Packages the Windows NSIS installer |
| `pnpm desktop:dist:portable` | Packages the Windows standalone portable executable |
| `pnpm desktop:dist` | Packages both NSIS and Portable Windows distributions |

---

## 4. Key Directories & Organization

```
notepadbackup/
├── app/                  # Next.js 16 App Router
│   ├── api/              # Serverless API routes (assets proxy, share, time, sync)
│   ├── dashboard/        # Multi-document manager & folders view
│   ├── layout.tsx        # Root HTML layout, fonts, service worker registration
│   └── page.tsx          # Main Infinite Canvas workspace
├── components/           # React 19 UI component tree
│   ├── academic/         # Academic OS widgets (planner, syllabus, hub)
│   ├── canvas/           # Core canvas rendering engine, Rough.js sketches
│   ├── chrome/           # Overlays, modals, inspector, command palette
│   ├── shell/            # Top bar capsule, bottom dock, clock, view menu
│   └── ui/               # Base UI primitives (buttons, switches, dialogs)
├── electron/             # Electron desktop main process & preload bridges
├── lib/                  # Business logic & utilities
│   ├── academic/         # Academic OS algorithms (spaced repetition, stats)
│   ├── canvas/           # Canvas math, spatial tree, geometry, hit-testing
│   ├── crypto/           # AES-256-GCM encryption & token verification
│   ├── lan/              # Wi-Fi peer-to-peer collaboration protocol
│   ├── storage/          # IndexedDB persistence, document store, autosave
│   └── time/             # Real-time clock & timezone calibration services
├── public/               # Static assets, fonts, icons, web workers
└── scripts/              # 37 test suites and standalone build helpers
```

---

## 5. Coding & Architectural Standards

### Canvas State & Gesture Granularity
- **Never trigger undo snapshots on every mousemove.**
- Call `onGestureStart()` on pointerdown, mutate nodes live for 60 FPS feedback, and call `commitGesture()` on pointerup. This collapses continuous drags into a single atomic undo entry.

### Styling with Semantic Design Tokens
- Do not hardcode static colors like `bg-stone-900` or `#007AFF` in shared components.
- Use Tailwind CSS v4 CSS variables:
  ```tsx
  // Recommended
  className="bg-background text-foreground border-border ring-[var(--ui-accent,#007AFF)]"
  
  // Prohibited in core components
  className="bg-[#007AFF] text-[#1E293B]"
  ```

### Handling IndexedDB in Development
- Open Chrome DevTools -> **Application** -> **Storage** -> **IndexedDB** -> `zenithsui_db`.
- Inspect the `documents` store to observe atomic autosave commits in real time.
- To reset local state completely, execute `indexedDB.deleteDatabase("zenithsui_db")` in the browser console.

---

## 6. How to Add a New Canvas Tool or Component

1. Define the element node type and properties in [lib/canvas/types.ts](file:///c:/Users/amitk/Pictures/websitetesting/notepadbackup/lib/canvas/types.ts).
2. Implement its Rough.js procedural sketch rendering branch in [components/canvas/sketch.tsx](file:///c:/Users/amitk/Pictures/websitetesting/notepadbackup/components/canvas/sketch.tsx).
3. Add its icon and activation shortcut in [components/shell/bottom-dock.tsx](file:///c:/Users/amitk/Pictures/websitetesting/notepadbackup/components/shell/bottom-dock.tsx).
4. Add property controls in [components/chrome/inspector.tsx](file:///c:/Users/amitk/Pictures/websitetesting/notepadbackup/components/chrome/inspector.tsx).
5. Add unit test coverage in `scripts/`.
