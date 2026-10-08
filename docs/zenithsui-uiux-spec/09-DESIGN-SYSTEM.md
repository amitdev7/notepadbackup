# 09 — Zenithsui Design System & Token Hierarchy

## 1. Design System Philosophy: The Two Worlds

Zenithsui operates under a strict dual-system design architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZENITHSUI INTERFACE                           │
│                                                                        │
│   ┌───────────────────────────┐     ┌──────────────────────────────┐   │
│   │     CHROME INTERFACE      │     │       CANVAS DRAWING         │   │
│   │     (SaaS Control Layer)  │     │       (Risograph Art Layer)  │   │
│   ├───────────────────────────┤     ├──────────────────────────────┤   │
│   │ • Native macOS feel       │     │ • Risograph spot ink colors  │   │
│   │ • Geist Sans & Monospace  │     │ • Virgil / Assistant / Casca.│   │
│   │ • Sub-pixel crisp borders │     │ • Rough.js sketchy strokes   │   │
│   │ • 4-tier Chrome radii     │     │ • 3-step flat wash tones     │   │
│   │ • Glassmorphism / Blur    │     │ • Paper & dot-grid sheet     │   │
│   │ • Oklch neutral system    │     │ • Pure mathematical bounds   │   │
│   └───────────────────────────┘     └──────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

The **Chrome Layer** is precise, quiet, neutral, and utility-focused. It gives the user immediate confidence that Zenithsui is an engineered tool.
The **Canvas Layer** is warm, analog, playful, and risograph-inspired. It gives the user expressive freedom without feeling chaotic.

---

## 2. Canvas Color Palettes: Risograph Spot Inks

Each canvas theme is a strict duotone system comprising spot ink and paper. All area fills are mathematical washes of ink mixed into paper (8% light wash and 20% strong wash).

### Complete Theme Token Matrix

| Palette ID | Display Name | Background (`--sq-bg`) | Paper (`--sq-paper`) | Primary Ink (`--sq-ink`) | Muted Ink (`--sq-muted`) | Hairline Faint (`--sq-faint`) | Wash 1 (`--sq-shade`) | Wash 2 (`--sq-shade-strong`) | Dot Grid (`--sq-grid`) | Selection Accent (`--sq-select`) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| `internet-blue` *(Default)* | Internet blue | `#FBFAF5` | `#FFFFFF` | `#2438FF` | `#6E7DFF` | `#BFC6FF` | `#EDEFFF` | `#D3D7FF` | `#E6E1D3` | `#A200FF` |
| `riso-red` | Riso red | `#FCFAF7` | `#FFFFFF` | `#E0342B` | `#EE7B72` | `#F7B9B3` | `#FDEFEE` | `#F9D6D5` | `#E8E0D3` | `#2438FF` |
| `terminal-green` | Terminal green | `#F8FBF7` | `#FFFFFF` | `#137A3D` | `#54A472` | `#A3CDB2` | `#ECF4EF` | `#D0E4D8` | `#D9E4D5` | `#E8622F` |
| `plum` | Purple drizzle | `#FCF9FC` | `#FFFFFF` | `#71268A` | `#A566B8` | `#D0AADB` | `#F4EEF6` | `#E3D4E8` | `#E7DFE9` | `#D9A441` |
| `marigold` | Dirty blond | `#FDFAF2` | `#FFFFFF` | `#B26A0F` | `#D69B4E` | `#EDCC96` | `#F9F3EC` | `#F0E1CF` | `#EAE0C7` | `#2438FF` |
| `graphite` | Hipster black | `#FCFCFA` | `#FFFFFF` | `#2D2A26` | `#8A857D` | `#C9C4BB` | `#EEEEEE` | `#D5D4D4` | `#E2DDD3` | `#E0653A` |

### Paper Shades
The paper sheet tone allows wireframes and documents to lift off the canvas:
1. **White** (`#FFFFFF`): Pure digital sheet for crisp exports and screenshots.
2. **Subtle** (`p.bg`): The authentic warm risograph stock.
3. **Shaded** (`mix(p.bg, p.grid, 0.7)`): Deeper sheet value that makes white cards (`--sq-paper`) pop out with depth.

---

## 3. Chrome Color Architecture (OKLCH Scale)

Zenithsui Chrome leverages modern `oklch` color spaces for uniform perceptual brightness across light and dark modes.

| Chrome Token | Light Value | Dark Value | Purpose |
|:---|:---|:---|:---|
| `--background` | `oklch(1 0 0)` (`#FFFFFF`) | `oklch(0.145 0 0)` (`#141414`) | Shell window and full page background |
| `--foreground` | `oklch(0.145 0 0)` (`#141414`) | `oklch(0.985 0 0)` (`#FAFAFA`) | Primary text and icons in chrome |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Surfaces for dialogs, popovers, drawers |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Inactive button hover tracks, keyboard badges |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary labels, hints, shortcut keys |
| `--border` / `--input` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Subtle hairlines, menu separators, field outlines |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Hover states on dropdown menus and dock items |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.65 0.24 27.3)` | Trash, clear canvas, irreversible operations |

---

## 4. Typography Scale

Zenithsui operates two distinct type scales:
1. **Chrome Scale**: Fixed, sub-pixel aligned, Geist-driven typography for high-density UI.
2. **Canvas Font Modes**: Expressive font stacks reflecting document state.

### Chrome Type Scale
Geist has an unusually tall x-height, allowing Zenithsui to run compact type that reads legibly at small sizes:

| Token | Size | Line Height | Weight | Typical Applications |
|:---|:---|:---|:---|:---|
| `--text-micro` | `10px` | `12px` | `500` / `600` | Keyboard badge chips (`⌘K`), counters, coordinate badges, axis indicators |
| `--text-label` | `11px` | `14px` | `500` | Property inspector labels, field captions, helper microcopy |
| `--text-row` | `13px` | `16px` | `400` / `500` | Menu items, command palette rows, settings field labels |
| `--text-title` | `15px` | `20px` | `600` | Modal headers, dialog titles, ⌘K command input text |
| Wordmark | `17px` | `17px` | `700` (`-0.03em`) | Brand header "zenithsui" (deliberately independent of scale) |

### Canvas Font Stacks
Controlled by the Page Inspector Font segmented control:

| Mode | Font Face | Family Definition | Intended Meaning |
|:---|:---|:---|:---|
| **Hand** | Virgil | `"Virgil", var(--font-sketch), cursive` | Early draft / wireframe ("nothing is decided yet") |
| **Sans** | Assistant | `"Assistant", var(--font-sans), sans-serif` | Product specification / technical layout |
| **Serif** | Source Serif 4 | `"Source Serif 4", Georgia, serif` | Editorial / academic publication / essay |
| **Mono** | Cascadia | `"Cascadia", monospace` | Code blocks, LaTeX math formulas, data matrices |

---

## 5. Geometric Chrome Radii & Spacing

To avoid the "generic bubble" look, Zenithsui uses tight, nesting radii where inner elements are strictly sharper than outer containers:

```
┌──────────────────────────────────────────────┐  --radius-chrome-lg (10px) [Panel]
│  ┌────────────────────────────────────────┐  │
│  │  Track Container                       │  │  --radius-chrome-md (7px) [Track]
│  │  ┌─────────────────┐ ┌───────────────┐ │  │
│  │  │ Segment Item    │ │ Segment Item  │ │  │  --radius-chrome-sm (5px) [Button]
│  │  │ ┌─────────────┐ │ └───────────────┘ │  │
│  │  │ │ Badge Chip  │ │                   │  │  --radius-chrome-xs (3px) [Badge]
│  │  │ └─────────────┘ │                   │  │
│  │  └─────────────────┘                   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

| Radius Token | Value | Applied To |
|:---|:---|:---|
| `--radius-chrome-xs` | `3px` | Inside-track badges, kbd keys, color swatches |
| `--radius-chrome-sm` | `5px` | Action buttons, segmented items, menu rows, input fields |
| `--radius-chrome-md` | `7px` | Segmented control tracks, popover menus, select listboxes |
| `--radius-chrome-lg` | `10px` | Floating inspector panels, dialog modals, bottom dock |
| `rounded-full` | `9999px` | Top bar pill, zoom pills, circular avatar indicators |

### Control Heights & Spacing
- `--spacing-ctl-sm`: `26px` (Micro controls nested inside complex inspectors)
- `--spacing-ctl`: `32px` (Standard inputs, buttons, dropdown triggers)
- `--spacing-ctl-lg`: `36px` (Prominent dialog triggers, primary CTA buttons)
- `--spacing-gutter`: `14px` (Padding inside inspector panels and cards)
- `--spacing-row`: `10px` (Vertical rhythm between property groups)
- `--spacing-label`: `60px` (Horizontal alignment seam for property labels)

---

## 6. Elevation & Shadows

Zenithsui uses two precisely tuned shadow elevations designed to feel like physical paper floating over a surface in soft diffused studio light:

| Shadow Token | CSS Definition | Usage |
|:---|:---|:---|
| `--shadow-panel` | `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12)` | Floating canvas panels: Top Bar, Bottom Dock, Inspector, Library Drawer |
| `--shadow-popup` | `0 1px 2px rgb(0 0 0 / 0.04), 0 10px 32px -8px rgb(0 0 0 / 0.18)` | Overlays: Command Palette, Settings Dialog, Share Modal, Context Menus |
| Glass Backdrop | `backdrop-blur-md bg-white/85 dark:bg-stone-900/85` | Bottom Dock, Top Bar, and floating HUDs |

---

## 7. Iconography Standards

Zenithsui exclusively uses `@phosphor-icons/react` with strict rules:
- **Default State**: `regular` weight, `16px` size.
- **Active / Selected State**: `bold` weight, same `16px` size, high-contrast foreground color.
- **Micro UI (Badges, sub-menus)**: `11px` to `13px` size.
- **Hero / Modal headers**: `20px` to `24px` size.
