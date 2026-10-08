# ZENITHSUI — UI/UX Specification
## Document 05: Complete Screen & Surface Inventory

---

### Inventory Index & Categorization
The Zenithsui application surface comprises **7 primary standalone page routes** and **13 critical overlay/dialog surfaces**. Every entry below has been audited and verified in the live running application.

---

### Screen SCR-01: Main Whiteboard Canvas
- **Screen ID**: `SCR-01`
- **Name**: Main Whiteboard Canvas
- **Route**: `/` (with optional `?doc=[id]` and `?b=[boardId]`)
- **Purpose**: The core infinite creative workspace for freehand sketching, geometric wireframing, document attachment, and nested whiteboard exploration.
- **User Types**: All personas (Elena, Marcus, Aarav, Dr. Jenkins, Chloe).
- **Entry Points**: Direct URL, browser bookmark, clicking "Back to Canvas" from Dashboard, accepting an invite.
- **Exit Points**: Navigating to `/dashboard`, closing tab, clicking external link.
- **Parent Screen**: Root application surface.
- **Child Screens / Overlays**: SCR-08 (Settings), SCR-09 (Library), SCR-10 (Command Palette), SCR-11 (Files Popover), SCR-12 (PDF Converter), SCR-13 (Document Viewer), SCR-14 (Version History), SCR-15 (Trash), SCR-16 (Wi-Fi Publish), SCR-17 (Stats), SCR-18 (Search), SCR-19 (Conflict), SCR-20 (Shortcuts).
- **Primary Actions**: Select tools (`V`, `H`, `R`, `P`, `E`, `A`, `T`, `S`, `F`, `K`, `L`), draw geometry, pan/zoom canvas, edit text, place components.
- **Secondary Actions**: Change look (theme/paper/font), open settings, export image, share document, undo/redo.
- **Navigation Elements**: TopBar floating pill, BottomDock floating island, Right Inspector panel, Floating Context Row.
- **Required Components**: `Canvas`, `TopBar`, `BottomDock`, `Inspector`, `EmptyCanvas`, `Sketch`, `LaserOverlay`.
- **Data Dependencies**: `SquigState` (Zustand), IndexedDB (`zenithsui:documents`), asset store (`zenithsui:assets`).
- **Responsive Behavior**:
  - *Desktop*: TopBar centered, BottomDock floating with full tools + zoom controls, Inspector fixed on right edge.
  - *Tablet*: Inspector becomes collapsible drawer; dock remains centered; touch gestures (pinch-zoom, two-finger pan) enabled.
  - *Mobile*: Zoom controls hide in dock; dock becomes horizontally scrollable with safe-area padding; TopBar breadcrumbs truncate with ellipsis; Inspector becomes bottom slide-sheet.
- **States**:
  - *Empty State*: Zenithsui Bear Mascot centered with rotating caption ("napkin first, pixels later").
  - *Loading State*: Centered text: *"warming up the pencils…"*.
  - *Error State*: Notice flash banner at top right: *"Unable to load canvas document"*.
  - *Offline State*: TopBar sync dot turns neutral gray; tooltip: *"Offline (Saved Locally)"*.
- **Keyboard Interactions**: Complete mapping of single-key tools (`V`, `H`, `R`, `P`, `E`, `A`, `T`, `S`, `F`, `K`, `L`), modifier actions (`⌘Z`, `⇧⌘Z`, `⌘C`, `⌘V`, `⌘D`, `⌘A`, `⌘\`, `⌘K`, `⌘F`, `⌘/`, `?`).

---

### Screen SCR-02: Document Management Dashboard
- **Screen ID**: `SCR-02`
- **Name**: Document & Project Dashboard
- **Route**: `/dashboard`
- **Purpose**: Workspace organization, recent file management, project grouping, shared document discovery, and trash recovery.
- **User Types**: Product designers, architects, students managing multiple boards.
- **Entry Points**: Dock menu -> "Open / Recent...", TopBar logo click.
- **Exit Points**: Clicking any document card (opens `/?doc=[id]`), clicking "Back to Canvas" link.
- **Layout**: 2-column layout: Left navigation sidebar (`w-60`) + Right scrollable document grid.
- **Sidebar Elements**:
  - Logo (`zenithsui`)
  - Workspace Switcher dropdown
  - `+ New Drawing` primary button
  - Navigation tabs: `Recent`, `Projects`, `Shared with me`, `Trash`
  - Bottom link: `← Back to Canvas`
- **Header**: Tab title (`Recent Drawings`, `Projects`, `Shared with Me`, `Trash`).
- **Document Cards Grid**:
  - Responsive multi-column grid (`grid-cols-1 sm:2 md:3 lg:4`).
  - Card anatomy: Preview thumbnail box showing node count badge, document title, update timestamp, privacy badge (`🔒 Private`, `🔗 Shared`, `🌐 Public`).
- **Empty States**:
  - Recent: *"No drawings yet. Start a new wireframe on the napkin canvas."*
  - Shared: *"No shared documents. Documents shared with your account will appear here."*
  - Trash: *"Trash is empty. Documents you delete will show up here."*
- **Responsive Behavior**: On mobile, sidebar collapses into top hamburger navigation; grid shifts to single column.

---

### Screen SCR-03: Kitchen Sink Component Registry
- **Screen ID**: `SCR-03`
- **Name**: Kitchen Sink Registry Showcase
- **Route**: `/kitchen-sink`
- **Purpose**: Comprehensive developer and designer showcase rendering all 168 library definitions at 100% scale and squeezed test scales.
- **User Types**: Design system engineers, UI QA auditors, developers authoring new components.
- **Entry Points**: Direct URL `/kitchen-sink`, documentation link.
- **Exit Points**: Browser back button.
- **Controls**:
  - Sticky header: Total def count badge (`168 defs`), category tabs (`components`, `blocks`), interactive scale slider (`50%` to `150%`).
- **Content Sections**:
  - Buttons (7 items), Forms (13 items), Selection, Navigation, Display, Feedback, Data, Media, Marketing, Content, Commerce, App, AI, Screens, Education (17 items).
- **Cell Anatomy**: Hand-drawn SVG preview card on `var(--sq-bg)`, component title, kind identifier, dimensions badge (`220×62`), error banner if render throws.

---

### Screen SCR-04: Encrypted Public Share Viewer
- **Screen ID**: `SCR-04`
- **Name**: Public Share Canvas Viewer
- **Route**: `/share/[token]`
- **Purpose**: Read-only, zero-login canvas viewer for clients, reviewers, and students accessing shared boards.
- **User Types**: Collaborating Reviewers (Chloe), Students, External Stakeholders.
- **Entry Points**: Following a shared link `https://.../share/abcdef123`.
- **Exit Points**: Closing browser window, exporting PNG.
- **Key Features**:
  - Client-side decryption if password-protected (`lib/security/share-crypto.ts`).
  - Read-only infinite canvas navigation (pan, zoom, fit to content).
  - Folder nodes remain interactive: double-clicking navigates into child whiteboards.
  - Simplified chrome: minimal top pill showing document name, read-only indicator, and "Export PNG" button. Zero edit tools displayed.

---

### Screen SCR-05: Collaboration Invite Acceptance
- **Screen ID**: `SCR-05`
- **Name**: Invite Acceptance Portal
- **Route**: `/invite/[token]`
- **Purpose**: Welcomes users invited to a collaborative workspace or document, verifies permissions, and redirects to the board.
- **User Types**: Team members invited via email.
- **States**:
  - Valid token: Displays workspace name, inviter avatar, role granted (`Editor` / `Viewer`), and "Accept Invite" primary button.
  - Expired / Invalid token: Displays error card with "Request New Invite" button.

---

### Screen SCR-06: Local Wi-Fi Classroom Viewer
- **Screen ID**: `SCR-06`
- **Name**: Zero-Cloud Classroom LAN Viewer
- **Route**: `/lan/view/[sessionId]`
- **Purpose**: Students on local school/university Wi-Fi watch the teacher's live canvas broadcast without internet connectivity.
- **User Types**: Students (Aarav).
- **Features**: Real-time canvas mirror via local WebRTC/WebSocket; live laser pointer tracking; "Save Snapshot PDF" floating action button.

---

### Overlay SCR-08: Master Settings Modal
- **Screen ID**: `SCR-08`
- **Component**: `components/shell/settings-dialog.tsx`
- **Trigger**: Bottom Dock Gear icon, Brand Menu -> "Settings...", Command Palette -> "Settings".
- **Dismiss**: Escape key, clicking backdrop, close button (`X`).
- **Layout**: 2-pane macOS style settings modal: Left sidebar listing 15 categories, Right content panel.
- **Categories**:
  1. `General`: Start page (`Canvas` vs `Dashboard`), Language selector, Confirm destructive actions toggle, Auto-save frequency indicator.
  2. `Appearance`: Theme mode (`Light`, `Dark`, `System`), UI Accent selector (7 options), UI Density (`Comfortable`, `Compact`), Animation mode (`Full`, `Reduced`).
  3. `Canvas`: Presentation controls, show canvas UI, show dock, show zoom controls, status indicators.
  4. `Page`: Default paper shade, default ink palette, default grid toggle.
  5. `Keyboard`: Navigation hotkeys, customizable shortcuts table.
  6. `Files & Storage`: Local database metrics, storage quota, cache wipe, export all data.
  7. `Cloud & Sync`: Supabase connection status, cloud backup toggle, account linkage.
  8. `Sharing`: Default link permissions, password requirements.
  9. `Notifications`: Study reminders, sound effects toggle.
  10. `Wi-Fi & LAN`: Local broadcast name, discovery port, peer list.
  11. `Privacy & Security`: Local-first retention policies, telemetry opt-out.
  12. `Accessibility`: High-contrast mode, large text mode, screen-reader hints.
  13. `Advanced`: WebGL / SVG render flags, memory profiler.
  14. `About`: App version (`v0.1.0`), build number, open-source acknowledgments.
  15. `Coming Soon`: Feature roadmap, experimental labs flags.

---

### Overlay SCR-09: Unified Library Drawer / Panel
- **Screen ID**: `SCR-09`
- **Component**: `components/chrome/library-panel.tsx`
- **Trigger**: Bottom Dock Sparkle icon, `L` key, Command Palette.
- **Layout**: Floating bottom-docked sheet or side drawer with sticky search and filter bar.
- **Anatomy**:
  - Search input with placeholder: *"Search components, wireframe blocks, formulas, syllabus cards..."*
  - Filter pills: `All (168)`, `Components (83)`, `Blocks (85)`, `Templates (29)`.
  - Category horizontal chip scroller: `All`, `Education`, `Buttons`, `Forms`, `Navigation`, `Cards`, `Data`, `Display`, `Feedback`, `Marketing`, `Screens`, `Commerce`.
  - Grid of interactive cards showing component names, group badges, and live hand-drawn preview thumbnails.
  - Footer action indicator: *"Click to select • Drag to canvas • Esc to close"*.

---

### Overlay SCR-10: Command Palette Overlay
- **Screen ID**: `SCR-10`
- **Component**: `components/chrome/command-palette.tsx`
- **Trigger**: `⌘K` or `Ctrl+K`.
- **Anatomy**: Floating modal with search input, keyboard navigation (`↑`/`↓`/`Enter`), categorized command list (Tools, Actions, Recent Files, Library Components).

---

### Overlay SCR-11: Document Files Popover
- **Screen ID**: `SCR-11`
- **Component**: `components/chrome/files-popover.tsx`
- **Trigger**: Clicking `📁 Files ˅` in the Top Bar.
- **Anatomy**: Floating popover card anchored under the Top Bar pill:
  - Header: `Canvas Files` (document count), `+ New Canvas` primary button.
  - List of recent local documents with active document checkmark.
  - Sub-board badges for nested documents.
  - Action footer: `📁 Open disk file`, `⤓ Export copy`.
  - Status bar: `📶 Same Wi-Fi Sync Active`, `Auto-saving`.

---

### Overlay SCR-12: PDF-to-Canvas Converter Modal
- **Screen ID**: `SCR-12`
- **Component**: `components/canvas/pdf-to-canvas-dialog.tsx`
- **Trigger**: Dropping a PDF and choosing "Convert to Canvas", or selecting a PDF `DocumentNode` and clicking "Convert".
- **Anatomy**: Modal dialog showing page thumbnail grid, multi-select checkboxes for pages, resolution selector, and "Import Selected Pages as Wireframes" action button.

---

### Overlay SCR-13: Fullscreen Document Asset Viewer Modal
- **Screen ID**: `SCR-13`
- **Component**: `components/canvas/document-viewer-modal.tsx`
- **Trigger**: Double-clicking an attached PDF, CSV, JSON, or Markdown `DocumentNode` on the canvas.
- **Anatomy**: Fullscreen backdrop, top navigation bar with page stepper, download button, and pan-zoomable high-resolution document viewer.

---

### Overlay SCR-14: Version History Rollback Panel
- **Screen ID**: `SCR-14`
- **Component**: `components/chrome/version-history-panel.tsx`
- **Trigger**: Dock menu -> "Version History".
- **Anatomy**: Side panel listing chronological autosave and manual snapshots with timestamp, node count diff, and "Restore this version" button.

---

### Overlay SCR-15: Trash & Document Recovery Dialog
- **Screen ID**: `SCR-15`
- **Component**: `components/chrome/trash-dialog.tsx`
- **Trigger**: Dashboard Trash tab, Dock menu -> "Trash...".
- **Anatomy**: Modal listing soft-deleted documents with deletion date, "Restore" action, and "Empty Trash Permanently" button.

---

### Overlay SCR-16: Wi-Fi Classroom Publish Dialog
- **Screen ID**: `SCR-16`
- **Component**: `components/chrome/wifi-publish-dialog.tsx`
- **Trigger**: Dock menu -> "Publish on Wi-Fi...".
- **Anatomy**: Modal showing broadcast toggle, local IP URL (`http://192.168.1.4:3000/lan/view/...`), large QR code, and connected peer counter.

---

### Overlay SCR-17: Canvas Statistics Modal
- **Screen ID**: `SCR-17`
- **Component**: `components/canvas/canvas-stats.tsx`
- **Trigger**: Bottom Dock ChartBar icon, `⌘/` shortcut.
- **Anatomy**: Floating modal displaying Total Elements, Selected Elements, Category Breakdown (Shapes, Text, Arrows, Images, Documents, Stickies, Frames), Zoom Level, History Depth, and JSON Document Payload size in KB.

---

### Overlay SCR-18: Canvas Search Overlay
- **Screen ID**: `SCR-18`
- **Component**: `components/canvas/canvas-search.tsx`
- **Trigger**: Bottom Dock MagnifyingGlass icon, `⌘F` shortcut.
- **Anatomy**: Floating top-right pill with search input, result match counter (`1 of 8`), `Prev` / `Next` buttons, and automatic canvas viewport pan-to-match on selection.

---

### Overlay SCR-19: Conflict Resolution Modal
- **Screen ID**: `SCR-19`
- **Component**: `components/chrome/conflict-dialog.tsx`
- **Trigger**: Background cloud sync detecting divergent vector clock timestamp.
- **Anatomy**: Side-by-side visual diff comparison ("Local Version" vs "Remote Version") with three action buttons: "Keep Local", "Keep Remote", "Fork to New Board".

---

### Overlay SCR-20: Keyboard Shortcuts Cheat Sheet Modal
- **Screen ID**: `SCR-20`
- **Component**: `components/chrome/shortcuts-sheet.tsx`
- **Trigger**: Pressing `?` key on canvas.
- **Anatomy**: Multi-column dialog displaying grouped keyboard shortcuts: Tools, Selection, Canvas Navigation, Geometry Transformation, File Actions.
