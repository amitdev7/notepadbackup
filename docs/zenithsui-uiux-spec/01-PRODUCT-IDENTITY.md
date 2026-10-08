# ZENITHSUI — UI/UX Specification
## Document 01: Product Identity & Brand Philosophy

---

### 1. Brand Mission & Core Metaphor
Zenithsui is defined by a single core conviction:

> **"Napkin first, pixels later."**

Before software enters production, before an architectural diagram is set in stone, and before a student memorizes a formula, ideas must exist in an uncommitted, malleable, exploratory state. 

Traditional digital whiteboards make premature commitments: they force users into sterile corporate rectangles or slick polished vectors. Zenithsui provides an intentional, tactile counterweight—an infinite digital surface that feels like an **early-web risograph print workshop meets an engineer's graph-paper notebook**.

---

### 2. The Golden Dichotomy: Chrome vs Canvas

A foundational rule of Zenithsui's design architecture is the **strict separation between Application Chrome and Canvas Language**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ APPLICATION CHROME (The Frame)                                         │
│ • Calm, neutral, understated, modern macOS/iPadOS utility aesthetic    │
│ • Colors: Deep zinc/charcoal darks (#121316), subtle cool light grays  │
│ • Typography: Inter / Geist Sans (clear, highly legible, sans-serif)   │
│ • Role: Get completely out of the way; never compete with the content   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ sits on top of
┌───────────────────────────────────▼────────────────────────────────────┐
│ CANVAS LANGUAGE (The Art)                                              │
│ • Tactile early-web Risograph duotone ink on warm textured paper       │
│ • Colors: High-saturation single inks (Internet Blue, Riso Red, etc.)  │
│ • Shading: Flat 3-step tonal ladder (paper, 8% ink wash, 20% wash)     │
│ • Geometry: Hand-drawn closed paths via Rough.js with stable seeds     │
│ • Typography: Patrick Hand (uncommitted sketch) or Geist/Georgia       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Why This Distinction Matters
When designers attempt to make the *entire application* look like a hand-drawn cartoon, the tool feels childish, unergonomic, and untrustworthy for serious work. Conversely, when designers make the *canvas* look like a standard corporate dashboard, the freedom to explore is lost. Zenithsui preserves this tension: **a professional, razor-sharp instrument holding a deeply expressive, analog drawing plane**.

---

### 3. The Risograph Color & Paper Philosophy

Rather than allowing an arbitrary color picker with infinite RGB gradients, Zenithsui uses a **curated printing palette**:

1. **The Substrate (Paper)**:
   - Base canvas color is warm, off-white unbleached newsprint (`#FBFAF5` in default Internet Blue).
   - A paper shade dial allows adjusting between `White` (bleached for crisp exports), `Subtle` (natural warm paper), and `Shaded` (slightly darkened to let opaque cards pop).

2. **The Inks (Duotone Palettes)**:
   - Exactly one saturated ink color is active per drawing, echoing physical Risograph cylinder printing:
     - **Internet Blue** (`#2438FF`): Default ink. Electric early-web hyperlink blue on warm ivory.
     - **Riso Red** (`#E0342B`): Vibrant editorial scarlet ink on cream paper.
     - **Terminal Green** (`#137A3D`): Deep CRT green on pale matcha paper.
     - **Purple Drizzle** (`#71268A`): Moody rich plum ink on lavender paper.
     - **Dirty Blond** (`#B26A0F`): Warm ochre/marigold ink on straw paper.
     - **Hipster Black** (`#2D2A26`): Deep charcoal/graphite ink on pale stone.

3. **The 3-Tone Shading Ladder**:
   - Every wireframe element, card, bar chart, and illustration draws its fill from exactly three tones:
     - `paper`: Pure opaque white (`#FFFFFF`) to occlude elements underneath.
     - `shade`: 8% ink mixed mathematically into paper. Used for inert surfaces, table headers, tracks.
     - `shadeStrong`: 20% ink mixed into paper. Used for emphasis, selected tabs, progress bars.
   - *There is no fourth tone by design.* This guarantees wireframes read as a coherent tonal hierarchy rather than a chaotic pile of tints.

4. **Selection UI Inversion**:
   - The selection marquee, bounding boxes, and transform handles deliberately use a **contrasting secondary color** (e.g. Electric Violet `#A200FF` in Internet Blue, Bright Blue `#2438FF` in Riso Red) so UI controls never blend into the artwork itself.

---

### 4. The Canvas Mascot: The Zenithsui Bear

At the center of an empty canvas sits Zenithsui’s beloved visual anchor: a charming hand-drawn bear wearing a tilted baseball cap, holding up an inked wireframe document with a happy face.

#### Mascot Captions & Voice
Underneath the mascot sits a subtle, hand-lettered caption rendered in the active ink (`font-sketch`). On canvas load, it randomly selects from an encouraging set of core maxims:
- *"let's doodle your next idea"*
- *"draw it before you build it"*
- *"napkin first, pixels later"*
- *"what are we sketching today?"*
- *"warming up the pencils…"*

The mascot instantly relieves the intimidation of the "blank canvas syndrome," signaling to the user that perfection is not required here.

---

### 5. Competitive Differentiation

| Feature / Dimension | Zenithsui | Excalidraw | Figma / FigJam | Miro / Mural |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Visual Tone** | Risograph print / tactile engineering | Loose hand-sketch | Vector precision / slick stickers | Corporate enterprise presentation |
| **Component Library** | 168 pre-built UI & Academic blocks | Community libraries only | Massive vector UI kits | Sticky notes & flowchart templates |
| **Document Hierarchy** | First-class Nested Whiteboards | Flat single file | Pages & Sections | Infinite board frames |
| **Local-First & Storage** | IndexedDB zero-loss snapshotting | LocalStorage / cloud backend | Cloud-only (requires login) | Cloud-only (enterprise server) |
| **Academic / Study Engine** | Built-in Syllabus, Spaced Repetition, Calendars | None | None | None |
| **P2P LAN Sync** | Built-in zero-cloud classroom sync | None | None | None |
| **File Attachments** | Multi-page PDFs, CSV, JSON, Markdown on canvas | Images only | Images, widgets | Files, PDFs, embeds |
