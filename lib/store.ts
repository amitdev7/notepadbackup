import { create } from "zustand"
import { nanoid } from "nanoid"
import type { SquigNode, ToolKind, Viewport } from "./types"
import type { StoredDoc, FileMeta } from "./files"
import { listFiles, readFile, saveFileAs, deleteStoredFile, readPrefs, writePrefs } from "./files"
import type { Look } from "./theme"
import { DEFAULT_LOOK, applyLook } from "./theme"
import type { Collaborator, CollabStatus, CollaborationOp } from "./collaboration-types"
import type { PageVersionMeta, PageVersion } from "./version-types"
import type { ClientSafeShareConfig } from "./server-share"
import type { TeamClientSummary } from "./team-types"
import type { ClientSafeUser } from "./auth-types"
import type { DocumentPermissionRole } from "./workspace-types"
import { unionBounds } from "./selection"
import { scaleNodes } from "./canvas/transform"
import { fitTextBox } from "./canvas/text-reflow"
import { getDef } from "./library/registry"

export type SaveStatus = "saved" | "saving" | "syncing" | "offline" | "failed"
export type ElementDefaults = Record<string, any>

type Snapshot = { nodes: Record<string, SquigNode>; order: string[]; selection: string[] }
type AlignMode = "left" | "center-x" | "right" | "top" | "center-y" | "bottom"
type DistributeMode = "horizontal" | "vertical"

interface Notice { text: string; id: number }

interface SquigState {
  nodes: Record<string, SquigNode>
  order: string[]
  selection: string[]
  selectedIds: string[]
  docId: string | null
  fileName: string
  renamingFile: boolean
  editingId: string | null
  viewport: Viewport
  pan: { x: number; y: number }
  zoom: number
  hydrated: boolean
  saveStatus: SaveStatus
  notice: Notice | null
  tool: ToolKind
  activeCategory: string
  files: FileMeta[]
  dbFiles: FileMeta[]
  clipboard: SquigNode[]
  past: Snapshot[]
  future: Snapshot[]
  checkpointRef: Snapshot | null

  databaseModalOpen: boolean
  selectedDbId: string | null
  isSyncingDb: boolean
  shareModalOpen: boolean
  shareConfig: ClientSafeShareConfig | null
  isLoadingShare: boolean
  versionHistoryOpen: boolean
  versions: PageVersionMeta[]
  isLoadingVersions: boolean
  isRestoringVersion: boolean
  previewVersion: PageVersion | null
  collabStatus: CollabStatus
  collaborators: Collaborator[]
  collabRevision: number

  currentUser: ClientSafeUser | null
  authModalOpen: boolean
  teams: TeamClientSummary[]
  currentTeamId: string | null
  currentTeamDetails: any | null
  teamSettingsModalOpen: boolean
  createTeamModalOpen: boolean
  invitationModalToken: string | null

  uiHidden: boolean
  commandOpen: boolean
  shortcutsOpen: boolean
  panel: string | null
  pagePanel: boolean
  contextRow: string | null
  smartSketch: boolean
  contextMenu: { x: number; y: number; id?: string } | null
  linkOpen: boolean
  workspaceHomeOpen: boolean
  handwritingModalOpen: boolean
  colorSizeStudioOpen: boolean
  activeStudioTab: string
  passwordModalOpen: boolean
  unlockModalOpen: boolean
  presentationMode: boolean
  presentationPointerType: string
  presentationTimer: number
  presentationTimerRunning: boolean
  slmLearningModalOpen: boolean
  activePdfModalNodeId: string | null

  theme: string
  paper: string
  font: string
  grid: boolean
  drawColor: string
  textColor: string
  pencilGrade: string
  shapeKind: string
  arrowHead: string
  elementDefaults: ElementDefaults
  pendingSuggestion: any | null
  slmLearningTarget: any | null
  hasPassword: boolean
  isLocked: boolean
  unlockAttemptsLeft: number
  isReadOnly: boolean
  permissionRole: DocumentPermissionRole | null
  currentWorkspaceId: string | null

  hydrate: () => void
  loadDoc: (text: string) => boolean
  serialize: () => string
  newFile: () => void
  openFile: (id: string) => void
  deleteFile: (id: string) => void
  clearCanvas: () => void
  saveNow: () => void
  retrySave: () => void
  scheduleSave: () => void
  flushSave: () => void
  setFileName: (n: string) => void
  setRenamingFile: (v: boolean) => void
  setEditing: (id: string | null) => void
  setSelection: (ids: string[]) => void
  select: (ids: string[]) => void
  selectNone: () => void
  selectAll: () => void
  setViewport: (v: Partial<Viewport>) => void
  setPan: (p: { x: number; y: number }) => void
  setZoom: (z: number) => void
  setTool: (t: ToolKind) => void
  setActiveCategory: (c: string) => void
  zoomBy: (f: number, cx?: number, cy?: number) => void
  zoomToFit: () => void
  zoomTo100: () => void
  zoomToSelection: () => void
  addNode: (node: SquigNode, opts?: { select?: boolean; checkpoint?: boolean }) => void
  addNodes: (list: SquigNode[], opts?: { select?: boolean }) => void
  updateNode: (id: string, patch: Partial<SquigNode>, opts?: { checkpoint?: boolean }) => void
  updateNodes: (patches: Record<string, Partial<SquigNode>>) => void
  removeNodes: (ids: string[]) => void
  deleteNodes: (ids: string[]) => void
  insertComponent: (kind: string, x: number, y: number) => void
  checkpoint: () => void
  revertToCheckpoint: () => void
  undo: () => void
  redo: () => void

  duplicateSelected: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: (dx?: number, dy?: number) => void
  pasteNodes: (list: SquigNode[]) => void
  deleteSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  detachSelected: () => void
  bringToFront: () => void
  bringForward: () => void
  sendBackward: () => void
  sendToBack: () => void
  alignSelected: (mode: AlignMode) => void
  distributeSelected: (mode: DistributeMode) => void
  flipSelected: (dir: "h" | "v") => void
  lockSelected: () => void
  unlockSelected: () => void
  toggleLockSelected: () => void
  setLinkOnSelection: (url: string | null) => void
  handleRemotePatch: (ops: CollaborationOp[]) => void

  selectDatabase: (dbId: string | null) => void
  syncDatabaseFiles: () => void
  setDatabaseModalOpen: (v: boolean) => void
  setShareModalOpen: (v: boolean) => void
  updateShareSettings: (patch: any) => void
  revokeShare: () => void
  openVersionHistory: () => void
  closeVersionHistory: () => void
  fetchVersions: () => void
  previewVersionById: (id: string) => void
  restoreVersion: (id: string) => void
  exitVersionPreview: () => void

  connectSSE: () => void
  broadcastPresence: (presence: any) => void
  catchUpMissedPatches: () => void
  handleConnectionDrop: () => void
  handleNetworkOnline: () => void
  handleNetworkOffline: () => void

  setAuthModalOpen: (v: boolean) => void
  setCurrentUser: (u: ClientSafeUser | null) => void
  fetchTeams: () => void
  switchTeam: (id: string | null) => void
  setTeamSettingsModalOpen: (v: boolean) => void
  setCreateTeamModalOpen: (v: boolean) => void
  setInvitationModalToken: (t: string | null) => void

  setUiHidden: (v: boolean) => void
  setCommandOpen: (v: boolean) => void
  setShortcutsOpen: (v: boolean) => void
  setPanel: (v: string | null) => void
  setPagePanel: (v: boolean) => void
  togglePagePanel: () => void
  setContextRow: (v: string | null) => void
  setSmartSketch: (v: boolean) => void
  toggleSmartSketch: () => void
  setContextMenu: (v: { x: number; y: number; id?: string } | null) => void
  setLinkOpen: (v: boolean) => void
  setWorkspaceHomeOpen: (v: boolean) => void
  setHandwritingModalOpen: (v: boolean) => void
  setColorSizeStudioOpen: (v: boolean) => void
  setActiveStudioTab: (v: string) => void
  setPasswordModalOpen: (v: boolean) => void
  setUnlockModalOpen: (v: boolean) => void
  setPresentationMode: (v: boolean) => void
  setPresentationPointerType: (v: string) => void
  setPresentationTimer: (v: number) => void
  setPresentationTimerRunning: (v: boolean) => void
  resetPresentationTimer: () => void
  setSlmLearningModalOpen: (v: boolean) => void
  setActivePdfModalNodeId: (id: string | null) => void
  openClassroom: (nodeId: string) => void

  setTheme: (v: string) => void
  setPaper: (v: string) => void
  setFont: (v: string) => void
  setGrid: (v: boolean) => void
  setDrawColor: (v: string) => void
  setTextColor: (v: string) => void
  setPencilGrade: (v: string) => void
  setShapeKind: (v: string) => void
  setArrowHead: (v: string) => void
  setElementDefault: (k: string, v: any) => void
  resetElementDefaults: () => void
  applyStudioPreset: (preset: any) => void
  applyDefaultsToSelection: () => void
  applyPendingSuggestion: () => void
  dismissPendingSuggestion: () => void
  setNotice: (text: string | null) => void
  setPagePassword: (pw: string) => void
  removePagePassword: () => void
  unlockPage: (pw: string) => boolean
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let sse: EventSource | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null

function snap(s: Pick<SquigState, "nodes" | "order" | "selection">): Snapshot {
  return { nodes: s.nodes, order: s.order, selection: s.selection }
}
function pushHistory(s: SquigState): Pick<SquigState, "past" | "future"> {
  const past = [...s.past, snap(s)].slice(-60)
  return { past, future: [] }
}
function boxOf(n: SquigNode): { x: number; y: number; w: number; h: number } {
  const a = n as any
  return { x: a.x ?? 0, y: a.y ?? 0, w: a.w ?? 100, h: a.h ?? 60 }
}
function freshClone(n: SquigNode, dx: number, dy: number): SquigNode {
  const a = n as any
  return { ...a, id: nanoid(), seed: nanoid(), x: (a.x ?? 0) + dx, y: (a.y ?? 0) + dy } as SquigNode
}
function applyOpsToNodes(
  nodes: Record<string, SquigNode>,
  order: string[],
  ops: CollaborationOp[]
): { nodes: Record<string, SquigNode>; order: string[] } {
  const next = { ...nodes }
  let nextOrder = [...order]
  for (const op of ops as any[]) {
    try {
      const o = op as any
      if (o.op === "upsert" || o.op === "add") {
        const n = o.node ?? o.value
        if (n?.id) { next[n.id] = n as SquigNode; if (!nextOrder.includes(n.id)) nextOrder.push(n.id) }
      } else if (o.op === "update" || o.op === "patch") {
        const id = o.id ?? o.nodeId
        if (id && next[id]) next[id] = { ...next[id], ...(o.patch ?? o.node ?? {}) } as SquigNode
      } else if (o.op === "remove" || o.op === "delete") {
        const id = o.id ?? o.nodeId
        if (id) { delete next[id]; nextOrder = nextOrder.filter((x) => x !== id) }
      }
    } catch { /* never throw */ }
  }
  return { nodes: next, order: nextOrder }
}
async function fetchJSON(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json().catch(() => ({}))
}

export const useSquig = create<SquigState>((set, get) => ({
  nodes: {},
  order: [],
  selection: [],
  selectedIds: [],
  docId: null,
  fileName: "Untitled",
  renamingFile: false,
  editingId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  pan: { x: 0, y: 0 },
  zoom: 1,
  hydrated: false,
  saveStatus: "saved",
  notice: null,
  tool: "select",
  activeCategory: "student",
  files: [],
  dbFiles: [],
  clipboard: [],
  past: [],
  future: [],
  checkpointRef: null,

  databaseModalOpen: false,
  selectedDbId: null,
  isSyncingDb: false,
  shareModalOpen: false,
  shareConfig: null,
  isLoadingShare: false,
  versionHistoryOpen: false,
  versions: [],
  isLoadingVersions: false,
  isRestoringVersion: false,
  previewVersion: null,
  collabStatus: "offline",
  collaborators: [],
  collabRevision: 0,

  currentUser: null,
  authModalOpen: false,
  teams: [],
  currentTeamId: null,
  currentTeamDetails: null,
  teamSettingsModalOpen: false,
  createTeamModalOpen: false,
  invitationModalToken: null,

  uiHidden: false,
  commandOpen: false,
  shortcutsOpen: false,
  panel: null,
  pagePanel: false,
  contextRow: null,
  smartSketch: false,
  contextMenu: null,
  linkOpen: false,
  workspaceHomeOpen: false,
  handwritingModalOpen: false,
  colorSizeStudioOpen: false,
  activeStudioTab: "color",
  passwordModalOpen: false,
  unlockModalOpen: false,
  presentationMode: false,
  presentationPointerType: "arrow",
  presentationTimer: 0,
  presentationTimerRunning: false,
  slmLearningModalOpen: false,
  activePdfModalNodeId: null,

  theme: (DEFAULT_LOOK as any)?.theme ?? "napkin",
  paper: (DEFAULT_LOOK as any)?.paper ?? "white",
  font: (DEFAULT_LOOK as any)?.font ?? "hand",
  grid: false,
  drawColor: "#1a1a1a",
  textColor: "#1a1a1a",
  pencilGrade: "HB",
  shapeKind: "rough",
  arrowHead: "arrow",
  elementDefaults: {},
  pendingSuggestion: null,
  slmLearningTarget: null,
  hasPassword: false,
  isLocked: false,
  unlockAttemptsLeft: 5,
  isReadOnly: false,
  permissionRole: null,
  currentWorkspaceId: null,

  hydrate: () => {
    try {
      const prefs = readPrefs() as any
      const files = listFiles() as FileMeta[]
      const look: Look = {
        ...(DEFAULT_LOOK as any),
        theme: prefs?.theme ?? (DEFAULT_LOOK as any)?.theme,
        paper: prefs?.paper ?? (DEFAULT_LOOK as any)?.paper,
        font: prefs?.font ?? (DEFAULT_LOOK as any)?.font,
      } as Look
      try { applyLook(look) } catch { /* noop */ }
      set({
        files,
        hydrated: true,
        theme: (look as any).theme,
        paper: (look as any).paper,
        font: (look as any).font,
      })
    } catch {
      set({ hydrated: true })
    }
  },
  loadDoc: (text) => {
    try {
      const d = JSON.parse(text) as any
      const raw = d.nodes
      const order: string[] = Array.isArray(d.order) ? d.order : Array.isArray(raw) ? raw.map((n: any) => n.id) : Object.keys(raw ?? {})
      const arr: SquigNode[] = Array.isArray(raw) ? raw : Object.values(raw ?? {})
      if (!Array.isArray(arr)) return false
      const nodes: Record<string, SquigNode> = {}
      for (const n of arr) if (n?.id) nodes[n.id] = n
      const look = d.look ?? d.theme
      if (look) { try { applyLook({ ...(DEFAULT_LOOK as any), ...look } as Look) } catch { /* noop */ } }
      set((s) => ({
        nodes, order: order.filter((id) => nodes[id]),
        selection: [], selectedIds: [],
        docId: d.docId ?? d.id ?? s.docId,
        fileName: d.fileName ?? d.name ?? s.fileName,
        viewport: d.viewport ?? s.viewport,
        pan: { x: (d.viewport?.x ?? s.viewport.x), y: (d.viewport?.y ?? s.viewport.y) },
        zoom: d.viewport?.zoom ?? s.zoom,
        past: [], future: [], saveStatus: "saved",
      }))
      return true
    } catch { return false }
  },
  serialize: () => {
    const s = get()
    return JSON.stringify({ nodes: s.nodes, order: s.order, fileName: s.fileName, docId: s.docId, viewport: s.viewport, savedAt: Date.now() })
  },
  newFile: () => {
    try {
      const doc = saveFileAs({ fileName: "Untitled", nodes: {}, order: [] } as any) as StoredDoc
      set((s) => ({ nodes: {}, order: [], selection: [], selectedIds: [], docId: (doc as any)?.id ?? nanoid(), fileName: "Untitled", files: listFiles() as FileMeta[], saveStatus: "saved", past: [...s.past, snap(s)].slice(-60), future: [] }))
    } catch {
      set((s) => ({ nodes: {}, order: [], selection: [], selectedIds: [], docId: nanoid(), fileName: "Untitled", past: [...s.past, snap(s)].slice(-60), future: [] }))
    }
  },
  openFile: (id) => {
    try {
      const hit = get().files.find((f) => (f as any).id === id)
      const doc = readFile(id) as any
      if (!doc) { get().setNotice("File not found"); return }
      const raw = doc.nodes ?? {}
      const arr: SquigNode[] = Array.isArray(raw) ? raw : Object.values(raw)
      const nodes: Record<string, SquigNode> = {}
      for (const n of arr) if (n?.id) nodes[n.id] = n
      set({ nodes, order: doc.order ?? Object.keys(nodes), selection: [], selectedIds: [], docId: id, fileName: (hit as any)?.fileName ?? doc.fileName ?? "Untitled", saveStatus: "saved", past: [], future: [] })
    } catch { get().setNotice("Could not open file") }
  },
  deleteFile: (id) => {
    try { deleteStoredFile(id) } catch { /* noop */ }
    set((s) => ({ files: s.files.filter((f) => (f as any).id !== id), docId: s.docId === id ? null : s.docId }))
  },
  clearCanvas: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    set({ nodes: {}, order: [], selection: [], selectedIds: [], past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  saveNow: () => {
    const s = get()
    if (!s.docId && !s.fileName) return
    set({ saveStatus: "saving" })
    try {
      const payload = { fileName: s.fileName, nodes: s.nodes, order: s.order, viewport: s.viewport } as any
      if (s.docId) {
        try { saveFileAs({ ...payload, id: s.docId }) } catch { saveFileAs(payload) }
      } else {
        const doc = saveFileAs(payload) as StoredDoc
        set({ docId: (doc as any)?.id ?? nanoid() })
      }
      try { localStorage.setItem("squig:autosave", get().serialize()) } catch { /* noop */ }
      set({ saveStatus: "saved", files: (() => { try { return listFiles() as FileMeta[] } catch { return get().files } })() })
    } catch {
      try { localStorage.setItem("squig:autosave", get().serialize()) } catch { /* noop */ }
      set({ saveStatus: "failed" })
      get().setNotice("Save failed — kept a local backup")
    }
  },
  retrySave: () => { set({ saveStatus: "saving" }); get().saveNow() },
  scheduleSave: () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { saveTimer = null; try { get().saveNow() } catch { /* noop */ } }, 400)
  },
  flushSave: () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null } get().saveNow() },
  setFileName: (fileName) => { set({ fileName }); get().scheduleSave() },
  setRenamingFile: (renamingFile) => set({ renamingFile }),
  setEditing: (editingId) => set({ editingId }),
  setSelection: (ids) => set({ selection: ids, selectedIds: ids }),
  select: (ids) => set({ selection: ids, selectedIds: ids }),
  selectNone: () => set({ selection: [], selectedIds: [] }),
  selectAll: () => { const o = get().order; set({ selection: o, selectedIds: o }) },
  setViewport: (v) => set((s) => {
    const viewport = { ...s.viewport, ...v }
    return { viewport, pan: { x: viewport.x, y: viewport.y }, zoom: viewport.zoom }
  }),
  setPan: (pan) => set((s) => ({ pan, viewport: { ...s.viewport, x: pan.x, y: pan.y } })),
  setZoom: (zoom) => set((s) => ({ zoom, viewport: { ...s.viewport, zoom } })),
  setTool: (tool) => set({ tool }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  zoomBy: (f, cx, cy) => {
    const s = get()
    const zoom = Math.min(4, Math.max(0.2, s.viewport.zoom * f))
    if (cx == null || cy == null) { get().setViewport({ zoom }); return }
    const k = zoom / s.viewport.zoom
    get().setViewport({ zoom, x: cx - (cx - s.viewport.x) * k, y: cy - (cy - s.viewport.y) * k })
  },
  zoomToFit: () => {
    const s = get()
    const list = s.selection.length ? s.selection.map((id) => s.nodes[id]).filter(Boolean) : s.order.map((id) => s.nodes[id]).filter(Boolean)
    if (!list.length) { get().setViewport({ x: 0, y: 0, zoom: 1 }); return }
    try {
      const b = unionBounds(list as any) as any
      const w = b.w || b.width || 800; const h = h0(b)
      const zoom = Math.min(2, Math.max(0.2, Math.min(1000 / Math.max(1, w), 700 / Math.max(1, h))))
      get().setViewport({ x: (b.x ?? 0) - 40, y: (b.y ?? 0) - 40, zoom })
    } catch { get().setViewport({ zoom: 1 }) }
    function h0(b: any) { return b.h || b.height || 600 }
  },
  zoomTo100: () => get().setViewport({ zoom: 1 }),
  zoomToSelection: () => {
    const s = get()
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    if (!list.length) return
    try {
      const b = unionBounds(list as any) as any
      get().setViewport({ x: (b.x ?? 0) - 20, y: (b.y ?? 0) - 20, zoom: s.viewport.zoom })
    } catch { /* noop */ }
  },
  addNode: (node, opts) => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    set({ nodes: { ...s.nodes, [node.id]: node }, order: s.order.includes(node.id) ? s.order : [...s.order, node.id],
      ...(opts?.select ? { selection: [node.id], selectedIds: [node.id] } : {}),
      ...(opts?.checkpoint === false ? {} : { past: [...s.past, snap(s)].slice(-60), future: [] }) })
    get().scheduleSave()
  },
  addNodes: (list, opts) => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !list.length) return
    const nodes = { ...s.nodes }
    const order = [...s.order]
    for (const n of list) { nodes[n.id] = n; if (!order.includes(n.id)) order.push(n.id) }
    set({ nodes, order,
      ...(opts?.select ? { selection: list.map((n) => n.id), selectedIds: list.map((n) => n.id) } : {}),
      past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  updateNode: (id, patch, opts) => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    const cur = s.nodes[id]
    if (!cur) return
    let next = { ...cur, ...patch } as SquigNode
    try {
      if ((patch as any)?.text != null && (cur as any).type === "text")
        next = fitTextBox(next as any, {}) as unknown as SquigNode
    } catch { /* noop */ }
    set({ nodes: { ...s.nodes, [id]: next },
      ...(opts?.checkpoint === false ? {} : { past: [...s.past, snap(s)].slice(-60), future: [] }) })
    get().scheduleSave()
  },
  updateNodes: (patches) => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    const nodes = { ...s.nodes }
    for (const [id, p] of Object.entries(patches)) if (nodes[id]) nodes[id] = { ...nodes[id], ...p } as SquigNode
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  removeNodes: (ids) => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !ids.length) return
    const gone = new Set(ids)
    const nodes = { ...s.nodes }
    for (const id of gone) delete nodes[id]
    set({ nodes, order: s.order.filter((id) => !gone.has(id)),
      selection: s.selection.filter((id) => !gone.has(id)), selectedIds: s.selectedIds.filter((id) => !gone.has(id)),
      past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  deleteNodes: (ids) => get().removeNodes(ids),
  insertComponent: (kind, x, y) => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    let props: any = {}
    let w = 200; let h = 120
    try {
      const def = getDef(kind as any) as any
      props = def?.defaultProps ?? {}
      w = def?.defaultSize?.w ?? w; h = def?.defaultSize?.h ?? h
    } catch { /* defaults stand */ }
    const node = { id: nanoid(), type: "component", kind, x, y, w, h, props } as unknown as SquigNode
    get().addNode(node, { select: true })
  },
  checkpoint: () => set((s) => ({ checkpointRef: snap(s) })),
  revertToCheckpoint: () => {
    const c = get().checkpointRef
    if (!c) return
    set({ nodes: c.nodes, order: c.order, selection: c.selection, selectedIds: c.selection })
    get().scheduleSave()
  },
  undo: () => {
    const s = get()
    const prev = s.past[s.past.length - 1]
    if (!prev) return
    set({ nodes: prev.nodes, order: prev.order, selection: prev.selection, selectedIds: prev.selection, past: s.past.slice(0, -1), future: [snap(s), ...s.future].slice(0, 60) })
    get().scheduleSave()
  },
  redo: () => {
    const s = get()
    const nx = s.future[0]
    if (!nx) return
    set({ nodes: nx.nodes, order: nx.order, selection: nx.selection, selectedIds: nx.selection, future: s.future.slice(1), past: [...s.past, snap(s)].slice(-60) })
    get().scheduleSave()
  },

  duplicateSelected: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !s.selection.length) return
    const clones = s.selection.map((id) => s.nodes[id]).filter(Boolean).map((n) => freshClone(n, 24, 24))
    get().addNodes(clones, { select: true })
  },
  copySelected: () => {
    const s = get()
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    set({ clipboard: list })
  },
  cutSelected: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked) return
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    set({ clipboard: list })
    get().removeNodes(s.selection)
  },
  pasteClipboard: (dx = 32, dy = 32) => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !s.clipboard.length) return
    const clones = s.clipboard.map((n) => freshClone(n, dx, dy))
    get().addNodes(clones, { select: true })
  },
  pasteNodes: (list) => {
    if (!list?.length) return
    get().addNodes(list.map((n) => freshClone(n, 16, 16)), { select: true })
  },
  deleteSelected: () => get().removeNodes(get().selection),
  groupSelected: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked || s.selection.length < 2) return
    const gid = nanoid()
    const nodes = { ...s.nodes }
    for (const id of s.selection) if (nodes[id]) nodes[id] = { ...nodes[id], groupId: gid } as SquigNode
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  ungroupSelected: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !s.selection.length) return
    const nodes = { ...s.nodes }
    for (const id of s.selection) if (nodes[id] && (nodes[id] as any).groupId) { const c = { ...nodes[id] } as any; delete c.groupId; nodes[id] = c }
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  detachSelected: () => {
    const s = get()
    if (s.isReadOnly || s.isLocked || !s.selection.length) return
    const nodes = { ...s.nodes }
    for (const id of s.selection.slice(0, 1)) if (nodes[id]) { const c = { ...nodes[id] } as any; delete c.groupId; nodes[id] = c }
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    get().scheduleSave()
  },
  bringToFront: () => {
    const s = get()
    const sel = new Set(s.selection)
    set({ order: [...s.order.filter((id) => !sel.has(id)), ...s.order.filter((id) => sel.has(id))], ...pushHistory(s) })
    get().scheduleSave()
  },
  bringForward: () => {
    const s = get()
    const order = [...s.order]
    for (let i = order.length - 2; i >= 0; i--) {
      if (s.selection.includes(order[i]) && !s.selection.includes(order[i + 1])) { const t = order[i]; order[i] = order[i + 1]; order[i + 1] = t }
    }
    set({ order, ...pushHistory(s) }); get().scheduleSave()
  },
  sendBackward: () => {
    const s = get()
    const order = [...s.order]
    for (let i = 1; i < order.length; i++) {
      if (s.selection.includes(order[i]) && !s.selection.includes(order[i - 1])) { const t = order[i]; order[i] = order[i - 1]; order[i - 1] = t }
    }
    set({ order, ...pushHistory(s) }); get().scheduleSave()
  },
  sendToBack: () => {
    const s = get()
    const sel = new Set(s.selection)
    set({ order: [...s.order.filter((id) => sel.has(id)), ...s.order.filter((id) => !sel.has(id))], ...pushHistory(s) })
    get().scheduleSave()
  },
  alignSelected: (mode) => {
    const s = get()
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    if (list.length < 2) return
    const boxes = list.map(boxOf)
    const minX = Math.min(...boxes.map((b) => b.x)); const maxR = Math.max(...boxes.map((b) => b.x + b.w))
    const minY = Math.min(...boxes.map((b) => b.y)); const maxB = Math.max(...boxes.map((b) => b.y + b.h))
    const nodes = { ...s.nodes }
    list.forEach((n, i) => {
      const b = boxes[i]; const c = { ...nodes[n.id] } as any
      if (mode === "left") c.x = minX
      else if (mode === "right") c.x = maxR - b.w
      else if (mode === "center-x") c.x = (minX + maxR) / 2 - b.w / 2
      else if (mode === "top") c.y = minY
      else if (mode === "bottom") c.y = maxB - b.h
      else c.y = (minY + maxB) / 2 - b.h / 2
      nodes[n.id] = c
    })
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] }); get().scheduleSave()
  },
  distributeSelected: (mode) => {
    const s = get()
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    if (list.length < 3) return
    const sorted = [...list].sort((a, b) => mode === "horizontal" ? boxOf(a).x - boxOf(b).x : boxOf(a).y - boxOf(b).y)
    const boxes = sorted.map(boxOf)
    const nodes = { ...s.nodes }
    if (mode === "horizontal") {
      const lo = Math.min(...boxes.map((b) => b.x)); const hi = Math.max(...boxes.map((b) => b.x))
      const gap = (hi - lo) / (sorted.length - 1)
      sorted.forEach((n, i) => { (nodes[n.id] as any) = { ...nodes[n.id], x: lo + gap * i } })
    } else {
      const lo = Math.min(...boxes.map((b) => b.y)); const hi = Math.max(...boxes.map((b) => b.y))
      const gap = (hi - lo) / (sorted.length - 1)
      sorted.forEach((n, i) => { (nodes[n.id] as any) = { ...nodes[n.id], y: lo + gap * i } })
    }
    set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] }); get().scheduleSave()
  },
  flipSelected: (dir) => {
    const s = get()
    const list = s.selection.map((id) => s.nodes[id]).filter(Boolean)
    if (!list.length) return
    try {
      const flipped = scaleNodes(list as any, dir === "h" ? -1 : 1, dir === "v" ? -1 : 1) as any[]
      const nodes = { ...s.nodes }
      flipped.forEach((n: any) => { if (nodes[n.id]) nodes[n.id] = { ...nodes[n.id], ...n } })
      set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    } catch {
      const boxes = list.map(boxOf)
      const minX = Math.min(...boxes.map((b) => b.x)); const maxR = Math.max(...boxes.map((b) => b.x + b.w))
      const minY = Math.min(...boxes.map((b) => b.y)); const maxB = Math.max(...boxes.map((b) => b.y + b.h))
      const nodes = { ...s.nodes }
      list.forEach((n, i) => {
        const b = boxes[i]; const c = { ...nodes[n.id] } as any
        if (dir === "h") c.x = minX + maxR - b.x - b.w; else c.y = minY + maxB - b.y - b.h
        nodes[n.id] = c
      })
      set({ nodes, past: [...s.past, snap(s)].slice(-60), future: [] })
    }
    get().scheduleSave()
  },
  lockSelected: () => {
    const s = get()
    const nodes = { ...s.nodes }
    for (const id of s.selection) if (nodes[id]) nodes[id] = { ...nodes[id], locked: true } as SquigNode
    set({ nodes }); get().scheduleSave()
  },
  unlockSelected: () => {
    const s = get()
    const nodes = { ...s.nodes }
    for (const id of s.selection) if (nodes[id]) { const c = { ...nodes[id] } as any; c.locked = false; nodes[id] = c }
    set({ nodes }); get().scheduleSave()
  },
  toggleLockSelected: () => {
    const s = get()
    const anyLocked = s.selection.some((id) => (s.nodes[id] as any)?.locked)
    if (anyLocked) get().unlockSelected(); else get().lockSelected()
  },
  setLinkOnSelection: (url) => {
    const s = get()
    const nodes = { ...s.nodes }
    for (const id of s.selection) if (nodes[id]) nodes[id] = { ...nodes[id], link: url } as SquigNode
    set({ nodes }); get().scheduleSave()
  },
  handleRemotePatch: (ops) => {
    try {
      const s = get()
      const { nodes, order } = applyOpsToNodes(s.nodes, s.order, ops)
      set({ nodes, order, collabRevision: s.collabRevision + 1 })
    } catch { /* never throw */ }
  },

  selectDatabase: (selectedDbId) => {
    set({ selectedDbId })
    if (selectedDbId) get().syncDatabaseFiles()
  },
  syncDatabaseFiles: async () => {
    const { selectedDbId } = get()
    if (!selectedDbId) return
    set({ isSyncingDb: true })
    try {
      const data = await fetchJSON(`/api/database/${selectedDbId}/files`)
      const list = (data?.files ?? data ?? []) as FileMeta[]
      set({ dbFiles: Array.isArray(list) ? list : [], files: Array.isArray(list) ? list : get().files, isSyncingDb: false })
      try { localStorage.setItem(`squig:db:${selectedDbId}`, JSON.stringify(list)) } catch { /* noop */ }
    } catch {
      let fallback: FileMeta[] = []
      try { fallback = JSON.parse(localStorage.getItem(`squig:db:${selectedDbId}`) ?? "[]") } catch { fallback = [] }
      set({ isSyncingDb: false, dbFiles: fallback, saveStatus: "offline" })
      get().setNotice("Database sync failed — using local copy")
    }
  },
  setDatabaseModalOpen: (databaseModalOpen) => set({ databaseModalOpen }),
  setShareModalOpen: (shareModalOpen) => set({ shareModalOpen }),
  updateShareSettings: async (patch) => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) { get().setNotice("Open a database file to share"); return }
    set({ isLoadingShare: true })
    try {
      const cfg = await fetchJSON(`/api/database/${selectedDbId}/files/${docId}/share`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
      set({ shareConfig: (cfg?.config ?? cfg ?? null) as ClientSafeShareConfig, isLoadingShare: false })
    } catch {
      set({ isLoadingShare: false })
      get().setNotice("Could not update share settings")
    }
  },
  revokeShare: async () => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) return
    try {
      await fetch(`/api/database/${selectedDbId}/files/${docId}/share`, { method: "DELETE" })
      set({ shareConfig: null })
    } catch { get().setNotice("Could not revoke share") }
  },
  openVersionHistory: () => { set({ versionHistoryOpen: true }); get().fetchVersions() },
  closeVersionHistory: () => set({ versionHistoryOpen: false, previewVersion: null }),
  fetchVersions: async () => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) { set({ versions: [] }); return }
    set({ isLoadingVersions: true })
    try {
      const data = await fetchJSON(`/api/database/${selectedDbId}/files/${docId}/versions`)
      set({ versions: (data?.versions ?? data ?? []) as PageVersionMeta[], isLoadingVersions: false })
    } catch {
      set({ isLoadingVersions: false })
      get().setNotice("Could not load versions")
    }
  },
  previewVersionById: async (id) => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) return
    try {
      const data = await fetchJSON(`/api/database/${selectedDbId}/files/${docId}/versions/${id}`)
      set({ previewVersion: (data?.version ?? data ?? null) as PageVersion })
    } catch { get().setNotice("Could not preview version") }
  },
  restoreVersion: async (id) => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) return
    set({ isRestoringVersion: true })
    try {
      const data = await fetchJSON(`/api/database/${selectedDbId}/files/${docId}/versions/${id}/restore`, { method: "POST" })
      const snapDoc = (data?.doc ?? data) as any
      if (snapDoc?.nodes) {
        const raw = snapDoc.nodes
        const arr: SquigNode[] = Array.isArray(raw) ? raw : Object.values(raw)
        const nodes: Record<string, SquigNode> = {}
        for (const n of arr) if (n?.id) nodes[n.id] = n
        set((s) => ({ nodes, order: snapDoc.order ?? Object.keys(nodes), past: [...s.past, snap(s)].slice(-60), future: [] }))
      }
      set({ isRestoringVersion: false, previewVersion: null })
      get().fetchVersions()
    } catch {
      set({ isRestoringVersion: false })
      get().setNotice("Could not restore version")
    }
  },
  exitVersionPreview: () => set({ previewVersion: null }),

  connectSSE: () => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) return
    try { if (sse) { sse.close(); sse = null } } catch { sse = null }
    try {
      let token = ""
      try { token = sessionStorage.getItem("squig:token") ?? "" } catch { token = "" }
      const url = `/api/database/${selectedDbId}/files/${docId}/realtime${token ? `?token=${encodeURIComponent(token)}` : ""}`
      const es = new EventSource(url)
      sse = es
      set({ collabStatus: "connecting" as CollabStatus })
      es.onopen = () => set({ collabStatus: "live" as CollabStatus })
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.ops) get().handleRemotePatch(msg.ops as CollaborationOp[])
          else if (msg?.presence && Array.isArray(msg.collaborators)) set({ collaborators: msg.collaborators })
          if (typeof msg?.revision === "number") set({ collabRevision: msg.revision })
        } catch { /* noop */ }
      }
      es.onerror = () => { set({ collabStatus: "offline" as CollabStatus }); get().setNotice("Realtime disconnected") }
    } catch {
      set({ collabStatus: "offline" as CollabStatus })
      get().setNotice("Could not connect realtime")
    }
  },
  broadcastPresence: (presence) => {
    const { selectedDbId, docId } = get()
    if (!selectedDbId || !docId) return
    try {
      fetch(`/api/database/${selectedDbId}/files/${docId}/presence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(presence) }).catch(() => {})
    } catch { /* noop */ }
  },
  catchUpMissedPatches: async () => {
    const { selectedDbId, docId, collabRevision } = get()
    if (!selectedDbId || !docId) return
    try {
      const data = await fetchJSON(`/api/database/${selectedDbId}/files/${docId}/patches?since=${collabRevision}`)
      if (data?.ops) get().handleRemotePatch(data.ops as CollaborationOp[])
    } catch { get().setNotice("Could not catch up patches") }
  },
  handleConnectionDrop: () => set({ collabStatus: "offline" as CollabStatus, saveStatus: "offline" }),
  handleNetworkOnline: () => { set({ saveStatus: "saved" }); get().catchUpMissedPatches() },
  handleNetworkOffline: () => set({ collabStatus: "offline" as CollabStatus, saveStatus: "offline" }),

  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  fetchTeams: async () => {
    try {
      const data = await fetchJSON("/api/teams")
      const teams = (data?.teams ?? data ?? []) as TeamClientSummary[]
      set({ teams: Array.isArray(teams) ? teams : [] })
      try {
        const sess = await fetchJSON("/api/auth/session")
        if (sess?.user) set({ currentUser: sess.user as ClientSafeUser })
      } catch { /* keep teams */ }
    } catch {
      set({ teams: [] })
    }
  },
  switchTeam: (currentTeamId) => {
    set({ currentTeamId })
    try {
      fetch("/api/teams/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: currentTeamId }) }).catch(() => {})
    } catch { /* noop */ }
  },
  setTeamSettingsModalOpen: (teamSettingsModalOpen) => set({ teamSettingsModalOpen }),
  setCreateTeamModalOpen: (createTeamModalOpen) => set({ createTeamModalOpen }),
  setInvitationModalToken: (invitationModalToken) => set({ invitationModalToken }),

  setUiHidden: (uiHidden) => set({ uiHidden }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setPanel: (panel) => set({ panel }),
  setPagePanel: (pagePanel) => set({ pagePanel }),
  togglePagePanel: () => set((s) => ({ pagePanel: !s.pagePanel })),
  setContextRow: (contextRow) => set({ contextRow }),
  setSmartSketch: (smartSketch) => set({ smartSketch }),
  toggleSmartSketch: () => set((s) => ({ smartSketch: !s.smartSketch })),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setLinkOpen: (linkOpen) => set({ linkOpen }),
  setWorkspaceHomeOpen: (workspaceHomeOpen) => set({ workspaceHomeOpen }),
  setHandwritingModalOpen: (handwritingModalOpen) => set({ handwritingModalOpen }),
  setColorSizeStudioOpen: (colorSizeStudioOpen) => set({ colorSizeStudioOpen }),
  setActiveStudioTab: (activeStudioTab) => set({ activeStudioTab }),
  setPasswordModalOpen: (passwordModalOpen) => set({ passwordModalOpen }),
  setUnlockModalOpen: (unlockModalOpen) => set({ unlockModalOpen }),
  setPresentationMode: (presentationMode) => set({ presentationMode }),
  setPresentationPointerType: (presentationPointerType) => set({ presentationPointerType }),
  setPresentationTimer: (presentationTimer) => set({ presentationTimer }),
  setPresentationTimerRunning: (presentationTimerRunning) => set({ presentationTimerRunning }),
  resetPresentationTimer: () => set({ presentationTimer: 0, presentationTimerRunning: false }),
  setSlmLearningModalOpen: (slmLearningModalOpen) => set({ slmLearningModalOpen }),
  setActivePdfModalNodeId: (activePdfModalNodeId) => set({ activePdfModalNodeId }),
  openClassroom: (nodeId) => set({ activePdfModalNodeId: nodeId }),

  setTheme: (theme) => {
    set({ theme })
    try { applyLook({ theme } as unknown as Look) } catch { /* noop */ }
    try { writePrefs({ theme } as any) } catch { /* noop */ }
  },
  setPaper: (paper) => {
    set({ paper })
    try { applyLook({ paper } as unknown as Look) } catch { /* noop */ }
    try { writePrefs({ paper } as any) } catch { /* noop */ }
  },
  setFont: (font) => {
    set({ font })
    try { applyLook({ font } as unknown as Look) } catch { /* noop */ }
    try { writePrefs({ font } as any) } catch { /* noop */ }
  },
  setGrid: (grid) => set({ grid }),
  setDrawColor: (drawColor) => set({ drawColor }),
  setTextColor: (textColor) => set({ textColor }),
  setPencilGrade: (pencilGrade) => set({ pencilGrade }),
  setShapeKind: (shapeKind) => set({ shapeKind }),
  setArrowHead: (arrowHead) => set({ arrowHead }),
  setElementDefault: (k, v) => set((s) => ({ elementDefaults: { ...s.elementDefaults, [k]: v } })),
  resetElementDefaults: () => set({ elementDefaults: {} }),
  applyStudioPreset: (preset) => {
    if (!preset || typeof preset !== "object") return
    set((s) => ({
      elementDefaults: { ...s.elementDefaults, ...(preset.defaults ?? preset) },
      ...(preset.drawColor ? { drawColor: preset.drawColor } : {}),
      ...(preset.textColor ? { textColor: preset.textColor } : {}),
    }))
  },
  applyDefaultsToSelection: () => {
    const s = get()
    if (!s.selection.length) return
    const nodes = { ...s.nodes }
    for (const id of s.selection) {
      if (!nodes[id]) continue
      const kind = (nodes[id] as any).kind ?? (nodes[id] as any).type
      const d = (s.elementDefaults as any)?.[kind]
      if (d) nodes[id] = { ...d, ...nodes[id], id } as SquigNode
    }
    set({ nodes })
    get().scheduleSave()
  },
  applyPendingSuggestion: () => {
    const s = get()
    const sug = s.pendingSuggestion as any
    if (!sug) return
    try {
      if (sug.node) get().addNode({ ...sug.node, id: sug.node.id ?? nanoid() } as SquigNode, { select: true })
      else if (sug.patch && sug.id && s.nodes[sug.id]) get().updateNode(sug.id, sug.patch)
    } catch { /* noop */ }
    set({ pendingSuggestion: null })
  },
  dismissPendingSuggestion: () => set({ pendingSuggestion: null }),
  setNotice: (text) => {
    if (text == null) { set({ notice: null }); return }
    set({ notice: { text, id: Date.now() } })
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => set({ notice: null }), 4000)
  },
  setPagePassword: (pw) => {
    try { localStorage.setItem(`squig:pw:${get().docId ?? "default"}`, pw) } catch { /* noop */ }
    set({ hasPassword: true, isLocked: true })
  },
  removePagePassword: () => {
    try { localStorage.removeItem(`squig:pw:${get().docId ?? "default"}`) } catch { /* noop */ }
    set({ hasPassword: false, isLocked: false })
  },
  unlockPage: (pw) => {
    const s = get()
    let expect = ""
    try { expect = localStorage.getItem(`squig:pw:${s.docId ?? "default"}`) ?? "" } catch { expect = "" }
    if (!expect || pw === expect) { set({ isLocked: false, unlockAttemptsLeft: 5 }); return true }
    const left = Math.max(0, s.unlockAttemptsLeft - 1)
    set({ unlockAttemptsLeft: left })
    return false
  },
}))
