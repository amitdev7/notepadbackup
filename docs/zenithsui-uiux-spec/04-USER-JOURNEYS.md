# ZENITHSUI — UI/UX Specification
## Document 04: End-to-End User Journeys

---

### Journey 1: First Visit & Zero-Friction Canvas Creation
**Persona**: Any first-time user (Elena, Marcus, Aarav)  
**Objective**: Arrive at the application and start sketching immediately with zero signup barriers.

```
[User loads http://localhost:3000]
         │
         ▼
[Warming up pencils loader (~300ms)]
         │
         ▼
[Empty Canvas with Zenithsui Bear Mascot]
         │ (Mascot caption: "napkin first, pixels later")
         ▼
[User presses 'R' or clicks Shape in Bottom Dock]
         │ (Cursor turns to crosshair)
         ▼
[Pointer Drag on Canvas]
         │ (Rough.js previews hand-drawn box with live wobble)
         ▼
[Pointer Release]
         │ (Box created; 8 bounding handles appear in bright purple #A200FF)
         ▼
[Inspector smoothly animates in from right with Shape properties]
         │ (Autosave silently flushes to IndexedDB: "untitled scribbles")
         ▼
[User types immediately to add text or presses 'T' for text labels]
```

- **Pre-Conditions**: Clear browser storage or first visit.
- **Trigger**: Opening Zenithsui root URL (`/`).
- **Feedback & Transitions**:
  - Loader displays *"warming up the pencils…"* in sketch font on `#FBFAF5`.
  - Mascot fades in centrally.
  - Active tool in the bottom dock illuminates in vibrant blue with a white icon.
  - Immediate local IndexedDB record created without prompts or blocking modals.
- **Edge Cases & Failure Recovery**:
  - IndexedDB blocked by browser privacy mode: System gracefully falls back to local memory and displays a subtle warning in the notice banner.

---

### Journey 2: Freehand Sketching & Diagram Construction
**Persona**: Marcus Vance (Software Architect)  
**Objective**: Rapidly construct a microservice system diagram with shapes, connectors, and labels.

1. **Shape Placement**: Marcus presses `R` and drags three service boxes onto the canvas.
2. **Duotone Fill**: In the Inspector, he sets Fill to `Light shade` (an 8% ink wash) for two boxes and `Strong shade` (20% wash) for the database box.
3. **Connector Binding**:
   - Marcus presses `A` (Arrow tool) and hovers near the edge of Service A.
   - A subtle magnetic snap point highlights (`ArrowBinding`).
   - He drags the arrow to Service B; the arrowhead snaps cleanly to Service B’s edge.
   - Moving Service A automatically recalculates and stretches the arrow while maintaining the connection (`lib/canvas/arrow-binding.ts`).
4. **Arrow Label**:
   - Double-clicking the arrow line opens an inline text input.
   - Marcus types `"gRPC / TLS 1.3"` and presses `Enter`. The label binds to the midpoint of the arrow path.
5. **Multi-Selection & Alignment**:
   - Marcus drags a marquee box around all three services.
   - In the Inspector's `AlignRow`, he clicks **Align Center Vertically** and **Distribute Horizontally**.
   - The shapes snap into clean equidistant alignment (`snap-engine.ts`).

---

### Journey 3: Placing Pre-Built Components & Modifying Props
**Persona**: Elena Rostova (Product Designer)  
**Objective**: Build a mobile checkout wireframe using Zenithsui’s unified 168-def library.

1. **Triggering Library**: Elena presses `L` or clicks the Sparkle icon in the bottom dock.
2. **Drawer Presentation**:
   - The Library panel slides up from the bottom (or drawer on right).
   - Elena types `"pricing"` into the search bar.
   - Search results filter instantly across all 168 definitions (`searchUnifiedLibrary`).
3. **Placement**:
   - Elena clicks the "Pricing Table" block preview. The panel closes, and a ghost outline follows her cursor.
   - Clicking on the canvas places the Pricing Table with its preset geometry.
4. **Variant Customization**:
   - Selecting the placed block activates the Inspector.
   - Under `Variant Controls`, Elena toggles `Billed Annually` to `true` and adjusts `Tier Count` from `3` to `4`.
   - The component instantly re-renders its Rough.js paths without full canvas recomputation.
5. **Break Apart (Component Unlinking)**:
   - Elena wants to customize one specific card.
   - She clicks **Break Apart** in the Inspector footer.
   - The complex component is decomposed into individual editable primitives (`ShapeNode`, `TextNode`, `DrawNode`), allowing custom manual tweaking.

---

### Journey 4: Attaching Multi-Page PDFs & PDF-to-Canvas Extraction
**Persona**: Aarav Sharma (STEM Student)  
**Objective**: Import a 12-page Calculus syllabus PDF onto the canvas, view it, and extract key pages into hand-drawn whiteboard wireframes.

1. **Dropping the File**: Aarav drags `calculus_syllabus.pdf` directly from his desktop onto the canvas.
2. **Binary Storage**:
   - Canvas handles the file drop (`lib/clipboard.ts`).
   - PDF binary is stored locally in IndexedDB asset storage (`asset://<hash>`).
   - A `DocumentNode` is placed at the drop coordinates displaying a high-contrast risograph PDF badge with the file name, size (`2.4 MB`), and page count (`12 pages`).
3. **In-Canvas Preview**:
   - Aarav clicks the PDF node and uses the Inspector’s page stepper to flip through pages 1, 2, and 3.
   - Double-clicking opens the full-screen `DocumentViewerModal` for distraction-free reading.
4. **PDF-to-Canvas Conversion**:
   - In the context menu or Inspector, Aarav clicks **"Convert PDF to Canvas"**.
   - The `PdfToCanvasDialog` opens, showing thumbnails of all 12 pages.
   - Aarav selects pages 2 and 3 and clicks **"Import as Wireframe Nodes"**.
   - Zenithsui extracts vector paths, text boxes, and diagrams from the PDF and converts them directly into editable hand-drawn `SquigNode` objects arranged neatly across his canvas.

---

### Journey 5: Recursive Whiteboard Navigation (Nested Folders)
**Persona**: Elena Rostova / Aarav Sharma  
**Objective**: Create a folder on the main board to house detailed sub-flows, enter the child board, and return via breadcrumbs.

```
[Main Board: "Product Architecture"]
         │
         ▼
[Click Folder Tool in Dock / Command Palette "Sub-Board (Folder)"]
         │
         ▼
[Click Canvas at (x: 400, y: 300)]
         │
         ▼
[Folder Node rendered in Risograph envelope style]
         │ (Top tab: "BOARD ↗", Title: "Sub-Board", Count: "0 items")
         ▼
[Double-Click Folder Node OR Press Enter]
         │
         ▼
[Smooth Transition into Child Board Document]
         │ • Document ID switches in URL: /?b=[childBoardId]
         │ • Canvas re-hydrates with child board's flat node list
         │ • Top Bar updates: Breadcrumbs display [ Product Architecture / Sub-Board ]
         │ • Left Caret Return Button (<) illuminates in Top Bar
         ▼
[User draws detailed sub-flow nodes inside child whiteboard]
         │
         ▼
[User clicks "<" or "Product Architecture" in breadcrumb trail]
         │
         ▼
[Smooth return to Parent Board; Folder Node now displays updated "4 items" badge]
```

- **Safety & Integrity**:
  - The cycle-prevention engine (`willCreateCycle`) guarantees that boards can never be reparented into their own descendants.
  - Deep-duplication (`duplicateBoardTree`) ensures copying a folder clones the entire nested hierarchy without reference sharing.

---

### Journey 6: Offline Operation & Auto-Save Recovery
**Persona**: Aarav Sharma (Studying in a library with no Wi-Fi)  
**Objective**: Work continuously for 4 hours completely offline, close browser, and reopen with zero data loss.

1. **Offline Indicator**:
   - Browser goes offline; Top Bar sync status dot turns from green to neutral gray (`Offline (Saved Locally)`).
   - The application functions with 100% feature parity; zero features are disabled or gated.
2. **Continuous Autosave**:
   - Every stroke, resize, text edit, and folder creation is debounced at 300ms and committed to IndexedDB.
   - In the Top Bar, the file name flashes a subtle *"saved"* indicator.
3. **Reconnection & Conflict Safety**:
   - Aarav closes his laptop and reopens it at home on Wi-Fi.
   - The background sync engine wakes up (`lib/sync/engine.ts`), inspects the local revision log, compares vector clocks, and seamlessly pushes updates to cloud storage.
   - If another device edited the document while offline, `ConflictDialog` opens, displaying a side-by-side visual comparison allowing Aarav to choose "Keep Local", "Keep Remote", or "Fork to New Board".

---

### Journey 7: Local Wi-Fi Classroom Broadcasting
**Persona**: Dr. Sarah Jenkins (Classroom Lecturer)  
**Objective**: Broadcast a live drawing session to 30 students sitting in a lecture hall without using cloud servers.

1. **Initiation**:
   - Dr. Jenkins clicks the brand menu in the bottom dock and selects **"Publish on Wi-Fi..."**.
   - `WifiPublishDialog` opens, showing the local network IP (`http://192.168.1.4:3000/lan/view/[sessionId]`) and an auto-generated QR code.
2. **Student Connection**:
   - Students scan the QR code with their tablets or phones.
   - Their browsers load the lightweight `/lan/view/[sessionId]` route.
3. **Live Streaming**:
   - Canvas state is broadcast peer-to-peer via local WebRTC data channels or WebSocket gateway (`classroom-transport.ts`).
   - When Dr. Jenkins switches to the **Laser Pointer** (`K`), students see the glowing neon trail tracking her stylus in real time across their screens.
4. **Session Termination**:
   - Dr. Jenkins clicks "Stop Broadcasting"; student viewers receive a prompt offering to save a local snapshot PDF of the lecture notes.
