# 16 — Zenithsui UX Friction Audit & Known Pain Points

## 1. Executive UX Evaluation

During comprehensive testing across desktop, tablet, and mobile environments, the following 6 UX friction areas were identified. These represent architectural design trade-offs and areas for future refinement:

---

## 2. Friction Point Inventory

### 1. The Context Row vs. Inspector Redundancy
- **Problem**: When an element is selected, both the floating contextual toolbar (floating directly above the node) and the right-hand Property Inspector expose similar stroke, tone, and arrangement controls.
- **Impact**: On dense canvas diagrams, the floating context row can visually occlude neighboring elements or connectors, leading users to accidentally click the wrong node.
- **Root Cause**: Two competing interaction paradigms (Figma-style persistent inspector vs. Miro-style floating node HUD).

### 2. Deeply Nested Group Traversal
- **Problem**: In complex wireframes with nested groups, clicking a grouped child selects the entire parent group. Drilling down requires repetitive double-clicking.
- **Impact**: Casual users unfamiliar with vector design software struggle to edit text inside a card or button that has been grouped.
- **Remedy in Place**: `Cmd + Click` bypasses group hierarchy to select the leaf node directly, but lacks visual onboarding cues.

### 3. Mobile Dock Density on Compact Screens (< 380px)
- **Problem**: On screens like iPhone SE (375px width), the bottom dock hosts 10 drawing tools plus utility buttons.
- **Impact**: Horizontal real estate becomes tight; icons compress slightly, risking accidental taps on neighboring tools.

### 4. Risograph Duotone Constraint vs. Brand Color Demands
- **Problem**: Zenithsui strictly limits drawings to the selected palette's 6 spot inks and tonal washes.
- **Impact**: Users attempting to recreate multi-colored corporate logos or rainbow roadmaps cannot inject arbitrary hex codes.
- **Design Justification**: This constraint is intentional—it guarantees aesthetic coherence and prevents chaotic whiteboard visual rot—but creates friction for users expecting unconstrained color wheels.

### 5. Wi-Fi Peer-to-Peer Discovery in Enterprise Networks
- **Problem**: Zenithsui's local Wi-Fi auto-sync relies on local broadcast / WebRTC signaling.
- **Impact**: On enterprise Wi-Fi networks where client-to-client isolation is enforced by IT security, automatic peer discovery fails silently without clear diagnostic feedback.

### 6. Single-Key Shortcut Conflicts During Rapid Editing
- **Problem**: Single-letter shortcuts (`V`, `R`, `P`, `T`, `A`) are active whenever text fields are not focused.
- **Impact**: If a user finishes editing a text node and immediately types a sentence without verifying that the text cursor is active, they may trigger tool switches accidentally.
