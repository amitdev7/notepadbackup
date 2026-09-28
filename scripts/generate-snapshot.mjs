import fs from "node:fs";
import path from "node:path";

const EXCLUDED_PATHS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".turbo",
  "CODEBASE_SNAPSHOT.md",
  "codebase_snapshot.md",
  "docs/hero.jpg",
  "app/favicon.ico",
  "scripts/tsconfig.tsbuildinfo",
]);

function getFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const rel = path.join(dir, entry).replace(/^\.\//, "");
    if (
      EXCLUDED_PATHS.has(rel) ||
      entry === "node_modules" ||
      entry === ".next" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === ".turbo"
    ) {
      continue;
    }
    const stat = fs.statSync(rel);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(rel));
    } else {
      if (!EXCLUDED_PATHS.has(rel)) {
        results.push(rel);
      }
    }
  }
  return results;
}

function getCategory(filePath) {
  if (!filePath.includes("/")) return 1; // Root configs
  if (filePath.startsWith(".zenithsui_data/")) return 1.5; // Data stores & seed workspaces
  if (filePath.startsWith("app/")) return 2; // App router & API
  if (filePath.startsWith("components/")) return 3; // Components
  if (filePath.startsWith("lib/")) return 4; // Library & core logic
  if (filePath.startsWith("docs/")) return 5; // Documentation
  if (filePath.startsWith("scripts/")) return 6; // Scripts
  if (filePath.startsWith("public/")) return 7; // Public assets
  return 8;
}

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".js":
    case ".mjs":
      return "javascript";
    case ".json":
    case ".lock":
      return "json";
    case ".css":
      return "css";
    case ".md":
      return "markdown";
    case ".svg":
      return "xml";
    case ".example":
      return "env";
    default:
      if (filePath.startsWith(".env")) return "env";
      return "";
  }
}

function getFence(content) {
  const matches = content.match(/`{3,}/g);
  if (!matches) return "```";
  let max = 3;
  for (const m of matches) {
    if (m.length >= max) {
      max = m.length + 1;
    }
  }
  return "`".repeat(max);
}

const files = getFiles(".");

files.sort((a, b) => {
  const catA = getCategory(a);
  const catB = getCategory(b);
  if (catA !== catB) return catA - catB;
  return a.localeCompare(b);
});

console.log(`Processing ${files.length} files...`);

let output = `# Zenithsui Codebase Snapshot

This file contains the complete, up-to-date source code of the Zenithsui project for AI agents and developers to reference.

Generated on: ${new Date().toISOString().split("T")[0]}
Total Files: ${files.length}

---

## Project Structure

\`\`\`
zenithsui/
├── app/                      # Next.js App Router
│   ├── api/                 # Backend REST & SSE endpoints (AI, Auth, Teams, Database, Share, Sketch)
│   ├── kitchen-sink/        # Component catalog showcase
│   ├── p/                   # Public share view
│   ├── globals.css          # Tailwind CSS imports
│   ├── layout.tsx           # Root application layout
│   └── page.tsx             # Main canvas workspace
├── components/               # React components
│   ├── canvas/              # Canvas, viewport, rough.js rendering, text overlay, smart sketch overlay
│   ├── chrome/              # UI chrome (panels, modals, inspector, left rail, auth, teams, AI)
│   ├── pdf-classroom/       # Interactive classroom whiteboard, PDF rendering & vector annotation layers
│   └── ui/                  # Reusable UI primitives (buttons, inputs, menus, panels, segmented)
├── lib/                     # Core logic, stores, and utilities
│   ├── ai/                  # AI assistant, BYOK vault, PDF intelligence, multi-provider engine
│   ├── canvas/              # Canvas transforms, hit testing, snap engine, text metrics, clipboard
│   ├── data-providers/      # Database adapters (Supabase, Postgres, Zenithsui Cloud, registry)
│   ├── library/             # Component & wireframe block definitions (basic, app, marketing, templates)
│   ├── sketch/              # Rough.js drawing primitives, icons, and text layout
│   └── sketch-recognition/  # Smart Sketch & Handwriting recognition, CNN engine, 69 specialist ensemble, renderers
├── docs/                    # Architecture, specifications, and AI documentation
├── scripts/                 # Build, generation, ML training & verification scripts
│   └── ml/                  # CNN training & specialist ensemble benchmarking pipelines
├── public/                  # Static assets & PDF.js worker
└── .zenithsui_data/         # Local file databases, workspaces, boards, users, teams & credentials
\`\`\`

---

## Key Files Index

### Configuration & Tooling
- package.json - Project dependencies and scripts
- tsconfig.json - TypeScript configuration
- next.config.ts - Next.js configuration
- postcss.config.mjs - PostCSS & Tailwind v4 plugin configuration
- eslint.config.mjs - ESLint flat configuration
- components.json - Component configuration
- metadata.json - Application metadata & capabilities
- .env.example - Documented environment variables
- README.md - Project documentation & overview
- AGENTS.md / GEMINI.md - AI guidelines & style preservation instructions
- bun.lock - Dependency lockfile

### Core Application & App Router
- app/layout.tsx - Root layout with viewport, theme script, and font setup
- app/page.tsx - Main canvas workspace
- app/globals.css - Tailwind CSS imports & base styles
- app/error.tsx - Application error boundary
- app/global-error.tsx - Global application error boundary
- app/not-found.tsx - 404 page
- app/p/[publicId]/page.tsx - Public shared canvas page
- app/kitchen-sink/page.tsx - Component library showcase

### State Management & Storage
- lib/store.ts - Primary Zustand store (document state, history, viewport, selection)
- lib/types.ts - Core domain types (Node, Edge, Viewport, Ink, etc.)
- lib/database.ts - Database client & workspace persistence
- lib/files.ts - Local document storage and file metadata
- lib/auth-store.ts - Authentication state (users, sessions, roles)
- lib/ai/ai-store.ts - AI assistant state, chat history, and suggestions
- lib/workspaces-client.ts - Client-side multi-tenant workspace management
- lib/connected-databases-client.ts - Client for connecting external SQL/Supabase databases

### Canvas & Drawing Engine
- components/canvas/canvas.tsx - Main canvas interaction, pan/zoom, gesture handling
- components/canvas/canvas-error-boundary.tsx - Canvas rendering isolation boundary
- components/canvas/sketch.tsx - Rough.js napkin sketch vector rendering
- components/canvas/context-row.tsx - Floating selection context toolbar
- components/canvas/text-edit-overlay.tsx - WYSIWYG text editing on canvas nodes
- components/canvas/smart-sketch-overlay.tsx - Live ink recognition HUD & candidate selector
- lib/canvas/snap-engine.ts - Smart alignment guides and snapping
- lib/canvas/hit-test.ts - Raycast and geometric hit testing
- lib/canvas/transform.ts - Node movement, resizing, and rotation transforms
- lib/sketch/kit.ts - Rough.js drawing primitives (rectangles, arrows, clouds, cards)
- lib/sketch/icons.ts - Phosphor icons sketch rendering
- lib/sketch/node-prims.ts - Node primitive vector builders
- lib/sketch/text-layout.ts - Word-wrapped rough napkin text formatting

### Smart Sketch Recognition & ML Engine
- lib/sketch-recognition/types.ts - Core sketch recognition types, stroke models, and confidence bounds
- lib/sketch-recognition/registry.ts - Gesture, geometry, and handwriting classes registry
- lib/sketch-recognition/preprocessing.ts - Stroke cleaning, normalization, convex hull, resampling, feature extraction
- lib/sketch-recognition/sequence-engine.ts - Multi-character handwriting clustering, temporal analysis & sequence engine
- lib/sketch-recognition/geometry-recognizer.ts - Deterministic polygon, ellipse, line, and connector classifier
- lib/sketch-recognition/handwriting-classifier.ts - Isolated letter and digit classifier
- lib/sketch-recognition/cnn-classifier.ts - Deep sketch classifier with multi-channel features
- lib/sketch-recognition/cnn-engine.ts - Client/server neural inference execution engine
- lib/sketch-recognition/cnn-rasterizer.ts - High-fidelity 32x32 rasterization for neural input
- lib/sketch-recognition/confidence-calibrator.ts - Platt scaling and softmax temperature calibration
- lib/sketch-recognition/orchestrator.ts - Central sketch recognition pipeline orchestrator
- lib/sketch-recognition/renderers.ts - Deterministic napkin sketch node & edge generation
- lib/sketch-recognition/specialists/types.ts - Specialist model types, priors, and evaluation metrics
- lib/sketch-recognition/specialists/class-definitions.ts - 69 distinct class specifications and geometric priors
- lib/sketch-recognition/specialists/hard-negatives-matrix.ts - Hard-negative disambiguation matrix
- lib/sketch-recognition/specialists/specialist-model.ts - One-vs-Rest specialist classifier with raster similarity
- lib/sketch-recognition/specialists/specialist-registry.ts - Singleton registry managing 69 specialist models
- lib/sketch-recognition/specialists/specialist-ensemble.ts - Multi-specialist arbitration and confidence fusing
- lib/sketch-recognition/models/geometry-cnn.json - Geometry CNN model weights
- lib/sketch-recognition/models/handwriting-cnn.json - Handwriting CNN model weights
- lib/sketch-recognition/models/object-cnn.json - Pre-trained CNN weights for sketch classification

### PDF Classroom & Smart Whiteboard Suite
- components/pdf-classroom/classroom-whiteboard.tsx - Full-screen educational whiteboard with drawing tools
- components/pdf-classroom/pdf-classroom-modal.tsx - Classroom view container modal
- components/pdf-classroom/pdf-annotation-svg.tsx - Real-time vector annotation rendering overlay
- components/pdf-classroom/smart-board-overlays.tsx - Teacher HUD overlays and presentation tools
- components/pdf-classroom/pdf-text-layer.tsx - Selectable PDF text rendering layer
- components/pdf-classroom/pdf-search-bar.tsx - In-document search interface
- components/pdf-classroom/pdf-thumbnails-rail.tsx - Multi-page navigation rail
- components/pdf-classroom/pdf-text-editor-overlay.tsx - Inline PDF text modification overlay

### Data Providers & Database Adapters
- lib/data-providers/provider-interface.ts - Abstract interface for external data sources
- lib/data-providers/registry.ts - Provider factory and connection registry
- lib/data-providers/supabase-provider.ts - Supabase database connector
- lib/data-providers/postgres-provider.ts - PostgreSQL connection adapter
- lib/data-providers/zenithsui-cloud-provider.ts - Native cloud workspace sync provider

### Component Library
- lib/library/registry.ts - Component catalog registry
- lib/library/defs-basic.ts - Fundamental wireframing components (buttons, inputs, checkboxes)
- lib/library/defs-blocks-app.ts - Application wireframe blocks (dashboards, tables, headers)
- lib/library/defs-blocks-marketing.ts - Landing page & marketing sections
- lib/library/defs-display.ts - Display elements (cards, badges, modals)
- lib/library/defs-extra.ts - Sticky notes, browser frames, annotations
- lib/library/defs-nav.ts - Navigation patterns (tabs, sidebars, breadcrumbs)
- lib/library/defs-templates.ts - Pre-assembled UI templates

### AI & PDF Intelligence
- lib/ai/router.ts - Multi-provider AI streaming router
- lib/ai/action-executor.ts - Translates AI suggestions into canvas mutations
- lib/ai/action-schema.ts - Strict schema validation for AI actions
- lib/ai/byok-vault.ts - Client-side encrypted key storage
- lib/ai/pdf-intelligence.ts - PDF parsing and canvas wireframe extraction
- lib/ai/orchestrator.ts - Orchestrates multi-step canvas generation and editing
- lib/ai/study-copilot.ts - Educational assistant for PDF learning and classroom notes

### Collaboration & Server API
- lib/collaboration-client.ts - Real-time SSE collaboration and presence client
- lib/server-realtime.ts - Server-side SSE broadcast and room manager
- lib/server-share.ts - Secure document sharing, public links, and password protection
- lib/server-storage.ts - File and database backend storage layer
- app/api/ai/* - AI chat, model test, provider, BYOK, and sketch recognition endpoints
- app/api/auth/* - Authentication, login, signup, recovery codes
- app/api/database/* - Database file CRUD, versioning, search, attachments
- app/api/teams/* - Multi-tenant team management and invitations
- app/api/share/* - Public share link verification and realtime synchronization
- app/api/workspaces/* - Workspace management, backup, storage, and boards

### Test & Machine Learning Pipelines
- scripts/ml/train-cnn.ts - Training pipeline for sketch recognition CNN
- scripts/ml/evaluate-specialists.ts - Benchmark and evaluation harness for 69 specialist models
- scripts/test-cnn-pipeline.ts - Integration test suite for full recognition pipeline
- scripts/test-handwriting-sequences.ts - Multi-word and digit sequence test suite
- scripts/test-smart-sketch.ts - Geometry recognizer validation test suite
- scripts/test-specialists.ts - Specialist ensemble and hard-negative test suite
- scripts/test-geometry.ts - Low-level geometric calculation tests
- scripts/test-text.ts - Text metrics and typography layout tests
- scripts/test-selection.ts - Multi-node selection & bounds tests
- scripts/test-clipboard.ts - Copy/paste serialization tests

### Persistent Data Stores (.zenithsui_data)
- .zenithsui_data/workspaces_v2.json - Workspace configurations and metadata
- .zenithsui_data/users.json - Local user directory and credential salts
- .zenithsui_data/teams.json - Team definitions and access control
- .zenithsui_data/ai_credentials.json - Stored AI provider connection status
- .zenithsui_data/connected_databases.json - Registered external database connections
- .zenithsui_data/boards_*.json - Stored boards, canvases, and wireframe documents

---
`;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const fence = getFence(content);
  const lang = getLanguage(filePath);

  output += `\n\n## File: ${filePath}\n\n${fence}${lang}\n${content}\n${fence}`;
}

output += "\n";

fs.writeFileSync("CODEBASE_SNAPSHOT.md", output, "utf8");
fs.writeFileSync("codebase_snapshot.md", output, "utf8");

const stat = fs.statSync("CODEBASE_SNAPSHOT.md");
console.log(`Successfully generated snapshot!`);
console.log(`File size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
console.log(`Total lines: ${output.split("\n").length}`);

