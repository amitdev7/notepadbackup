# ZENITHSUI — UI/UX Specification
## Document 06: Deep Canvas UX & Interaction Engine

---

### 1. Coordinate System & Space Transformations

The Zenithsui canvas operates on two distinct coordinate spaces:
1. **World Space (`wx`, `wy`)**: Infinite Cartesian plane in floating-point pixels where all node positions (`n.x`, `n.y`), dimensions (`n.w`, `n.h`), and freehand stroke points are persistently authored and stored in document state.
2. **Screen Space (`sx`, `sy`)**: Device pixel coordinates relative to the browser viewport `<canvas>` / `<svg>` element.

The bidirectional transformations are strictly implemented via:
```typescript
export function worldToScreen(v: Viewport, wx: number, wy: number): [number, number] {
  return [wx * v.zoom + v.x, wy * v.zoom + v.y]
}

export function screenToWorld(v: Viewport, sx: number, sy: number): [number, number] {
  return [(sx - v.x) / v.zoom, (sy - v.y) / v.zoom]
}
```

---

### 2. Viewport Mechanics: Zoom, Pan & Autopan

- **Zoom Range**:
  - `MIN_ZOOM`: `0.1` (10% scale). Allows bird's-eye architectural overviews of massive multi-screen flows.
  - `MAX_ZOOM`: `4.0` (400% scale). Allows microscopic inspection of vector strokes and fine hand-lettering.
  - **Focal Zoom**: Zooming via wheel/trackpad scales towards the pointer position (`pointer [sx, sy]`), preventing the drawing from jumping off-screen.
- **Panning Mechanics**:
  - **Spacebar + Drag**: Temporarily switches any active tool into pan mode. Releasing Spacebar returns to the previous tool with zero state loss.
  - **Middle Mouse Drag**: Instant panning on three-button mice.
  - **Two-Finger Trackpad Gesture**: Smooth 2D translation via native `wheel` delta.
  - **Hand Tool (`H`)**: Permanent single-finger / primary button pan mode.
- **Autopan at Viewport Boundaries**:
  - When dragging nodes, marquee boxes, or resize handles within **40px (`AUTOPAN_EDGE`)** of the viewport boundary, the viewport automatically glides in that direction.
  - Velocity scales proportionally up to **22px/frame (`AUTOPAN_MAX_SPEED`)**, allowing users to drag elements across vast canvas distances without manual panning.

---

### 3. Selection & Grouping Engine

- **Single Click Selection**:
  - Clicking a node selects it and clears prior selection.
  - **Outer Group Rule (`outerGroup`)**: If a clicked node belongs to a group (`groupIds`), the outermost group is selected as a single unified bounding box.
- **Marquee (Lasso/Box) Selection**:
  - Dragging on empty canvas casts a selection marquee rectangle.
  - Any node whose bounding box intersects the marquee is captured in `selection: string[]`.
- **Shift-Click Toggle**:
  - Holding `Shift` while clicking nodes or dragging a marquee toggles membership without clearing existing selections.
- **Locking Behavior (`locked: true`)**:
  - Locked nodes ignore drag, resize, alignment, and deletion gestures.
  - Clicking a locked node displays a small padlock indicator. Unlocking requires the Inspector toggle or context menu action.

---

### 4. Geometry Transformations & Handle Ergonomics

When 1 or more nodes are selected, a selection bounding box is computed (`unionBounds`):

```
       (nw) ┌───────────────(n)───────────────┐ (ne)
            │                                 │
        (w) │         SELECTION BOX           │ (e)
            │      [ x, y, w, h metrics ]     │
       (sw) └───────────────(s)───────────────┘ (se)
```

- **8 Transform Handles**:
  - 4 Corners: `nw`, `ne`, `se`, `sw` (scale both width and height).
  - 4 Edges: `n`, `s`, `w`, `e` (scale along single axis).
- **Proportional Constraint**: Holding `Shift` while dragging corner handles locks the aspect ratio.
- **Minimum Size Guard**: Elements cannot be crushed below `10px` (`MIN_SIZE = 10`), preventing inverted or negative-dimension rendering anomalies.
- **Keyboard Nudges**:
  - Arrow keys (`↑`, `↓`, `←`, `→`): Nudge selected elements by **1px**.
  - `Shift` + Arrow keys: Nudge selected elements by **10px** (or snap increment).
- **Flipping**: Horizontal (`flipX`) and Vertical (`flipY`) mirror coordinates and primitives along the element's own center axis.

---

### 5. Snapping & Alignment Engine

- **Grid Snapping**: Canvas features an optional dot grid (`grid: true`). When active, node origins snap to grid increments.
- **Object-to-Object Snapping (`SNAP_THRESHOLD = 6px`)**:
  - Moving or resizing elements detects adjacent bounding box edges (left, center, right, top, middle, bottom).
  - When within 6 screen pixels, the geometry magnetically snaps, and a subtle risograph alignment guide line flashes on the canvas.
- **Distribution**:
  - `Distribute Horizontally`: Spaces 3+ selected items with equal horizontal gaps.
  - `Distribute Vertically`: Spaces 3+ selected items with equal vertical gaps.

---

### 6. Dynamic Connectors & Arrow Bindings

Zenithsui features smart connected arrows (`ArrowNode`):
- **Dynamic Element Bindings (`ArrowBinding`)**:
  - An arrow's start or end point can bind to any canvas element (`elementId`).
  - `focus` represents the parametric position along the bound element's perimeter (`0.0` to `1.0`).
  - `gap` specifies the offset distance from the shape edge (default 4px).
- **Interactive Relocation**: Moving either connected shape causes the arrow path to automatically stretch, angle, and re-anchor without breaking connections.
- **Arrow Labels**: Midpoint text labels automatically translate and rotate to stay legible along the arrow's trajectory.

---

### 7. Text Reflow & Typography Engine

Text layers operate in two distinct modes:
1. **Auto-Sized Text (Default)**:
   - Box hugs the entered characters tightly.
   - Lines break only when the user explicitly presses `Enter`.
   - Adding characters expands the box width automatically.
2. **Fixed-Width Wrapped Text (`fixedW: true`)**:
   - Dragging a side handle (`w` or `e`) locks the text width to a fixed measure.
   - Words automatically reflow and wrap into multi-line paragraphs; height (`h`) expands dynamically to accommodate the line count.
   - **Double-clicking a side handle** clears `fixedW` and restores auto-sizing.
- **Inline Editing**: Double-clicking any text node opens `TextEditOverlay`, rendering an exact-scale textarea directly over the canvas text position, allowing seamless typography editing.

---

### 8. First-Class Embedded Documents & Media

- **PDF & File Nodes (`DocumentNode`)**:
  - PDFs render directly on the canvas with thumbnail previews, page numbers, and page-flip controls.
  - Double-clicking opens the full-screen `DocumentViewerModal`.
  - Non-PDF files (CSV, JSON, Markdown, TXT) render compact risograph file cards with live text snippet previews.
- **Interactive Widgets on Canvas**:
  - Special `ComponentNode` items (e.g. `functional-calendar`) render interactive React DOM components directly on the infinite canvas (`INTERACTIVE_COMPONENTS`).
  - Users can click calendar days, toggle views (Month / Week / Agenda), add events, and drag agenda tasks without leaving the drawing surface.

---

### 9. Nested Whiteboards (Folder Nodes)

- **First-Class Canvas Object**: Appears as a hand-drawn Risograph folder envelope with an indexed top tab (`BOARD ↗`), title, and child item count badge.
- **Navigable Traversal**:
  - Double-clicking or pressing `Enter` transitions seamlessly into the independent child whiteboard.
  - The browser URL syncs `?b=[childBoardId]`.
  - The Top Bar updates the cycle-safe breadcrumb trail (`getBoardAncestors`).
  - Pressing the Top Bar parent button (`<`) returns to the parent canvas.
