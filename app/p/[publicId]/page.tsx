"use client"

// ---------------------------------------------------------------------------
// Zenithsui Dedicated Share Viewer Route (/p/[publicId])
//
// Access Modes (authoritative, resolved from the server):
//   - Public (View-Only)
//   - Password Protected (View + Password Required to Edit)
//   - Private (Access restricted)
//
// Loading strategy (server-first):
//   - URL hash (#d=...) and localStorage cache are ONLY an instant,
//     strictly read-only placeholder until the server confirms.
//   - Legacy #d= hashes are still readable for backward compat but are
//     never generated here (no sync POSTs, no hash writing).
//   - resolvePublicShareClient is authoritative for mode / doc / ids.
//
// Realtime (only when the server confirms + SSE connects):
//   - EventSource GET /api/share/[publicId]/realtime?token= for init/patch.
//   - Outbound diffs POST to /api/share/[publicId]/realtime with
//     x-zenithsui-edit-token. "Live synced" notice only while SSE is up,
//     otherwise the viewer stays view-only.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { useSquig } from "@/lib/store"
import {
  resolvePublicShareClient,
  verifySharePasswordClient,
  storeEditToken,
  getStoredEditToken,
  getClientSessionId,
  type ShareMode,
} from "@/lib/database"
import {
  decodeSharePayload,
  cacheLocalShare,
  getLocalShareCache,
} from "@/lib/share-payload"
import {
  applyCollaborationOps,
  type CollaborationOp,
} from "@/lib/collaboration-types"
import { Canvas } from "@/components/canvas/canvas"
import { LeftRail } from "@/components/chrome/left-rail"
import { LibraryPanel } from "@/components/chrome/library-panel"
import { Inspector } from "@/components/chrome/inspector"
import { ZoomPill } from "@/components/chrome/top-corner"
import { CanvasContextMenu } from "@/components/chrome/context-menu"
import { ShortcutsSheet } from "@/components/chrome/shortcuts-sheet"
import { Notice } from "@/components/chrome/notice"
import { PdfClassroomModal } from "@/components/pdf-classroom/pdf-classroom-modal"
import {
  exportJson,
  exportPdfDoc,
  exportSvgDoc,
  exportPngDoc,
  copyPngClipboard,
} from "@/lib/file-io"
import {
  Globe as GlobeIcon,
  LockKey as LockKeyIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  FileArrowDown as ExportIcon,
  FilePdf as FilePdfIcon,
  FileImage as FileImageIcon,
  FileSvg as FileSvgIcon,
  FileCode as FileCodeIcon,
  Copy as CopyIcon,
  X as XIcon,
  CaretDown as CaretDownIcon,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/ui/panel"

interface PageProps {
  params: Promise<{ publicId: string }> | { publicId: string }
}

// ---------------------------------------------------------------------------
// Local snapshot + diff helpers for share-realtime mutations.
// The viewer never invents server state: diffs are computed against the last
// server-confirmed (or just-acknowledged) snapshot and POSTed as collab ops.
// ---------------------------------------------------------------------------

interface ShareSnapshot {
  nodes: Record<string, any>
  order: string[]
  name: string
  look: { theme: unknown; paper: unknown; font: unknown; grid: unknown }
}

function snapshotOf(s: any): ShareSnapshot {
  return {
    nodes: s?.nodes ?? {},
    order: Array.isArray(s?.order) ? [...s.order] : [],
    name: s?.fileName ?? s?.name ?? "",
    look: {
      theme: s?.theme,
      paper: s?.paper,
      font: s?.font,
      grid: s?.grid,
    },
  }
}

function diffShareOps(last: ShareSnapshot | null, cur: any): CollaborationOp[] {
  if (!last) return []
  const ops: CollaborationOp[] = []
  const lastNodes: Record<string, any> = last.nodes || {}
  const curNodes: Record<string, any> = cur?.nodes || {}

  const removed = Object.keys(lastNodes).filter((id) => !curNodes[id])
  if (removed.length) ops.push({ type: "remove-nodes", ids: removed })

  const added = Object.keys(curNodes)
    .filter((id) => !lastNodes[id])
    .map((id) => curNodes[id])
    .filter(Boolean)
  if (added.length) ops.push({ type: "add-nodes", nodes: added as any })

  const patches: Record<string, any> = {}
  for (const id of Object.keys(curNodes)) {
    if (!lastNodes[id]) continue
    try {
      if (JSON.stringify(lastNodes[id]) !== JSON.stringify(curNodes[id])) {
        patches[id] = curNodes[id]
      }
    } catch {
      patches[id] = curNodes[id]
    }
  }
  if (Object.keys(patches).length) {
    ops.push({ type: "update-nodes", patches } as CollaborationOp)
  }

  const lastOrder = last.order || []
  const curOrder = Array.isArray(cur?.order) ? cur.order : []
  try {
    if (JSON.stringify(lastOrder) !== JSON.stringify(curOrder)) {
      ops.push({ type: "reorder-nodes", order: [...curOrder] })
    }
  } catch {
    // ignore order diff errors
  }

  const curName = cur?.fileName ?? cur?.name ?? ""
  if ((last.name ?? "") !== (curName ?? "")) {
    ops.push({ type: "set-filename", name: curName })
  }

  const curLook = {
    theme: cur?.theme,
    paper: cur?.paper,
    font: cur?.font,
    grid: cur?.grid,
  }
  try {
    if (JSON.stringify(last.look) !== JSON.stringify(curLook)) {
      ops.push({ type: "set-look", look: curLook as any })
    }
  } catch {
    // ignore look diff errors
  }

  return ops
}

export default function SharedPageViewer({ params }: PageProps) {
  const resolvedParams =
    params && typeof (params as any).then === "function"
      ? use(params as Promise<{ publicId: string }>)
      : (params as { publicId: string })
  const publicId = resolvedParams?.publicId || ""

  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [shareMode, setShareMode] = useState<ShareMode>("public-view")
  const [unlocked, setUnlocked] = useState(false)
  const [shareDbId, setShareDbId] = useState<string | null>(null)
  const [shareFileId, setShareFileId] = useState<string | null>(null)

  // Password Unlock Modal State
  const [unlockModalOpen, setUnlockModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [isLockedOut, setIsLockedOut] = useState(false)

  const hydrated = useSquig((s) => s.hydrated)
  const hydrate = useSquig((s) => s.hydrate)
  const loadDoc = useSquig((s) => s.loadDoc)
  const setReadOnly = (ro: boolean) => useSquig.setState({ isReadOnly: ro })
  const isReadOnly = useSquig((s) => s.isReadOnly)
  const fileName = useSquig((s) => s.fileName)
  const setNotice = useSquig((s) => s.setNotice)

  // Realtime bookkeeping (refs only — no visual changes).
  const sseRef = useRef<EventSource | null>(null)
  const sseConnectedRef = useRef(false)
  const applyingRemote = useRef(false)
  const revisionRef = useRef(0)
  const lastSynced = useRef<ShareSnapshot | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Load document: instant read-only placeholder, then authoritative server GET.
  useEffect(() => {
    let mounted = true
    async function loadSharedDoc() {
      setLoading(true)
      setErrorStatus(null)
      setErrorMessage(null)

      // Instant placeholder ONLY (legacy #d= hash, then local cache).
      // Strictly read-only; the server GET below overwrites it. Nothing is
      // ever POSTed back and no hashes are generated here.
      const showPlaceholder = (doc: any): boolean => {
        if (!doc || !doc.nodes) return false
        const loaded = loadDoc(JSON.stringify(doc))
        if (loaded && mounted) {
          setReadOnly(true)
          useSquig.setState({
            selectedDbId: "nezukos-box",
            permissionRole: "viewer",
          })
          setLoading(false)
          return true
        }
        return false
      }

      let placeholderShown = false
      if (typeof window !== "undefined" && window.location.hash) {
        const docFromHash = decodeSharePayload(window.location.hash)
        if (showPlaceholder(docFromHash)) {
          placeholderShown = true
          try {
            cacheLocalShare(publicId, docFromHash as any)
          } catch {
            // ignore cache errors
          }
        }
      }
      if (!placeholderShown) {
        const cached = getLocalShareCache(publicId) as any
        if (cached && cached.nodes) {
          showPlaceholder(cached)
        }
      }

      // Authoritative: server-first GET resolves mode / ids / document.
      const res = await resolvePublicShareClient(publicId)
      if (!mounted) return

      if (!res.success || !res.doc) {
        setErrorStatus(res.status || 404)
        setErrorMessage(res.error || "Shared wireframe not found or access is restricted.")
        setLoading(false)
        return
      }

      setShareMode(res.mode || "public-view")
      setShareDbId(res.dbId || null)
      setShareFileId(res.fileId || null)
      try {
        cacheLocalShare(publicId, res.doc)
      } catch {
        // ignore cache errors
      }

      // Ingest the server-confirmed document into the canvas store.
      applyingRemote.current = true
      try {
        const loaded = loadDoc(JSON.stringify(res.doc))
        if (loaded && mounted) {
          setReadOnly(true)
          useSquig.setState({
            selectedDbId: res.dbId || "nezukos-box",
            permissionRole: "viewer",
          })
        }
      } finally {
        applyingRemote.current = false
      }
      revisionRef.current = 0
      lastSynced.current = snapshotOf(useSquig.getState())

      setLoading(false)
    }

    if (publicId) {
      void loadSharedDoc()
    }

    return () => {
      mounted = false
    }
  }, [publicId, loadDoc])

  // Realtime inbound: SSE patch stream for this share link.
  useEffect(() => {
    if (!publicId || !shareDbId || !shareFileId) return
    const dbId = shareDbId
    const fileId = shareFileId
    let closed = false
    let es: EventSource | null = null

    const applyInitDoc = (msg: any) => {
      if (msg?.revision != null && typeof msg.revision === "number") {
        revisionRef.current = msg.revision
        useSquig.setState({ collabRevision: msg.revision })
      }
      if (msg?.doc && msg.doc.nodes) {
        applyingRemote.current = true
        try {
          const st = useSquig.getState()
          const order = Array.isArray(msg.doc.order)
            ? msg.doc.order.filter((id: string) => msg.doc.nodes[id])
            : Object.keys(msg.doc.nodes)
          useSquig.setState({
            fileName: msg.doc.name || st.fileName,
            nodes: msg.doc.nodes,
            order,
            collabRevision: revisionRef.current,
          } as any)
          if (msg.doc.look) {
            try {
              useSquig.setState(msg.doc.look as any)
            } catch {
              // ignore look errors
            }
          }
          lastSynced.current = snapshotOf(useSquig.getState())
        } finally {
          applyingRemote.current = false
        }
      }
      // The server derives role from the edit token: trust it.
      if (msg?.role === "editor" || msg?.role === "owner") {
        useSquig.setState({ permissionRole: msg.role, isReadOnly: false })
        setUnlocked(true)
      } else if (msg?.role === "viewer") {
        useSquig.setState({ permissionRole: "viewer", isReadOnly: true })
        setUnlocked(false)
      }
    }

    const applyPatchOps = (ops: CollaborationOp[], revision: number) => {
      if (!Array.isArray(ops) || !ops.length) return
      applyingRemote.current = true
      try {
        const st = useSquig.getState()
        const updated = applyCollaborationOps(
          {
            id: (st.docId as string) || fileId,
            name: st.fileName,
            nodes: st.nodes as any,
            order: st.order,
            updatedAt: Date.now(),
            look: {
              theme: (st as any).theme,
              paper: (st as any).paper,
              font: (st as any).font,
              grid: (st as any).grid,
            },
          } as any,
          ops
        )
        useSquig.setState({
          nodes: updated.nodes as any,
          order: updated.order,
          fileName: updated.name,
          collabRevision: revision,
        } as any)
        if (updated.look) {
          try {
            useSquig.setState(updated.look as any)
          } catch {
            // ignore look errors
          }
        }
        lastSynced.current = snapshotOf(useSquig.getState())
      } finally {
        applyingRemote.current = false
      }
    }

    const catchUpMissed = async () => {
      try {
        const r = await fetch(
          `/api/share/${encodeURIComponent(publicId)}/realtime?since=${revisionRef.current}`,
          { headers: { "x-session-id": getClientSessionId() } }
        )
        const data = await r.json().catch(() => ({}))
        if (!r.ok || closed) return
        if (data?.fullSync && data?.doc?.nodes) {
          if (typeof data.revision === "number") revisionRef.current = data.revision
          applyingRemote.current = true
          try {
            loadDoc(JSON.stringify(data.doc))
            useSquig.setState({ collabRevision: revisionRef.current } as any)
            lastSynced.current = snapshotOf(useSquig.getState())
          } finally {
            applyingRemote.current = false
          }
        } else if (Array.isArray(data?.patches) && data.patches.length) {
          for (const h of data.patches) {
            if (closed) break
            if (typeof h?.revision === "number") revisionRef.current = h.revision
            applyPatchOps(h?.ops || [], revisionRef.current)
          }
        }
      } catch {
        // retry on the next patch or reconnect
      }
    }

    try {
      const token = getStoredEditToken(dbId, fileId) || ""
      const clientId = getClientSessionId()
      const url =
        `/api/share/${encodeURIComponent(publicId)}/realtime` +
        `?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(clientId)}`
      es = new EventSource(url)
      sseRef.current = es

      es.addEventListener("init", (ev) => {
        try {
          const msg = JSON.parse((ev as MessageEvent).data)
          if (closed) return
          applyInitDoc(msg)
        } catch {
          // ignore malformed init
        }
      })

      es.addEventListener("patch", (ev) => {
        try {
          const msg = JSON.parse((ev as MessageEvent).data)
          if (closed) return
          if (msg.clientId && msg.clientId === getClientSessionId()) {
            if (typeof msg.revision === "number") {
              revisionRef.current = Math.max(revisionRef.current, msg.revision)
              useSquig.setState({ collabRevision: revisionRef.current } as any)
            }
            return
          }
          if (
            typeof msg.revision === "number" &&
            msg.revision > revisionRef.current + 1 &&
            revisionRef.current > 0
          ) {
            void catchUpMissed()
            return
          }
          if (typeof msg.revision === "number") revisionRef.current = msg.revision
          applyPatchOps(msg.ops || [], revisionRef.current)
        } catch {
          // ignore malformed patch
        }
      })

      es.onopen = () => {
        if (closed) return
        if (!sseConnectedRef.current) {
          sseConnectedRef.current = true
          setNotice("Live synced — you are viewing the latest version.")
        }
      }
      es.onerror = () => {
        if (sseConnectedRef.current) {
          sseConnectedRef.current = false
          setNotice("View-only — live connection lost. Reconnecting…")
        }
      }
    } catch {
      sseConnectedRef.current = false
    }

    return () => {
      closed = true
      sseConnectedRef.current = false
      try {
        es?.close()
      } catch {
        // ignore
      }
      if (sseRef.current === es) sseRef.current = null
    }
  }, [publicId, shareDbId, shareFileId, unlocked, loadDoc, setNotice])

  // Realtime outbound: POST local diffs while unlocked with the edit token.
  useEffect(() => {
    if (!unlocked || !shareDbId || !shareFileId) return
    const dbId = shareDbId
    const fileId = shareFileId
    let timer: ReturnType<typeof setTimeout> | null = null
    let sending = false
    let disposed = false

    lastSynced.current = snapshotOf(useSquig.getState())

    const flushMutations = async () => {
      if (disposed || sending || applyingRemote.current) return
      const st = useSquig.getState()
      if (st.isReadOnly) return
      const ops = diffShareOps(lastSynced.current, {
        nodes: st.nodes,
        order: st.order,
        fileName: st.fileName,
        theme: (st as any).theme,
        paper: (st as any).paper,
        font: (st as any).font,
        grid: (st as any).grid,
      })
      if (!ops.length) {
        lastSynced.current = snapshotOf(st)
        return
      }
      sending = true
      try {
        const token = getStoredEditToken(dbId, fileId) || ""
        const clientId = getClientSessionId()
        const res = await fetch(`/api/share/${encodeURIComponent(publicId)}/realtime`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": clientId,
            "x-zenithsui-edit-token": token,
          },
          body: JSON.stringify({
            type: "mutate",
            dbId,
            fileId,
            clientId,
            baseRevision: revisionRef.current,
            ops,
            timestamp: Date.now(),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (disposed) return
        if (res.ok && (data.success || typeof data.revision === "number")) {
          if (typeof data.revision === "number") {
            revisionRef.current = data.revision
            useSquig.setState({ collabRevision: data.revision } as any)
          }
          lastSynced.current = snapshotOf(useSquig.getState())
        } else if (res.status === 403) {
          useSquig.setState({ isReadOnly: true })
          setUnlocked(false)
          useSquig.getState().setNotice("Edit access was revoked. View-only mode.")
        }
      } catch {
        // keep lastSynced as-is so the next change retries the diff
      } finally {
        sending = false
      }
    }

    const unsub = useSquig.subscribe((s, prev) => {
      if (disposed || applyingRemote.current) return
      if ((s as any).isReadOnly) return
      const changed =
        (s as any).nodes !== (prev as any).nodes ||
        (s as any).order !== (prev as any).order ||
        (s as any).fileName !== (prev as any).fileName ||
        (s as any).theme !== (prev as any).theme ||
        (s as any).paper !== (prev as any).paper ||
        (s as any).font !== (prev as any).font ||
        (s as any).grid !== (prev as any).grid
      if (!changed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void flushMutations()
      }, 500)
    })

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      unsub()
    }
  }, [unlocked, shareDbId, shareFileId, publicId])

  // Password Unlock Handler
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim()) return

    setUnlocking(true)
    setUnlockError(null)

    try {
      const res = await verifySharePasswordClient(publicId, passwordInput)
      if (res.success && res.token) {
        if (shareDbId && shareFileId) {
          storeEditToken(shareDbId, shareFileId, res.token)
        }
        setUnlocked(true)
        setReadOnly(false)
        useSquig.setState({
          permissionRole: "editor",
          isReadOnly: false,
        })
        lastSynced.current = snapshotOf(useSquig.getState())
        setUnlockModalOpen(false)
        setPasswordInput("")
        setNotice(
          sseConnectedRef.current
            ? "Editing unlocked! Live changes are now synced."
            : "Editing unlocked (view-only — waiting for live sync)."
        )
      } else {
        setUnlockError(res.error || "Incorrect password")
        setAttemptsLeft(res.attemptsLeft ?? null)
        if (res.locked) {
          setIsLockedOut(true)
        }
      }
    } finally {
      setUnlocking(false)
    }
  }

  // Fork / Duplicate doc into local workspace
  const handleForkDocument = () => {
    const json = useSquig.getState().serialize()
    try {
      localStorage.setItem("zenithsui:temp_fork", json)
      window.open("/", "_blank")
      setNotice("Opening duplicate copy in a new tab…")
    } catch {
      setNotice("Could not duplicate document")
    }
  }

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (loading || !hydrated) {
    return (
      <main className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="font-mono text-xs text-muted-foreground">Loading shared wireframe…</p>
        </div>
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // Error State (404 / 403 / Private / Disabled)
  // ---------------------------------------------------------------------------
  if (errorStatus || errorMessage) {
    return (
      <main className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-chrome-lg border border-border/80 bg-background p-6 text-center shadow-panel">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <LockIcon size={24} weight="duotone" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-bold text-foreground">
              {errorStatus === 403 ? "Access Restricted" : "Wireframe Not Found"}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {errorMessage ||
                "This shared link may be private, disabled by the owner, or expired. Please check with the creator."}
            </p>
          </div>
          <Link
            href="/"
            className="mt-2 flex h-8.5 items-center gap-1.5 rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-xs font-medium text-[var(--sq-paper)] hover:opacity-90 transition-opacity"
          >
            Create New Wireframe
          </Link>
        </div>
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Shared Viewer
  // ---------------------------------------------------------------------------
  return (
    <main className="relative h-full w-full overflow-hidden">
      {/* Canvas viewport */}
      <Canvas />

      {/* Top Bar Navigation for Shared Page */}
      <Panel className="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-30 flex-row items-center justify-between p-1.5 shadow-panel max-w-[calc(100vw-1.5rem)]">
        {/* Left: Branding & Document Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="Open Zenithsui Home"
            className="flex items-center gap-1 rounded-chrome-sm px-2 py-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-[var(--sq-ink)]/40"
          >
            <span
              className="font-sans text-[16px] leading-none font-bold tracking-[-0.03em] select-none"
              style={{ color: "var(--sq-ink)" }}
            >
              zenithsui
            </span>
          </Link>

          <div className="h-4 w-px bg-border/80" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground max-w-[200px] sm:max-w-xs truncate">
              {fileName}
            </span>

            {/* Permission Badge */}
            {shareMode === "public-view" && (
              <span className="flex items-center gap-1 rounded-chrome-xs bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <GlobeIcon size={12} />
                <span>Public View</span>
              </span>
            )}

            {shareMode === "password-edit" && !unlocked && (
              <span className="flex items-center gap-1 rounded-chrome-xs bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <LockKeyIcon size={12} weight="bold" />
                <span>Read-Only</span>
              </span>
            )}

            {shareMode === "password-edit" && unlocked && (
              <span className="flex items-center gap-1 rounded-chrome-xs bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <LockOpenIcon size={12} weight="bold" />
                <span>Editing Unlocked</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Unlock / Export / Fork) */}
        <div className="flex items-center gap-1.5">
          {/* Unlock Editing Button (if in password-edit mode and not yet unlocked) */}
          {shareMode === "password-edit" && !unlocked && (
            <Button
              type="button"
              size="sm"
              onClick={() => setUnlockModalOpen(true)}
              className="h-7.5 gap-1.5 rounded-chrome-sm text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
            >
              <LockKeyIcon size={13} weight="bold" />
              <span>Unlock to Edit</span>
            </Button>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Export wireframe"
              className="flex h-7.5 items-center gap-1 rounded-chrome-sm border border-border/80 bg-background px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground outline-none"
            >
              <ExportIcon size={13} weight="bold" />
              <span className="hidden sm:inline">Export</span>
              <CaretDownIcon size={10} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => exportPngDoc()}>
                <span className="flex items-center gap-2">
                  <FileImageIcon className="size-3.5 text-blue-500" weight="bold" />
                  Raster PNG (.png)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportSvgDoc()}>
                <span className="flex items-center gap-2">
                  <FileSvgIcon className="size-3.5 text-amber-500" weight="bold" />
                  Vector SVG (.svg)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdfDoc()}>
                <span className="flex items-center gap-2">
                  <FilePdfIcon className="size-3.5 text-red-500" weight="bold" />
                  PDF Document (.pdf)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportJson()}>
                <span className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-emerald-500" weight="bold" />
                  JSON Document (.json)
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => copyPngClipboard()}>
                Copy PNG to clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Duplicate / Fork */}
          <button
            type="button"
            onClick={handleForkDocument}
            className="hidden sm:flex h-7.5 items-center gap-1.5 rounded-chrome-sm border border-border/80 bg-background px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Duplicate wireframe into your personal workspace"
          >
            <CopyIcon size={13} />
            <span>Fork Copy</span>
          </button>
        </div>
      </Panel>

      {/* Editing Toolbar Chrome (If Unlocked) */}
      {unlocked && !isReadOnly && (
        <>
          <LeftRail />
          <LibraryPanel />
          <Inspector />
        </>
      )}

      {/* Zoom Pill */}
      <ZoomPill />

      {/* Notices & Dialogs */}
      <Notice />
      <CanvasContextMenu />
      <ShortcutsSheet />

      {/* Password Unlock Modal */}
      {unlockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unlock Editing"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          onPointerDown={() => setUnlockModalOpen(false)}
        >
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
          <div
            className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-amber-500/10 text-amber-600">
                  <LockKeyIcon size={16} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-title font-medium text-foreground">Unlock Editing</h2>
                  <p className="text-label text-muted-foreground truncate max-w-[200px]">{fileName}</p>
                </div>
              </div>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setUnlockModalOpen(false)}
              >
                <XIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleUnlock} className="flex flex-col gap-4 p-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter the edit password provided by the page creator to make changes and collaborate live.
              </p>

              <div className="flex flex-col gap-1.5">
                <input
                  type="password"
                  placeholder="Enter password…"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setUnlockError(null)
                  }}
                  disabled={unlocking || isLockedOut}
                  autoFocus
                  className="h-9 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {unlockError && <p className="text-xs text-destructive">{unlockError}</p>}
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining before lockout.
                </p>
              )}
              {isLockedOut && (
                <p className="text-[11px] text-destructive font-medium">
                  Too many failed attempts. Password editing is temporarily locked.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlockModalOpen(false)}
                  className="h-8 rounded-chrome-sm text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!passwordInput.trim() || unlocking || isLockedOut}
                  className="h-8 gap-1.5 rounded-chrome-sm text-xs font-medium"
                >
                  <LockKeyIcon size={14} weight="bold" />
                  {unlocking ? "Verifying…" : "Unlock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PdfClassroomModal />
    </main>
  )
}
