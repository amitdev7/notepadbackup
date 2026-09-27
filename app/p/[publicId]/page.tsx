"use client"

// ---------------------------------------------------------------------------
// Zenithsui Dedicated Share Viewer Route (/p/[publicId])
//
// Access Modes:
//   - Public (View-Only)
//   - Password Protected (View + Password Required to Edit)
//   - Private (Access restricted)
//
// Integrated with:
//   - Database and shared registry
//   - Read-only enforcement / Password authorization
//   - Live Realtime synchronization
//   - Export (PDF, PNG, SVG, JSON)
//   - Napkin / Rough sketch design fidelity
// ---------------------------------------------------------------------------

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useSquig } from "@/lib/store"
import {
  resolvePublicShareClient,
  verifySharePasswordClient,
  type ShareMode,
} from "@/lib/database"
import {
  decodeSharePayload,
  cacheLocalShare,
  getLocalShareCache,
} from "@/lib/share-payload"
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

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Load document on initial mount with instant multi-tier fallback
  useEffect(() => {
    let mounted = true
    async function loadSharedDoc() {
      setLoading(true)
      setErrorStatus(null)
      setErrorMessage(null)

      // Tier 1: Check URL hash for self-contained wireframe payload (#d=...)
      if (typeof window !== "undefined" && window.location.hash) {
        const docFromHash = decodeSharePayload(window.location.hash)
        if (docFromHash && docFromHash.nodes) {
          const loaded = loadDoc(JSON.stringify(docFromHash))
          if (loaded && mounted) {
            setReadOnly(true)
            useSquig.setState({
              selectedDbId: "nezukos-box",
              permissionRole: "viewer",
            })
            setLoading(false)
            cacheLocalShare(publicId, docFromHash)

            // Background async sync to server so clean URLs also work
            void fetch(`/api/share/${encodeURIComponent(publicId)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ doc: docFromHash, mode: "public-view" }),
            }).catch(() => {})
            return
          }
        }
      }

      // Tier 2: Check local browser cache for immediate tab-to-tab rendering
      const cached = getLocalShareCache(publicId) as any
      if (cached && cached.nodes) {
        const loaded = loadDoc(JSON.stringify(cached))
        if (loaded && mounted) {
          setReadOnly(true)
          useSquig.setState({
            selectedDbId: "nezukos-box",
            permissionRole: "viewer",
          })
          setLoading(false)

          // Background async sync to server
          void fetch(`/api/share/${encodeURIComponent(publicId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc: cached, mode: "public-view" }),
          }).catch(() => {})
          return
        }
      }

      // Tier 3: Fetch from server API
      const res = await resolvePublicShareClient(publicId)
      if (!mounted) return

      if (!res.success || !res.doc) {
        // Fallback: check if local storage has any last edited document
        try {
          const temp = localStorage.getItem("zenithsui:temp_fork")
          if (temp) {
            const parsed = JSON.parse(temp)
            if (parsed && parsed.nodes) {
              loadDoc(temp)
              setReadOnly(true)
              setLoading(false)
              return
            }
          }
        } catch {
          // ignore
        }

        setErrorStatus(res.status || 404)
        setErrorMessage(res.error || "Shared wireframe not found or access is restricted.")
        setLoading(false)
        return
      }

      setShareMode(res.mode || "public-view")
      cacheLocalShare(publicId, res.doc)

      // Ingest document into canvas store
      const loaded = loadDoc(JSON.stringify(res.doc))
      if (loaded) {
        setReadOnly(true)
        useSquig.setState({
          selectedDbId: res.dbId || "nezukos-box",
          permissionRole: "viewer",
        })
      }

      setLoading(false)
    }

    if (publicId) {
      void loadSharedDoc()
    }

    return () => {
      mounted = false
    }
  }, [publicId, loadDoc])

  // Password Unlock Handler
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim()) return

    setUnlocking(true)
    setUnlockError(null)

    try {
      const res = await verifySharePasswordClient(publicId, passwordInput)
      if (res.success && res.token) {
        setUnlocked(true)
        setReadOnly(false)
        useSquig.setState({
          permissionRole: "editor",
          isReadOnly: false,
        })
        setUnlockModalOpen(false)
        setPasswordInput("")
        setNotice("Editing unlocked! Live changes are now synced.")
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

