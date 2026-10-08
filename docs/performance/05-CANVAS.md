# ZENITHSUI — INFINITE CANVAS RENDERING ARCHITECTURE
## 05-CANVAS.md

> **Target Standard:** 60/120 FPS Sustained, Sub-4ms Frame Render, Zero Ink Jitter  
> **Core Files:** `components/canvas/canvas.tsx`, `components/canvas/sketch.tsx`, `lib/canvas/*`  
> **Status:** Hardened & Verified

---

## 1. Dual-Layer Hybrid Rendering Architecture

Zenithsui employs a hybrid graphics architecture combining the crisp scalability of SVG with the rich interactivity of the DOM:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CANVAS DUAL-LAYER SYSTEM                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Vector SVG Layer (Bottom)                                           │
│    - Renders all shapes, arrows, lines, freehand ink, text             │
│    - Driven by Rough.js primitive compilation (`lib/sketch/kit.ts`)    │
│    - Transformed via `<g transform="translate(vx, vy) scale(zoom)">`  │
│    - Viewport culled via `visibleOrder`                                │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Interactive HTML DOM Layer (Top)                                    │
│    - Embedded documents (`DocumentCanvasItem`)                         │
│    - Interactive widgets (`FunctionalCalendar`)                       │
│    - Synchronously positioned via CSS `translate3d(vx, vy, 0) scale()` │
│    - Pointer-events routed through canvas gesture manager              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic Viewport Culling Algorithm

When a canvas contains 1,000+ nodes, rendering all SVG elements causes massive browser layout and paint overhead even if 95% of nodes are offscreen.

### Mathematical Formulation
Given the viewport position $(v_x, v_y)$, zoom factor $z$, container dimensions $(W, H)$, and culling buffer margin $M$:

$$\text{minX} = -\frac{v_x}{z} - M, \quad \text{minY} = -\frac{v_y}{z} - M$$
$$\text{maxX} = \frac{-v_x + W}{z} + M, \quad \text{maxY} = \frac{-v_y + H}{z} + M$$

An unselected node $n$ with bounding box $(n_x, n_y, n_w, n_h)$ is included in `visibleOrder` if and only if:

$$(n_x \le \text{maxX}) \land (n_x + n_w \ge \text{minX}) \land (n_y \le \text{maxY}) \land (n_y + n_h \ge \text{minY})$$

### Selection & Editing Pinning Guarantees
- Any node currently selected (`selection.includes(id)`) is **never culled**, ensuring transform handles, bounding rings, and context rows remain intact even if partially offscreen.
- The node currently being edited (`editingId`) is **never culled**.

### Configurable Buffer Modes
| Mode | Buffer Margin ($M$) | Target Use Case | Visual Behavior |
|---|---|---|---|
| **Aggressive** | 150 px | Low-end mobile devices, tablets | Maximum DOM offload (up to 92% culled) |
| **Standard** | 400 px | Balanced default for modern laptops | Seamless panning without edge pop-in |
| **Relaxed** | 1000 px | High-performance desktops (120Hz/144Hz) | Massive pre-rendered safety margin |
| **Off** | $\infty$ | Benchmarking / specialized export | Full scene SVG rendering |

---

## 3. High-Polling Pointer RAF Latching

Standard browser `pointermove` events fire up to 1,000 times per second on high-refresh gaming mice and precision styluses (Apple Pencil). Calling React state updates directly on every event produces massive thread starvation.

Zenithsui coalesces incoming pointer events using a **RequestAnimationFrame Latch**:
1. When a `pointermove` arrives during an active gesture (`draw`, `move`, `resize`, `marquee`):
   - Current mouse coordinates are stored in `pendingPointRef.current`.
   - If no RAF is currently scheduled (`gestureRafRef.current === null`), a new frame is requested.
2. Inside the RAF callback:
   - `updateGesture(pendingPoint.clientX, pendingPoint.clientY)` runs exactly once per screen refresh.
   - `gestureRafRef.current` is reset to null.
3. On `pointerup` (`finishGesture`), any pending point is immediately flushed before committing the gesture checkpoint, guaranteeing 100% geometric accuracy.

---

## 4. Deterministic Rough.js Path Caching

To prevent hand-drawn strokes from jittering or changing their organic wobble during unrelated re-renders:
- Every node receives a deterministic integer seed computed from its unique node identifier (`id`).
- Rough.js paths are compiled once and cached; CSS variables (`--sq-ink`, `--sq-shade`) control coloring so switching themes restyles the entire canvas without regenerating a single vector path.
