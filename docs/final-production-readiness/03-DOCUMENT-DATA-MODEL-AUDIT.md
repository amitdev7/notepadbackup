# 03 — Document & Data Model Audit

## 1. Supported Canvas Node Types
Zenithsui supports 10 distinct node primitives under the `SquigNode` union:

| Node Type | TypeScript Interface | Key Attributes | Notes |
|---|---|---|---|
| `shape` | `ShapeNode` | `shape: 'rect' \| 'ellipse' \| 'diamond'`, `fill: FillTone` | Riso ink tonal fills: paper, light, strong |
| `draw` | `DrawNode` | `points: [number, number][]`, `stroke` | Freehand drawing with stable seed wobble |
| `text` | `TextNode` | `text`, `fontSize`, `fixedW`, `align`, `link` | Rich inline text with auto or fixed wrapping |
| `arrow` | `ArrowNode` | `points`, `startBinding`, `endBinding`, `head` | Dynamic perimeter bindings with anchor gap |
| `image` | `ImageNode` | `src: data:image/*`, `w`, `h` | Local-first data URI embedded images |
| `document` | `DocumentNode` | `name`, `mimeType`, `assetId`, `src` | Embedded attachments (PDF, documents) |
| `sticky` | `StickyNoteNode` | `text`, `tone`, `fontSize` | Colored memo notes |
| `frame` | `FrameNode` | `name`, `w`, `h` | Named canvas organizing containers |
| `embed` | `EmbedNode` | `url`, `title` | Web resource embeds |
| `component` | `ComponentNode` | `kind`, `props` | UI library components (buttons, cards) |

---

## 2. Clipboard Serialization & Deserialization
- Carrier: Dual MIME encoding (`text/html` with `data-zenithsui` JSON payload, and `text/plain` for fallback).
- Sanitization: All incoming nodes are strictly validated via `validNode`:
  - NaN/Infinite coordinate rejection.
  - Strict schema whitelisting for all 10 node types.
  - Verification of valid coordinate points and text length limits.

---

## 3. Clone & Arrow Binding Remapping
- `cloneNodes` assigns fresh IDs to all copied nodes and reconstructs bindings:
  - Updates `ArrowBinding.elementId` to point to newly cloned elements when both arrow and target are cloned together.
  - Remaps `groupIds` to prevent shared group mutations across distinct document regions.
