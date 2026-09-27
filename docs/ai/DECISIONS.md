# Architectural & Product Decisions

This file records all significant architectural, design, and product decisions for the Zenithsui project. Future AI agents and developers must respect these decisions.

---

# Decision: 20-Component Student Kit Architecture and Napkin Vector Primitives

Date: 2026-09-17
Status: ACCEPTED

## Decision
The 20 Student Kit components are built strictly as native `ComponentDef` definitions in `lib/library/defs-student.ts`, compiled directly to `Prim[]` vector primitives (`rect`, `pill`, `line`, `text`, `ellipse`, `icon`). Under no circumstances are student components rendered as HTML/DOM elements or styled with external high-fidelity design systems.

## Reason
1. **Preservation of Core Identity**: The hand-drawn rough.js napkin wireframe aesthetic is the signature identity of Zenithsui. By building the student library directly from `kit.ts` primitives and the standard `ComponentDef` architecture, the components feel like natural wireframe sketches drawn by a student on a desk napkin.
2. **Infinite Canvas Compatibility**: Native vector primitives allow zero-artifact zooming, scaling, panning, multi-selection, rotation, and serialization into the `.zenith` document format.
3. **Break-Apart Support**: Because they emit native primitives with predictable bounding geometry, any Student Kit component can be disassembled into raw editable canvas nodes (`SquigNode`) via `breakApart()`.
4. **AI Copilot Interoperability**: Fits seamlessly with Zenith AI Study Copilot prompts and canvas mutation proposals.

## Alternatives Rejected
- *Rendering with HTML/DOM overlays*: Causes canvas desynchronization, breaks zoom/pan transforms, and destroys the napkin aesthetic.
- *Introducing custom high-fidelity color palettes or rounded modern cards*: Directly violates the Zenithsui design system invariant.

---

# Decision: Strict Preservation of UI, UX, Look & Feel, Design, and Theme

Date: 2026-08-31
Status: PERMANENT MANDATE

## Decision
Under NO circumstances should the UI, UX, visual design, napkin/sketch aesthetic, color scheme, typography, layout, borders, buttons, or toolbars of Zenithsui be altered, restyled, modernized, or redesigned.
