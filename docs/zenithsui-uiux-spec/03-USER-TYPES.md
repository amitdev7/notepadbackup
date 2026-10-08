# ZENITHSUI — UI/UX Specification
## Document 03: User Types, Roles & Personas

---

### 1. User Types & Personas Overview

Zenithsui serves two primary cohorts of creators:
1. **Product, Software & Design Builders** who need rapid napkin wireframing, architecture mapping, and uncommitted visual thinking.
2. **Students & Self-Directed Learners** who need visual mind mapping, structured syllabus tracking, spaced repetition revision, and offline study planning.

Below are the 5 core user personas supported by the product:

---

### Persona 1: The Solo Product Designer / Wireframer

```
Name: Elena Rostova
Role: Senior Product Designer / Freelance UX Consultant
Environment: macOS / Chrome, Dual 4K Monitors + iPad Sidecar
Tech Affinity: Very High
Primary Need: Rapid visual exploration before opening high-fidelity Figma
```

- **Goals**:
  - Quickly map out user flows and screen interactions without fussing over pixel alignment or design system tokens.
  - Test multiple layout variants side-by-side using pre-built UI components and blocks.
  - Export clean, high-contrast monochrome/duotone PNGs to drop into PRDs and client slide decks.
- **Key Tasks**:
  - Dragging pre-built blocks (Login screens, Navbars, Pricing grids, Hero banners) from the Library.
  - Modifying component variant props directly in the Inspector.
  - Connecting screen cards using dynamic auto-binding arrows with custom labels.
  - Nesting detailed sub-screens inside navigable Folder Whiteboards.
- **Permissions**: Full local owner (`owner`), cloud document creator.
- **Pain Points & Frustrations**:
  - Slow tools with heavy cloud latency.
  - Tools that force high-fidelity vector editing too early.
  - Complicated file hierarchies when trying to organize multiple sub-flows.

---

### Persona 2: The Software Architect / Tech Lead

```
Name: Marcus Vance
Role: Staff Systems Architect / Engineering Manager
Environment: Linux / Windows Desktop, 34" Ultrawide Monitor
Tech Affinity: Extremely High (Keyboard-first power user)
Primary Need: Whiteboarding distributed systems, APIs, and database schemas
```

- **Goals**:
  - Rapidly sketch microservice diagrams, message queues, and database entities during sprint planning.
  - Keep everything locally stored on his workstation without corporate cloud data leakage.
  - Navigate the entire app purely via keyboard shortcuts (`⌘K`, `V`, `R`, `A`, `T`, `⌘/`).
- **Key Tasks**:
  - Drawing interconnected boxes and diamonds with orthogonal and labeled arrows.
  - Attaching API schema JSON files or architecture PDF specs directly onto the canvas.
  - Running Canvas Search (`⌘F`) to find specific node IDs or text labels on large canvas maps.
  - Using Canvas Statistics (`⌘/`) to monitor payload size and node counts.
- **Permissions**: Full local workspace owner.
- **Pain Points & Frustrations**:
  - Tools that require signing up or logging into proprietary clouds.
  - Cluttered UI toolbars that block drawing space.
  - Poor performance when canvas node count exceeds 500 elements.

---

### Persona 3: The Student / Competitive Exam Aspirant

```
Name: Aarav Sharma
Role: STEM Student / Medical & Engineering Exam Candidate
Environment: Windows Laptop + Tablet Stylus / Mobile Browser
Tech Affinity: Moderate
Primary Need: Organizing massive curricula into visual maps, schedules, and flashcard review
```

- **Goals**:
  - Break down complex multi-chapter subjects (e.g. Physics, Chemistry, Calculus) into visual mind maps and formulas.
  - Maintain a functional study calendar and track weekly target study hours.
  - Practice spaced repetition flashcards (SM-2) for formulas and concepts.
  - Log exam mistakes with root causes (calculation error, concept flaw, time pressure).
- **Key Tasks**:
  - Dropping textbook chapter PDFs onto the canvas and using PDF-to-Canvas to extract formula sheets.
  - Organizing study notes into nested folders (`Physics -> Mechanics -> Newton's Laws`).
  - Interacting with the canvas-embedded `FunctionalCalendar` to view study agendas and exam countdowns.
  - Working completely offline during library study sessions without losing data.
- **Permissions**: Local owner, student profile.
- **Pain Points & Frustrations**:
  - Losing study notes due to spotty Wi-Fi connections.
  - Disconnected tools (having to use separate apps for calendar, flashcards, and notes).
  - Complicated sync setups requiring manual export/import.

---

### Persona 4: The Educator / Classroom Instructor

```
Name: Dr. Sarah Jenkins
Role: University Lecturer / High School Physics Teacher
Environment: Classroom Touch Smartboard / iPad / MacBook
Tech Affinity: High
Primary Need: Live interactive lecturing, broadcasting whiteboard sessions, and sharing lecture boards
```

- **Goals**:
  - Deliver dynamic visual lectures on a responsive digital whiteboard using pen drawing and laser pointer.
  - Broadcast live whiteboard progress over the classroom Wi-Fi network without requiring student internet logins.
  - Publish read-only encrypted lecture boards for students to review after class.
- **Key Tasks**:
  - Switching to Pen tool (`P`) with stylus pressure and Laser Pointer (`K`) to highlight diagrams.
  - Triggering "Publish on Wi-Fi..." to broadcast the lecture to students on the local school subnet.
  - Creating password-protected public share links with expiration dates.
- **Permissions**: Broadcaster (`teacher` / `owner`), session host.
- **Pain Points & Frustrations**:
  - Unstable classroom cloud connections causing video/canvas lag.
  - Complex student onboarding processes that waste classroom lecture minutes.

---

### Persona 5: The Collaborating Reviewer / Stakeholder

```
Name: Chloe Dupuis
Role: Product Marketing Director / External Client
Environment: iPhone / iPad Safari / Chrome Laptop
Tech Affinity: Low to Moderate
Primary Need: Viewing, reviewing, and commenting on shared wireframe links
```

- **Goals**:
  - Open a shared link (`/share/[token]`) on any device without installing software or creating an account.
  - Smoothly pan, zoom, and inspect wireframe flows on mobile touchscreens.
  - Verify layout proposals and download high-resolution presentation screenshots.
- **Key Tasks**:
  - Entering an access password on protected share links.
  - Touch-panning and pinch-zooming through the canvas hierarchy.
  - Double-clicking folder nodes to explore child boards.
- **Permissions**: Read-only (`viewer`) or Commenter.
- **Pain Points & Frustrations**:
  - Broken mobile layouts with tiny unclickable buttons.
  - Being blocked by mandatory sign-up walls.
  - Slow rendering on mobile browsers.

---

### 2. User Permission & Access Matrix

Zenithsui implements a granular role model across local storage, peer LAN, and Supabase cloud:

| Role Level | Local Storage | Cloud Document | Wi-Fi / LAN Session | Capabilities |
| :--- | :---: | :---: | :---: | :--- |
| **Anonymous Local** | `Full Owner` | None | Client only | Complete canvas creation, local file export, settings customization. |
| **Cloud Owner** | `Full Owner` | `owner` | Host (`teacher`) | Full edit rights, delete doc, invite members, toggle public sharing, set passwords. |
| **Cloud Editor** | Cached replica | `editor` | Co-teacher | Create, edit, move, delete canvas nodes; duplicate boards; cannot delete doc or manage access. |
| **Cloud Viewer** | Transient cache | `viewer` | Observer (`student`) | Pan, zoom, inspect, open folders, export PNG; zero canvas editing permissions. |
| **Public Link Visitor** | Memory only | `public_viewer` | Observer | View published snapshot, enter child whiteboards; read-only. |
