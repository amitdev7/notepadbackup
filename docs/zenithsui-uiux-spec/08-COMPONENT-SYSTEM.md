# ZENITHSUI — UI/UX Specification
## Document 08: UI Component System & Chrome Widgets

---

### Component System Architecture
Zenithsui’s application chrome uses a lightweight, highly accessible UI foundation powered by `@base-ui/react`, Tailwind CSS v4, and `@phosphor-icons/react`. Every component is built with strict adherence to system typography (`font-sans`), calm zinc/stone palettes, and micro-interactions that never distract from the canvas.

Below is the complete specification for the core component system:

---

### 1. Button (`components/ui/button.tsx`)
- **Anatomy**: `<button>` with optional icon prefix/suffix, text label, and keyboard focus ring.
- **Variants**:
  - `default`: Solid charcoal/dark background (`bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900`). Primary destructive or submit actions.
  - `secondary`: Subtle surface fill (`bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200/80 dark:border-stone-700/80`).
  - `ghost`: Transparent background (`hover:bg-stone-100 dark:hover:bg-stone-800/80 text-stone-700 dark:text-stone-300`). Standard toolbar and chrome buttons.
  - `destructive`: Deep crimson text and hover (`text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40`). Clear canvas and permanent delete actions.
  - `accent`: Electric UI Accent fill (`bg-[var(--sq-accent)] text-white hover:brightness-110`). Used for "New Drawing", "Accept Invite".
- **Sizes**:
  - `xs`: Height `24px`, text `11px`, padding `px-2`.
  - `sm`: Height `28px`, text `12px`, padding `px-2.5`.
  - `md`: Height `32px`, text `13px`, padding `px-3.5`.
  - `lg`: Height `38px`, text `14px`, padding `px-4.5`.
  - `icon`: Square icon-only button (`size-7` or `size-8`).
- **States**:
  - *Default*: Crisp border and subtle shadow (`shadow-2xs`).
  - *Hover*: Fast opacity/fill shift (`100ms`).
  - *Active / Pressed*: Scale `0.97` micro-press feedback.
  - *Focus-Visible*: 2px offset outline in active UI accent color (`ring-2 ring-[var(--sq-accent)] ring-offset-2`).
  - *Disabled*: `opacity-40 cursor-not-allowed pointer-events-none`.

---

### 2. Segmented Control (`components/ui/segmented.tsx`)
- **Anatomy**: Pill container holding a horizontal row of mutually exclusive options. An animated background pill slides underneath the active item.
- **Usage**: Mode toggles (Tool selection, Fill tone ladder, Canvas font face, Alignment controls, Paper shade options).
- **Behavior**:
  - Arrow keys (`←` / `→`) navigate options with automatic focus.
  - Clicking an option updates state instantly.
  - Includes `ToneChip` and `PaperSample` custom renderers for visual color previews.

---

### 3. Switch Toggle (`components/ui/switch.tsx`)
- **Anatomy**: Track pill (`w-8 h-4.5`) containing a sliding white thumb circle (`size-3.5`).
- **Usage**: Boolean toggles (Dot grid on/off, Confirm destructive actions, High contrast, Context menu floating).
- **States**:
  - *Off / Unchecked*: Neutral track (`bg-stone-300 dark:bg-stone-700`), thumb left.
  - *On / Checked*: Active accent track (`bg-[var(--sq-accent)]`), thumb right.
  - *Keyboard*: Spacebar toggles state; Tab navigates to switch.

---

### 4. Input & Textarea (`components/ui/input.tsx`)
- **Anatomy**: Text input container with optional prefix icon (e.g. MagnifyingGlass), clear button (`X`), and error border.
- **Usage**: Document rename field, Search queries, URL links, Numeric metric scrubbers.
- **States**:
  - *Default*: Border `stone-200 dark:stone-800`, background `white dark:stone-900/60`.
  - *Focus*: Glow outline in UI accent color (`border-[var(--sq-accent)] ring-1 ring-[var(--sq-accent)]`).
  - *Error*: Red border (`border-red-500`).
- **Numeric Scrubbing**: Dragging horizontally over numeric labels (e.g. `X`, `Y`, `W`, `H` in the Inspector) increments or decrements values smoothly.

---

### 5. Dropdown Menu (`components/ui/dropdown-menu.tsx`)
- **Anatomy**: Trigger button, floating anchored content menu, item rows with icons and shortcut hints, separators.
- **Usage**: Dock Brand Menu (`zenithsui ˅`), Files Popover, Context Menus, Look Theme Pickers.
- **Motion**: Gentle scale-fade entrance (`opacity: 0, scale: 0.96` -> `opacity: 1, scale: 1` over `120ms`).
- **Keyboard**: Escape dismisses menu; `↑`/`↓` moves selection; `Enter` commits action.

---

### 6. Tooltip (`components/ui/tooltip.tsx`)
- **Anatomy**: Dark floating badge (`bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[11px] px-2 py-1 rounded-md shadow-md`).
- **Features**: Displays tool label along with single-key shortcut badge (e.g. `"Rectangle (R)"`, `"Select (V)"`).
- **Timing**: Delay of `300ms` before display to prevent visual noise during fast mouse sweeps.

---

### 7. Floating Panel & PanelSection (`components/ui/panel.tsx`)
- **Anatomy**: Floating card container on the canvas with optional header, scrollable body, and footer.
- **Usage**: Inspector Panel, Library Drawer, Canvas Statistics, Canvas Search.
- **Anatomy Components**:
  - `Panel`: Master card container with backdrop blur (`backdrop-blur-md bg-stone-900/90 text-white dark:bg-stone-900/95 border border-stone-800 rounded-2xl`).
  - `PanelHeader`: Title and close icon.
  - `PanelSection`: Collapsible group with title and optional disclosure arrow.
  - `Row`: Single property row with label on left and input on right.
  - `StackRow`: Vertical stack for complex multi-control rows.

---

### 8. Notice Banner (`components/chrome/notice.tsx`)
- **Anatomy**: Floating horizontal toast banner at top-right corner.
- **Usage**: Temporary feedback messages (*"Copied PNG to clipboard"*, *"Document saved"*, *"Imported 4 pages"*).
- **Behavior**: Auto-dismisses after 3 seconds. Multiple triggers increment a stable message ID to reset the timer and animate a subtle pulse.

---

### 9. Context Menu (`components/chrome/context-menu.tsx`)
- **Trigger**: Right-click on canvas or selected node.
- **Items on Node Selection**:
  - Cut (`⌘X`), Copy (`⌘C`), Paste (`⌘V`), Duplicate (`⌘D`)
  - Bring to Front (`]`), Send to Back (`[`)
  - Flip Horizontal, Flip Vertical
  - Lock / Unlock (`⌘L`)
  - Break Apart (for components)
  - Open Child Whiteboard (for folder nodes)
  - Convert PDF to Canvas (for document nodes)
  - Delete (`Backspace`)
- **Items on Bare Canvas**:
  - New Drawing, New Child Whiteboard / Folder, Paste Here, Select All (`⌘A`), Reset View (`⌘0`), Settings.

---

### 10. Workspace Switcher (`components/chrome/workspace-switcher.tsx`)
- **Anatomy**: Compact dropdown in the Dashboard sidebar displaying current workspace name and color badge.
- **Options**: "Personal", "Academics", "Design Studio", "+ Create Workspace".
