# ZENITHSUI — UI/UX Specification
## Document 02: Information Architecture & Navigation

---

### 1. Structural Information Hierarchy

Zenithsui organizes content into a clean, hierarchical mental model that balances high-level workspace project management with recursive whiteboard nesting:

```
WORKSPACE (e.g. "Personal", "Academics", "Design Studio")
  │
  └── PROJECT (e.g. "Biology 101", "Mobile App Redesign", "Q3 Pitch")
        │
        └── BOARD / DOCUMENT (e.g. "System Architecture.sq")
              │
              ├── CANVAS NODES (Shapes, Drawings, Text, Arrows, Images)
              │
              ├── COMPONENT NODES (Buttons, Tables, Calendars, Forms)
              │
              ├── DOCUMENT ASSETS (Embedded PDFs, CSVs, JSON, Notes)
              │
              └── FOLDER NODES (First-Class Navigable Child Boards)
                    │
                    └── CHILD BOARD (Independent Flat Whiteboard Document)
                          │
                          └── GRANDCHILD FOLDERS & NODES (Arbitrary Recursive Depth)
```

---

### 2. Complete Application Route Inventory

The following table documents every page route registered in the Next.js App Router:

| Route Path | Type | Purpose | Key Parameters & State |
| :--- | :---: | :--- | :--- |
| `/` | Client Page | **Main Infinite Whiteboard Canvas**. The default creative workspace. | `?doc=[id]` (open specific doc)<br>`?b=[boardId]` (deep-link to child board) |
| `/dashboard` | Client Page | **Document & Project Management Hub**. | Tabs: `recent`, `projects`, `shared`, `trash` |
| `/kitchen-sink` | Client Page | **Design System Visual Registry**. Dev & design showcase for all 168 component definitions. | Scale slider, Category filter (`components`, `blocks`) |
| `/share/[token]` | Dynamic Page | **Encrypted Public Board Viewer**. Renders a shared canvas without requiring login. | `[token]`, optional password hash verification |
| `/invite/[token]` | Dynamic Page | **Collaboration Invite Acceptance**. Handles incoming workspace/board invites. | `[token]`, accepts invite and redirects to doc |
| `/lan/view/[sessionId]` | Dynamic Page | **Zero-Cloud Classroom LAN Viewer**. Read-only real-time broadcast of teacher's canvas. | `[sessionId]`, connects via WebRTC / WebSocket transport |
| `/p/[slug]` | Dynamic Page | **Public Slug Viewer**. Human-readable vanity URLs for published wireframes. | `[slug]`, loads published document snapshot |

---

### 3. Application Chrome Navigation Surfaces

Zenithsui’s interface consists of five persistent or triggered chrome surfaces:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (Floating Pill)                                                      │
│ [ < Parent ] [ Breadcrumbs: Root / Folder / Current ] [ 📁 Files ˅ ] [ ● ]   │
└──────────────────────────────────────────────────────────────────────────────┘
                                  CANVAS
             (Infinite 2D Workspace with Pan, Zoom & Nodes)
┌──────────────────────────────────────────────────────────────────────────────┐
│ BOTTOM DOCK (Floating Island)                                                │
│ [zenithsui ˅] │ [V][H][R][P][E][A][T][S][F][K][✦] │ [🔍][📊][📄][⚙] │ [- 100% +]│
└──────────────────────────────────────────────────────────────────────────────┘
```

#### A. The Top Bar (`components/shell/top-bar.tsx`)
Floating at the top center of the screen, the Top Bar serves as the document anchor:
- **Parent Return Button (`<`)**: Appears only when inside a child whiteboard; clicking returns immediately to parent board.
- **Hierarchical Breadcrumbs**: Cycle-safe ancestor trail (e.g. `Research / Paper / Diagrams`). Clicking any ancestor segment navigates directly to that board level.
- **Document Title Field**: Inline editable title (`untitled scribbles` by default). Pressing Enter or clicking away commits the rename and updates IndexedDB immediately.
- **Files Popover Button (`📁 Files ˅`)**: Opens the document drawer showing saved canvases, disk open, export copy, and Wi-Fi sync status.
- **Sync Status Dot (`●`)**: Green when saved/synced, pulsing amber during background upload, red on error.

#### B. The Bottom Dock (`components/shell/bottom-dock.tsx`)
The primary floating interaction dock positioned at `bottom-4` (Mac-style floating dock):
1. **Brand Menu (`zenithsui ˅`)**:
   - `New Canvas`
   - `Open / Recent...` (navigates to `/dashboard`)
   - `Share...` (opens Share Dialog)
   - `Publish on Wi-Fi...` (LAN classroom broadcast)
   - `Version History` (snapshot timeline panel)
   - `Undo` (⌘Z) / `Redo` (⇧⌘Z)
   - `Settings...` (opens Settings Dialog)
   - `Reset View` (⌘0)
   - `Clear Canvas` (destructive action with confirm dialog)
   - `GitHub` link
2. **Tool Segment**:
   - Select (`V`), Pan/Hand (`H`), Shape (`R`), Draw/Pen (`P`), Eraser (`E`), Arrow (`A`), Text (`T`), Sticky Note (`S`), Frame (`F`), Laser Pointer (`K`), Library (`L`).
3. **Utility Segment**:
   - Canvas Search (`⌘F`), Canvas Statistics (`⌘/`), Page & Canvas Inspector (`File`), System Settings (`Gear`).
4. **Zoom Controls**:
   - Zoom Out (`-`), Zoom Reset to 100% (`100%`), Zoom In (`+`).

#### C. The Inspector Panel (`components/chrome/inspector.tsx`)
Positioned on the right edge of the screen:
- **Page Mode (Nothing Selected)**: Edits global paper shade (`white`, `subtle`, `shaded`), dot grid toggle, active Risograph ink palette, canvas font face (`hand`, `sans`, `serif`), and context menu toggle.
- **Selection Mode (1+ Nodes Selected)**: Dynamically displays only the sections relevant to the active selection:
  - Position & Geometry (`X`, `Y`, `W`, `H`)
  - Alignment & Distribution (Left, Center, Right, Top, Middle, Bottom, Distribute H/V)
  - Fill Tone Ladder (`none`, `paper`, `light`, `strong`)
  - Outline & Stroke (`light`, `regular`, `heavy`, `dashed`)
  - Shape Roundness toggle
  - Text Formatting (size, alignment, bold, italic, underline, link)
  - Component Variant Controls (props defined in component registry)
  - Folder Controls (folder title, open child whiteboard)
  - Document Controls (page selector, download asset, replace file)
  - Layer Actions (Lock/Unlock, Flip H/V, Break Apart, Delete)

#### D. The Command Palette (`components/chrome/command-palette.tsx`)
Triggered globally via `⌘K` or `Ctrl+K`:
- Unified fuzzy search across all application tools, canvas actions, recent files, and the entire 168-item component and block library.
- Selecting any component immediately places it at the current canvas center.

#### E. Overlays & Specialized Dialogs
- **Settings Dialog** (`components/shell/settings-dialog.tsx`): 15-category two-pane macOS style settings dialog.
- **Library Panel** (`components/chrome/library-panel.tsx`): Drawer with search, categories, and live component previews.
- **Shortcuts Sheet** (`components/chrome/shortcuts-sheet.tsx`): Triggered via `?`, displaying categorized keyboard shortcuts.
- **Share Dialog** (`components/chrome/share-dialog.tsx`): Link generation, role assignments, password protection.
- **PDF-to-Canvas Dialog** (`components/canvas/pdf-to-canvas-dialog.tsx`): Multi-page PDF extraction and conversion tool.
- **Trash Recovery Dialog** (`components/chrome/trash-dialog.tsx`): Soft-deleted document restore and permanent wipe.
