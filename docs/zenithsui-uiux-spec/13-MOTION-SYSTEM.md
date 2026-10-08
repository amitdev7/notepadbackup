# 13 — Zenithsui Motion Design & Animation Physics

## 1. Motion Philosophy: Frictionless Utility

Motion in Zenithsui is never ornamental. It exists strictly to:
1. **Clarify spatial hierarchy**: Show where a drawer or menu originated.
2. **Confirm user intent**: Provide immediate, physical haptic response to clicks and keystrokes.
3. **Prevent cognitive disorientation**: Anchor the user during drastic zoom or pan operations.

---

## 2. Easing Curves & Timing Tokens

Zenithsui relies on an Apple-inspired spring and cubic-bezier timing curve system:

| Token | Duration | Easing Curve | Purpose |
|:---|:---:|:---|:---|
| `--motion-instant` | `75ms` | `linear` | Tool button pressed states, active toggle clicks |
| `--motion-micro` | `120ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Dropdown menu items, tooltip appearances, radio pill shifts |
| `--motion-standard` | `180ms` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Modals, popovers, Command Palette entrance & exit |
| `--motion-drawer` | `240ms` | `cubic-bezier(0.32, 0.72, 0, 1)` | Library panel slide-out, Files popover accordion expand |
| `--motion-canvas` | Variable | Momentum decay (`0.88` friction) | Viewport trackpad panning and inertia release |

---

## 3. Transition Choreography

### 1. Dialog & Modal Overlays
- **Enter**: `opacity: 0 → 1`, `scale: 0.96 → 1.0`, duration `150ms`.
- **Exit**: `opacity: 1 → 0`, `scale: 1.0 → 0.98`, duration `100ms`.
- **Backdrop**: Smooth blur transition `backdrop-blur-[0px] → backdrop-blur-[2px]`.

### 2. Laser Pointer Trail Physics
- When using the Laser Pointer (`K`), trail segments are sampled at 60fps / 120fps.
- As the cursor moves, points are connected with a glowing spline.
- Each point possesses a timestamp and decays across `1200ms`.
- Opacity decays non-linearly: `alpha(t) = (1 - t / 1200)^1.8`.
- Point radius contracts from `6px` to `0.5px` before vanishing completely.

### 3. Flash Notification Banner (`components/chrome/notice.tsx`)
- Appears floating quietly below the top bar when actions complete (e.g., "Copied PNG to clipboard", "Saved to local storage").
- Enters with a gentle `translate-y-[-4px] → translate-y-[0px]` and `opacity: 0 → 1`.
- Lingers for `2200ms` without blocking canvas interactions (`pointer-events-none`).
- Exits with a crisp `fade-out` over `150ms`.

### 4. Zero-Latency Canvas Theme Swapping
- Unlike traditional canvas applications that re-run layout and redraw all vector geometry upon theme change, Zenithsui updates CSS variables directly on `:root`.
- The SVG elements and rough paths use `stroke="var(--sq-ink)"` and `fill="var(--sq-shade)"`.
- Swapping the theme from **Internet Blue** to **Riso Red** takes `< 1ms` across tens of thousands of elements simultaneously with zero frame drops.
