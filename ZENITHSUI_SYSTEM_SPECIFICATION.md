# ZENITHSUI: THE DEFINITIVE ARCHITECTURAL, SYSTEM, AND ENGINEERING SPECIFICATION

---

## 1. Executive Summary, Product Philosophy & Core Invariants

### 1.1 Product Identity & Philosophy
**Zenithsui** is a specialized low-fidelity wireframing and sketch-canvas application engineered for architects, product designers, educators, and developers who think by sketching.

In the modern product design spectrum, a profound chasm exists:
- **High-Fidelity Mockup Suites (e.g., Figma, Sketch)**: Force creators prematurely into aesthetic micro-decisions—corner radii, drop shadows, color harmonies, and pixel alignment—derailing high-level architectural ideation and exploratory user-flow validation.
- **Freehand Whiteboard Canvases (e.g., tldraw, Excalidraw)**: Provide rapid, unstructured drawing surfaces, but lack the vocabulary of real UI components (buttons, navbars, forms, tables, modals, application blocks), forcing creators to draw every primitive from scratch without semantic structure or variant control.

Zenithsui bridges this divide: **An infinite canvas where users construct wireframes out of real, parametric UI components and application blocks, but where every single element renders with an intentional, hand-drawn napkin sketch risograph aesthetic.**

The sketchy aesthetic is an architectural invariant: **It is a napkin, not a mockup.** Because nothing looks finalized, stakeholders focus entirely on structural hierarchy, mental models, information architecture, and core user journeys rather than cosmetic styling.

---

### 1.2 The Absolute Aesthetic Invariant (Permanent Mandate)

```
================================================================================
CRITICAL DIRECTIVE: STRICT UI/UX, DESIGN, LOOK & FEEL PRESERVATION MANDATE
================================================================================
1. ZERO UNSOLICITED REDESIGNS:
   Under NO circumstances should the UI, UX, design system, theme, typography,
   color palette, spatial layout, borders, buttons, or aesthetic of Zenithsui
   be altered, refactored, restyled, modernized, or replaced.

2. NAPKIN / ROUGH SKETCH AESTHETIC:
   The signature hand-drawn rough.js napkin wireframe aesthetic is the core identity
   of the product and MUST remain completely unchanged.

3. PRESERVE ALL EXISTING UI CHROME:
   All toolbars, icons, palettes, canvas behaviors, menus, rails, modal dialogs,
   and floating panels must remain in their established positions, sizing, and styling.

4. DESIGN CONTINUITY FOR EXTENSIONS:
   Any new capability, modal, or component must strictly conform to the established
   Zenithsui visual tokens, CSS variables, and interaction patterns.
================================================================================
```

#### Core Design Tokens (`app/globals.css`)
- **Background & Canvas**:
  - `--sq-bg`: `#fbfaf5` (Warm off-white sketch paper)
  - `--sq-paper`: `#ffffff` (Pure white opaque backing for cards/modals)
  - `--sq-ink`: `#2d2a26` (Graphite ink black)
  - `--sq-muted`: `#8a857d` (Subtle pencil tone)
  - `--sq-faint`: `#c9c4bb` (Light guideline tone)
  - `--sq-shade`: `#eeeeee` (8% ink wash for inert surfaces and tracks)
  - `--sq-shade-strong`: `#d5d4d4` (20% ink wash for emphasized components)
  - `--sq-grid`: `#e2ddd3` (Canvas dot grid tone)
  - `--sq-select`: `#2438ff` (Selection accent ring)
- **Chrome Scale & Spacing**:
  - `--radius-chrome-xs`: `3px` (Segment inside track)
  - `--radius-chrome-sm`: `5px` (Fields, toggles, buttons, menu rows)
  - `--radius-chrome-md`: `7px` (Tracks, select popups)
  - `--radius-chrome-lg`: `10px` (Floating panels, dialogs)
  - `--spacing-ctl-sm`: `26px`, `--spacing-ctl`: `32px`, `--spacing-ctl-lg`: `36px`
  - `--spacing-gutter`: `14px`, `--spacing-row`: `10px`, `--spacing-label`: `60px`
  - `--shadow-panel`: `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12)`
  - `--shadow-popup`: `0 1px 2px rgb(0 0 0 / 0.04), 0 10px 32px -8px rgb(0 0 0 / 0.18)`
- **Typography Scale**:
  - `--font-sketch`: `Patrick Hand`, `"Comic Sans MS"`, cursive (Canvas typography)
  - `--font-sans`: `Geist Sans` (Application chrome typography)
  - `--font-serif`: `Source Serif 4` (Longform wireframe copy)
  - `--text-micro`: `10px`, `--text-label`: `11px`, `--text-row`: `13px`, `--text-title`: `15px`

---

### 1.3 Technology Stack Summary
- **Frontend Framework**: Next.js 15.1.7 (React 19, TypeScript 5, App Router)
- **Styling**: Tailwind CSS v4, custom CSS variables, `@base-ui/react`, Radix UI primitives
- **State Management**: Zustand 5 (`lib/store.ts`) with immutable undo/redo snapshots
- **Vector Graphics Pipeline**: SVG + `roughjs` 4.6.6 with deterministic pseudo-random seeding
- **Iconography**: Phosphor Icons (`@phosphor-icons/react`) rendered as crisp vectors
- **Export & Compression**: `jspdf` 4.2.1, `pako` 3.0.2 (deflate/inflate), HTML5 Canvas 2D
- **Document Intelligence**: `pdfjs-dist` 6.3.289 with offscreen worker rasterization
- **Backend Services**: Next.js Route Handlers, Server-Sent Events (SSE), Node.js `crypto`
- **Database Adapters**: Bring-Your-Own-Database (PostgreSQL via `pg`, Supabase via `@supabase/supabase-js`, Zenithsui Cloud)
- **AI Engine**: Multi-provider BYOK orchestration (Gemini, OpenAI, Claude, Groq, DeepSeek, Perplexity, OpenRouter) with AES-256-GCM vault security
- **Sketch Recognition & ML**: In-browser Convolutional Neural Network (TypeScript `Float32Array` tensor engine) + Python 48-feature Small Language Model (SLM)

---

## 2. High-Level System Architecture

Zenithsui is divided into six decoupled yet interoperable architectural tiers:

```
+---------------------------------------------------------------------------------------------------+
|                                      APPLICATION ENTRY & CHROME                                    |
|   app/page.tsx · TopCorner · LeftRail · Inspector · LibraryPanel · CommandPalette · Modal Dialogs  |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                   ZUSTAND REACTIVE CORE (lib/store.ts)                            |
|       Nodes · Z-Order · Selection · Viewport · Tool · History Stacks · Realtime Collab Sync       |
+---------------------------------------------------------------------------------------------------+
        │                                         │                                         │
        ▼                                         ▼                                         ▼
+-----------------------+               +-----------------------+               +-------------------+
|   CANVAS & GEOMETRY   |               |   COMPONENT LIBRARY   |               |     ZENITH AI     |
| - Affine Viewport     |               | - 100+ Definitions   |               | - BYOK AES Vault  |
| - Hit-Testing Engine  |               | - Basic, Nav, Display |               | - Context Builder |
| - Smart Snap Engine   |               | - App & Marketing     |               | - Tool Calling    |
| - Text Reflow Metrics |               | - 20 Student Kit Defs |               | - Action Executor |
| - Transform Handles   |               | - Break-Apart Engine  |               | - Fallback Engine |
+-----------------------+               +-----------------------+               +-------------------+
        │                                         │                                         │
        ▼                                         ▼                                         │
+-------------------------------------------------------------------+                       │
|                    VECTOR RENDERING PIPELINE                      |                       │
|   components/canvas/sketch.tsx · rough-renderer.tsx · kit.ts     |                       │
|   - Deterministic Seeding (7919 prime multiplier)                 |                       │
|   - Risograph Tonal Ladder (none / paper / light / strong)        |                       │
|   - 19-Grade Graphite Pencil Model · Phosphor Vector Icons        |                       │
+-------------------------------------------------------------------+                       │
        │                                                                                   │
        ▼                                                                                   ▼
+-------------------------------------------------------------------+   +---------------------------+
|               SKETCH RECOGNITION & SLM MACHINE LEARNING           |   |   BACKEND API & BYODB     |
| - Preprocessing (Deduplication, Gaussian Smooth, Resample)        |   | - 45+ API Route Handlers  |
| - 4-Shape Deterministic Geometry Recognizer (<0.5ms)              |   | - Postgres / Supabase /   |
| - Browser CNN (Conv2D, MaxPool, LeakyReLU, Dense)                 |   |   Zenithsui Cloud DBs     |
| - Sequence Engine & Lexicon Disambiguation                        |   | - SSE Realtime Hub        |
| - Python SLM A/B Model (48 topological features)                  |   | - PBKDF2 Auth & Security  |
+-------------------------------------------------------------------+   | - PDF Classroom Suite     |
                                                                        +---------------------------+
```

---

## 3. Canvas Coordinate System, Viewport & Interaction Engine

### 3.1 Affine Viewport Coordinate Transformations
The canvas implements an infinite Cartesian plane. State vector $\mathbf{V} = [v_x, v_y, s]^T$ defines the viewport:
- $v_x = \text{viewport.x}$ (horizontal pan offset in screen pixels)
- $v_y = \text{viewport.y}$ (vertical pan offset in screen pixels)
- $s = \text{viewport.zoom}$ (zoom scale factor, clamped to $[0.10, 4.00]$)

#### Transformation Matrix
$$\begin{bmatrix} x_{\text{screen}} \\ y_{\text{screen}} \\ 1 \end{bmatrix} = \begin{bmatrix} s & 0 & v_x \\ 0 & s & v_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x_{\text{world}} \\ y_{\text{world}} \\ 1 \end{bmatrix}$$

#### Exact Projection Formulas
- **Screen-to-World (Unprojection)**:
  $$x_{\text{world}} = \frac{x_{\text{client}} - R_{\text{left}} - v_x}{s}, \quad y_{\text{world}} = \frac{y_{\text{client}} - R_{\text{top}} - v_y}{s}$$
  where $(R_{\text{left}}, R_{\text{top}})$ is the canvas container's `getBoundingClientRect()` origin.
- **World-to-Screen (Forward Projection)**:
  $$x_{\text{screen}} = x_{\text{world}} \cdot s + v_x, \quad y_{\text{screen}} = y_{\text{world}} \cdot s + v_y$$

### 3.2 Zooming Mechanics & Focal Invariance
Zooming scales around an arbitrary screen coordinate $(c_x, c_y)$ (mouse position or viewport center) while preserving the world point beneath the cursor:

$$s_{\text{next}} = \operatorname{clamp}(s_{\text{curr}} \cdot f, 0.10, 4.00), \quad k = \frac{s_{\text{next}}}{s_{\text{curr}}}$$
$$v_{x,\text{next}} = c_x - (c_x - v_{x,\text{curr}}) \cdot k$$
$$v_{y,\text{next}} = c_y - (c_y - v_{y,\text{curr}}) \cdot k$$

- **Zoom Step Factor**: $f = 1.25$ (+25% in) or $f = 0.80$ (-20% out)
- **Presets**:
  - `Shift+0` (`⌘0`): Reset to 100% zoom ($s = 1.0, v_x = 0, v_y = 0$).
  - `Shift+1`: Zoom to fit all canvas nodes with 40px margin.
  - `Shift+2`: Zoom to fit active selection.

### 3.3 Multi-Modal Panning System
1. **Spacebar-Pan (`use-spacebar-pan.ts`)**: Pressing Space changes cursor to `grab`/`grabbing`. Handlers in `shouldBlockSpacebar()` protect input fields, textareas, content-editable nodes, and dropdowns.
2. **Middle Mouse Button (Button 1)**: Initiates pan gesture regardless of the active tool.
3. **Primary Canvas Drag**: Clicking on empty canvas background (`#canvas-plane`) initiates pan if no modifier is active.
4. **Parallax Dot Grid**: Dynamic background gradient matches pan and zoom:
   ```css
   background-image: radial-gradient(var(--sq-dot, rgba(0,0,0,0.12)) 1px, transparent 1px);
   background-size: calc(24px * zoom) calc(24px * zoom);
   background-position: pan.x px pan.y px;
   ```

---

## 4. Rough.js & Vector Rendering Pipeline

### 4.1 Deterministic PRNG Seeding
To eliminate visual jitter during canvas re-renders, drags, or selection mutations, every shape generates an integer seed from a large prime multiplier:
$$s_{\text{prim}} = \left((s_{\text{node}} + i \cdot 7919) \pmod{2^{31}}\right) \mathbin{\Vert} 1$$
This guarantees that while nodes look hand-drawn, their contours remain deterministic and frozen.

### 4.2 Rough.js Configuration Profile
```typescript
const opts: Options = {
  seed: s_prim,
  roughness: 1.2,           // Controlled hand-drawn wobble
  bowing: 1.0,              // Controlled curve bowing
  stroke: resolvedColor,    // Theme-derived hex
  strokeWidth: 1.5,         // Base stroke weight
  disableMultiStroke: true, // INVARIANT: Eliminates messy double-stroked sketch fuzz
  disableMultiStrokeFill: true, // Clean single-pass fills
  preserveVertices: true,   // Corners meet accurately at vertices
}
```

### 4.3 Risograph Tonal Fill Ladder
Fills are strictly governed by a 4-tier hierarchy rather than arbitrary colors:
1. `none`: Fully transparent interior. Unfilled hollow shapes allow clicks inside to pass through to the canvas for marquee selection.
2. `paper`: Pure white `#ffffff`. Genuinely opaque; occludes underlying shapes and connectors.
3. `light`: 8% ink wash (`--sq-shade`). Inert background tone for cards, tracks, table headers, and alternating rows.
4. `strong`: 20% ink wash (`--sq-shade-strong`). Emphasized tone reserved for primary buttons, active tabs, and highlighted chart bars. Exactly one strong fill permitted per component.

### 4.4 Risograph Block Shadows
Elevated components declaring `shadow: true` render a crisp 4px south-east block shadow. **Shadows bypass Rough.js entirely** and render as pristine geometric paths filled with `--sq-shade-strong` to evoke early-desktop risograph printing.

```
+---------------------+
| Rough.js Hand-Drawn |
|      Surface        |
+---------------------+ \
 \  Crisp Block Shadow \ \  (Offset +4px, +4px; No Rough Jitter)
  \  Fill: ShadeStrong  \ \
   +---------------------+
```

### 4.5 The 19-Grade Graphite Pencil Engine (`lib/pencil-grades.ts`)
The drawing engine models real-world graphite pencil hardness:
- **H Grades (Hard & Light)**: High clay ratio, ultra-fine precision.
  - `9H` (0.8px, 28% opacity) to `2H` (1.7px, 72% opacity), `H` (1.8px, 78% opacity).
- **HB Grade (Standard Everyday)**:
  - `HB`: 2.0px stroke width, 88% opacity.
- **B Grades (Soft & Dark)**: High graphite ratio, bold dark strokes.
  - `B` (2.3px, 92% opacity) up to `6B` (4.2px, 100% opacity) and `9B` (5.5px, 100% opacity).
- **Tool Configurations (`lib/draw-colors.ts`)**:
  - `pen`: 1.9px stroke width, 100% opacity, 0.2 roughness.
  - `marker`: 4.5px stroke width, 88% opacity, 0.2 roughness.
  - `highlighter`: 14.0px stroke width, 42% opacity, 0.1 roughness, `mix-blend-mode: multiply`.

### 4.6 Zero-Jump Inline Text Editing (`components/canvas/text-edit-overlay.tsx`)
1. Double-clicking any text node or component launches the overlay.
2. A probe string (`⁣zqx`) measures internal component text primitive positions.
3. The underlying SVG text primitive is hidden (`hiddenText: "all"`).
4. An absolute HTML `<textarea>` is positioned at the exact typographic baseline:
   $$\text{baselineY} = (y_{\text{node}} + y_{\text{targetBaseline}}) \cdot s + v_y$$
   $$\text{top} = \text{baselineY} - \left(\frac{\text{lineHeight} - (\text{ascent} + \text{descent})}{2} + \text{ascent}\right) - \text{padY}$$
5. Pressing `Enter` (or clicking away) commits text mutations atomically to the store. Pressing `Escape` aborts changes. Empty text nodes are automatically deleted to prevent orphaned invisible targets.

---

## 5. Selection, Hit-Testing, Snapping & Transformation Engine

### 5.1 World-Space Hit-Testing Algorithms (`lib/canvas/hit-test.ts`)
Hit testing runs entirely in world coordinates, bypassing DOM limitations:
- **Dynamic Tolerance Collar**:
  $$\text{tol} = \min\left(\frac{8}{s}, 14\right) \text{ world units}$$
- **Hollow Shape Detection**:
  Hollow rectangles and ellipses verify that pointer clicks fall within the stroke collar while remaining **outside the inner core box**:
  $$\text{inner} = (x > b_x + \text{tol}) \land (x < b_x + b_w - \text{tol}) \land (y > b_y + \text{tol}) \land (y < b_y + b_h - \text{tol})$$
  $$\text{isStrokeHit} = \text{inOuterBox} \land \neg \text{inner}$$
  This allows users to click through large empty wireframe frames to start marquee drags.
- **Liang-Barsky Line Clipping**: Used in marquee selection to test whether arrow connectors and sketch scribbles intersect the selection rectangle without relying on imprecise bounding boxes.

### 5.2 Transformation & Resize Mathematics (`lib/canvas/transform.ts`)
Handles 8 bounding box handles: `nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`.
- **Minimum Size Invariant**:
  $$\text{MIN\_SIZE} = 8\text{px}$$
  Clamps bounds to prevent negative mirroring or inverted coordinate anomalies.
- **Aspect Ratio Locking (`Shift` Key)**:
  Uniform scale factor evaluates the maximum pull axis:
  $$s_{\text{uniform}} = \max\left(\frac{w_{\text{drag}}}{w_{\text{orig}}}, \frac{h_{\text{drag}}}{h_{\text{orig}}}\right)$$
- **Center-Anchored Scaling (`Alt` Key)**:
  Scales outward/inward symmetrically around centroid $(c_x, c_y)$.
- **Multi-Node Cluster Scaling (`scaleNodes`)**:
  Proportionally transforms arbitrary selections:
  $$s_x = \frac{B_{\text{next}}.w}{B_{\text{orig}}.w}, \quad s_y = \frac{B_{\text{next}}.h}{B_{\text{orig}}.h}$$
  $$x_i' = B_{\text{next}}.x + (x_i - B_{\text{orig}}.x) \cdot s_x, \quad y_i' = B_{\text{next}}.y + (y_i - B_{\text{orig}}.y) \cdot s_y$$
  Scaled text elements recompute font sizes and reflow line wraps automatically.

### 5.3 Smart Snap & Alignment Engine (`lib/canvas/snap-engine.ts`)
Executes purely in screen-space overlay pixels to ensure a consistent 6px snap threshold regardless of zoom.
- Generates 3 alignment candidate edges per axis:
  $$E_x = [R_{\text{left}}, R_{\text{cx}}, R_{\text{right}}], \quad E_y = [R_{\text{top}}, R_{\text{cy}}, R_{\text{bottom}}]$$
- Dispatches dynamic guide lines (`GuideLine`) and edge-to-edge distance indicators (`DistanceIndicator`) during drags.
- Holding `Cmd` / `Ctrl` bypasses all snapping magnets.

---

## 6. Complete Data Model, Types & Schemas

### 6.1 Primitive Node Union (`SquigNode` in `lib/types.ts`)
Every entity on the Zenithsui canvas is an instance of `SquigNode`:
```typescript
export type SquigNode =
  | RectNode            // Primitive box
  | EllipseNode         // Primitive oval
  | LineNode            // Simple segment
  | ShapeNode           // Wireframe shape with Risograph fill tone
  | DrawNode            // Freehand scribble with pencil grade
  | ArrowNode           // Connector with directional arrowhead
  | TextNode            // Sketch typography with link support
  | ComponentNode       // Parametric UI component with props
  | ImageNode           // Encoded base64 data-URL screenshot
  | PdfNode             // Interactive PDF card with annotations
  | FileAttachmentNode  // Linked file reference card
```

### 6.2 The Document Schema (`ZenithsuiDocument`)
```typescript
export interface ZenithsuiDocument {
  app: "zenithsui"
  schemaVersion: 1
  version?: number
  docId?: string
  fileName: string
  look: {
    theme: "orange" | "internet-blue" | "yellow" | "riso-red" | "terminal-green" | "plum" | "marigold" | "graphite"
    paper: "white" | "subtle" | "shaded"
    font: "hand" | "sans" | "serif"
    grid: boolean
  }
  nodes: Record<string, SquigNode>
  order: string[]  // Z-index layer order from back to front
  viewport?: { x: number; y: number; zoom: number }
  metadata?: {
    appVersion?: string
    exportedAt?: string
    client?: string
  }
}
```

### 6.3 Document Sanitization & Defensive Validation (`lib/document-validator.ts`)
All clipboard, file, and network inputs undergo strict sanitization:
1. Rejects missing/malformed root objects.
2. Enforces finite numeric bounds (`num(x) && num(y) && num(w) && num(h)`).
3. **Data-URL Origin Defense**: Image nodes MUST match `/^data:image\//i`. Remote HTTP/HTTPS URLs are unconditionally rejected to prevent canvas tainting during export and SSRF vulnerabilities.
4. **Z-Order Rebalancing**: Purges dangling IDs and appends unlisted valid nodes to prevent data loss.

---

## 7. Zustand State Management & History Engine

### 7.1 Store Architecture (`useSquig` in `lib/store.ts`)
Central store manages:
- **Document Model**: `nodes: Record<string, SquigNode>`, `order: string[]`, `fileName: string`, `docId: string`.
- **Selection Topology**: `selection: string[]`, `selectedIds: string[]`.
- **Tool States**: `tool: ToolKind` (`select`, `hand`, `rect`, `ellipse`, `line`, `draw`, `text`, `arrow`, `component`).
- **History Stacks**: `past: DocSnapshot[]`, `future: DocSnapshot[]` (capped at 50 snapshots).
- **Collaboration Context**: `collabStatus`, `collaborators`, `permissionRole` (`owner`, `editor`, `viewer`).

### 7.2 History & Transaction Mechanics
1. **Checkpointing**: Discrete interactions push immutable snapshots `{ nodes, order, look, fileName }` to `past` and clear `future`.
2. **Transient State Exclusion**: Mousemove tracking, zoom/pan operations, marquee boxes, and slider scrubs **never generate checkpoints**.
3. **Atomic Rollback**: Single-action commands (`⌘Z`) restore prior states in a single frame.

---

## 8. Component & Block Library Architecture

### 8.1 Component Authoring Contract
Components implement `ComponentDef` in `lib/library/registry.ts`:
```typescript
export interface ComponentDef {
  kind: string
  name: string
  category: "components" | "blocks" | "student"
  group: string
  keywords: string[]
  size: { w: number; h: number }
  defaults: Record<string, unknown>
  controls: ControlDef[]
  render: (props: Record<string, unknown>, w: number, h: number) => Prim[]
}
```

### 8.2 Complete Library Inventory (100+ Components & Blocks)
1. **Basic UI Controls (`defs-basic.ts`, `defs-more.ts`)**:
   `button`, `icon-button`, `button-group`, `split-button`, `fab`, `chip`, `chip-group`, `badge`, `avatar`, `input`, `textarea`, `select`, `search-input`, `otp-input`, `file-upload`, `date-picker`, `combobox`, `input-group`, `stepper-input`, `color-swatches`, `checkbox`, `checkbox-group`, `radio`, `radio-group`, `switch`, `toggle-group`, `slider`, `slider-range`, `progress`, `rating`.
2. **Display & Overlay (`defs-display.ts`, `defs-more.ts`)**:
   `card`, `card-stat`, `card-profile`, `card-media`, `card-pricing`, `card-testimonial`, `card-product`, `card-blog`, `card-notification`, `table`, `data-table`, `kv-list`, `tabs`, `nav-tabs-pill`, `breadcrumb`, `pagination`, `stepper`, `timeline`, `tree-view`, `accordion`, `carousel`, `dialog`, `dropdown`, `context-menu`, `menubar`, `command-menu`, `toast`, `alert`, `tooltip`, `stat`, `chart`, `code-block`, `calendar`, `skeleton`, `spinner`, `video-player`, `audio-player`, `image-grid`, `map`.
3. **Navigation (`defs-nav.ts`, `defs-more.ts`)**:
   `navbar`, `sidebar`, `bottom-nav`.
4. **App & Workflow Blocks (`defs-blocks-app.ts`)**:
   `usage-meter`, `invoice-list`, `account-block`, `billing-block`, `notification-list`, `activity-feed`, `comments`, `inbox-list`, `kanban-board`, `calendar-block`, `file-browser`, `search-results`, `onboarding-checklist`, `empty-block`, `settings-block`, `profile-header`, `command-palette-block`, `ai-input`, `ai-chat`, `ai-prompt-suggestions`, `ai-response`, `ai-agent-card`, `ai-thinking`, `order-summary`, `cart`, `checkout`, `product-detail`, `product-grid`, `payment-methods`, `app-shell`, `landing-page`, `chat-screen`, `inbox-screen`, `profile-screen`.
5. **Marketing Blocks (`defs-blocks-marketing.ts`)**:
   `hero`, `hero-minimal`, `cta-block`, `feature-grid`, `feature-split`, `feature-list`, `testimonial-block`, `logo-cloud`, `pricing-block`, `faq`, `stats-band`, `newsletter`, `banner`, `announcement-bar`, `footer`, `team-grid`, `awards`, `gallery`, `about-block`, `blog-list`, `blog-post-header`, `article-body`, `changelog`, `contact-form-block`, `breadcrumb-header`, `section-header`.
6. **Student & Education Kit (20 Handcrafted Components in `defs-student.ts`)**:
   - `student.header`: Course code, name, semester badge, notification icon.
   - `student.assignment-card`: Problem set status, due date, points badge, progress bar.
   - `student.flashcard`: Flip card with subject tag, counter, and term.
   - `student.quiz-mcq`: Multiple-choice question card with radio indicators.
   - `student.pomodoro`: Focus timer ring with play/pause controls.
   - `student.progress-ring`: Course completion percentage indicator.
   - `student.streak-counter`: Habit gamification counter with fire icon.
   - `student.grade-pill`: GPA / Letter grade pill badge.
   - `student.study-checklist`: Midterm checklist with toggle boxes.
   - `student.calendar-day`: Timetable schedule card with time-slotted lectures.
   - `student.cornell-note`: 3-section Cornell notes layout (Cues, Notes, Summary).
   - `student.vocab-chip`: Vocabulary definition card with pronunciation label.
   - `student.formula-card`: Math/Physics formula card with equation block.
   - `student.audio-lecture-player`: Lecture recording scrub bar with play/pause buttons.
   - `student.discussion-bubble`: Peer discussion forum thread element.
   - `student.syllabus-timeline`: Weekly milestone progression roadmap.
   - `student.study-group-finder`: Peer collaboration study group card.
   - `student.leaderboard-row`: Class gamification leaderboard ranking row.
   - `student.rubric-criterion`: Evaluation rubric criteria scoring box.
   - `student.ai-tutor-bubble`: Zenith AI Study Copilot explanation bubble.
7. **Full-Page Wireframe Templates (`defs-templates.ts`)**:
   `template.login`, `template.signup`, `template.settings`, `template.dashboard`, `template.pricing`, `template.feed`, `template.empty-state`.

### 8.3 The Break-Apart Engine (`lib/library/break-apart.ts`)
A one-way conversion transforming parametric `ComponentNode` instances into editable native canvas primitives (`ShapeNode`, `TextNode`, `ArrowNode`, `DrawNode`). It executes `render()`, decomposes generated vector primitives, preserves absolute spatial positions, binds them to a shared `groupId`, and replaces the component on the canvas.

---

## 9. Zenith AI, BYOK Vault & Multi-Provider Architecture

### 9.1 BYOK Security Vault (`lib/ai/encryption.ts`, `byok-vault.ts`)
- **Encryption**: AES-256-GCM authenticated cipher with 96-bit random IVs and 128-bit authentication tags.
- **Master Secret Hierarchy**: `process.env.ZENITHSUI_SECRET_KEY` $\to$ `process.env.ENCRYPTION_KEY` $\to$ persistent server secret.
- **SSRF Defense (`lib/ai/security-audit.ts`)**: Custom endpoints are audited; loopback (`127.0.0.1`), link-local (`169.254.169.254`), and private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked.
- **Secret Redaction**: Server scrubbers purge API keys and bearer tokens from outgoing telemetry.
- **Account Boundaries (`AccountSecurityBoundary`)**: Intercepts password resets, recovery codes, and role escalations, routing users to UI settings modals rather than executing LLM operations.

### 9.2 Supported AI Providers & Models (`lib/ai/model-registry.ts`)
1. **Google Gemini**: `gemini-3.8-flash` (Default), `gemini-3.7-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`.
2. **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`.
3. **Groq LPU**: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b`, `qwen/qwen3.6-27b`.
4. **OpenRouter**: `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`.
5. **Anthropic Claude**: `claude-3-7-sonnet-20250219`, `claude-3-5-haiku-20241022`.
6. **DeepSeek**: `deepseek-chat` (V3), `deepseek-reasoner` (R1).
7. **Perplexity**: `sonar`, `sonar-reasoning`.
8. **Self-Hosted / Gateway**: `openai-compatible` (Ollama/vLLM), `azure`, `huggingface`.

### 9.3 Smart Router & Dynamic Fallback Engine
- **Routing Modes**: `manual`, `fastest` (Groq/Flash), `best-reasoning` (o3-mini/Gemini 2.5 Pro/R1), `cheapest`.
- **Automatic Fallback Chain**: Network timeouts or 429 errors seamlessly cascade through fallback providers.
- **Offline Synthesizer (`FallbackAIEngine`)**: Operates client-side when no keys exist or when offline, synthesizing wireframes, mind maps, flowcharts, and study cards via regex rules and deterministic templates.

### 9.4 Canvas Context Builder (`lib/ai/context-builder.ts`)
Converts canvas state into dense prompt payloads:
- Resolves deictic pronouns ("this", "that", "it") using a 5-tier priority (previous answer $\to$ selection $\to$ recent AI creations $\to$ spatial proximity $\to$ canvas overview).
- Calculates relative bounding positions ("to the left", "above") within a 250px radius.
- Clamps document attachments and text summaries to protect model context budgets.

### 9.5 Tool Registry & Action Execution (`lib/ai/action-executor.ts`)
- Model outputs actions in a ` ```zenith-actions ` JSON block containing `CanvasAction[]`.
- Actions are cleaned from conversational text displayed in chat.
- `AIActionExecutor.applyProposal()` starts an atomic transaction (`store.checkpoint()`), instantiates nodes with random seeds, and updates the canvas.
- Single-undo (`⌘Z`) rolls back the entire multi-element generation.

---

## 10. Sketch Recognition, Browser CNN & Python SLM Engine

### 10.1 Multi-Stage Recognition Pipeline
```
Raw Strokes -> Preprocessing -> Deterministic Geometric Engine (<0.5ms)
                             -> Vectorized Browser CNN (32x32 Tensor Engine)
                             -> Sequence Clustering & Lexicon Disambiguation
                             -> Dedicated A/B Specialist Pipeline (48 Features)
                             -> Platt-Calibrated Confidence Filter
                                (>=0.88 Auto-convert | 0.60-0.88 Suggestion | <0.60 Keep Raw)
```

### 10.2 Preprocessing (`preprocessing.ts`)
1. **Deduplication**: Drops points with Euclidean distance $< 1.5\text{px}$.
2. **Smoothing**: 3-point Gaussian kernel ($p_i \leftarrow 0.25p_{i-1} + 0.50p_i + 0.25p_{i+1}$).
3. **Resampling**: Equidistant parameterization to $N=64$ points along arc length.
4. **Convex Hull**: Andrew's Monotone Chain algorithm computing Shoelace area and circularity ($C = \frac{4\pi A}{P^2}$).

### 10.3 Geometric Primitive Engine (`geometry-recognizer.ts`)
- **Line**: Straightness $\frac{\text{chord}}{\text{length}} \ge 0.88$, chord deviation $\le 0.12$.
- **Arrow**: Analyzes shaft straightness and backwards-pointing arrowhead barbs ($\theta < 120^\circ$).
- **Rectangle**: Closure ratio $\le 0.38$, Douglas-Peucker simplification yields 4 corners, at least 3 right angles ($65^\circ \le \theta \le 115^\circ$), parallel opposing edges.
- **Ellipse**: Closed loop ($R_{\text{close}} \le 0.42$), zero sharp corners ($< 125^\circ$), second central moments $\mu_{xx}, \mu_{yy}, \mu_{xy}$ establish orientation and semi-axes $a, b$, residual error $\le 0.16$, octant coverage $\ge 7/8$.

### 10.4 In-Browser CNN Engine (`cnn-engine.ts`, `cnn-rasterizer.ts`)
Vectorized scratch-built Convolutional Neural Network running in TypeScript:
- **Input**: $[1, 32, 32]$ `Float32Array` generated with subpixel anti-aliasing.
- **Layers**:
  - `Conv2D` ($1 \to 8$, $3\times 3$, pad 1) $\to$ `LeakyReLU` ($\alpha = 0.1$) $\to$ `MaxPool2D` ($2\times 2$, stride 2)
  - `Conv2D` ($8 \to 16$, $3\times 3$, pad 1) $\to$ `LeakyReLU` $\to$ `MaxPool2D` ($2\times 2$, stride 2)
  - `Dense` ($1024 \to 48$) $\to$ `LeakyReLU` $\to$ `Dense` ($48 \to K$) $\to$ `Softmax`.
- **Memory Footprint**: Active weights under 1.2 MB across 3 model domains (Handwriting, Geometry, Objects).

### 10.5 Dedicated A/B Python SLM Pipeline (`slm_ab/`)
- Extracts a 48-dimensional kinematic and topological feature vector: apex convergence, mid-crossbar presence, bottom leg openness, left stem straightness, upper/lower loop ratio, waist indentation, and 16 projection profile bins.
- Linear discriminant perceptron scoring + dual geometric validation gates.
- Strict rejection threshold: Ambiguous drawings or non-matching topology yield `UNKNOWN`.
- `LearningSession` provides online personalization from 3–10 user drawing samples with hard negative regression checks before promotion.

---

## 11. Backend API Routes, BYODB Engine & Real-Time Sync

### 11.1 Bring Your Own Database (BYODB) Engine
Tenants configure external databases stored in `.zenithsui_data/connected_databases.json`:
1. **PostgreSQL Driver (`postgres-provider.ts`)**: Connection pooling via `pg.Pool`, SSL support (`rejectUnauthorized: false`), connection timeouts.
2. **Supabase Driver (`supabase-provider.ts`)**: Direct `@supabase/supabase-js` client with REST health checks and local memory caching.
3. **Zenithsui Cloud (`zenithsui-cloud-provider.ts`)**: File-system backed snapshot storage.
4. **Schema Engine**: Automatically provisions and verifies tables:
   `zenithsui_schema_migrations`, `zenithsui_workspaces`, `zenithsui_boards`, `zenithsui_files`, `zenithsui_shares`, `zenithsui_versions`.

### 11.2 Real-Time Collaboration & Synchronization
- **Transport Layer**: Server-Sent Events (SSE) streaming at `/api/database/[dbId]/files/[fileId]/realtime` with HTTP POST mutation pipelines.
- **Heartbeat**: 15,000ms SSE comments (`: keepalive\n\n`) prevent proxy timeouts.
- **In-Memory Room Hub (`RealtimeRoom`)**: Tracks connected clients, 200-patch revision ring buffer, and debounced 500ms persistent storage flushes.
- **Conflict-Free Updates (`applyCollaborationOps`)**:
  - `update-nodes`: Merges properties cleanly; shallowly merges component `props` to prevent clobbering concurrent edits.
  - `remove-nodes`: Purges node records and reconciles z-index order arrays.
- **Sequence Gap Catch-Up**: Clients detecting revision gaps request catch-up deltas (`?since=rev`).
- **Offline Sync Queue**: Mutations offline are queued in `localStorage` and drained sequentially upon network reconnection.

---

## 12. Security, Cryptography, Authentication & Permissions

### 12.1 Cryptographic Algorithms & Invariants
- **User Passwords**: PBKDF2-HMAC-SHA256 with 100,000 iterations, unique 16-byte random salts. Verified with `crypto.timingSafeEqual`.
- **Document Passwords**: PBKDF2-HMAC-SHA256 with 10,000 iterations, unique 16-byte random salts.
- **Emergency Recovery Codes**: 6 unique codes (`zen-XXXX-XXXX`), stored as SHA-256 hashes, burned on single use.
- **Session Tokens**: Base64URL encoded signed HMAC-SHA256 tokens in 30-day `HttpOnly`, `SameSite=lax` cookies.
- **Document Edit Tokens**: Signed 24-hour HMAC tokens passed in `x-zenithsui-edit-token` headers.
- **Rate-Limiting & Lockout Safeguards**:
  - User login: 5 failed attempts $\to$ 15-minute lockout.
  - Document/share passwords: 3 failed attempts $\to$ 30-minute lockout.

### 12.2 Public Share Access Matrix
Public links (`/p/[publicId]`) enforce strict permission gates:
- `public-view`: Read-only canvas inspection. Mutation POST requests return HTTP 403.
- `password-edit`: Requires unlocking with document password to obtain an edit token before mutations are accepted.
- `private`: Access restricted strictly to authenticated workspace members.

---

## 13. PDF Classroom & Smart Whiteboard Suite

### 13.1 High-Resolution Rendering & Architecture
- Uses `pdfjs-dist` with `/pdf.worker.min.mjs` background worker.
- Validates `%PDF-` byte header signatures.
- Renders high-DPI viewports to offscreen HTML5 canvas instances cached in `pageRenderCache`.
- Normalized coordinate mathematics (`PdfCoord`) maps annotations across scales ($0.0 \to 1.0$) to prevent drift on mobile or window resize.

### 13.2 Smart Board Teaching Tools (`smart-board-overlays.tsx`)
1. **Laser Pointer**: Pulsing red core with 15-frame glowing trail filter (`#laser-glow`).
2. **Spotlight Mode**: 68% dark backdrop with interactive circular punch-out mask and radius adjuster.
3. **2.2x Magnifier**: Circular loupe rendering inverted scaled page bitmaps.
4. **Interactive Ruler**: Acrylic centimeter/millimeter ruler with dynamic $\operatorname{atan2}$ rotation handle.
5. **Classroom Scratchpad (`classroom-whiteboard.tsx`)**: Fullscreen whiteboard with ruled, grid, or dot backgrounds and disappearing ink (`tempMarker`) that fades after 100ms.
6. **Search & Annotation Overlays**: Selectable text layer extraction with keyword search, multi-page bounding highlights, and quick-action toolbars (Copy, Highlight, Note).

---

## 14. Local Persistence, File I/O & Export Systems

### 14.1 Browser Storage & 40-File Sliding Window
- Files persist in `localStorage` under `zenithsui:file:<id>` with index `zenithsui:files:v1`.
- Proactive LRU eviction bounds documents to 40 entries.
- If `QuotaExceededError` fires, the engine reactively evicts the oldest non-active documents until storage succeeds.

### 14.2 Export Pipeline
- **Vector SVG**: Inlines `@font-face` WOFF2 data as base64 and resolves all CSS variables to static hex codes.
- **Retina PNG**: Offscreen canvas rasterization at $2\times$ scale (clamped to 8192px). Async clipboard integration supports Safari gesture requirements.
- **jsPDF Documents**: Native vector PDF export with `px_scaling` hotfixes.
- **Pako URL Hashes**: Serializes documents to compressed URL hash fragments (`#d=<base64url>`) via raw Deflate/Inflate.

---

## 15. Deployment & Configuration

### 15.1 Environment Variables
```bash
# Core Security
ZENITHSUI_SECRET_KEY=             # Master encryption secret for AES-256-GCM vault & HMAC tokens
NEXTAUTH_SECRET=                 # Auth token fallback secret

# Multi-Provider AI API Keys (Optional System Defaults)
GEMINI_API_KEY=                  # Google Gemini key
OPENAI_API_KEY=                  # OpenAI key
ANTHROPIC_API_KEY=               # Anthropic Claude key
GROQ_API_KEY=                    # Groq LPU key
DEEPSEEK_API_KEY=                # DeepSeek key
PERPLEXITY_API_KEY=              # Perplexity key
OPENROUTER_API_KEY=              # OpenRouter key

# Cloud Database & Storage (Optional)
SUPABASE_URL=                    # Default Supabase project URL
SUPABASE_ANON_KEY=               # Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
DATABASE_ENCRYPTION_SECRET=      # BYODB connection string encryption master key
```

### 15.2 Verification Commands
- Run test suites: `npm test` (`node --experimental-strip-types scripts/test-student-components.ts`)
- Production build: `npm run build`
- Start server: `npm run start`

---

## 16. Master Architectural File Index

| File Path | Core Subsystem Responsibilities |
|---|---|
| `app/page.tsx` | Main application entry, floating chrome, modal mounting, canvas layout |
| `app/globals.css` | Chrome design scale, Risograph CSS variables, typography definitions |
| `components/canvas/canvas.tsx` | Viewport gestures, dot grid, pan/zoom event routing, node container |
| `components/canvas/sketch.tsx` | SVG Rough.js compiler, Risograph tonal ladder, block shadows |
| `components/canvas/rough-renderer.tsx` | Rough.js primitive rendering for component previews |
| `components/canvas/text-edit-overlay.tsx` | Zero-jump baseline-matched inline text editing overlay |
| `lib/types.ts` | Complete node type hierarchy, document models, affine math |
| `lib/store.ts` | Central Zustand reactive store, actions, history stacks, snapshots |
| `lib/document-validator.ts` | Strict schema validation, sanitization, data URL security |
| `lib/canvas/hit-test.ts` | World-space hit testing, hollow shape click-through, line clipping |
| `lib/canvas/transform.ts` | 8-handle resizing, aspect ratio lock, multi-node cluster scaling |
| `lib/canvas/snap-engine.ts` | Screen-space guide lines, center/edge magnetic snapping, distances |
| `lib/canvas/text-metrics.ts` | Headless 2D canvas font metrics, word-wrapping, measurement probe |
| `lib/sketch/kit.ts` | Primitive constructors (`rect`, `pill`, `line`, `poly`, `text`, `icon`) |
| `lib/library/registry.ts` | Component registry, schema definitions, category grouping |
| `lib/library/defs-basic.ts` | Basic UI controls (buttons, inputs, toggles, sliders, badges) |
| `lib/library/defs-blocks-app.ts` | Product & workflow blocks (kanban, chat, analytics, settings) |
| `lib/library/defs-blocks-marketing.ts` | Marketing blocks (hero, pricing, features, testimonials, FAQ) |
| `lib/library/defs-student.ts` | 20 handcrafted education & student kit wireframe components |
| `lib/library/break-apart.ts` | One-way component decomposition engine into editable primitives |
| `lib/ai/orchestrator.ts` | Zenith AI intent classifier, prompt builder, action block parser |
| `lib/ai/action-executor.ts` | Atomic canvas mutation synthesizer, single-undo transaction engine |
| `lib/ai/byok-vault.ts` | Credential service facade, health check testing, masked key management |
| `lib/ai/encryption.ts` | Server-side AES-256-GCM authenticated encryption service |
| `lib/ai/model-registry.ts` | Multi-provider definitions, context windows, cost telemetry |
| `lib/ai/context-builder.ts` | Canvas state prompt serializer, deictic pronoun resolver |
| `lib/sketch-recognition/orchestrator.ts` | Sketch recognition coordinator, latency-stratified routing |
| `lib/sketch-recognition/geometry-recognizer.ts` | Deterministic 4-shape geometric classifier (<0.5ms) |
| `lib/sketch-recognition/cnn-engine.ts` | Vectorized in-browser CNN tensor engine (TypeScript) |
| `slm_ab/model.py` | Python 48-feature Small Language Model with geometric gates |
| `lib/data-providers/registry.ts` | BYODB provider factory, connection lifecycle, caching |
| `lib/data-providers/postgres-provider.ts` | Native PostgreSQL connection pool and query engine |
| `lib/data-providers/supabase-provider.ts` | Supabase PostgREST client with offline fallback caching |
| `lib/server-realtime.ts` | SSE collaboration room hub, ring buffer, presence broadcast |
| `lib/security.ts` | PBKDF2 password hashing, HMAC edit tokens, lockout rate limits |
| `lib/pdf-renderer.ts` | PDF.js high-DPI page renderer, worker configuration, thumbnail caching |
| `lib/pdf-types.ts` | Normalized [0..1] coordinate system, PDF annotation types |
| `components/pdf-classroom/smart-board-overlays.tsx` | Laser pointer, spotlight mask, 2.2x loupe, metric ruler |
| `lib/files.ts` | LocalStorage LRU persistence, 40-file window, quota eviction |
| `lib/export-image.ts` | Standalone SVG/PNG/PDF export pipeline, font inlining |

---
*Generated by Claude Code at Ultracode Effort Level (Comprehensive Architectural Synthesis).*
