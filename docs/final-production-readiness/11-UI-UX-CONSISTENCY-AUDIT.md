# 11 — UI / UX Consistency Audit

## 1. Risograph Spot-Ink Design System
Zenithsui features a distinct analog print aesthetic rooted in Risograph printing culture:
- **Paper Background**: Warm newsprint tones (`#f8f6f0` / dark charcoal `#0E1015`).
- **Spot-Ink Palette**: Bold, deliberate ink tones (Federal Blue, Teal, Amber, Hunter Green, Fluorescent Pink, Black).
- **Ink Tonal Ladder**: Replaces arbitrary hex fills with authentic Risograph screen tints (`paper`, `light`, `strong`, `none`).

---

## 2. Dock Controls Visibility Architecture
Per product directives, the bottom toolbar and action buttons are fully configurable:
- **Default State**:
  - `toolFrame: false` (Frame tool hidden by default)
  - `toolSticky: false` (Sticky Note tool hidden by default)
  - `actionSearch: false` (Search action hidden by default)
  - `actionStats: false` (Stats action hidden by default)
- **Settings Dialog Integration**:
  - Under `Settings > Canvas & Toolbar`, users are provided an exhaustive 26-toggle matrix divided into:
    1. Drawing & Creation Tools (11 items)
    2. Quick Action Buttons (4 items)
    3. Dock Modules (2 items)
    4. Brand Menu Items (11 items)
  - Bulk action buttons: `[Enable All]` and `[Reset Defaults]`.
- **Visual Polish**: Bottom dock dynamically hides inactive tools and balances separators, ensuring zero layout shifts or empty toolbar gaps.
