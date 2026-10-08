# 02 — Canvas Engine & Geometry Audit

## 1. Node Storage Model
Zenithsui maintains a flat, high-performance canvas node architecture:
- `nodes: Record<string, SquigNode>`: Keyed map of nodes providing $O(1)$ lookup and mutation.
- `order: string[]`: Array of IDs defining strict z-index rendering order.
- Grouping is represented as an array of group strings on `BaseNode.groupIds`, preserving flat lookups while supporting nested group hierarchies without deeply recursive AST trees.

---

## 2. Hit-Testing & Surface Solidity
- **Solid Shapes**: Shapes with `normalizeFill(n.fill) !== "none"`, text, sticky notes, embeds, and documents register hits across their entire interior bounding surface.
- **Rhombus Geometry (`diamond`)**:
  - `hitsPoint` evaluates normalized distance: $\frac{|x - c_x|}{r_x} + \frac{|y - c_y|}{r_y} \le 1 + \text{tol}$.
  - Clicking the corners of the rectangular bounding box outside the rhombus correctly returns `false`.
- **Hollow Shapes**: Empty rectangles and ellipses only capture hits along their boundary stroke within the `pickTolerance` collar, allowing users to start marquee selections through empty interiors.

---

## 3. Viewport & Coordinate Projections
- Transformations between screen coordinates and infinite world coordinates:
  - World to Screen: $[w_x \cdot z + v_x, w_y \cdot z + v_y]$
  - Screen to World: $[(s_x - v_x) / z, (s_y - v_y) / z]$
- Zoom is clamped between $0.05\times$ and $5.0\times$ with smooth logarithmic scaling.
- Viewport state is persisted per document.
