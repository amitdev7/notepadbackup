# Zenithsui Canvas Frames & Container Hierarchy Specification

This document outlines the container hierarchy, nesting rules, and render ordering for Frame elements in Zenithsui Canvas.

---

## 1. Frame Ordering Invariants

To guarantee deterministic clipping, hit-testing, and layer compositing, canvas elements inside frames must strictly adhere to the following order sequence:

- **Frame children appear first in the element array**, ordered from bottom-most child to top-most child.
- **The frame element itself follows immediately after all its children**.

```text
[
  background_element,
  frame1_child1,
  frame1_child2,
  frame1_parent,
  canvas_element_between,
  frame2_child1,
  frame2_child2,
  frame2_parent,
  foreground_element
]
```

---

## 2. Rationale & Performance Impact

1. **Clipping Context**: Canvas renderers configure an SVG `<clipPath>` or 2D canvas clipping rectangle using the frame boundary before drawing the contained child nodes.
2. **Hit-Testing**: When selecting items within a frame, child nodes take precedence over the background bounding container of the frame.
3. **Viewport Culling**: If the parent frame is detected to be offscreen during viewport culling, the rendering pipeline can immediately skip all bundled child elements in a single bounds check.
