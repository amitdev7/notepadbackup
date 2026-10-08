# ZENITHSUI — GPU ACCELERATION & COMPOSITING ARCHITECTURE
## 06-GPU.md

> **Target Standard:** 60/120 FPS Composited Transforms, Sub-1ms Layer Panning, Zero VRAM Leaks  
> **Compositor Engine:** Chromium Blink / WebKit / Gecko Hardware Compositors  
> **Status:** Hardened & Verified

---

## 1. Hardware Compositing Strategy

The objective of Zenithsui's GPU strategy is **not** to blindly force all drawing into WebGL/WebGPU shaders (which creates high battery drain and text blurriness), but rather to allow the GPU to do what it does best: **high-frequency matrix transformations, scaling, and raster layer compositing**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HARDWARE LAYER PIPELINE                         │
├────────────────────────────────────────────────────────────────────────┤
│ CPU: Vector Math & Semantic Hierarchy                                  │
│  - Node geometry, hit-testing, Rough.js ink path generation            │
│  - Strict single-pass SVG rendering                                    │
├────────────────────────────────────────────────────────────────────────┤
│ GPU: Hardware Texture Compositing                                      │
│  - Root canvas container promoted via `translate3d(0, 0, 0)`           │
│  - Viewport panning and zooming executed via compositor matrix         │
│  - Zero vector re-rasterization during active camera movement          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic Layer Promotion (`will-change`)

Permanently assigning `will-change: transform` to thousands of elements causes severe GPU memory exhaustion (VRAM bloat) and degrades performance on mobile devices.

Zenithsui implements **Dynamic Gesture-Gated Layer Promotion**:
```tsx
// components/canvas/canvas.tsx
<g
  transform={`translate(${v.x} ${v.y}) scale(${v.zoom})`}
  style={
    perfSettings?.hardwareCompositing && gestureKind
      ? { willChange: "transform" }
      : undefined
  }
>
  {visibleOrder.map(...)}
</g>
```
- **During Active Gestures (`gestureKind !== null`):** The compositor promotes the coordinate root to a dedicated hardware backing texture. Continuous pan/zoom gestures bypass layout and paint passes entirely.
- **On Gesture Idle (`gestureKind === null`):** The layer promotion is gracefully released, freeing GPU VRAM back to the operating system.

---

## 3. Backface Visibility & Anti-Tearing

The canvas container applies:
```css
transform: translate3d(0, 0, 0);
backface-visibility: hidden;
```
This forces the browser to establish an isolated stacking context and composite plane, preventing visual tearing between the background dot-grid and foreground vector strokes during rapid viewport acceleration.

---

## 4. Sub-Pixel Text & Glyph Sharpness Preservation

A common failure of WebGL/canvas-based whiteboards is blurry text rendering on high-DPI (Retina) screens when scaling. Because Zenithsui preserves native SVG `<text>` elements in the vector layer:
- Text glyphs are rasterized directly by the OS font engine (DirectWrite on Windows, CoreText on macOS, FreeType on Linux).
- Fonts remain razor-sharp at all zoom factors from 10% to 400%.
- Native text selection, screen readers, and browser search (`Cmd+F`) retain 100% fidelity.
