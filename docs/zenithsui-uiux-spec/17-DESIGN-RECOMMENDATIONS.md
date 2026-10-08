# 17 — Zenithsui Design Recommendations & Future Enhancements

## 1. Interaction Refinements

Based on the systemic friction audit, the following design recommendations are prioritized for future iterations of Zenithsui:

---

## 2. Recommendation Portfolio

### 1. Adaptive Floating Context Row
- **Proposal**: Introduce an intelligent auto-positioning rule for the floating selection HUD.
- **Implementation**: If a node is within `60px` of the top edge of the viewport, position the floating context row below the selection bounds instead of above. If the selection is being actively dragged, dim the context row to `opacity: 0.2` to eliminate visual distraction.

### 2. Group Breadcrumb Trail
- **Proposal**: When a nested child is selected, display an unobtrusive breadcrumb indicator directly above the bounding box:
  ```
  [Homepage Wireframe] › [Navigation Bar] › [Sign Up Button]
  ```
- **Benefit**: Allows users to click any parent ancestor in the breadcrumb to expand their selection up the hierarchy without needing keyboard shortcuts.

### 3. Category-Segmented Mobile Dock
- **Proposal**: On viewports `< 500px`, consolidate the dock into three segmented categories:
  - `[Select / Pan]`
  - `[Create: Shapes, Draw, Text, Frames]`
  - `[Connect: Arrow, Line]`
- **Benefit**: Ensures 48px hitboxes on mobile screens while keeping the dock clean and uncrowded.

### 4. Secondary Accent Ink Slot
- **Proposal**: Introduce an optional "Spot Accent" swatch into the Page settings.
- **Specification**: Allow users to select one contrasting risograph ink (e.g., adding `Riso Red` highlights to an `Internet Blue` diagram).
- **Benefit**: Satisfies user demand for emphasis highlights while maintaining the authentic dual-plate risograph printing aesthetic.

### 5. Wi-Fi Auto-Sync Diagnostic Pill
- **Proposal**: Expand the Wi-Fi icon in the Top Bar to display live peer state:
  - `● 3 peers connected` (Green pulse)
  - `○ Searching local Wi-Fi...` (Amber steady)
  - `▲ Local isolation detected (using Cloud fallback)` (Informative badge)
