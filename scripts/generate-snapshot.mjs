import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join, relative, extname, basename } from "node:path"

const ROOT = process.cwd()

// Curated list of all source files organized into logical domains
const FILE_CATEGORIES = [
  {
    category: "1. Project Configuration & Build System",
    description: "Build settings, TypeScript compiler configuration, package dependencies, and toolchain configurations.",
    files: [
      "package.json",
      "tsconfig.json",
      "next.config.ts",
      "components.json",
      "postcss.config.mjs",
      "eslint.config.mjs",
      ".gitignore",
      ".npmrc",
      "README.md",
    ],
  },
  {
    category: "2. Next.js App Router & Application Shell",
    description: "Root layout, canvas page entry point, global CSS variables/styling, metadata images, and kitchen sink demo.",
    files: [
      "app/layout.tsx",
      "app/page.tsx",
      "app/globals.css",
      "app/kitchen-sink/page.tsx",
      "app/icon.svg",
      "app/opengraph-image.tsx",
      "app/social-image.tsx",
      "app/twitter-image.tsx",
    ],
  },
  {
    category: "3. Core Application State, Document Model & File Storage",
    description: "Zustand state store, TypeScript types, theme engine, undo/redo history, localStorage drawer, clipboard payload, and export helpers.",
    files: [
      "lib/types.ts",
      "lib/store.ts",
      "lib/theme.ts",
      "lib/utils.ts",
      "lib/selection.ts",
      "lib/shortcuts.ts",
      "lib/files.ts",
      "lib/file-io.ts",
      "lib/clipboard.ts",
      "lib/clipboard-payload.ts",
      "lib/export-image.ts",
    ],
  },
  {
    category: "4. Canvas Geometry, Hit Testing, Snapping & Transforms",
    description: "Pure math engines for hit detection, screen-space smart guides/snapping, bounding box transforms, text measurement, duplicate tracking, and event ownership.",
    files: [
      "lib/canvas/hit-test.ts",
      "lib/canvas/snap-engine.ts",
      "lib/canvas/transform.ts",
      "lib/canvas/text-metrics.ts",
      "lib/canvas/text-reflow.ts",
      "lib/canvas/edit-target.ts",
      "lib/canvas/duplicate.ts",
      "lib/canvas/keyboard-owner.ts",
      "lib/canvas/use-clipboard.ts",
      "lib/canvas/use-spacebar-pan.ts",
    ],
  },
  {
    category: "5. Rough.js Hand-Drawn Sketch Engine & Vector Primitives",
    description: "Vector primitive DSL, Rough.js SVG path generation, seed determinism, pen weight styling, Phosphor icon path mappings, text layout, and doodle illustration.",
    files: [
      "components/canvas/sketch.tsx",
      "lib/sketch/kit.ts",
      "lib/sketch/node-prims.ts",
      "lib/sketch/icons.ts",
      "lib/sketch/text-layout.ts",
      "lib/sketch/doodle.ts",
      "lib/sketch/phosphor-paths.ts",
    ],
  },
  {
    category: "6. Interactive Canvas Components",
    description: "Infinite canvas controller (pointer events, gestures, auto-pan, overlay), floating context row, empty canvas hero, and inline text editing overlay.",
    files: [
      "components/canvas/canvas.tsx",
      "components/canvas/context-row.tsx",
      "components/canvas/empty-canvas.tsx",
      "components/canvas/text-edit-overlay.tsx",
    ],
  },
  {
    category: "7. Chrome Shell & Control Panels",
    description: "Left rail toolbar, property inspector, command palette (Cmd+K), context menus, library panel, keyboard shortcuts sheet, link editor, and file management.",
    files: [
      "components/chrome/inspector.tsx",
      "components/chrome/left-rail.tsx",
      "components/chrome/library-panel.tsx",
      "components/chrome/command-palette.tsx",
      "components/chrome/context-menu.tsx",
      "components/chrome/align-row.tsx",
      "components/chrome/file-name.tsx",
      "components/chrome/ink-picker.tsx",
      "components/chrome/link-editor.tsx",
      "components/chrome/mixed-fields.tsx",
      "components/chrome/notice.tsx",
      "components/chrome/recent-files.tsx",
      "components/chrome/shortcuts-sheet.tsx",
      "components/chrome/text-controls.tsx",
      "components/chrome/top-corner.tsx",
      "components/chrome/variant-controls.tsx",
    ],
  },
  {
    category: "8. Base UI Component Primitives",
    description: "Accessible headless UI wrappers styled with Tailwind v4 (buttons, dialogs, dropdowns, inputs, panels, selects, switches, tooltips).",
    files: [
      "components/ui/button.tsx",
      "components/ui/dropdown-menu.tsx",
      "components/ui/input.tsx",
      "components/ui/panel.tsx",
      "components/ui/scroll-area.tsx",
      "components/ui/segmented.tsx",
      "components/ui/select.tsx",
      "components/ui/switch.tsx",
      "components/ui/tooltip.tsx",
    ],
  },
  {
    category: "9. Component Library Registry & Wireframe Definitions",
    description: "The complete component library: registry, break-apart engine, authoring guide, and definitions for basic UI, display, navigation, app blocks, marketing blocks, templates, and extra components.",
    files: [
      "lib/library/registry.ts",
      "lib/library/break-apart.ts",
      "lib/library/AUTHORING.md",
      "lib/library/defs-basic.ts",
      "lib/library/defs-display.ts",
      "lib/library/defs-nav.ts",
      "lib/library/defs-extra.ts",
      "lib/library/defs-blocks-marketing.ts",
      "lib/library/defs-blocks-app.ts",
      "lib/library/defs-templates.ts",
      "lib/library/defs-more.ts",
    ],
  },
  {
    category: "10. Product & UX Specifications",
    description: "Full behavioral specifications for multi-selection, marquee XOR, dragging, modifiers, and transforms.",
    files: [
      "docs/multiselect-spec.md",
    ],
  },
  {
    category: "11. Build Scripts, Asset Generators & Test Suite",
    description: "Offline TypeScript unit tests (geometry, selection, clipboard, text reflow), ESM loaders, Phosphor icon generator, doodle path builder, and snapshot generator.",
    files: [
      "scripts/tsconfig.json",
      "scripts/register-loader.mjs",
      "scripts/loader-hooks.mjs",
      "scripts/test-geometry.ts",
      "scripts/test-selection.ts",
      "scripts/test-clipboard.ts",
      "scripts/test-text.ts",
      "scripts/gen-icons.mjs",
      "scripts/gen-doodle.mjs",
      "scripts/generate-snapshot.mjs",
      "scripts/doodle.zenithsui.json",
    ],
  },
]

function walkDir(dir) {
  let res = []
  for (const item of readdirSync(dir)) {
    if (["node_modules", ".git", ".next"].includes(item)) continue
    if (["CODEBASE_SNAPSHOT.md"].includes(item)) continue
    const full = join(dir, item)
    const rel = relative(ROOT, full).replace(/\\/g, "/")
    const st = statSync(full)
    if (st.isDirectory()) {
      res = res.concat(walkDir(full))
    } else {
      res.push(rel)
    }
  }
  return res
}

// Check for any unlisted files and auto-include them (excluding lockfiles and binary assets)
const allFiles = walkDir(ROOT)
const knownSet = new Set(FILE_CATEGORIES.flatMap((c) => c.files))
const unlisted = allFiles.filter((f) => !knownSet.has(f) && !/\.(ico|jpg|png|lock|yaml)$/i.test(f))

if (unlisted.length > 0) {
  console.log(`Found ${unlisted.length} unlisted files. Adding to Miscellaneous category:`, unlisted)
  FILE_CATEGORIES.push({
    category: "12. Miscellaneous Source Files",
    description: "Additional configuration or source files discovered in the workspace.",
    files: unlisted,
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
    case ".md":
      return "markdown"
    default:
      return ""
  }
}

function buildArchitecturalDossier() {
  return `# Zenithsui (Omniscience Edition): The Complete Architecture Dossier & Verbatim Source Codebase

> **AI Master Note**: This document is the ultimate, unabridged knowledge repository and verbatim source code snapshot of **Zenithsui** (formerly codenamed squig). Any AI language model reading this single document possesses full context, absolute architectural understanding, mathematical clarity, and exact source code access to debug, extend, refactor, or reproduce the entire project with zero ambiguity.

---

# Table of Contents

1. [PART 1: THE GOD-LEVEL ARCHITECTURAL DOSSIER](#part-1-the-god-level-architectural-dossier)
   - [1. Executive Synopsis & Core Identity](#1-executive-synopsis--core-identity)
   - [2. System Architecture & High-Level Data Flow](#2-system-architecture--high-level-data-flow)
   - [3. Complete Data Model & State Invariants](#3-complete-data-model--state-invariants)
   - [4. Geometry, Coordinate Spaces & Math Engine](#4-geometry-coordinate-spaces--math-engine)
   - [5. Rough.js Hand-Drawn Rendering Pipeline](#5-roughjs-hand-drawn-rendering-pipeline)
   - [6. Component Library Architecture & Authoring Protocol](#6-component-library-architecture--authoring-protocol)
   - [7. Canvas Gestures & Interaction State Machine](#7-canvas-gestures--interaction-state-machine)
   - [8. User Interface Chrome & Control Shell](#8-user-interface-chrome--control-shell)
   - [9. Clipboard, Storage & Export Protocols](#9-clipboard-storage--export-protocols)
   - [10. The 10 Commandments / Invariants for Modifying Zenithsui](#10-the-10-commandments--invariants-for-modifying-zenithsui)
   - [11. Step-by-Step Implementation Recipes for Common Extensions](#11-step-by-step-implementation-recipes-for-common-extensions)
   - [12. Master File Index & Dependency Graph](#12-master-file-index--dependency-graph)
2. [PART 2: COMPLETE VERBATIM SOURCE CODE DIRECTORY](#part-2-complete-verbatim-source-code-directory)
   - [Category 1: Project Configuration & Build System](#category-1-project-configuration--build-system)
   - [Category 2: Next.js App Router & Application Shell](#category-2-nextjs-app-router--application-shell)
   - [Category 3: Core Application State, Document Model & File Storage](#category-3-core-application-state-document-model--file-storage)
   - [Category 4: Canvas Geometry, Hit Testing, Snapping & Transforms](#category-4-canvas-geometry-hit-testing-snapping--transforms)
   - [Category 5: Rough.js Hand-Drawn Sketch Engine & Vector Primitives](#category-5-roughjs-hand-drawn-sketch-engine--vector-primitives)
   - [Category 6: Interactive Canvas Components](#category-6-interactive-canvas-components)
   - [Category 7: Chrome Shell & Control Panels](#category-7-chrome-shell--control-panels)
   - [Category 8: Base UI Component Primitives](#category-8-base-ui-component-primitives)
   - [Category 9: Component Library Registry & Wireframe Definitions](#category-9-component-library-registry--wireframe-definitions)
   - [Category 10: Product & UX Specifications](#category-10-product--ux-specifications)
   - [Category 11: Build Scripts, Asset Generators & Test Suite](#category-11-build-scripts-asset-generators--test-suite)
   - [Binary & Generated Assets Reference](#binary--generated-assets-reference)

---

# PART 1: THE GOD-LEVEL ARCHITECTURAL DOSSIER

## 1. Executive Synopsis & Core Identity

### What is Zenithsui?
**Zenithsui** is a local-first, infinite-canvas wireframing and prototyping application built with Next.js 16 (React 19), Tailwind CSS v4, Zustand 5, Rough.js 4, and @base-ui/react. It produces hand-drawn, sketch-aesthetic UI wireframes inspired by early-web risograph prints, Excalidraw, FigJam, and tldraw.

### Core Philosophy
1. **Refined Hand-Drawn Aesthetic**: The visual output feels like an architect's or designer's notebook rather than a cartoon napkin. Corners meet crisply, lines possess subtle, restrained organic jitter, and icons remain sharp vector paths.
2. **The Single-Ink Pen Model**: Every line on the canvas is drawn with one single ink color (e.g. \`--sq-ink\`). There are no multi-colored strokes. Visual hierarchy is achieved exclusively through **pen pressure** (\`ink\`: full stroke, \`muted\`: regular, \`faint\`: hairline) and **two-tone shaded fills** (\`shade\` for inert backgrounds, \`shadeStrong\` for focal points, \`paper\` for occlusion).
3. **Local-First, Zero Backend**: The application runs 100% in the browser. Documents are stored in \`localStorage\` as JSON with an index table ("the file drawer"). Files can be exported as standalone \`.zenithsui\` JSON files or rendered to high-resolution PNG/SVG images.
4. **Flat Document Hierarchy**: To preserve instant dragging, group operations, undo/redo diffing, and zero-overhead serialization, the canvas contains a flat dictionary of nodes (\`Record<string, SquigNode>\`) and a z-order array (\`order: string[]\`). Nesting and grouping are stamped via \`groupIds: string[]\` arrays on individual nodes rather than deep recursive DOM trees.
5. **Deterministic Seeds**: Every node holds an immutable numerical \`seed\`. Rough.js uses this seed to compute path coordinates. Re-renders never cause "swimming" or jittering lines; the sketch remains stable across viewports, zooms, and page reloads until intentionally modified.

---

## 2. System Architecture & High-Level Data Flow

\`\`\`mermaid
flowchart TD
    subgraph Browser["Browser & User Input"]
        Pointer["Pointer Events (Mouse / Pen / Touch)"]
        Keyboard["Keyboard Events (Shortcuts / Nudges / Typing)"]
        Drop["Drag & Drop / System Clipboard"]
    end

    subgraph Chrome["UI Chrome Shell"]
        LeftRail["Left Rail Toolbar (Tools & Placements)"]
        TopCorner["Top Corner Menu & Zoom Controls"]
        Inspector["Right Inspector Panel (Properties & Fonts)"]
        ContextRow["Floating Context Row (Quick Controls)"]
        CommandPalette["Command Palette (Cmd+K)"]
        ContextMenu["Context Menu (Right-Click)"]
    end

    subgraph State["Zustand Store (lib/store.ts)"]
        DocState["Document State (nodes, order, look)"]
        SelectionState["Selection State (selectedIds, primary)"]
        ViewportState["Viewport State (pan x/y, zoom)"]
        HistoryState["History Stacks (past[], future[])"]
        ClipboardBuffer["Internal Clipboard & DupTrail"]
    end

    subgraph CanvasCore["Canvas Engine (components/canvas/canvas.tsx)"]
        GestureSM["Gesture State Machine (Pan, Move, Marquee, Resize, Draw)"]
        HitTest["Hit Testing Engine (lib/canvas/hit-test.ts)"]
        SnapEngine["Snap Engine & Smart Guides (lib/canvas/snap-engine.ts)"]
        TransformEngine["Transform & Resize Math (lib/canvas/transform.ts)"]
        TextReflow["Text Measurement & Reflow (lib/canvas/text-reflow.ts)"]
    end

    subgraph Rendering["Rough.js SVG Rendering Pipeline"]
        Registry["Component Registry (lib/library/registry.ts)"]
        KitDSL["Kit Primitive DSL (lib/sketch/kit.ts)"]
        RoughGen["Rough.js Generator (components/canvas/sketch.tsx)"]
        SVGDOM["SVG Viewport DOM Nodes"]
    end

    subgraph Persistence["Storage & Export Layer"]
        LocalStorage["LocalStorage Drawer (lib/files.ts)"]
        FileIO["JSON Document Exporter/Importer (lib/file-io.ts)"]
        ImageExport["Offscreen PNG/SVG Exporter (lib/export-image.ts)"]
        SystemClip["System Clipboard Payload (lib/clipboard.ts)"]
    end

    Pointer --> GestureSM
    Keyboard --> GestureSM
    Drop --> GestureSM

    LeftRail --> State
    TopCorner --> State
    Inspector --> State
    ContextRow --> State
    CommandPalette --> State
    ContextMenu --> State

    GestureSM --> HitTest
    GestureSM --> SnapEngine
    GestureSM --> TransformEngine
    GestureSM --> TextReflow
    GestureSM --> State

    State --> CanvasCore
    State --> Rendering
    State --> Persistence

    Registry --> KitDSL
    KitDSL --> RoughGen
    RoughGen --> SVGDOM
\`\`\`

---

## 3. Complete Data Model & State Invariants

### Node Types Hierarchy (\`lib/types.ts\`)
All canvas entities implement or extend \`BaseNode\`:

\`\`\`ts
export interface BaseNode {
  id: string              // Unique nanoid identifier
  x: number               // World coordinate X
  y: number               // World coordinate Y
  w: number               // Width in world units (>= 0)
  h: number               // Height in world units (>= 0)
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
   - \`src: string\` (data:image/... base64 data URL)
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
- **Screen Space (\`sx, sy\`)**: Client pixel coordinates relative to the canvas container element bounding rect (\`containerRef.getBoundingClientRect()\`).
- **World Space (\`wx, wy\`)**: The infinite 2D plane coordinate system where all node \`x, y, w, h\` positions and vector coordinates live.
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
4. **Soft-Hit vs. Hard-Hit Distinction**:
   - When pointer-down lands inside the hollow center of an empty shape, it registers as a \`softHitId\`.
   - If the pointer moves $< 3\\text{px}$ (click): it resolves to selecting that hollow shape.
   - If the pointer moves $\\ge 3\\text{px}$ (drag): the soft hit is ignored and a marquee selection starts through the empty interior.
5. **Marquee Collision (Liang-Barsky Line Clipping)**:
   - Marquee uses **intersection** (touching), not containment.
   - For linear elements (arrows, freehand draw strokes), Zenithsui uses the Liang-Barsky parametric line clipping algorithm against the padded marquee rectangle \`segmentNearRect()\`.

### Smart Guides & Snapping Engine (\`lib/canvas/snap-engine.ts\`)
- Calculations run in **screen space** so snapping feels consistently magnetic (6px threshold) regardless of canvas zoom level.
- **6-Point Alignment**:
  - X-Axis: Left edge, Center ($x + w/2$), Right edge ($x + w$).
  - Y-Axis: Top edge, Middle ($y + h/2$), Bottom edge ($y + h$).
- **Distance Distribution Snapping**:
  - Automatically identifies equidistant spacing between three or more consecutively aligned elements.
  - Computes gap distances and snaps the dragging element when its gap matches a neighboring gap.
- **Escape Hatch**: Holding \`Cmd\` (Mac) or \`Ctrl\` (Windows/Linux) during move or resize disables snapping instantly.

### Transform & Resize Math (\`lib/canvas/transform.ts\`)
- **8 Handles**: \`["nw", "n", "ne", "e", "se", "s", "sw", "w"]\`.
- **Gesture Anchoring**: All transforms compute strictly from the snapshot taken at pointer-down (\`origBounds\`, \`origNodes\`), preventing floating-point drift during back-and-forth scrubbing.
- **Aspect Ratio Locking (Shift)**:
  - Corner handle: Scales uniformly based on the larger delta axis.
  - Side handle: Perpendicular axis scales outward symmetrically from center.
- **Center-Origin Scaling (Alt)**:
  - Opposing edge mirrors the dragged edge symmetrically around the center $(cx, cy)$.
- **Clamping Rule**: Minimum bounding box dimension is locked to $8 \\times 8\\text{px}$ (\`MIN_SIZE = 8\`). It **never flips** (no negative scale).
- **Proportional Scaling (\`scaleNodes\`\`)**:
  - Scales $x, y, w, h$.
  - Freehand draw points: $\\vec{p}_{\\text{new}} = (px \\cdot s_x, py \\cdot s_y)$.
  - Arrow points: scaled proportionally.
  - Text nodes: font size scales with vertical ratio $s_y$; fixed-width layers re-wrap text and recompute height via \`textBlockHeight\`.

### Text Layout & Reflow Engine (\`lib/canvas/text-metrics.ts\`, \`text-reflow.ts\`)
- **Measurement**: Offscreen HTML5 Canvas 2D context with precise font string \`"\${bold ? 'bold ' : ''}\${size}px \${fontFamily}"\`.
- **Baseline Alignment**: Text is positioned by its typographical baseline, calculated as:
  $$y_{\\text{baseline}} = \\frac{h}{2} + \\text{fontSize} \\times 0.35$$
- **Auto-Size vs Fixed-Width**:
  - Auto-sized: Dimensions automatically envelope the single/multi-line text runs.
  - Fixed-width (\`fixedW: true\`): Dragging side handles fixes the width; words wrap dynamically, and height expands to accommodate lines. Double-clicking side handle reverts to auto-sizing.

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
- \`"paper"\`: Fully opaque background color (\`var(--sq-paper)\`) used to occlude items underneath (modals, dropdowns, sticky notes).
- \`"shade"\`: Soft tinted wash (\`var(--sq-shade)\`) for placeholders, tracks, alternating table rows.
- \`"shadeStrong"\`: Darker tinted wash (\`var(--sq-shade-strong)\`) for primary buttons, active chips, chart bars.

### Seed Stability & Determinism
- Rough.js requires a numeric \`seed\` parameter in its generator options.
- The canvas engine stores \`seed\` on every node. When rendering SVG paths, \`seed\` is passed directly.
- Result: **Zero visual jitter**. Paths remain identical on every frame. When duplicating or pasting, a new random seed is generated so clones don't look like carbon copies.

### Phosphor Icons Integration
- Over 100 Phosphor icons are baked into raw SVG path strings in \`lib/sketch/phosphor-paths.ts\` (viewBox: $0\\ 0\\ 256\\ 256$).
- Icons are rendered **crisp** (bypassing Rough.js) so symbols stay sharp and legible even at $16\\text{px}$.

---

## 6. Component Library Architecture & Authoring Protocol

Every prefabricated wireframe component (buttons, forms, cards, charts, navigation bars, pricing tables, full landing pages) is declared as a \`ComponentDef\` in \`lib/library/\`:

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
- \`icon("user", cx, cy, size, opts)\`: Phosphor icon centered at cx, cy. (Always spread: \`prims.push(...icon(...))\`).
- \`loremLines(x, y, w, count, gap)\`: Hand-drawn placeholder copy lines.
- \`truncate(str, size, maxW)\`: Ellipsizes text.
- \`textWidth(str, size)\`: Measures string width.

### Break-Apart Engine (\`lib/library/break-apart.ts\`)
Users can explode any library component into raw primitive canvas nodes (\`ShapeNode\`, \`TextNode\`, \`ArrowNode\`) grouped together. It evaluates the component's \`render()\` output and maps each \`Prim\` back into a corresponding standalone canvas node.

---

## 7. Canvas Gestures & Interaction State Machine

### Gesture Lifecycle
1. **Pointer Down**:
   - Hit tests coordinates in world space.
   - Captures modifier keys: \`Shift\` (axis lock or XOR), \`Alt\` (duplicate), \`Cmd/Ctrl\` (selection toggle or disable snap).
   - Initializes \`Gesture\` state with \`exceeded = false\`.
   - Takes a document checkpoint on the undo stack (\`checkpoint()\`).
2. **Pointer Move (Threshold Latching)**:
   - Radial distance threshold: \`DRAG_THRESHOLD = 3px\`.
   - Once pointer exceeds 3px from origin, \`exceeded = true\` latches permanently for that gesture.
   - Dispatches to gesture handlers: \`move\`, \`resize\`, \`marquee\`, \`draw\`, \`create\`.
3. **Auto-Panning rAF Loop**:
   - When pointer moves within $40\\text{px}$ of the screen viewport boundary (\`AUTOPAN_EDGE = 40\`), an autonomous \`requestAnimationFrame\` loop pans the canvas viewport at up to $22\\text{px/frame}$ (\`AUTOPAN_MAX_SPEED\`).
4. **Pointer Up / Completion**:
   - Commits changes to the Zustand store.
   - Cleans up gesture refs, guide lines, and auto-pan loops.
   - If cancelled via \`Escape\`, invokes \`revertToCheckpoint()\` to roll back state losslessly.

### Multi-Select Gestures
- **Click**: Selects single node (or its outermost group).
- **Shift+Click / Cmd+Click**: Toggles node in/out of current selection.
- **Marquee Drag**:
  - Plain drag: Replaces selection with intersected nodes.
  - Shift/Cmd drag: Performs **XOR** (symmetric difference) against the selection frozen at gesture start.
- **Alt+Drag**: Duplicates selected nodes immediately and drags the copies; originals stay in place.
- **Shift+Drag during Move**: Constrains motion to horizontal or vertical axis (axis-lock).

---

## 8. User Interface Chrome & Control Shell

- **Left Rail (\`LeftRail\`)**: Sticky toolbar for tools (\`Select\`, \`Shape\`, \`Pencil\`, \`Text\`, \`Line/Arrow\`) and category panel openers (\`Components\`, \`Blocks\`).
- **Top Corner (\`TopCorner\`)**: File name drawer dropdown, undo/redo buttons, zoom level indicator pill with quick zoom actions (\`Zoom to Fit ⇧1\`, \`Zoom to 100% ⇧0\`, \`Zoom to Selection ⇧2\`).
- **Right Inspector (\`Inspector\`)**:
  - Contextual properties based on selection.
  - Multi-node alignment buttons: Left, Center, Right, Top, Middle, Bottom, Distribute H, Distribute V.
  - Typography controls: font mode, size, line-wrap toggle, alignment, bold/italic/underline, links.
  - Stroke weight & dashed toggles.
  - Fill tone ladder picker (\`none\`, \`paper\`, \`light\`, \`strong\`).
- **Floating Context Row (\`ContextRow\`)**: Appears immediately above/below selected nodes on canvas, offering 2-3 instant quick controls (e.g. Button tone, icon toggle, item count).
- **Command Palette (\`CommandPalette\`, \`Cmd+K\`)**: Instant fuzzy search across library components, blocks, actions, themes, and canvas operations.
- **Context Menu (\`CanvasContextMenu\`)**: Right-click actions (Cut, Copy, Paste Here, Duplicate, Delete, Group, Ungroup, Bring to Front, Send to Back, Break Apart, Export Selection).
- **Zen Mode (\`Cmd+\\\`)**: Hides all chrome panels, leaving 100% pure canvas.

---

## 9. Clipboard, Storage & Export Protocols

### Clipboard Architecture (\`lib/clipboard.ts\`, \`lib/clipboard-payload.ts\`)
- **Dual-Carrier System**:
  - \`text/html\`: Houses the lossless JSON payload encoded in a custom data attribute: \`<div data-zenithsui="URI_ENCODED_JSON"></div>\`.
  - \`text/plain\`: Plain text of all included \`TextNode\` items for clean pasting into external text editors, or raw JSON fallback.
- **Sanitization Gate (\`validNode\`)**: Strictly validates incoming nodes against malicious properties, \`NaN\` geometry, and untrusted URLs. Images must begin with \`data:image/\`.

### File Storage ("The File Drawer" in \`lib/files.ts\`)
- LocalStorage key schema:
  - \`zenithsui:files:v1\`: Array of \`FileMeta\` (id, name, updatedAt).
  - \`zenithsui:file:\${id}\`: Full \`StoredDoc\` (id, name, nodes, order, look, updatedAt).
  - \`zenithsui:prefs:v1\`: User preferences (active file id, look defaults).
- LRU pruning: Automatically keeps the drawer within 40 recent documents to prevent storage quota exhaustion.

### High-Resolution Image Export (\`lib/export-image.ts\`)
- Computes union bounding box of document or selection.
- Renders Rough.js SVG markup into an offscreen \`<canvas>\` at $2\\times$ pixel ratio for crisp retina output.
- Exports to downloadable \`.png\` or \`.svg\`, or copies directly to the operating system clipboard as a PNG blob.

---

## 10. The 10 Commandments / Invariants for Modifying Zenithsui

Any engineer or AI agent modifying this codebase MUST uphold these non-negotiable rules:

1. **NEVER Mutate Nodes Directly**: Always use \`useSquig.getState().updateNode(id, patch)\` or \`updateNodes(patches)\`. Never mutate \`node.x = ...\` in place.
2. **Preserve Seed Stability**: Never re-roll \`node.seed\` during drag, resize, restyle, or font change. Only generate a new seed when instantiating a completely new node or duplicating.
3. **Anchor All Gestures in World Space**: Always record \`screenToWorld(viewport, sx, sy)\` at pointer-down and recompute subsequent frames from the original anchor. Never accumulate incremental screen-space deltas.
4. **Enforce Strictly Finite Geometry**: Wrap all width and height assignments with \`Math.max(MIN_SIZE, ...)\` or \`Math.max(0, ...)\`. Never allow \`NaN\`, \`Infinity\`, or negative dimensions into node state.
5. **Keep Library \`render()\` Pure**: A component's \`render(props, w, h)\` must depend strictly on its arguments, must stay within bounds \`w\` and \`h\`, and must never query DOM or state.
6. **Use \`pill()\` for Rounded Badges/Chips**: Never use \`ellipse()\` for elongated elements. An ellipse bows inward and distorts labels.
7. **Adhere to the Three-Tone Ink Model**: Do not add arbitrary RGB/HSL color pickers to shapes or components. Styling is monochrome ink with \`"none"\`, \`"paper"\`, \`"shade"\`, or \`"shadeStrong"\`.
8. **Check Keyboard Ownership**: Before responding to global single-key shortcuts, always verify \`canvasOwnsKeyboard()\` to ensure the user is not typing inside an \`<input>\`, \`<textarea>\`, or dialog.
9. **Maintain Flat Grouping**: Do not transform \`nodes\` into a nested tree. Grouping is an array stamp \`groupIds: string[]\` on flat nodes.
10. **Align Text by Baseline**: In custom components, always compute text baseline as \`y = h / 2 + size * 0.35\` when centering vertically.

---

## 11. Step-by-Step Implementation Recipes for Common Extensions

### Recipe A: Adding a New Library Component
1. Open or create a file in \`lib/library/defs-*.ts\`.
2. Define a \`ComponentDef\`:
   \`\`\`ts
   export const myWidgetDef: ComponentDef = {
     kind: "my-widget",
     name: "My Widget",
     category: "components",
     group: "Display",
     size: { w: 200, h: 80 },
     defaults: { title: "Activity", count: 5 },
     controls: [
       { key: "title", label: "Title", type: "text" },
       { key: "count", label: "Items", type: "number", min: 1, max: 10, quick: true },
     ],
     render(props, w, h) {
       const prims: Prim[] = []
       prims.push(rect(0, 0, w, h, { r: 6, fill: "paper" }))
       prims.push(text(12, 24, String(props.title), 14, { bold: true }))
       return prims
     }
   }
   \`\`\`
3. Add \`myWidgetDef\` to \`ALL_DEFS\` in \`lib/library/registry.ts\`.

### Recipe B: Adding a New Inspector Property Control
1. In \`components/chrome/inspector.tsx\`, inspect the active selection using \`useSquig((s) => s.selection)\`.
2. Extract the common property value or detect mixed values with \`components/chrome/mixed-fields.tsx\`.
3. Render a control from \`components/ui/\` (e.g. \`Segmented\`, \`Switch\`, \`Select\`).
4. On change, take a checkpoint with \`checkpoint()\` and batch update selected nodes with \`updateNodes(patches)\`.

### Recipe C: Adding a New Keyboard Shortcut
1. Define the key string and display representation in \`lib/shortcuts.ts\`.
2. In \`components/canvas/canvas.tsx\` (inside \`onKeyDown\`), check \`if (!canvasOwnsKeyboard()) return\`.
3. Handle the key event and invoke the corresponding store action.
4. Add the entry to \`components/chrome/shortcuts-sheet.tsx\` for documentation display.

---

## 12. Master File Index & Dependency Graph

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

  for (const cat of FILE_CATEGORIES) {
    doc += `## ${cat.category}\n\n`
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

      console.log(`Embedding: ${file} (${lines} lines, ${st.size} bytes)`)

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
  doc += `   - Format: Windows Icon format (multi-resolution 16x16, 32x32, 48x48) displaying the Zenithsui hand-drawn pencil/paper logo.\n\n`
  doc += `2. **\`docs/hero.jpg\`**:\n`
  doc += `   - Path: \`docs/hero.jpg\`\n`
  doc += `   - Size: 75,077 bytes\n`
  doc += `   - Format: JPEG image showcasing the Zenithsui canvas with wireframe components, smart guides, and hand-drawn UI blocks.\n\n`
  doc += `3. **\`pnpm-lock.yaml\`**:\n`
  doc += `   - Path: \`pnpm-lock.yaml\`\n`
  doc += `   - Size: 197,187 bytes (6,037 lines)\n`
  doc += `   - Format: PNPM Lockfile v9 (pnpm 10.4.1), pinning exact dependency tree for Next 16.2.12, React 19.2.4, Tailwind CSS 4, Zustand 5, and Rough.js 4.6.6.\n\n`

  const targetPath = join(ROOT, "CODEBASE_SNAPSHOT.md")
  console.log(`Writing master snapshot to ${targetPath}...`)
  writeFileSync(targetPath, doc, "utf8")
  console.log(`Successfully generated CODEBASE_SNAPSHOT.md! Size: ${doc.length} characters.`)
}

generateFullDocument()
