# Zenithsui GitHub Project Management & Governance Runbook

This guide defines the project management taxonomy, label hierarchy, milestone roadmap, GitHub Projects board setup, and recommended repository protection rules for **Zenithsui**.

---

## 1. Issue & PR Label Taxonomy

Zenithsui uses a structured, color-coded label taxonomy categorized by **Type**, **Priority**, **Status**, and **Area**:

### Type Labels
| Label | Color | Description |
|---|---|---|
| `type: bug` | `#d73a4a` | Something isn't working as expected |
| `type: feature` | `#a2eeef` | New user-facing capability or tool |
| `type: enhancement` | `#a2eeef` | Incremental improvement to existing feature |
| `type: docs` | `#0075ca` | Improvements or corrections to documentation |
| `type: refactor` | `#cfd3d7` | Code restructuring without user-facing behavior change |
| `type: perf` | `#d4c5f9` | Performance optimization (memory, FPS, render latency) |
| `type: security` | `#b60205` | Security vulnerability, hardening, or dependency patch |

### Priority Labels
| Label | Color | Description |
|---|---|---|
| `priority: critical` | `#b60205` | Severe bug causing data loss, crash, or blocking release (P0) |
| `priority: high` | `#d93f0b` | Major functional issue with high user impact (P1) |
| `priority: medium` | `#fbca04` | Standard bug or planned feature enhancement (P2) |
| `priority: low` | `#0e8a16` | Minor polish, cosmetic issue, or low-urgency task (P3) |

### Status Labels
| Label | Color | Description |
|---|---|---|
| `status: needs-triage` | `#ededed` | Newly submitted issue awaiting maintainer review |
| `status: confirmed` | `#bfdadc` | Issue reproduced and accepted for development |
| `status: in-progress` | `#fef2c0` | Currently being actively worked on by a contributor |
| `status: blocked` | `#e99695` | Blocked on an external dependency, upstream bug, or user input |
| `status: completed` | `#0e8a16` | Resolved, verified, and merged |

### Area Labels
| Label | Color | Description |
|---|---|---|
| `area: canvas` | `#1d76db` | Core canvas math, Rough.js sketches, gestures, tools |
| `area: chrome` | `#5319e7` | Overlays, docks, top bar, modals, inspector, themes |
| `area: storage` | `#0052cc` | IndexedDB, autosave, file export/import, document store |
| `area: sync` | `#006b75` | Cryptographic sharing, peer-to-peer Wi-Fi LAN |
| `area: academic` | `#1f883d` | Academic OS suite (syllabus, planner, revision, hub) |
| `area: desktop` | `#47848f` | Electron wrapper, Windows NSIS installer, auto-updater |
| `area: api` | `#d93f0b` | Serverless API routes under `/app/api/` |

---

## 2. Milestone Roadmap

### Milestone 1: `v0.1.1 Maintenance & Quality Hardening`
- **Focus**: Minor edge-case fixes, test suite hardening, documentation validation.
- **Key Deliverables**:
  - Verification of high-DPI canvas touch input on tablet devices.
  - Performance audit on low-memory mobile browser viewports.

### Milestone 2: `v0.2.0 WebRTC & Real-Time Canvas Collaboration`
- **Focus**: Direct peer-to-peer mesh synchronization with end-to-end encryption.
- **Key Deliverables**:
  - WebRTC data channel transport for zero-latency multi-cursor presence.
  - CRDT-based concurrent stroke merging.

### Milestone 3: `v0.3.0 Cross-Platform Desktop Packaging`
- **Focus**: Expanding desktop coverage beyond Windows.
- **Key Deliverables**:
  - macOS DMG & universal binary packaging (Apple Silicon & Intel).
  - Linux AppImage and `.deb` packages with auto-update capability.

---

## 3. GitHub Projects Board Configuration

To configure an official **Zenithsui Engineering Board** in GitHub:

1. In the repository, navigate to the **Projects** tab -> **New project**.
2. Select the **Board** template and name it `Zenithsui Roadmap & Execution`.
3. Configure the following column workflow:
   - **📥 Backlog**: Candidate issues, user feature requests, raw proposals.
   - **📋 Ready for Dev**: Triaged, priority-assigned issues ready to be picked up.
   - **⚙️ In Progress**: Branch created, active development underway.
   - **👀 In Review**: Pull request opened, undergoing automated CI checks and code review.
   - **✅ Done**: Merged to `main` and verified in staging or production.
4. Add Custom Fields:
   - `Priority` (Single select: Critical, High, Medium, Low)
   - `Area` (Single select: Canvas, Chrome, Storage, Sync, Academic, Desktop, API)
   - `Target Milestone` (Linked milestone)

---

## 4. Recommended Branch Protection Rules

To protect production stability, configure branch protection for `main`:

### Manual Configuration Steps in GitHub:
1. Navigate to **Settings** -> **Branches** -> **Add branch protection rule**.
2. Enter branch name pattern: `main`.
3. Check **Require a pull request before merging**:
   - *Require approvals*: 1 (or maintainer approval).
   - *Dismiss stale pull request approvals when new commits are pushed*: Checked.
4. Check **Require status checks to pass before merging**:
   - *Require branches to be up to date before merging*: Checked.
   - Status checks to require:
     - `Lint & Typecheck`
     - `Test Suites (37 Suites)`
     - `Production Build Verification`
5. Check **Require conversation resolution before merging**: Checked.
6. Check **Do not allow bypassing the above settings**: Checked.
7. Click **Create** or **Save changes**.

---

## 5. Security & Secret Protection Settings

In **Settings** -> **Code security and analysis**:
- **Dependabot alerts**: Enabled
- **Dependabot security updates**: Enabled
- **Secret scanning**: Enabled
- **Push protection**: Enabled
