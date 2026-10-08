# 10 — Zenithsui Responsive System & Device Adaptations

## 1. Breakpoint Architecture

Zenithsui employs a strict three-tier device adaptation model optimized for infinite spatial editing on touch, trackpad, and mouse inputs.

| Tier | Tailwind Breakpoint | Viewport Range | Primary Input Mode | Shell Modality |
|:---|:---|:---|:---|:---|
| **Mobile** | Default (`< 640px`) | `320px – 639px` | Direct Touch / Apple Pencil | Single-Column Bottom Sheet + Collapsed Dock |
| **Tablet** | `sm` to `md` (`640px – 1023px`) | `640px – 1023px` | Stylus / Touch / Magic Keyboard | Floating Pill HUDs + Popover Drawers |
| **Desktop** | `lg` and `xl` (`≥ 1024px`) | `1024px – 2560px+` | Mouse / Precision Trackpad / Hotkeys | Multi-surface Floating Canvas Environment |

---

## 2. Desktop Layout (≥ 1024px)

On desktop, the viewport is maximized for canvas visibility with all chrome floating quietly at the boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [zenithsui ▾]                [ Document Title (✏️) | Files ]     [🔔] [●] │ (Top Bar)
│                                                                        │
│                                                                        │
│ ┌───────────────┐                                      ┌─────────────┐ │
│ │ Library Panel │                                      │ Property    │ │
│ │ (Sparkle)     │                                      │ Inspector   │ │
│ │               │                                      │             │ │
│ │ Wireframes    │               CANVAS                 │ Tone: Blue  │ │
│ │ Flowcharts    │               SURFACE                │ Stroke: 1.5 │ │
│ │ Tables        │                                      │ Fill: Shade │ │
│ └───────────────┘                                      └─────────────┘ │
│                                                                        │
│                                                                        │
│          ┌─────────────────────────────────────────────────┐           │
│          │ [V] [H] [R] [P] [E] [A] [T] [F] [K] [✨] | ⚙️ 📄 │ - 100% +│ (Bottom Dock)
│          └─────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────────────┘
```

- **Bottom Dock**: Centered at `bottom-4`, height `48px`, contains all primary tools, page popover trigger, settings button, and zoom controls.
- **Top Bar**: Centered at `top-3`, minimal pill containing inline-editable title, Files popover, and Wi-Fi auto-sync status.
- **Top Left**: Persistent Wordmark `zenithsui ▾` serving as the master file menu (New, Save, Export, Share, History, Trash).
- **Inspector**: Floats at `top-4 right-4` when an element is selected; falls back to Page settings when nothing is selected.
- **Command Palette (`⌘K`)**: Centers over canvas as a keyboard-driven spotlight dialog (`max-w-xl`).

---

## 3. Tablet Layout (640px – 1023px)

On tablet screens (e.g. iPad Pro, iPad Air, Surface Pro):
- **Bottom Dock**: Reduces button sizes from `size-8` (`32px`) to `size-7` (`28px`), padding tightens from `px-3` to `px-2`.
- **Top Bar**: Document title truncates earlier (`max-w-[160px]`).
- **Inspector & Panels**: Display as modal sheets or compact popovers rather than full floating persistent panels to preserve drawing surface area.
- **Input Adaptations**:
  - Direct pencil drawing triggers pen tool without selecting it first.
  - Two-finger drag gestures pan the canvas; two-finger pinch zooms smoothly.
  - Palm rejection prevents accidental pan gestures while Apple Pencil / S-Pen is active.

---

## 4. Mobile Layout (< 640px)

On mobile phones (375px – 430px):
- **Bottom Dock**:
  - Floats pinned at `bottom-2 inset-x-2`, flex-wrapping or horizontally scrolling smoothly.
  - Shortcut tooltips and keyboard badge indicators are completely hidden.
  - Touch target hitboxes expand to at least `44x44px` using invisible hit-padding (`after:absolute after:-inset-2`).
- **Top Bar**:
  - Minimal pill at `top-2`, title max-width drops to `100px` with ellipsis.
  - Files menu opens as a native-feel bottom drawer instead of a floating popover.
- **Settings & Page Popover**:
  - Automatically converted to sliding bottom sheets with swipe-to-dismiss handles.
- **Canvas Interaction**:
  - Single-finger drag draws if pen/shape tool is active, or pans if hand tool is active.
  - Pinch-to-zoom centered on the midpoint between the two touches.
  - Long-press triggers element context menu.

---

## 5. Touch Target & Accessibility Sizing Matrix

To ensure compliance with WCAG 2.5.5 (Target Size) and Apple Human Interface Guidelines:

| Element | Visual Size | Touch Hitbox Size | Implementation Technique |
|:---|:---|:---|:---|
| Dock Tool Buttons | `28px × 28px` (mobile) / `32px × 32px` (desktop) | `44px × 44px` | Relative container with negative margin pseudos |
| Zoom Pill Buttons (`+` / `-`) | `24px × 24px` | `44px × 44px` | Touch-expanded hit area |
| Inspector Swatches | `20px × 20px` | `36px × 36px` | Inline flex padding wrapper |
| Handle Anchors on Canvas Nodes | `8px × 8px` | `24px × 24px` | SVG transparent stroke hit-testing padding |
| Menu Rows in Dropdowns | `32px` row height | `40px` row height | Responsive padding `py-2 sm:py-1.5` |
