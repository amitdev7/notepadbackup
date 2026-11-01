# Changelog

All notable changes to the **Zenithsui** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Cross-platform macOS (.dmg) and Linux (.AppImage) native desktop builds.
- WebRTC end-to-end encrypted mesh collaboration.
- Vector SVG path import with automatic Rough.js procedural sketch conversion.

---

## [0.1.0] - 2026-11-02

### Added
- **Apple VisionOS & Liquid Glass Design System**:
  - Liquid Glass 2.0 micro-interaction system across the top bar capsule, bottom dock, and inspector.
  - Multi-theme support: Light, Dark, Sepia (warm parchment), Midnight (pure OLED black), and System.
  - 5 physical reference card styles for smart hover notes: Yellow Slate, Ice Ceramic, Royal Slate, Cyan Slate, and Acrylic Glass.
  - Ultra-smooth spring-lerp GPU motion engine for hover text positioning and card transitions.
- **Infinite Canvas & Rendering Pipeline**:
  - Deterministic procedural napkin sketch rendering powered by Rough.js with stable 32-bit seeds.
  - 60 FPS viewport coordinate transformations (`screenToWorld`, `worldToScreen`).
  - Spatial indexing with R-tree bounding box queries supporting 10,000+ simultaneous nodes.
  - Excalidraw format interoperability (`.excalidraw` and `.excalidrawlib` import/export).
  - High-performance PDF-to-canvas importer and viewer dialog.
  - Temporary canvas elements engine with configurable automatic expiration and recovery archive.
- **Local-First & Multi-Document Persistence**:
  - Zero-latency multi-document IndexedDB storage engine (`zenithsui_db`).
  - Autosave with atomic transaction commits and offline conflict resolution.
  - Viewport memory system: persistent per-document camera positions and zoom states.
- **Academic OS Suite**:
  - Syllabus tracking with visual progress heatmaps and milestone checklists.
  - Functional academic planner and calendar with conflict detection.
  - Spaced repetition revision engine and active recall practice tracker.
  - Academic Guardian system for distraction prevention and session analytics.
  - Unified Student Hub workspace dashboard.
- **Collaboration & Networking**:
  - Peer-to-peer Wi-Fi LAN real-time live synchronization bridge.
  - End-to-end cryptographic sharing utilizing authenticated AES-256-GCM tokens.
  - Hardened SSRF-protected asset proxy (`/api/assets/proxy`) for secure external media resolution.
  - Drift-free server timestamp calibration with automatic network round-trip measurement.
  - Real-time geolocation and timezone detection with privacy-conscious approximate fallbacks.
- **Cross-Platform Desktop (Electron)**:
  - Windows NSIS installer and standalone portable builds with auto-updater (`electron-updater`).
  - Hardened context isolation bridge and secure native file system IPC.
- **Automated Verification**:
  - 37 dedicated test suites covering canvas geometry, selection, clipboard, text, security, database RLS, sync, and LAN protocols.

### Fixed
- **Top Bar Clock Sizing**: Eliminated seconds-tick horizontal jitter and pill capsule width morphing by enforcing `tabular-nums`, removing `tracking-tight`, setting stable container widths, and scoping CSS transitions away from structural dimensions.
- **Document Switching Race Conditions**: Resolved async viewport load race conditions when rapidly switching active documents in the files manager.
- **Standalone Electron Packaging**: Fixed standalone `node_modules` path resolution and CommonJS preload script bundling for desktop distributables.

### Performance
- Optimized dock magnification with direct requestAnimationFrame (RAF) DOM transforms, avoiding React state re-render cascades.
- Isolated GPU composite layers with `transform: translateZ(0)` and `will-change: transform`.
- Sub-pixel gesture smoothing for touchpad panning and pinch-to-zoom.

---

## Versioning Policy

- **Major (X.0.0)**: Breaking changes to file storage formats, database schemas, or public APIs.
- **Minor (0.X.0)**: New features, canvas tools, component vocabulary blocks, or platform targets.
- **Patch (0.0.X)**: Bug fixes, performance optimizations, security patches, and documentation updates.
