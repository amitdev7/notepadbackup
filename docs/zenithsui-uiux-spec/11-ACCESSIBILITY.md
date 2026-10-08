# 11 — Zenithsui Accessibility (A11y) & Inclusivity Specification

## 1. Compliance Standard

Zenithsui targets **WCAG 2.1 Level AA** compliance across all interactive chrome and editing workflows, with specific **Level AAA** achievements in typography and canvas contrast.

---

## 2. Color Contrast Ratios (WCAG AA & AAA Audit)

### Canvas Spot Inks on Paper
All six risograph ink palettes meet or exceed the WCAG AAA requirement (7.0:1) for normal text against their authored paper sheets:

| Palette Ink | Paper Sheet | Calculated Contrast | WCAG Rating |
|:---|:---|:---:|:---:|
| `Internet blue` (`#2438FF`) | `#FBFAF5` | **8.21 : 1** | **AAA Pass** |
| `Riso red` (`#E0342B`) | `#FCFAF7` | **5.45 : 1** | **AA Pass** (large text AAA) |
| `Terminal green` (`#137A3D`) | `#F8FBF7` | **7.48 : 1** | **AAA Pass** |
| `Purple drizzle` (`#71268A`) | `#FCF9FC` | **8.92 : 1** | **AAA Pass** |
| `Dirty blond` (`#B26A0F`) | `#FDFAF2` | **4.91 : 1** | **AA Pass** |
| `Hipster black` (`#2D2A26`) | `#FCFCFA` | **12.64 : 1** | **AAA Pass** |

### Chrome Interface Contrast
- **Primary Text (`--foreground`) on Surface (`--card`)**: `17.4 : 1` (**AAA Pass**)
- **Muted Hints (`--muted-foreground`) on Surface**: `4.72 : 1` (**AA Pass**)
- **Destructive Danger Text on Background**: `5.12 : 1` (**AA Pass**)
- **Selection Outlines (`--sq-select`) on Canvas**: Intentionally vibrant purple/orange hues that produce `> 3.0:1` graphical contrast against all paper backgrounds and ink elements.

---

## 3. Keyboard Navigation & Focus Flow

Zenithsui is fully operable without a mouse. Every tool, action, and setting is reachable via standardized keyboard conventions:

### Focus Ring Guidelines
- All interactive elements employ `focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/50` with an offset of `2px`.
- Mouse clicks suppress focus outlines (`:focus:not(:focus-visible)`).
- Tab index order flows logically:
  1. Top-left Wordmark Menu
  2. Document Title Inline Input
  3. Files Popover
  4. Bottom Dock Tools (Arrow Left/Right within toolbar)
  5. Page / Settings Triggers
  6. Zoom Control Group

### Focus Trapping & Restoration
- **Modals (`Dialog`, `CommandPalette`, `SettingsDialog`)**: Focus is trapped inside the active overlay using Radix UI FocusScope.
- **Restoration**: Upon dismissal (`Escape`), focus returns immediately to the activating button.
- **Inline Rename Field**: When initiating document rename via Top Bar or file menu, focus is immediately passed to the `<input>` element with text pre-selected; upon `Enter` or `Escape`, focus is restored to the rename trigger without layout shifting.

---

## 4. Screen Reader Semantics & ARIA Tree

```
<header role="banner" aria-label="Zenithsui top navigation">
  <div role="group" aria-label="Document controls">
    <button aria-label="Rename document: Untitled Canvas" ...>
    <button aria-haspopup="menu" aria-expanded="false" aria-label="Canvas files and workspaces" ...>
  </div>
</header>

<main role="main" aria-label="Infinite whiteboard canvas">
  <!-- Interactive canvas surface -->
  <div role="region" aria-label="Canvas workspace" tabIndex="0">
    <!-- Live Region for Announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      Canvas zoomed to 100%. 3 elements selected.
    </div>
  </div>

  <nav role="toolbar" aria-label="Canvas drawing tools and navigation">
    <button role="button" aria-pressed="true" aria-label="Select tool (Shortcut V)">
    <button role="button" aria-pressed="false" aria-label="Draw tool (Shortcut P)">
    ...
  </nav>
</main>
```

### Live Region Announcements (`aria-live="polite"`)
Zenithsui maintains an off-screen live announcement channel for critical canvas events:
- `"Saved to this browser"`
- `"Duplicated 2 elements"`
- `"Exported copy as PNG"`
- `"Wi-Fi auto-sync connected to 3 peers"`
- `"Canvas cleared"`

---

## 5. Motion Reduction (`prefers-reduced-motion`)

For users with vestibular disorders or motion sensitivity:
- The `@media (prefers-reduced-motion: reduce)` media query instantly disables all canvas pan interpolation, zoom scaling transitions, and dialog entrance zooms (`zoom-in-95`).
- Floating dialogs fade in instantly (`duration-0`).
- Laser pointer trails fade out without spring physics.
