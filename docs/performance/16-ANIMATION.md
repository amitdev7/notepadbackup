# ZENITHSUI — ANIMATION & MOTION PERFORMANCE
## 16-ANIMATION.md

> **Target Standard:** 60/120 FPS Composited Transitions, Zero Layout Thrashing, Reduced-Motion Compliance  
> **Status:** Hardened & Verified

---

## 1. Compositor-Only Motion Principle

To prevent layout recalculation during transitions, all UI animations strictly target compositor-friendly CSS properties:
- **Permitted Properties:** `transform`, `opacity`, `filter` (hardware-accelerated backdrop blur).
- **Prohibited Properties in Continuous Motion:** `width`, `height`, `top`, `left`, `margin`, `padding` (trigger layout reflow).

Modal appearances (`.animate-modal-enter`) and popover card fades (`.animate-card-fade`) use cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`) with durations capped at $\le 200\text{ms}$.

---

## 2. Reduced Motion Accessibility & Battery Mode

Zenithsui provides first-class support for `prefers-reduced-motion`:
- Synchronized to the DOM via `.reduce-motion` class in `lib/shell-store.ts`.
- When active, all modal zooms, dock transitions, and decorative animations collapse into instantaneous opacity fades, eliminating motion sickness and saving GPU battery cycles.
