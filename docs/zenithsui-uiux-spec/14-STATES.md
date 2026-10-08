# 14 — Zenithsui Component & Canvas State Matrix

## 1. System-Wide State Hierarchy

Every surface, control, and canvas element in Zenithsui implements a predictable lifecycle across 8 fundamental UI states:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          STATE PROGRESSION FLOW                        │
│                                                                        │
│   [Empty / Init] ───► [Loading / Hydration] ───► [Ready / Idle]        │
│                                                        │               │
│                                    ┌───────────────────┴──────────┐    │
│                                    ▼                              ▼    │
│                             [Interactive]                    [Viewer]  │
│                             • Hover                          (Locked)  │
│                             • Pressed                                  │
│                             • Selected                                 │
│                             • Editing                                  │
│                                    │                                   │
│                                    ▼                                   │
│                           [Degraded / Offline]                         │
│                           • Offline sync                               │
│                           • Error / Conflict                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Empty States

### 1. The Empty Canvas (Hero State)
- **Visual Trigger**: Rendered when `Object.keys(nodes).length === 0`.
- **Mascot Illustration**: Features Pablo Stanley's friendly illustrated bear sitting quietly in the center.
- **Copy**: *"draw something, or tap R to make a box"*.
- **Interaction**: Directly disappears the moment the first stroke or node is created.

### 2. Empty Library Search
- **Trigger**: Searching the Component or Block library with a query that returns zero matches.
- **Visual**: A faded magnifying glass icon with the caption: *"No matching components found. Try searching for 'button', 'card', or 'table'."*
- **Action**: A single *"Clear search"* link button to reset the query.

### 3. Empty Trash Dialog
- **Trigger**: Opening Trash when no nodes or canvases have been deleted.
- **Visual**: Open trash basket illustration with: *"Trash is empty. Discarded items will appear here before being permanently cleared."*

---

## 3. Loading & Rehydration States

### 1. Canvas Initial Load ("Warming Up the Pencils")
- **Trigger**: App mount prior to IndexedDB rehydration.
- **Visual**: Fullscreen background tinted with `--sq-bg`, displaying the warm italic phrase:
  > *"warming up the pencils…"*
- **Font**: Set in the user's active canvas font (`Virgil` or `Assistant`).

### 2. PDF-to-Canvas Conversion Spinner
- **Trigger**: Converting multi-page PDFs to canvas elements.
- **Visual**: Progress bar accompanied by: *"Rendering page 3 of 12 as vector canvas cards..."*

### 3. File List Thumbnails
- **Trigger**: Files Popover fetching cached canvas snapshots.
- **Visual**: Pulsing skeleton rectangle (`bg-stone-200/60 dark:bg-stone-800/60 animate-pulse`) with rounded corners.

---

## 4. Interactive Element States

| State | Canvas Node | Dock Button | Dropdown Menu Item |
|:---|:---|:---|:---|
| **Idle** | Authored stroke and fill | Translucent neutral icon | Neutral row, regular font |
| **Hover** | Cursor changes to crosshair/grab | `bg-stone-100 dark:bg-stone-800` | `bg-accent text-accent-foreground` |
| **Pressed** | Node starts dragging | `scale-95 bg-stone-200/80` | `bg-accent/80` |
| **Selected** | 8 bounding handles, violet selection outline | Bold icon, filled indicator pill | Highlighted checkmark |
| **Disabled** | Opacity `0.4`, unselectable | Opacity `0.35`, cursor `not-allowed` | Muted text, pointer events none |
| **Locked** | Lock badge on top-left, handles disabled | N/A | Displays "Unlock" instead of "Lock" |

---

## 5. Viewer Mode (Read-Only)

When entering a shared whiteboard as a viewer:
- **Top Bar Badge**: Displays an amber pill reading `VIEWER`.
- **Bottom Dock**: Disables all drawing and creation tools; switches automatically to Hand/Pan mode (`H`).
- **Canvas Interaction**: Clicking nodes reveals inspection bounds and export options but blocks dragging, deletion, or text editing.
- **Inspector**: Replaces editable controls with read-only geometry metrics (width, height, coordinates).
