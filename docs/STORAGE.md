# Zenithsui Storage & Local-First Persistence

This document explains the storage architecture, IndexedDB schema, autosave mechanics, and file export formats utilized by **Zenithsui**.

---

## 1. Storage Architecture Overview

Zenithsui is built around the **Local-First Software principle**:
- **Offline Autonomy**: Data is written directly to client-side IndexedDB before any network transmission occurs.
- **Instant Response**: Canvas edits are applied to in-memory Zustand stores immediately (0ms user-perceived latency) and asynchronously flushed to IndexedDB via atomic transactions.
- **Additive Cloud Synchronization**: Cloud persistence (Supabase) and Wi-Fi synchronization are purely complementary layers that reconcile with the local database.

---

## 2. IndexedDB Schema (`zenithsui_db`)

The primary client database is named `zenithsui_db` (version 2):

### Object Stores

#### 1. `documents`
Stores document records, canvas elements, and metadata.
- **Key Path**: `id` (string, e.g. `doc_abc123`)
- **Indexes**:
  - `updatedAt` (number, epoch timestamp)
  - `title` (string)
  - `isArchived` (boolean)
- **Record Schema**:
  ```typescript
  interface DocumentRecord {
    id: string;
    title: string;
    elements: CanvasNode[];
    appState: {
      viewBackgroundColor: string;
      zoom: number;
      scrollX: number;
      scrollY: number;
      theme: "light" | "dark" | "sepia" | "midnight";
    };
    version: number;
    createdAt: number;
    updatedAt: number;
  }
  ```

#### 2. `viewports`
Maintains persistent camera position and zoom levels per document, ensuring the user returns to their exact viewing position upon switching documents.
- **Key Path**: `documentId` (string)
- **Record**: `{ documentId: string, scrollX: number, scrollY: number, zoom: number, updatedAt: number }`

#### 3. `assets`
Stores embedded images, PDF binary buffers, and external media blobs locally.
- **Key Path**: `id` (SHA-256 hash string of binary content)
- **Record**: `{ id: string, mimeType: string, data: ArrayBuffer | Blob, createdAt: number }`

#### 4. `academic_records`
Maintains local academic tracking data (syllabus trees, planner events, Leitner revision cards).
- **Key Path**: `id` (string)
- **Indexes**: `type`, `courseId`, `scheduledDate`

---

## 3. Autosave Lifecycle & Debounce Engine

To prevent disk thrashing while preserving responsiveness during continuous dragging operations:
1. **In-Memory Mutation**: Changes are committed to the Zustand store on every animation frame.
2. **Debounce Buffer (150ms)**: When user interactions cease, a timer triggers `saveCurrentDocument()`.
3. **Atomic Transaction**: An IndexedDB `readwrite` transaction opens, writing the document record atomically.
4. **Broadcast Notification**: Other tabs or desktop windows receive an event via `BroadcastChannel("zenithsui_sync")` to update recent files lists without reloading.

---

## 4. Conflict Resolution & Sync Replay

When syncing across devices or reconnecting after offline work:
- **Last-Write-Wins (LWW) with Vector Clocks**: Each document operation carries an incrementing revision number and timestamp.
- **Element-Level Merging**: If two peers edit different nodes simultaneously, operations merge cleanly based on unique node IDs (`node.id`).
- **Conflict Safeguard**: If identical nodes are modified simultaneously, the modification with the latest verified server timestamp takes precedence, and the displaced version is archived in the temporary recovery store.

---

## 5. File Import & Export Formats

| Format | Extension | Capabilities |
|---|---|---|
| **Zenithsui Native** | `.zenithsui.json` | Complete lossless document state, nodes, camera, theme, and academic metadata |
| **Excalidraw Compatible** | `.excalidraw` | Standard JSON format compatible with Excalidraw tools |
| **Excalidraw Library** | `.excalidrawlib` | Reusable component library bundle |
| **Raster Image** | `.png` | High-resolution raster export with transparent or canvas background |
| **Vector Graphic** | `.svg` | Scalable vector graphic retaining Rough.js procedural strokes |
| **Portable Document** | `.pdf` | Vector-rendered multi-page printable document |
