import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join, relative, extname, basename, sep } from "node:path"

const ROOT = process.cwd()

// Curated list of all 21 source domains organizing 100% of the project's source files
const FILE_CATEGORIES = [
  {
    category: "1. Project Configuration, Tooling & Vercel Deployment Settings",
    description: "Build configuration, TypeScript compiler settings, package dependencies, Vercel edge/deployment configs, and toolchain configurations.",
    match: (f) => /^(package\.json|tsconfig\.json|next\.config\.ts|vercel\.json|\.vercelignore|components\.json|postcss\.config\.mjs|eslint\.config\.mjs|\.gitignore|\.npmrc|skills-lock\.json|\.env\.example|\.env\.local|README\.md|next-env\.d\.ts)$/.test(f),
    files: [],
  },
  {
    category: "2. Next.js 16 App Router & Application Shell",
    description: "Root layout, canvas page entry point, global CSS variables, custom cursors CSS, metadata images, and kitchen sink demo.",
    match: (f) => /^app\/(layout|page|globals\.css|cursors\.css|dashboard\/page|kitchen-sink\/page|manifest|icon\.svg|opengraph-image|social-image|twitter-image)/.test(f),
    files: [],
  },
  {
    category: "3. Core Application State, Document Schema & Unified Types",
    description: "Zustand state stores (useSquig, useShellStore, useAuthStore), TypeScript domain types, theme engine, design tokens, and workspace helpers.",
    match: (f) => /^lib\/(types|store|shell-store|auth-store|theme|utils|selection|shortcuts|design-tokens|slug|workspace)\.ts$/.test(f),
    files: [],
  },
  {
    category: "4. Canvas Geometry, Hit Testing, Snapping & Mathematical Engine",
    description: "Pure math engines for hit detection, screen-space magnetic smart guides, 8-handle transform math, Liang-Barsky marquee clipping, and text reflow.",
    match: (f) => /^lib\/canvas\//.test(f),
    files: [],
  },
  {
    category: "5. Rough.js Hand-Drawn Sketch Engine & Vector Primitives",
    description: "Vector primitive DSL (rect, pill, ellipse, poly, icon, text), Rough.js SVG path generator, seed determinism, pen pressure styling, and Phosphor icons.",
    match: (f) => /^(components\/canvas\/sketch\.tsx|lib\/sketch\/)/.test(f),
    files: [],
  },
  {
    category: "6. Interactive Canvas Viewport & Direct Manipulation Components",
    description: "Infinite canvas controller (pointer events, gestures, auto-pan, overlay), floating context row, empty canvas hero, and inline text editing overlay.",
    match: (f) => /^components\/canvas\/(canvas|context-row|empty-canvas|text-edit-overlay)\.tsx$/.test(f),
    files: [],
  },
  {
    category: "7. Application Chrome Shell, Floating Panels & File Navigation",
    description: "Left rail toolbar, property inspector, command palette (Cmd+K), context menus, library panel, Files popover, and file management controls.",
    match: (f) => /^components\/chrome\//.test(f) && !/^(conflict-dialog|migration-dialog|notifications-panel|recent-files|share-dialog|share-password-modal|sync-indicator|trash-dialog|version-history-panel|wifi-device-panel|wifi-publish-dialog)/.test(f.replace('components/chrome/', '')),
    files: [],
  },
  {
    category: "8. Shell Navbars, Responsive Docks & Dialogs",
    description: "Top bar chrome, bottom dock tool selector, page popover, and system settings dialog.",
    match: (f) => /^components\/shell\//.test(f),
    files: [],
  },
  {
    category: "9. Accessible Base UI Component Primitives",
    description: "Accessible headless UI wrappers styled with Tailwind v4 (buttons, dialogs, dropdowns, inputs, panels, selects, switches, tooltips).",
    match: (f) => /^components\/ui\//.test(f),
    files: [],
  },
  {
    category: "10. Automatic Wi-Fi Sync, LAN Peer Transport & Session Mesh",
    description: "Automatic Wi-Fi network subnet detection, in-memory sliding cache with Supabase persistence fallback, WebRTC DataChannels, and LAN peer collaboration.",
    match: (f) => /^(lib\/lan\/|components\/chrome\/wifi-|app\/lan\/|app\/api\/wifi-sync)/.test(f),
    files: [],
  },
  {
    category: "11. Supabase Cloud Infrastructure, SSR Clients & Database Migrations",
    description: "Supabase client/server/middleware integrations with @supabase/ssr, database schemas, and migration scripts.",
    match: (f) => /^(lib\/supabase\/|utils\/supabase\/|lib\/db\/|supabase\/migrations\/|scripts\/apply-supabase-migrations\.mjs)/.test(f),
    files: [],
  },
  {
    category: "12. Real-Time Cloud Synchronization, Queue Engine & Conflict Resolution",
    description: "Cloud sync engine, offline mutation queue, sync status indicators, 3-way conflict resolution, and version history.",
    match: (f) => /^(lib\/sync\/|components\/chrome\/(sync-indicator|conflict-dialog|version-history-panel)\.tsx)/.test(f),
    files: [],
  },
  {
    category: "13. Cloud Document Actions, Sharing, Invitations & Access Control",
    description: "Document actions, invitations, public link views, password-protected links, trash recovery, and notification panels.",
    match: (f) => /^(lib\/actions\/|lib\/cloud\/|components\/chrome\/(share-dialog|share-password-modal|notifications-panel|trash-dialog|migration-dialog|recent-files)\.tsx|app\/(share|p|invite)\/)/.test(f),
    files: [],
  },
  {
    category: "14. Backend REST API Routes & Vercel Blob Integration",
    description: "Next.js App Router API route handlers for documents, invitations, notifications, asset proxying, signed upload URLs, and Vercel Blob file uploads.",
    match: (f) => /^(lib\/blob\.ts|app\/api\/(blob|documents|share|invitations|notifications|assets|auth)|proxy\.ts)/.test(f),
    files: [],
  },
  {
    category: "15. Local-First Storage Engine, IndexedDB & Migration Layer",
    description: "Dual-tier local persistence (IndexedDB and localStorage drawer), JSON document exporter/importer, and clipboard data serialization.",
    match: (f) => /^(lib\/(files|file-io|clipboard|clipboard-payload|export-image)\.ts|lib\/storage\/(db|documents|migration)\.ts)/.test(f),
    files: [],
  },
  {
    category: "16. Security, Cryptography, Token Management & Sanitization",
    description: "SVG input sanitization (script/event neutralization), cryptographic token hashing, password verification, and session security.",
    match: (f) => /^lib\/security\//.test(f),
    files: [],
  },
  {
    category: "17. Component Library Registry & Wireframe Definitions",
    description: "Component registry, break-apart engine, authoring protocols, and pre-built definitions for basic UI, display, navigation, app blocks, marketing blocks, templates, and study blocks.",
    match: (f) => /^lib\/library\//.test(f),
    files: [],
  },
  {
    category: "18. Academic & Calendar Study Engine",
    description: "Comprehensive study suite & interactive calendar engine: pure date math, overlap lane clustering, event CRUD, Month/Week views, syllabus progress, revision, test simulator, and IndexedDB persistence.",
    match: (f) => /^(lib\/academic\/|lib\/calendar\/|components\/calendar\/|lib\/storage\/academic-db\.ts)/.test(f),
    files: [],
  },
  {
    category: "19. PWA Offline Service Worker & Install Flow",
    description: "Service Worker lifecycle, offline caching strategy, and progressive web application installation prompts.",
    match: (f) => /^(public\/sw\.js|components\/pwa\/|lib\/pwa\/)/.test(f),
    files: [],
  },
  {
    category: "20. Build Scripts, Asset Generators & Offline Test Suite",
    description: "Offline TypeScript unit test suite (geometry, selection, clipboard, text reflow, security, academic DB, LAN), asset generators, and development gateway.",
    match: (f) => /^scripts\//.test(f),
    files: [],
  },
  {
    category: "21. Product & UX Specifications",
    description: "Formal UX and interaction specifications for multi-selection, marquee XOR, dragging, modifiers, and transforms.",
    match: (f) => /^docs\//.test(f),
    files: [],
  },
]

function walkDir(dir) {
  let res = []
  for (const item of readdirSync(dir)) {
    if (["node_modules", ".git", ".next", "mouse", ".claude", ".gemini", ".vscode", ".agents"].includes(item)) continue
    if (["CODEBASE_SNAPSHOT.md", "tsconfig.tsbuildinfo", "eslint-debug.log", "build-debug.log"].includes(item)) continue
    const full = join(dir, item)
    const st = statSync(full)
    if (st.isDirectory()) {
      res = res.concat(walkDir(full))
    } else {
      const rel = relative(ROOT, full).split(sep).join("/")
      if (!/\.(cur|png|ico|jpg|yaml|tsbuildinfo|log)$/i.test(rel)) {
        res.push(rel)
      }
    }
  }
  return res
}

// Discover and assign all source files
const allFiles = walkDir(ROOT).sort()
const unassigned = []

for (const file of allFiles) {
  let matched = false
  for (const cat of FILE_CATEGORIES) {
    if (cat.match(file)) {
      cat.files.push(file)
      matched = true
      break
    }
  }
  if (!matched) {
    unassigned.push(file)
  }
}

if (unassigned.length > 0) {
  console.warn("Unassigned files discovered:", unassigned)
  FILE_CATEGORIES.push({
    category: "22. Additional Discovered Source Files",
    description: "Supplementary project source files discovered in the workspace.",
    match: () => false,
    files: unassigned,
  })
}

function getCodeFenceLanguage(filePath) {
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "tsx"
    case ".js":
    case ".mjs":
      return "javascript"
    case ".json":
      return "json"
    case ".css":
      return "css"
    case ".svg":
      return "xml"
    case ".sql":
      return "sql"
    case ".md":
      return "markdown"
    default:
      return ""
  }
}

function buildArchitecturalDossier() {
  return `# Zenithsui: The Complete Architecture Dossier & Verbatim Source Codebase

> **AI Master Note**: This document is the ultimate, unabridged knowledge repository and verbatim source code snapshot of **Zenithsui** (formerly codenamed squig). Any AI language model reading this single document possesses full context, absolute architectural understanding, mathematical clarity, and exact source code access to debug, extend, refactor, or reproduce the entire project with zero ambiguity.

---

# Table of Contents

1. [PART 1: THE GOD-LEVEL ARCHITECTURAL DOSSIER](#part-1-the-god-level-architectural-dossier)
   - [1. Executive Synopsis & Core Philosophy](#1-executive-synopsis--core-philosophy)
   - [2. Multi-Tier System Topology & Data Flow](#2-multi-tier-system-topology--data-flow)
   - [3. Complete Unified Data Model & Invariants](#3-complete-unified-data-model--invariants)
   - [4. Geometry, Coordinate Spaces & Math Engine](#4-geometry-coordinate-spaces--math-engine)
   - [5. Rough.js Hand-Drawn Rendering Pipeline](#5-roughjs-hand-drawn-rendering-pipeline)
   - [6. Automatic Wi-Fi LAN Sync & Peer Session Mesh](#6-automatic-wi-fi-lan-sync--peer-session-mesh)
   - [7. Supabase Cloud Sync Engine & Database Architecture](#7-supabase-cloud-sync-engine--database-architecture)
   - [8. Vercel Deployment & Media Storage Architecture](#8-vercel-deployment--media-storage-architecture)
   - [9. Chrome Shell, Canvas Document Lifecycle & "Files" Popover](#9-chrome-shell-canvas-document-lifecycle--files-popover)
   - [10. Custom macOS-Inspired Cursor Engine & Spatial Interactions](#10-custom-macos-inspired-cursor-engine--spatial-interactions)
   - [11. Component Library Architecture & Authoring Protocol](#11-component-library-architecture--authoring-protocol)
   - [12. Canvas Gestures & Interaction State Machine](#12-canvas-gestures--interaction-state-machine)
   - [13. Academic & Classroom Study Engine](#13-academic--classroom-study-engine)
   - [14. Dual-Tier Storage (IndexedDB + LocalStorage) & Clipboard Protocols](#14-dual-tier-storage-indexeddb--localstorage--clipboard-protocols)
   - [15. Security, Token Cryptography & Input Sanitization](#15-security-token-cryptography--input-sanitization)
   - [16. The 10 Commandments / Invariants for Modifying Zenithsui](#16-the-10-commandments--invariants-for-modifying-zenithsui)
   - [17. Step-by-Step Implementation Recipes for Common Extensions](#17-step-by-step-implementation-recipes-for-common-extensions)
   - [18. Master File Index, Metrics & Complete Dependency Graph](#18-master-file-index-metrics--complete-dependency-graph)
2. [PART 2: COMPLETE VERBATIM SOURCE CODE DIRECTORY](#part-2-complete-verbatim-source-code-directory)
${FILE_CATEGORIES.map((cat, idx) => `   - [Category ${idx + 1}: ${cat.category.replace(/^\d+\.\s*/, "")}](#category-${idx + 1}-${cat.category.replace(/^\d+\.\s*/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")})`).join("\n")}
   - [Binary & Generated Assets Reference](#binary--generated-assets-reference)

---

# PART 1: THE GOD-LEVEL ARCHITECTURAL DOSSIER

## 1. Executive Synopsis & Core Philosophy

### What is Zenithsui?
**Zenithsui** is a local-first, infinite-canvas wireframing, prototyping, and study workspace built with Next.js 16 (React 19), Tailwind CSS v4, Zustand 5, Rough.js 4, and @base-ui/react. It produces hand-drawn, sketch-aesthetic UI wireframes inspired by early-web risograph prints, Excalidraw, FigJam, and tldraw, combined with seamless local-first collaboration, automatic Wi-Fi sync, and cloud synchronization.

### Core Philosophy
1. **Refined Hand-Drawn Aesthetic**: The visual output feels like an architect's or designer's notebook rather than a cartoon napkin. Corners meet crisply, lines possess subtle, restrained organic jitter, and icons remain sharp vector paths.
2. **The Single-Ink Pen Model**: Every line on the canvas is drawn with one single ink color (\`--sq-ink\`). There are no multi-colored strokes. Visual hierarchy is achieved exclusively through **pen pressure** (\`ink\`: full stroke, \`muted\`: regular, \`faint\`: hairline) and **two-tone shaded fills** (\`shade\` for inert backgrounds, \`shadeStrong\` for focal points, \`paper\` for occlusion).
3. **Zero-Latency Local-First, Zero-Backend Reliance**: The canvas operates 100% offline out-of-the-box. Changes write instantly to IndexedDB with localStorage fallback. Startup is instantaneous with zero spinners or cloud blockers.
4. **Flat Document Hierarchy**: To preserve instant dragging, group operations, undo/redo diffing, and zero-overhead serialization, the canvas contains a flat dictionary of nodes (\`Record<string, SquigNode>\`) and a z-order array (\`order: string[]\`). Nesting and grouping are stamped via \`groupIds: string[]\` arrays on individual nodes rather than deep recursive DOM trees.
5. **Deterministic Seeds**: Every node holds an immutable numerical \`seed\`. Rough.js uses this seed to compute path coordinates. Re-renders never cause "swimming" or jittering lines; the sketch remains stable across viewports, zooms, and page reloads until intentionally modified.
6. **Zero-Config Wi-Fi Sync**: Devices on the same Wi-Fi network or IP subnet automatically discover and sync the active canvas without manual room codes or user registration.

---

## 2. Multi-Tier System Topology & Data Flow

Zenithsui is architected as a resilient 5-tier system ensuring zero single points of failure:

\`\`\`mermaid
flowchart TD
    subgraph Tier1["Tier 1: Browser UI & Direct Manipulation"]
        Pointer["Pointer / Touch / Pen Events"]
        Keyboard["Keyboard Shortcuts (Cmd+K, Del, Space)"]
        CanvasView["Infinite Canvas Viewport (components/canvas)"]
        Chrome["UI Chrome (Files Popover, Inspector, Rail, Dock)"]
    end

    subgraph Tier2["Tier 2: Client State & Offline Storage"]
        Zustand["Zustand Store (useSquig, useShellStore)"]
        IndexedDB["IndexedDB Engine (lib/storage/db.ts)"]
        LocalStorage["LocalStorage File Drawer (lib/files.ts)"]
    end

    subgraph Tier3["Tier 3: Local Network (LAN) Peer Mesh"]
        SubnetSync["Auto Wi-Fi Sync (app/api/wifi-sync)"]
        WebRTC["WebRTC DataChannel Peer Mesh (lib/lan)"]
    end

    subgraph Tier4["Tier 4: Supabase Realtime Cloud"]
        Postgres["PostgreSQL Database (Supabase)"]
        Realtime["Realtime Engine (Broadcast & Presence)"]
        RLS["Row Level Security & Permissions"]
    end

    subgraph Tier5["Tier 5: Vercel Edge Serverless & Blob Storage"]
        VercelEdge["Next.js App Router API Routes"]
        VercelBlob["Vercel Blob Media Store (@vercel/blob)"]
    end

    Pointer --> CanvasView
    Keyboard --> CanvasView
    Chrome --> Zustand
    CanvasView --> Zustand

    Zustand <--> IndexedDB
    IndexedDB <--> LocalStorage

    Zustand <--> SubnetSync
    SubnetSync <--> WebRTC

    Zustand <--> Postgres
    Postgres <--> Realtime
    Postgres <--> RLS

    CanvasView --> VercelEdge
    VercelEdge --> VercelBlob
\`\`\`

---

## 3. Complete Unified Data Model & Invariants

### BaseNode & Concrete Canvas Nodes (\`lib/types.ts\`)
Every canvas element inherits from \`BaseNode\`:

\`\`\`ts
export interface BaseNode {
  id: string              // Unique nanoid identifier
  x: number               // World coordinate X
  y: number               // World coordinate Y
  w: number               // Width in world units (>= 8)
  h: number               // Height in world units (>= 8)
  seed: number            // Integer seed for deterministic Rough.js wobbles
  groupIds?: string[]     // Outermost group first: [grandparent, parent]
  flipX?: boolean         // Mirrored horizontally along its own box
  flipY?: boolean         // Mirrored vertically along its own box
}
\`\`\`

Concrete node types:
1. **\`ComponentNode\`**: Instances of library items (buttons, navbars, cards, tables, dashboard widgets).
   - \`type: "component"\`
   - \`kind: string\` (e.g. \`"button"\`, \`"card"\`, \`"pricing"\`)
   - \`props: Record<string, unknown>\` (variant properties matching registry controls)
2. **\`ShapeNode\`**: Geometric shapes.
   - \`type: "shape"\`
   - \`shape: "rect" | "ellipse"\`
   - \`fill: "none" | "paper" | "light" | "strong"\`
   - \`stroke?: "light" | "regular" | "heavy"\`
   - \`dashed?: boolean\`
3. **\`DrawNode\`**: Freehand pencil strokes.
   - \`type: "draw"\`
   - \`points: [number, number][]\` (relative to node origin: 0..w, 0..h)
   - \`stroke?: StrokeWeight\`
   - \`dashed?: boolean\`
4. **\`TextNode\`**: Live typography layers.
   - \`type: "text"\`
   - \`text: string\`
   - \`fontSize: number\`
   - \`fixedW?: boolean\` (false = auto-hugs words; true = wraps at width \`w\`)
   - \`align?: "left" | "center" | "right"\`
   - \`bold?: boolean\`, \`italic?: boolean\`, \`underline?: boolean\`
   - \`link?: string\` (URL or page reference)
5. **\`ArrowNode\`**: Straight lines and directed arrows.
   - \`type: "arrow"\`
   - \`points: [[number, number], [number, number]]\` (start and end relative to x,y)
   - \`head: boolean\` (true = arrow with hand-drawn head; false = plain line)
6. **\`ImageNode\`**: Pasted bitmap images taped to the napkin.
   - \`type: "image"\`
   - \`src: string\` (data:image/... or Vercel Blob URL)
   - \`naturalW: number\`, \`naturalH: number\`
   - \`name?: string\`

### Document State Model
\`\`\`ts
export interface SquigDoc {
  fileName: string
  nodes: Record<string, SquigNode>
  order: string[]         // Z-index list from bottom-most (index 0) to top-most
}
\`\`\`

### Aesthetic & Theme Model (\`lib/theme.ts\`)
\`\`\`ts
export type ThemeName = "sketch-black" | "felt-gray" | "drafting-ink" | "blueprint-navy" | "internet-blue" | "notebook-crimson" | "lead-pencil"
export type PaperShade = "white" | "parchment" | "dim" | "dark"
export type FontMode = "sans" | "hand" | "mono"

export interface Look {
  theme: ThemeName
  paper: PaperShade
  font: FontMode
  grid: boolean
}
\`\`\`

---

## 4. Geometry, Coordinate Spaces & Math Engine

### Coordinate Systems & Projections
- **Screen Space (\`sx, sy\`)\**: Client pixel coordinates relative to the canvas container element bounding rect (\`containerRef.getBoundingClientRect()\`).
- **World Space (\`wx, wy\`)\**: The infinite 2D plane coordinate system where all node \`x, y, w, h\` positions and vector coordinates live.
- **Conversion Equations**:
  $$\\text{wx} = \\frac{\\text{sx} - \\text{viewport.x}}{\\text{viewport.zoom}}$$
  $$\\text{wy} = \\frac{\\text{sy} - \\text{viewport.y}}{\\text{viewport.zoom}}$$
  $$\\text{sx} = \\text{wx} \\times \\text{viewport.zoom} + \\text{viewport.x}$$
  $$\\text{sy} = \\text{wy} \\times \\text{viewport.zoom} + \\text{viewport.y}$$

### Hit Testing Algorithms (\`lib/canvas/hit-test.ts\`)
1. **Dynamic Tolerance Collar**:
   - Touch/click tolerance collar in screen pixels: \`SLOP_PX = 8px\`.
   - Scaled to world units: \`tolerance = min(8 / zoom, 14)\`.
   - Clamped to hollow shape margins: For hollow areas, tolerance is capped at \`0.35 * min(w, h)\` to guarantee that the core of an empty rectangle remains hollow.
2. **Hollow vs. Filled Shape Hit Logic**:
   - A shape with \`fill === "none"\` is only hit if the pointer is within \`tolerance\` of its 4 perimeter segments (or ellipse boundary). The center is transparent.
   - A shape with a solid or shaded fill (\`fill !== "none"\`) is hit anywhere inside its interior bounds.
3. **Line, Arrow, and Draw Stroke Distance**:
   - Point-to-segment distance using vector projection:
     $$t = \\text{clamp}\\left(0, 1, \\frac{(\\vec{p} - \\vec{a}) \\cdot (\\vec{b} - \\vec{a})}{\\|\\vec{b} - \\vec{a}\\|^2}\\right)$$
     $$\\text{dist} = \\|\\vec{p} - (\\vec{a} + t(\\vec{b} - \\vec{a}))\\|$$
   - Hit if $\\text{dist} \\le \\text{tolerance}$.
4. **Marquee Collision (Liang-Barsky Line Clipping)**:
   - Marquee uses **intersection** (touching), not containment.
   - For linear elements (arrows, freehand draw strokes), Zenithsui uses the Liang-Barsky parametric line clipping algorithm against the padded marquee rectangle \`segmentNearRect()\`.

### Smart Guides & Snapping Engine (\`lib/canvas/snap-engine.ts\`)
- Calculations run in **screen space** so snapping feels consistently magnetic (6px threshold) regardless of canvas zoom level.
- **6-Point Alignment**: Left edge, Center ($x + w/2$), Right edge ($x + w$), Top edge, Middle ($y + h/2$), Bottom edge ($y + h$).
- **Equidistant Distribution Snapping**: Detects matching gaps between consecutively aligned elements and snaps dragging elements accordingly.
- **Escape Hatch**: Holding \`Cmd\` (Mac) or \`Ctrl\` (Windows/Linux) during move or resize disables snapping instantly.

### Bounding Box Transforms (\`lib/canvas/transform.ts\`)
- **8 Handles**: \`["nw", "n", "ne", "e", "se", "s", "sw", "w"]\`.
- **Gesture Anchoring**: All transforms compute strictly from the snapshot taken at pointer-down (\`origBounds\`, \`origNodes\`), preventing floating-point drift.
- **Aspect Ratio Locking (Shift)**: Corner handles scale uniformly based on the larger delta axis. Side handles scale perpendicular axes symmetrically.
- **Center-Origin Scaling (Alt)**: Opposing edges mirror the dragged edge symmetrically around center $(cx, cy)$.
- **Clamping Rule**: Minimum bounding box dimension is locked to $8 \\times 8\\text{px}$ (\`MIN_SIZE = 8\`). It **never flips** (no negative scale).

---

## 5. Rough.js Hand-Drawn Rendering Pipeline

### House Drawing Defaults (\`HAND\` in \`lib/sketch/kit.ts\`)
\`\`\`ts
export const HAND = {
  roughness: 0.25,      // Restrained organic wobble
  bowing: 0.35,         // Subtle arc on straight lines
  strokeWidth: 1.4,     // Standard baseline pen width
  radius: 3,            // Default corner rounding on rectangles
}
\`\`\`

### The Pen Pressure Model (\`PEN\`)
All strokes use the document theme ink: \`var(--sq-ink)\`.
- \`"ink"\`: Full stroke ($1.0 \\times \\text{strokeWidth}$)
- \`"muted"\`: Regular stroke ($0.8 \\times \\text{strokeWidth}$)
- \`"faint"\`: Hairline stroke ($0.62 \\times \\text{strokeWidth}$)

### The Tonal Ladder (\`SHADE\`)
- \`"none"\`: Transparent fill.
- \`"paper"\`: Fully opaque background color (\`var(--sq-paper)\`) used to occlude items underneath.
- \`"shade"\`: Soft tinted wash (\`var(--sq-shade)\`) for placeholders, tracks, alternating table rows.
- \`"shadeStrong"\`: Darker tinted wash (\`var(--sq-shade-strong)\`) for primary buttons, active chips, chart bars.

### Seed Determinism & Phosphor Icons
- Every node stores an integer \`seed\`. Rough.js uses this seed to compute path coordinates identically on every frame.
- Phosphor icons are baked into raw SVG path strings (\`lib/sketch/phosphor-paths.ts\`) and rendered crisp (bypassing Rough.js) so symbols remain readable at small sizes.

---

## 6. Automatic Wi-Fi LAN Sync & Peer Session Mesh

Zenithsui includes a zero-config, automatic Wi-Fi sync subsystem (\`app/api/wifi-sync/route.ts\`, \`lib/lan/auto-sync.ts\`, \`lib/lan/session.ts\`):

1. **Subnet IP Hash Detection**:
   When a device opens Zenithsui, the client connects to \`/api/wifi-sync\`. The server inspects the connecting IP address from \`x-forwarded-for\` or socket headers. If on a local private subnet (\`192.168.x.x\`, \`10.x.x.x\`, \`172.16-31.x.x\`), it groups devices under a subnet key.
2. **Dual-Tier State Synchronization**:
   - **Tier 1 (Instant Memory Cache)**: An in-memory cache with sliding TTL provides instant push/pull synchronization with sub-50ms latency across devices on the same Wi-Fi network.
   - **Tier 2 (Supabase Persistence Fallback)**: The session state is concurrently backed up to the \`wifi_canvas_sessions\` table in Supabase, surviving serverless cold starts and worker cycling.
3. **WebRTC Peer Data Channels**:
   When devices establish direct peer-to-peer connections, state synchronization transitions to zero-latency WebRTC DataChannels (\`lib/lan/transport.ts\`), enabling real-time multi-cursor collaboration on the local network.

---

## 7. Supabase Cloud Sync Engine & Database Architecture

Zenithsui integrates Supabase with \`@supabase/ssr\` for cloud workspaces and sharing:

### Database Tables & Schema
- **\`workspaces\`**: Organizational tenants with owner UUID and name.
- **\`documents\`**: Canvas documents storing nodes JSON, order array, look, revision, and updated timestamp.
- **\`share_links\`**: Public and password-protected share tokens with permissions (\`viewer\` vs \`editor\`).
- **\`wifi_canvas_sessions\`**: Network subnet cache storing real-time Wi-Fi canvas sessions.
- **Academic Tables**: Syllabus goals, revision schedule, practice questions, and exam attempts.

### Cloud Sync Engine (\`lib/sync/engine.ts\`, \`lib/sync/queue.ts\`)
- **Offline Mutation Queue**: Local changes append to an IndexedDB mutation queue.
- **Optimistic Updates**: Canvas reflects changes with 0ms delay.
- **Last-Write-Wins (LWW) & 3-Way Conflict Resolution**: Detects stale revisions, prompting users with a side-by-side visual diff dialog (\`components/chrome/conflict-dialog.tsx\`) if conflicts occur.
- **Row-Level Security (RLS)**: Enforces strict tenant boundaries; viewers cannot mutate documents.

---

## 8. Vercel Deployment & Media Storage Architecture

### Vercel Blob Integration (\`@vercel/blob\`, \`lib/blob.ts\`, \`app/api/blob/upload/route.ts\`)
- When users paste or drop images onto the canvas, the application uploads the image payload via \`@vercel/blob\` using \`BLOB_READ_WRITE_TOKEN\`.
- Images are stored with public read access and referenced directly by \`ImageNode.src\`.

### Production Deployment & Build Configurations
- **Node Engine Pinning**: Pinned in \`package.json\` to \`"20.x || 22.x || 24.x"\` to prevent automatic build failures on future Node updates.
- **PNPM Build Script Approval**: Configured with \`"pnpm": { "onlyBuiltDependencies": ["sharp"] }\` ensuring sharp builds cleanly in Vercel CI.
- **Environment Secrets**:
  - \`NEXT_PUBLIC_SUPABASE_URL\`
  - \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`
  - \`SUPABASE_SECRET_KEY\`
  - \`BLOB_STORE_ID\`
  - \`BLOB_READ_WRITE_TOKEN\`

---

## 9. Chrome Shell, Canvas Document Lifecycle & "Files" Popover

### "Files" Popover (\`components/chrome/files-popover.tsx\`)
Replaces legacy static badges with an interactive document manager:
- Lists all local and cloud canvases with relative timestamps ("2m ago", "1h ago").
- Provides instant "New Canvas" creation.
- Enables single-click canvas switching with lossless auto-save.
- Supports document renaming and deletion with confirmation.

### Top Bar & Bottom Dock Navigation
- **Top Bar (\`components/shell/top-bar.tsx\`)\**: Clean, uncluttered layout featuring document title, Files popover, undo/redo, zoom controls, and zen mode toggle.
- **Bottom Dock (\`components/shell/bottom-dock.tsx\`)\**: Ergonomic tool dock providing quick switching between Select, Shape, Pencil, Text, Arrow, and Library panels.

---

## 10. Custom macOS-Inspired Cursor Engine & Spatial Interactions

Zenithsui features an authentic macOS Sierra/modern cursor system (\`app/cursors.css\`, \`public/cursors/\`):
- High-DPI \`.cur\` cursors with high-fidelity PNG fallbacks.
- Precise hotspot alignments (e.g. \`crosshair 16 16\`, \`pointer 6 1\`, \`grab 16 16\`, \`text 16 16\`).
- Canvas handles map dynamically:
  - North/South handles: \`ns-resize\`
  - East/West handles: \`ew-resize\`
  - Northwest/Southeast handles: \`nwse-resize\`
  - Northeast/Southwest handles: \`nesw-resize\`
  - Creation & pencil tools: \`crosshair\`
  - Spacebar panning: \`grab\` / \`grabbing\`

---

## 11. Component Library Architecture & Authoring Protocol

Every prefabricated wireframe component is declared as a \`ComponentDef\` in \`lib/library/\`:

\`\`\`ts
export interface ComponentDef {
  kind: string                          // Unique kebab-case slug (e.g. "button", "pricing")
  name: string                          // Display title in library panel
  category: "components" | "blocks"     // High-level grouping
  group?: string                        // Sub-header (e.g. "Buttons", "Marketing", "Forms")
  keywords?: string[]                   // Search tags for palette
  size: { w: number; h: number }        // Default drag-and-drop dimensions
  defaults: Record<string, unknown>     // Default prop values
  controls: ControlDef[]                // Inspector knobs (text, select, toggle, number)
  render: (props: Props, w: number, h: number) => Prim[]
}
\`\`\`

### The Sketch Primitive DSL (\`@/lib/sketch/kit\`)
The \`render()\` function emits an array of vector primitives:
- \`rect(x, y, w, h, { r, fill, fillColor, stroke, dashed, shadow })\`
- \`pill(x, y, w, h, opts)\`: Rectangle with fully rounded ends. **Always use for chips, badges, and tabs (never ellipse!)**.
- \`ellipse(x, y, w, h, opts)\`: Circle/oval bounding box. Use for avatars, radio buttons, dots.
- \`line(x1, y1, x2, y2, opts)\`: Straight line.
- \`poly([[x, y], ...], close, opts)\`: Polygon.
- \`text(x, y, "label", size, { align, color, bold })\`: Text run (y is baseline).
- \`icon("user", cx, cy, size, opts)\`: Phosphor icon centered at cx, cy.
- \`loremLines(x, y, w, count, gap)\`: Hand-drawn placeholder copy lines.

### Break-Apart Engine (\`lib/library/break-apart.ts\`)
Explodes composite library components into raw standalone canvas nodes (\`ShapeNode\`, \`TextNode\`, \`ArrowNode\`) grouped together.

---

## 12. Canvas Gestures & Interaction State Machine

### Gesture Lifecycle
1. **Pointer Down**: Hit tests coordinates in world space. Captures modifier keys (\`Shift\`, \`Alt\`, \`Cmd/Ctrl\`). Takes an undo checkpoint.
2. **Threshold Latching**: Once pointer exceeds $3\\text{px}$ from origin (\`DRAG_THRESHOLD = 3\`), \`exceeded = true\` latches permanently.
3. **Auto-Panning rAF Loop**: When pointer moves within $40\\text{px}$ of the screen viewport boundary (\`AUTOPAN_EDGE = 40\`), an autonomous loop pans the viewport at up to $22\\text{px/frame}$.
4. **Pointer Up / Completion**: Commits state to Zustand and IndexedDB.

### Multi-Selection Math
- **Click**: Selects single node.
- **Shift+Click / Cmd+Click**: Toggles node in/out of current selection.
- **Marquee Drag**: Shift/Cmd drag performs symmetric difference (**XOR**) against initial selection.
- **Alt+Drag**: Duplicates selected nodes immediately and drags the copies; originals stay in place.
- **Shift+Drag during Move**: Constrains motion to horizontal or vertical axis (axis-lock).

---

## 13. Academic & Classroom Study Engine

Zenithsui includes an integrated academic and study workspace (\`lib/academic/\`, \`lib/library/defs-study.ts\`, \`lib/storage/academic-db.ts\`):
- **Syllabus Progress Tracking**: Hierarchical subjects, chapters, and topics with completion percentages and target goal dates.
- **Spaced Repetition Algorithm**: SuperMemo SM-2 variation computing optimal review intervals for flashcards and topic reviews.
- **Practice & Exam Simulator**: Timed mock tests with multiple-choice questions, scoring, and mistake log analysis.
- **Study Primitives**: Wireframe blocks for Cornell notes, flashcards, formula sheets, weekly study schedules, and pomodoro timers.
- **IndexedDB Persistence**: Dedicated IndexedDB store (\`academic-db.ts\`) preserving student progress completely offline.

---

## 14. Dual-Tier Storage (IndexedDB + LocalStorage) & Clipboard Protocols

### Storage Architecture (\`lib/storage/db.ts\`, \`lib/storage/migration.ts\`)
- **Primary Tier**: IndexedDB database \`zenithsui_local_db\` with object stores for documents, revisions, and study records.
- **Fallback Tier**: LocalStorage file drawer (\`zenithsui:files:v1\`, \`zenithsui:file:\${id}\`).
- **Migration Engine**: Seamlessly migrates legacy localStorage files to IndexedDB upon startup without data loss.

### Clipboard Protocol (\`lib/clipboard.ts\`, \`lib/clipboard-payload.ts\`)
- **Dual-Carrier System**:
  - \`text/html\`: Encodes lossless JSON payload in custom data attribute: \`<div data-zenithsui="URI_ENCODED_JSON"></div>\`.
  - \`text/plain\`: Plain text of included text nodes or fallback JSON.
- **Sanitization Gate**: Validates incoming clipboard geometry, bounds, and image URLs.

---

## 15. Security, Token Cryptography & Input Sanitization

1. **SVG Input Sanitization (\`lib/security/sanitize.ts\`)\**: Strips \`<script>\`, \`<iframe>\`, \`<foreignObject>\`, and event attributes (\`onload\`, \`onerror\`, \`onclick\`).
2. **Sharing Tokens & Password Hashes (\`lib/security/share-crypto.ts\`)\**: Uses Web Crypto SHA-256 for password verification and cryptographically secure token generation.
3. **Environment Security**: Strict separation of public keys (\`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`) from server secrets (\`SUPABASE_SECRET_KEY\`, \`BLOB_READ_WRITE_TOKEN\`).

---

## 16. The 10 Commandments / Invariants for Modifying Zenithsui

1. **NEVER Mutate Nodes Directly**: Always use \`useSquig.getState().updateNode(id, patch)\` or \`updateNodes(patches)\`.
2. **Preserve Seed Stability**: Never re-roll \`node.seed\` during drag, resize, restyle, or font change. Only generate new seeds on instantiation or duplication.
3. **Anchor All Gestures in World Space**: Always record \`screenToWorld(viewport, sx, sy)\` at pointer-down and compute subsequent frames from original anchors.
4. **Enforce Strictly Finite Geometry**: Wrap width and height with \`Math.max(MIN_SIZE, ...)\`. Never permit \`NaN\`, \`Infinity\`, or negative dimensions.
5. **Keep Library \`render()\` Pure**: A component's \`render(props, w, h)\` must depend strictly on its arguments and never query DOM or state.
6. **Use \`pill()\` for Rounded Badges/Chips**: Never use \`ellipse()\` for elongated elements.
7. **Adhere to the Three-Tone Ink Model**: Styling is monochrome ink with \`"none"\`, \`"paper"\`, \`"shade"\`, or \`"shadeStrong"\`.
8. **Check Keyboard Ownership**: Before responding to global single-key shortcuts, verify \`canvasOwnsKeyboard()\`.
9. **Maintain Flat Grouping**: Do not transform \`nodes\` into a nested tree. Grouping is an array stamp \`groupIds: string[]\` on flat nodes.
10. **Align Text by Baseline**: In custom components, compute text baseline as \`y = h / 2 + size * 0.35\` when centering vertically.

---

## 17. Step-by-Step Implementation Recipes for Common Extensions

### Recipe A: Adding a New Wireframe Component
1. Add a \`ComponentDef\` in \`lib/library/defs-*.ts\`.
2. Define defaults, inspector controls, and the \`render(props, w, h)\` function using \`@/lib/sketch/kit\`.
3. Register the definition in \`lib/library/registry.ts\`.

### Recipe B: Adding a Custom Inspector Control
1. In \`components/chrome/inspector.tsx\`, retrieve selected nodes via \`useSquig((s) => s.selection)\`.
2. Extract common property values or detect mixed states with \`components/chrome/mixed-fields.tsx\`.
3. Render a control from \`components/ui/\` and dispatch updates via \`updateNodes(patches)\`.

### Recipe C: Registering a Global Keyboard Shortcut
1. Define key string and display representation in \`lib/shortcuts.ts\`.
2. In \`components/canvas/canvas.tsx\` (inside \`onKeyDown\`), guard with \`if (!canvasOwnsKeyboard()) return\`.
3. Dispatch the store action and document the shortcut in \`components/chrome/shortcuts-sheet.tsx\`.

### Recipe D: Adding a Cloud Sync Entity or API Route
1. Define table schema in a new SQL file under \`supabase/migrations/\`.
2. Create route handler in \`app/api/<route>/route.ts\` verifying auth via \`@/utils/supabase/server\`.
3. Update \`lib/sync/engine.ts\` to include the entity in cloud push/pull cycles.

---

## 18. Master File Index, Metrics & Complete Dependency Graph

| File Path | Lines | Bytes | Role / Description | Key Exports |
|---|---|---|---|---|
${FILE_CATEGORIES.flatMap((cat) => cat.files)
  .map((file) => {
    try {
      const full = join(ROOT, file)
      if (!existsSync(full)) return null
      const content = readFileSync(full, "utf8")
      const lines = content.split("\n").length
      const bytes = statSync(full).size
      const base = basename(file)
      return `| \`${file}\` | ${lines} | ${bytes} | Core ${base} module | \`${base.replace(/\.[^.]+$/, "")}\` |`
    } catch {
      return null
    }
  })
  .filter(Boolean)
  .join("\n")}

---

`
}

function generateFullDocument() {
  console.log("Building Architectural Dossier...")
  let doc = buildArchitecturalDossier()

  doc += `# PART 2: COMPLETE VERBATIM SOURCE CODE DIRECTORY\n\n`
  doc += `> Every single source file in the Zenithsui repository is included below in full, unedited, verbatim form with exact relative file paths.\n\n`

  for (let i = 0; i < FILE_CATEGORIES.length; i++) {
    const cat = FILE_CATEGORIES[i]
    console.log(`Processing Category ${i + 1}/${FILE_CATEGORIES.length}: ${cat.category} (${cat.files.length} files)`)
    doc += `## Category ${i + 1}: ${cat.category.replace(/^\d+\.\s*/, "")}\n\n`
    doc += `*${cat.description}*\n\n`

    for (const file of cat.files) {
      const fullPath = join(ROOT, file)
      if (!existsSync(fullPath)) {
        console.warn(`File not found: ${file}`)
        continue
      }

      const st = statSync(fullPath)
      const content = readFileSync(fullPath, "utf8")
      const lines = content.split("\n").length
      const lang = getCodeFenceLanguage(file)

      doc += `### File: \`${file}\`\n\n`
      doc += `- **Path**: \`${file}\`\n`
      doc += `- **Lines**: ${lines}\n`
      doc += `- **Size**: ${st.size} bytes\n\n`
      doc += "```" + lang + "\n"
      doc += content
      if (!content.endsWith("\n")) doc += "\n"
      doc += "```\n\n---\n\n"
    }
  }

  // Binary & Generated Assets reference
  doc += `## Binary & Generated Assets Reference\n\n`
  doc += `The repository contains the following static binary assets and pre-generated package metadata:\n\n`
  doc += `1. **\`app/favicon.ico\`**:\n`
  doc += `   - Path: \`app/favicon.ico\`\n`
  doc += `   - Size: 19,220 bytes\n`
  doc += `   - Format: Windows Icon format displaying the Zenithsui hand-drawn pencil/paper logo.\n\n`
  doc += `2. **\`docs/hero.jpg\`**:\n`
  doc += `   - Path: \`docs/hero.jpg\`\n`
  doc += `   - Size: 75,077 bytes\n`
  doc += `   - Format: JPEG showcase image displaying the Zenithsui infinite canvas and hand-drawn wireframes.\n\n`
  doc += `3. **\`pnpm-lock.yaml\`**:\n`
  doc += `   - Path: \`pnpm-lock.yaml\`\n`
  doc += `   - Size: 197,187 bytes (6,037 lines)\n`
  doc += `   - Format: PNPM Lockfile v9 (pnpm 10.4.1), pinning the complete dependency graph.\n\n`
  doc += `4. **High-DPI Custom Cursor Pack (\`public/cursors/\`)**:\n`
  doc += `   - \`crosshair.cur\` / \`crosshair.png\`: Precision crosshair for node creation and drawing.\n`
  doc += `   - \`grab.cur\` / \`grab.png\`: Open hand for canvas panning.\n`
  doc += `   - \`grabbing.cur\` / \`grabbing.png\`: Closed hand for active panning.\n`
  doc += `   - \`nwse-resize.cur\` / \`nwse-resize.png\`: Northwest-to-Southeast diagonal resize handle.\n`
  doc += `   - \`nesw-resize.cur\` / \`nesw-resize.png\`: Northeast-to-Southwest diagonal resize handle.\n`
  doc += `   - \`ns-resize.cur\` / \`ns-resize.png\`: North-to-South vertical resize handle.\n`
  doc += `   - \`ew-resize.cur\` / \`ew-resize.png\`: East-to-West horizontal resize handle.\n`
  doc += `   - \`pointer.cur\` / \`pointer.png\`: Clean pointer for interactive buttons and links.\n`
  doc += `   - \`pen.cur\` / \`pen.png\`: Pencil cursor for freehand sketching.\n`
  doc += `   - \`text.png\`: I-beam cursor for inline text editing.\n`
  doc += `   - \`not-allowed.cur\` / \`not-allowed.png\`: Prohibited action cursor.\n`
  doc += `   - \`move.png\`, \`help.png\`, \`zoom-in.png\`, \`zoom-out.png\`: Secondary utility cursors.\n\n`

  const targetPath = join(ROOT, "CODEBASE_SNAPSHOT.md")
  console.log(`Writing master snapshot to ${targetPath}...`)
  writeFileSync(targetPath, doc, "utf8")
  console.log(`Successfully generated CODEBASE_SNAPSHOT.md! Size: ${doc.length} characters across ${FILE_CATEGORIES.reduce((acc, c) => acc + c.files.length, 0)} files.`)
}

generateFullDocument()
