# Contributing to Zenithsui

Thank you for your interest in contributing to **Zenithsui**! We welcome bug fixes, documentation improvements, architectural proposals, and performance optimizations.

This guide outlines our development workflow, engineering standards, testing expectations, and pull request procedures.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with respect and professionalism.

---

## Quick Reference Commands

| Task | Command |
|---|---|
| Install dependencies | `pnpm install --frozen-lockfile` |
| Start development server | `pnpm dev` |
| Run test suite (37 suites) | `pnpm test` |
| Type check | `pnpm exec tsc --noEmit` |
| Lint codebase | `pnpm lint` |
| Production build | `pnpm build` |
| Electron desktop dev | `pnpm desktop:dev` |
| Electron desktop build | `pnpm desktop:build` |

---

## Development Prerequisites

Before setting up the project, ensure your environment meets the minimum version requirements:

- **Node.js**: `20.x`, `22.x` (recommended), or `24.x`
- **Package Manager**: `pnpm >= 10.4.0` (pinned to `pnpm@10.4.1` via `packageManager`)
- **Git**: `>= 2.30`

> [!IMPORTANT]
> Always use `pnpm`. Do not use `npm` or `yarn`, as doing so will produce incompatible lockfiles and break CI reproducibility.

---

## Local Setup Workflow

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/amitdev7/notepadbackup.git
   cd notepadbackup
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(All features have complete offline local-first fallbacks; cloud Supabase credentials are only needed if testing cloud sync or authentication).*

4. **Start the Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Branching Conventions

Create a topic branch branched from `main`:

```bash
git checkout -b <type>/<short-description>
```

### Recognized Branch Types

| Type | Description | Example |
|---|---|---|
| `feat/` | New user-facing feature or capability | `feat/laser-pointer-trail` |
| `fix/` | Bug fix or regression patch | `fix/top-bar-clock-jitter` |
| `docs/` | Documentation additions or corrections | `docs/architecture-mermaid` |
| `refactor/` | Code refactoring without behavior change | `refactor/viewport-store` |
| `test/` | Adding or updating test suites | `test/viewport-memory-tests` |
| `perf/` | Performance optimizations | `perf/spatial-index-query` |
| `chore/` | Tooling, dependencies, or maintenance | `chore/update-pnpm-deps` |

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short imperative description>

[optional body explaining motivation and changes]

[optional footer referencing issues, e.g. Fixes #12]
```

### Commit Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process, auxiliary tools, or libraries

### Commit Scopes
- `canvas`: Core canvas engine, rendering, Rough.js
- `chrome`: Floating toolbars, top-bar, dock, inspector, popovers
- `storage`: IndexedDB, document store, local-first persistence
- `sync`: Cloud sync, peer-to-peer Wi-Fi LAN, invitations
- `academic`: Syllabus, planner, guardian, revision engine
- `desktop`: Electron wrapper, NSIS installer, auto-updater
- `api`: Serverless API routes

### Examples
- `feat(canvas): add spatial tree index for 10k node hit-testing`
- `fix(chrome): stabilize top-bar clock width transitions`
- `docs(readme): add genuine screenshot gallery and verification runbook`
- `test(sync): add race condition prevention test for document switching`

---

## Code & Architectural Standards

### 1. Architectural Invariants
- **Strict Separation of Canvas and Chrome**: Chrome elements must carry `data-zenithsui-chrome` and stop pointer propagation. Canvas drawing elements must never be shifted by CSS layout transitions.
- **Deterministic Rendering**: Every shape or sketch node must carry a stable 32-bit integer `seed` to guarantee Rough.js procedural stroke determinism across re-renders.
- **Local-First Autonomy**: All core editing and persistence must function offline with zero network connection. Cloud and LAN integrations must be additive.

### 2. TypeScript Guidelines
- All new code must be fully typed. Avoid `any`; use `unknown` or specific interfaces.
- Strict null checks and strict type-checking are enforced.
- Run `pnpm exec tsc --noEmit` before committing.

### 3. Styling & Themes
- Use Tailwind CSS v4 semantic tokens (`bg-background`, `text-foreground`, `border-border`, `--ui-accent`).
- Do not hardcode static colors like `#007AFF` or `stone-800` into core components; bind dynamically to CSS theme variables to preserve light, dark, sepia, and midnight modes.

---

## Testing Guidelines

Zenithsui includes 37 dedicated test suites in `scripts/test-*.ts` testing geometry, clipboard, security, database RLS, offline sync, LAN collaboration, academic OS, and desktop updater.

Before submitting a pull request, run the test suite:

```bash
pnpm test
```

### Adding New Tests
1. Locate the appropriate category in `scripts/`.
2. For new subsystems, create `scripts/test-<feature-name>.ts`.
3. Add the test file invocation to the `test` script in `package.json`.
4. Verify that tests execute deterministically with 0 race conditions.

---

## Pull Request Process

1. **Verify All Checks Locally**:
   ```bash
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm test
   pnpm build
   ```
2. **Push Branch and Open PR**:
   - Fill out the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
   - Link any related issue(s).
   - Provide before/after screenshots for any UI changes.
3. **Review & Rebase**:
   - Address any reviewer feedback.
   - Keep commit history clean by squashing or rebasing when requested.
4. **CI Verification**:
   - Ensure all automated GitHub Actions CI jobs pass cleanly.
