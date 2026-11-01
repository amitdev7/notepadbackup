# ADR 0002: Deterministic Procedural Rough.js Canvas Rendering

## Status
**Accepted**

## Context
Zenithsui uses Rough.js to generate hand-drawn sketch graphics (lines, curves, rectangles, arrows). By default, Rough.js utilizes `Math.random()` to generate procedural stroke jitter and line bowing.

In an interactive React canvas, components re-render during panning, zooming, selection changes, and property edits. Using raw random numbers causes lines to continuously re-jitter and twitch, creating severe visual fatigue and breaking export determinism.

## Decision
We enforce **Deterministic Procedural Rendering**:
1. Every canvas node data model requires a persistent 32-bit integer `seed`.
2. The `seed` is assigned once when the element is created.
3. Rough.js generators explicitly pass `{ seed: node.seed }` during all render passes.
4. Serialized export bundles (`.zenithsui.json`, `.excalidraw`) preserve this seed.

## Consequences
### Positive
- Hand-drawn roughness remains visually stable during pans, zooms, and theme switches.
- Exported images and shared canvases look visually identical across different machines.
### Negative / Trade-offs
- Modifying stroke properties (e.g., width or roughness slider) slightly alters the procedural output path, but the output remains stable once set.
