# 12 — Zenithsui Interaction System & Input Engine

## 1. Multi-Modal Input Architecture

Zenithsui is designed for seamless, simultaneous interaction across five distinct input modalities without requiring explicit mode switches:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERACTION INPUT MATRIX                        │
│                                                                        │
│   [Precision Mouse]       [Multi-Touch Trackpad]     [Touch Screen]    │
│   • Sub-pixel coordinates • 2-finger pan & pinch     • Tap to select   │
│   • Right-click menus     • Momentum physics         • Pinch-to-zoom   │
│   • Middle-click pan      • Smart zoom taps          • Long-press menu │
│                                                                        │
│   [Stylus / Pencil]       [Mechanical Keyboard]                        │
│   • Pressure drawing      • Single-key tool switches (V, R, P, T...)  │
│   • Tilt-based strokes    • Nudge (Arrows / Shift+Arrows)             │
│   • Palm rejection        • Modal command shortcuts (⌘K, ⌘Z, ⌘C...)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canvas Spatial Gestures

| Gesture / Event | Primary Input | Behavior | Edge Cases & Modifiers |
|:---|:---|:---|:---|
| **Pan Canvas** | `Space + Drag` or Middle Click or Two-Finger Drag | Shifts viewport `(x, y)` | Infinite canvas never hits boundary stops |
| **Zoom Viewport** | `Cmd + Wheel` or Trackpad Pinch | Zooms in/out anchored to current cursor point `(cx, cy)` | Clamped between `10%` and `500%` |
| **Marquee Select** | Drag on empty canvas with Select Tool (`V`) | Draws a selection bounding box | Nodes intersecting box are highlighted |
| **Shift + Marquee** | `Shift + Drag` | Inverts selection of encompassed nodes | Adds to or removes from active selection |
| **Direct Drag** | Click & drag node | Translates all selected nodes | Snaps to geometry edges and center axes of peers |
| **Alt + Drag** | `Alt / Option + Drag` node | Duplicates selected nodes in-place and drags copy | Retains original nodes at their initial positions |
| **Resize** | Drag any of 8 bounding box handles | Resizes node width and height | `Shift` preserves aspect ratio; `Alt` resizes from center |
| **Connector Pull** | Drag from cardinal anchor point (`top`, `bottom`, `left`, `right`) | Spawns arrow/line connector that snaps to target nodes | Auto-routes elbow or curved paths |
| **Double Click** | Double click on text or shape | Opens inline live text editor with blinking cursor | Auto-expands node bounds as user types |
| **Laser Trail** | Drag with Laser Tool (`K`) | Emits temporary glowing light trail | Disintegrates smoothly after 1.5 seconds |

---

## 3. Keyboard Engine & Single-Key Tool Switching

Zenithsui implements immediate single-key tool switches without modifier friction:

### Primary Drawing Tools
- `V`: **Select Tool** (Pointer selection and transform)
- `H`: **Hand Tool** (Canvas panning)
- `R`: **Rectangle Shape** (Rounded or sharp wireframe box)
- `O`: **Ellipse Shape** (Circle or oval)
- `D`: **Diamond Shape** (Flowchart decision rhombuses)
- `P`: **Draw Tool** (Freehand rough pencil)
- `E`: **Eraser Tool** (Instant element removal on hover/drag)
- `A`: **Arrow Tool** (Directed connector line)
- `L`: **Line Tool** (Straight divider stroke)
- `T`: **Text Tool** (Freeform typing)
- `F`: **Frame Tool** (Artboard / Page container)
- `K`: **Laser Pointer** (Presentation spotlight)

### Arrangement & Canvas State Shortcuts
- `⌘ + [` / `⌘ + ]`: Send backward / Bring forward
- `⌥ + ⌘ + [` / `⌥ + ⌘ + ]`: Send to bottom / Bring to top
- `⌘ + G`: Group selected nodes
- `⇧ + ⌘ + G`: Ungroup selected nodes
- `⌘ + L`: Lock / Unlock selected nodes
- `⇧ + H` / `⇧ + V`: Flip horizontally / Flip vertically
- `Arrow Keys`: Nudge by `1px` (or `10px` with `Shift`)
- `⌘ + 0`: Reset zoom to 100% and center
- `⇧ + 1`: Zoom to fit all canvas content
- `⇧ + 2`: Zoom to currently selected nodes
- `⌘ + \`: Toggle Minimal Zen Mode (hides all chrome)

---

## 4. Snapping & Alignment Engine

When dragging elements or resizing bounds:
1. **Axis Snapping**: Triggers when element edges or centers align with peer nodes within an `8px` screen threshold.
2. **Visual Feedback**: Renders cyan guide lines extending across the canvas, accompanied by distance pills indicating pixel gaps.
3. **Equidistant Spacing**: When an element is dragged between two peers, identical spacing gaps (`e.g. 24px`) snap automatically with visual gap markers.
