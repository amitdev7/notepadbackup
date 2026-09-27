# Known Issues & Technical Limitations

This document tracks known limitations, browser edge cases, and areas of future enhancement in Zenithsui.

---

# Issue: In-memory store on default database does not persist across server cold restarts

- **Severity**: Low (Development / Demo environment only)
- **Impact**: Documents saved to `primary-db` (in-memory mode) will reset to the default starter wireframe if the server process restarts.
- **Root cause**: `primary-db` uses a Node.js process-memory `Map` store for local multi-tab sharing without requiring external cloud credentials.
- **Current workaround**: Use `nezukos-box` (Supabase database) for persistent cloud storage, or export `.zenithsui.json` / local browser files.
- **Planned fix**: Provide optional SQLite or persistent file-based disk storage for local standalone server mode.

---

# Issue: Realtime collaborative cursors currently only show presence badge rather than spatial canvas cursors

- **Severity**: Low / Cosmetic
- **Impact**: Collaborators see who is connected via the `<CollabStatus />` presence pill, but do not see live floating pointer arrows moving across their viewport.
- **Root cause**: The real-time SSE protocol broadcasts collaborator presence and document mutations (`CollaborationOp`), but pointer cursor coordinate streaming on mousemove was deferred to prevent excessive SSE traffic.
- **Current workaround**: Edits made by other users appear in real time on the canvas via patch synchronization.
- **Planned fix**: Add lightweight spatial cursor broadcasts throttled to 30ms over WebSocket / SSE.

---

# Issue: Large embedded images can approach localStorage quotas in local storage mode

- **Severity**: Medium
- **Impact**: Pasting many multi-megabyte screenshots into a single document can fill browser `localStorage` (typically 5MB limit).
- **Root cause**: `ImageNode` stores image data as base64 data URLs directly in the document JSON.
- **Current workaround**: Zenithsui includes an automatic image re-encoding pipeline (`/lib/clipboard.ts`) that downsizes images to max 1280px and applies WebP/JPEG compression. If `localStorage` is full, an LRU eviction strategy preserves recent files.
- **Planned fix**: For shared databases, stream large image assets to external object storage (e.g. Supabase Storage / S3 bucket) and reference URLs instead of inlined base64.

---

# Issue: Text formatting applies to entire TextNode rather than sub-string inline spans

- **Severity**: Low (By Design for Wireframes)
- **Impact**: Bold, italic, underline, or color changes apply to the entire text block rather than individual words.
- **Root cause**: Zenithsui maintains a simple text model (`TextNode`) where text is broken into lines and rendered with uniform font sizing and style.
- **Current workaround**: Use multiple text nodes placed adjacently for mixed styles.
- **Planned fix**: Support simple markdown-style inline delimiters (`*bold*`, `_italic_`) during text primitive generation if requested by user.

---

# Issue: Safari clipboard image write requires synchronous user gesture

- **Severity**: Low (Safari browser specific)
- **Impact**: On Safari, clicking "Copy as PNG" from delayed async menus may trigger a direct PNG file download rather than copying directly to the system clipboard.
- **Root cause**: WebKit security policy disallows writing `ClipboardItem` if the promise resolution is decoupled from the immediate user event tick.
- **Current workaround**: Zenithsui automatically detects Safari clipboard rejection and gracefully triggers a direct `.png` file download (`downloadPng`) with an informative notice.
- **Planned fix**: Handled completely via the existing graceful fallback.
