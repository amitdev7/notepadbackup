# Zenithsui Canvas Engine & Mathematical Invariants

This document details the mathematical foundation, procedural rendering pipeline, coordinate spaces, and spatial indexing systems powering the **Zenithsui Canvas Engine**.

---

## 1. Procedural Napkin Sketch Pipeline (Rough.js)

Zenithsui transforms geometric primitives and UI component shapes into hand-drawn sketches using [Rough.js](https://roughjs.com/).

### Seed Determinism
Procedural stroke wobble and hachure lines are generated via pseudo-random distributions. Without determinism, every re-render, pan, or property adjustment would cause lines to re-jitter, creating visual noise.

**The Invariant**:
- Every node carries a 32-bit integer `seed` assigned upon node creation.
- Rough.js is configured with `seed: node.seed`, guaranteeing that corner overshoot, stroke bowing, and roughness remain identical across renders.
- Roughness parameter $\rho \in [0, 3.0]$ controls wobble intensity:
  - $\rho = 0$: Crisp architectural lines.
  - $\rho = 1.0$: Natural hand-drawn napkin sketch (default).
  - $\rho = 2.5$: Loose, hurried napkin ideation.

---

## 2. Coordinate Spaces & Transformations

The engine manages two distinct Cartesian coordinate systems:

```
[Screen Space (s_x, s_y)]           [World Space (w_x, w_y)]
0,0 ─────────────────► +X           -∞ ─────────────────► +∞
 │                                   │
 │   Browser Pixels                  │   Infinite Canvas Coordinates
 ▼                                   ▼
+Y                                  +∞
```

### Viewport State
- $v_x, v_y$: Viewport pan offset in screen pixels.
- $z$: Zoom scale factor, constrained to $z \in [0.10, 5.00]$.

### Transformation Equations

#### Screen to World (`screenToWorld`)
Used to determine where a user clicked in canvas space:
$$w_x = \frac{s_x - v_x}{z}, \quad w_y = \frac{s_y - v_y}{z}$$

#### World to Screen (`worldToScreen`)
Used to compute the SVG/Canvas element bounding box on screen:
$$s_x = w_x \cdot z + v_x, \quad s_y = w_y \cdot z + v_y$$

---

## 3. Spatial Indexing & Hit-Testing

To maintain 60 FPS performance when the canvas contains 10,000+ elements:
- An **R-Tree Spatial Index** indexes element Axis-Aligned Bounding Boxes (AABB):
  $$\text{AABB}(n) = [x_{\min}, y_{\min}, x_{\max}, y_{\max}]$$
- During marquee selection or viewport rendering, the spatial index queries only elements intersecting the visible viewport $[v_x, v_y, v_x + \frac{W}{z}, v_y + \frac{H}{z}]$.
- Elements outside the viewport bounds are culled from SVG DOM rendering.

---

## 4. Gesture Handling & Pointer Routing

- **Trackpad / Mouse Wheel**:
  - Direct 2D delta scrolls pan the canvas smoothly.
  - Holding `Ctrl` / `⌘` or performing a 2-finger pinch scales $z$ centered on the cursor position.
- **Spacebar Pan**:
  - Holding `Space` activates pan cursor mode (`grab`), transforming pointer drags into viewport movements without affecting element selection.
- **Chrome Element Shielding**:
  - All floating UI panels (inspector, top bar, dock) have `data-zenithsui-chrome` and call `e.stopPropagation()`. Canvas pointer listeners ignore events originating from chrome.

---

## 5. Laser Pointer Physics & Trail Decay

Zenithsui includes a real-time laser pointer tool for presentations and walkthroughs:
- Tracks cursor positions with sub-pixel timestamps.
- Renders an animated tapered spline with exponential opacity decay:
  $$\alpha(t) = e^{-\lambda (t_{\text{now}} - t_{\text{point}})}$$
- Automatically cleans up points older than 1,200ms to free GPU buffers.
