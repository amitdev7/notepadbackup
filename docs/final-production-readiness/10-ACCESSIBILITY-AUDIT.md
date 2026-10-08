# 10 — Accessibility (a11y) Audit

## 1. Keyboard Navigation
- **Tool Selection Shortcuts**: Single-key shortcuts (`V` for Select, `H` for Hand, `R` for Rect, `O` for Ellipse, `D` for Diamond, `A` for Arrow, `L` for Line, `P` for Draw, `T` for Text, `E` for Eraser).
- **History Shortcuts**: `Ctrl/Cmd + Z` for undo, `Ctrl/Cmd + Shift + Z` (or `Ctrl/Cmd + Y`) for redo.
- **Clipboard Shortcuts**: Standard `Ctrl/Cmd + C`, `Ctrl/Cmd + V`, `Ctrl/Cmd + X`.
- **Dialog Traps**: Settings dialog, share modals, and command palette provide complete focus containment and `Escape` key dismiss.

---

## 2. ARIA & Screen Readers
- Bottom dock buttons carry descriptive `aria-label` tags with keyboard shortcut hints.
- Interactive controls specify `role="button"` or `role="switch"` with `aria-checked` states on toggle switches.
- Error and loading boundaries include semantic headings (`<h1>`, `<h2>`) and informative alert roles.

---

## 3. Visual & Cognitive Accessibility
- Support for `prefers-reduced-motion` with an explicit "Reduced Motion" preference in Settings.
- High-contrast visual tokens adhering to WCAG AA contrast standards across both light (paper) and dark (ink) modes.
- Clear visual focus rings (`focus-visible:ring-2`) on all interactive buttons and inputs.
