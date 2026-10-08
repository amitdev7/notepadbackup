# ZENITHSUI — MOBILE & LOW-POWER DEVICE PERFORMANCE
## 17-MOBILE.md

> **Target Standard:** Touch Gesture Fluidity, Battery Conservation, Thermal Throttling Prevention  
> **Status:** Hardened & Verified

---

## 1. Touch & Stylus Optimization

1. **Touch-Action None:** The outer canvas element sets `touch-action: none`, preventing the browser's native viewport scrolling and pinch gestures from competing with custom canvas multi-touch handlers.
2. **Apple Pencil & Stylus Pressure:** Pointer events extract `e.pressure` without triggering extra React renders.
3. **Adaptive Culling on Mobile:** On devices detected with small viewports or lower memory, the engine automatically selects **Aggressive Culling (150px buffer)**, keeping mobile SVG DOM trees under 100 elements.

---

## 2. Battery & Thermal Management

- **Idle RAF Halting:** When no active gestures, animations, or HUD telemetry updates are executing, all `requestAnimationFrame` loops stop completely (0% CPU draw).
- **Background Tab Suspension:** Tab blur events (`window.blur`) immediately release gesture tracking, cancel auto-pan timers, and pause live framerate polling.
