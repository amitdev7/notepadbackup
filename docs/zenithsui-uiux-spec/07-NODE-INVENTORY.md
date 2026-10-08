# ZENITHSUI — UI/UX Specification
## Document 07: Complete Canvas Node & Content Inventory

---

### Node Type Architecture Overview
Every object on a Zenithsui canvas is a member of the flat `SquigNode` union type, identified by a unique `id` and stored in `Record<string, SquigNode>` with z-index ordering governed by `order: string[]`.

Below is the exhaustive specification for all **11 concrete node types**:

---

### Node 1: ShapeNode (`type: "shape"`)
- **Purpose**: Foundational geometric primitive for wireframing containers, screens, decision nodes, process flows, and interface cards.
- **Data Model**:
  ```typescript
  export interface ShapeNode extends BaseNode, Outlined {
    type: "shape"
    shape: "rect" | "ellipse" | "diamond"
    fill: "none" | "paper" | "light" | "strong"
    roundness?: boolean
    stroke?: "light" | "regular" | "heavy"
    dashed?: boolean
  }
  ```
- **Default Dimensions**:
  - `rect`: `w: 160`, `h: 100` (min: `10×10`)
  - `ellipse`: `w: 120`, `h: 120` (min: `10×10`)
  - `diamond`: `w: 120`, `h: 120` (min: `10×10`)
- **Visual Appearance**: Closed path rendered via Rough.js with double-pass hand-drawn strokes. Fill adheres strictly to the 3-tone ladder (`paper` pure white, `light` 8% wash, `strong` 20% wash). If `roundness: true`, corners use a gentle 8px sketch fillet.
- **Resize & Drag Behavior**: 8 bounding box handles; Shift constrains 1:1 aspect ratio. Free dragging across world space.
- **Editing & Typing**: Typing while a shape is selected automatically creates an aligned child text label.
- **Inspector Controls**: Shape Kind picker (`rect`, `ellipse`, `diamond`), Fill Tone segmented control, Stroke Weight selector, Dashed toggle, Roundness toggle.

---

### Node 2: DrawNode (`type: "draw"`)
- **Purpose**: Freehand ink sketching, gestures, handwritten notes, mathematical derivations, and freeform arrows.
- **Data Model**:
  ```typescript
  export interface DrawNode extends BaseNode, Outlined {
    type: "draw"
    points: [number, number][]
    stroke?: "light" | "regular" | "heavy"
    dashed?: boolean
  }
  ```
- **Default Dimensions**: Computed dynamically from the bounding box of freehand `points` array.
- **Visual Appearance**: Smooth Bézier curves connecting sample points rendered in active ink color with pressure modulation (heavier pressure widens stroke slightly).
- **Interactive Behavior**: Clicking selects the entire freehand stroke bounding box. Dragging moves the stroke. Corner handles scale the path proportionally.
- **Inspector Controls**: Stroke Weight (`light`, `regular`, `heavy`), Dashed toggle, Lock, Delete.

---

### Node 3: TextNode (`type: "text"`)
- **Purpose**: Headings, labels, notes, paragraphs, wireframe copy, and hyperlinked text annotations.
- **Data Model**:
  ```typescript
  export interface TextNode extends BaseNode {
    type: "text"
    text: string
    fontSize: number
    fixedW?: boolean
    align?: "left" | "center" | "right"
    bold?: boolean
    italic?: boolean
    underline?: boolean
    link?: string
  }
  ```
- **Default Dimensions**: Auto-hugs text metrics (default `fontSize: 18px`).
- **Modes**:
  - `auto-sized`: Box width expands as user types; height follows line breaks (`Enter`).
  - `fixedW: true`: Dragging side handles fixes measure; text auto-wraps; height grows with line count. Double-clicking side handle reverts to auto-sized.
- **Inline Editing**: Double-clicking launches `TextEditOverlay` (in-situ textarea matching font, size, line-height, and padding).
- **Hyperlinks**: If `link` is populated, text renders a hand-drawn underline and displays a clickable link icon navigating to the target URL.
- **Inspector Controls**: Font size scrub/stepper, Alignment buttons (Left, Center, Right), Bold, Italic, Underline, Link input field.

---

### Node 4: ArrowNode (`type: "arrow"`)
- **Purpose**: Directional flow arrows, connector lines, architecture relationships, and process pipelines.
- **Data Model**:
  ```typescript
  export interface ArrowNode extends BaseNode, Outlined {
    type: "arrow"
    points: [[number, number], [number, number]]
    head: boolean
    startBinding?: ArrowBinding | null
    endBinding?: ArrowBinding | null
    label?: string
  }
  ```
- **Visual Appearance**: Hand-drawn single stroke connecting start and end points. If `head: true`, a distinct risograph arrowhead is rendered at the destination.
- **Dynamic Bindings (`ArrowBinding`)**:
  - `elementId`: ID of shape being targeted.
  - `focus`: Parametric perimeter location (`0.0` to `1.0`).
  - `gap`: Clearance distance from shape perimeter (default 4px).
  - Moving connected shapes automatically recomputes arrow endpoints without manual adjustment.
- **Inline Label**: Double-clicking arrow opens an inline label editor bound to the path midpoint.
- **Inspector Controls**: Arrowhead toggle, Stroke weight, Dashed toggle, Reverse direction button.

---

### Node 5: ComponentNode (`type: "component"`)
- **Purpose**: Complex pre-built UI components and academic blocks (168 definitions in library registry) rendered as sketch primitives.
- **Data Model**:
  ```typescript
  export interface ComponentNode extends BaseNode {
    type: "component"
    kind: string
    props: Record<string, unknown>
  }
  ```
- **Categories & Groups**:
  - *Components (83)*: Buttons, Forms, Selection, Display, Feedback, Navigation, Data, Media.
  - *Blocks (85)*: Marketing, Content, Commerce, App, AI, Screens, Education (17 items including Mind Map, Formula Sheet, Revision Board, Study Timetable).
  - *Interactive Components*: `functional-calendar` renders full interactive DOM calendar.
- **Inspector Controls**: Dynamic `VariantControl` inputs defined in the component's registry definition (`select`, `toggle`, `text`, `number`).
- **Break Apart**: Inspector footer action decomposes the component into editable basic primitives.

---

### Node 6: ImageNode (`type: "image"`)
- **Purpose**: Pasted screenshots, reference mockups, photos, and visual design assets.
- **Data Model**:
  ```typescript
  export interface ImageNode extends BaseNode {
    type: "image"
    src: string // data:image/... base64
    naturalW: number
    naturalH: number
    name?: string
  }
  ```
- **Visual Appearance**: Pixel-accurate bitmap image framed in a subtle hand-drawn Risograph border ("photo taped to paper").
- **Interactive Behavior**: Resizing corner handles preserves natural aspect ratio (`naturalW / naturalH`).
- **Inspector Controls**: Dimensions display, Replace image, Export original, Lock, Delete.

---

### Node 7: DocumentNode (`type: "document"`)
- **Purpose**: First-class file attachments (PDFs, CSVs, JSON, Markdown, Code, Office docs) stored in local binary asset storage.
- **Data Model**:
  ```typescript
  export interface DocumentNode extends BaseNode {
    type: "document"
    assetId: string
    src?: string
    name: string
    mimeType: string
    extension?: string
    sizeBytes?: number
    pageCount?: number
    currentPage?: number
    thumbnailUrl?: string
    displayMode?: "preview" | "compact" | "icon"
    textContent?: string
    status?: "ready" | "uploading" | "local" | "syncing" | "error"
  }
  ```
- **Visual Appearance**:
  - `preview` mode: Renders rendered first-page canvas thumbnail with page stepper and title badge.
  - `compact` mode: Renders hand-drawn file card with file icon, name, and size.
  - `icon` mode: Minimalist badge.
- **Interactive Behavior**: Page stepper (`<` / `>`) flips pages on canvas. Double-click opens full-screen `DocumentViewerModal`. Context menu offers "Convert PDF to Canvas".
- **Inspector Controls**: Display Mode segmented control, Current Page stepper, Download File, Replace File, PDF-to-Canvas button.

---

### Node 8: StickyNoteNode (`type: "sticky"`)
- **Purpose**: Brainstorming notes, review comments, quick ideas, and retrospective cards.
- **Data Model**:
  ```typescript
  export interface StickyNoteNode extends BaseNode, Outlined {
    type: "sticky"
    text: string
    tone?: "yellow" | "blue" | "green" | "pink" | "orange"
    fontSize?: number
  }
  ```
- **Default Dimensions**: Square `200×200` (min: `80×80`).
- **Visual Appearance**: Subtle paper card with dog-eared corner shadow and tinted background tone. Hand-lettered centered text that auto-scales to fit the card area.
- **Editing**: Double-clicking opens in-situ text editing.
- **Inspector Controls**: Color Tone picker (Yellow, Blue, Green, Pink, Orange), Font Size, Stroke weight.

---

### Node 9: FrameNode (`type: "frame"`)
- **Purpose**: Visual presentation boundaries, screen framing (e.g. "Mobile Screen", "Desktop Viewport"), and export cropping frames.
- **Data Model**:
  ```typescript
  export interface FrameNode extends BaseNode {
    type: "frame"
    name: string
  }
  ```
- **Visual Appearance**: Neutral dashed hairline boundary with a top-left title tab.
- **Behavior**: Moving a frame automatically moves all elements contained within its bounding box. Double-clicking title allows inline renaming.
- **Inspector Controls**: Frame Name input, Frame presets dropdown (iPhone, iPad, Desktop, Presentation), Export Frame as PNG button.

---

### Node 10: EmbedNode (`type: "embed"`)
- **Purpose**: Live interactive embeds (Figma prototypes, YouTube videos, GitHub Gists, Google Docs).
- **Data Model**:
  ```typescript
  export interface EmbedNode extends BaseNode {
    type: "embed"
    url: string
    title?: string
  }
  ```
- **Visual Appearance**: Sandboxed `<iframe>` container framed in a sketch border with a top address bar header.
- **Inspector Controls**: Embed URL input, Reload button, Open in New Tab link.

---

### Node 11: FolderNode (`type: "folder"`)
- **Purpose**: First-class navigable container representing an independent child whiteboard document without recursive JSON nesting.
- **Data Model**:
  ```typescript
  export interface FolderNode extends BaseNode {
    type: "folder"
    childBoardId: string
    folderTitle: string
    itemCount?: number
    previewNodes?: Record<string, unknown>
  }
  ```
- **Default Dimensions**: `w: 220`, `h: 160` (min: `140×100`).
- **Visual Appearance**: Hand-drawn Risograph folder envelope with an indexed top file tab (`BOARD ↗`), folder envelope outline, header divider, folder title, item count badge (`n items`), open action prompt (`Double-click or Enter to open ↗`), and an interior preview viewport box.
- **Interactive Traversal**:
  - **Double-click** or **Enter key** navigates directly into the child whiteboard document.
  - Top Bar breadcrumbs update dynamically.
  - Duplicating a folder deep-clones the entire child board tree (`duplicateBoardTree`).
- **Inspector Controls**: Folder Title input (synced live with child document name), Child Document ID display, "Open Whiteboard ↗" action button.
