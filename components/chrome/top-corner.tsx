"use client"

// ---------------------------------------------------------------------------
// Top-left corner — the wordmark doubles as the file menu, the file name is
// inline-editable. No toolbar chrome beyond that, on purpose.
//
// It is a *file* menu: documents, saving, editing, the view. How the drawing
// looks — ink, paper, lettering, the grid — lives in the Page panel, which is
// what the inspector shows whenever nothing is selected. Two doors onto the
// same setting is how a menu turns into a junk drawer, so appearance has one.
// ---------------------------------------------------------------------------

import { useRef } from "react"
import { useSquig } from "@/lib/store"
import {
  exportZenithsui,
  exportJson,
  exportPdfDoc,
  exportSvgDoc,
  exportPngDoc,
  copyPngClipboard,
  importZenithsuiOrJson,
  importPdf,
  importImage,
  importDoc,
} from "@/lib/file-io"
import {
  CaretDownIcon,
  Database as DatabaseIcon,
  FilePdf as FilePdfIcon,
  FileImage as FileImageIcon,
  FileSvg as FileSvgIcon,
  FileCode as FileCodeIcon,
  FileArrowUp as ImportIcon,
  FileArrowDown as ExportIcon,
  Lock as LockIcon,
  LockKey as LockKeyIcon,
  Shield as ShieldIcon,
  ClockCounterClockwise as HistoryIcon,
  ShareNetwork as ShareIcon,
  User as UserIcon,
} from "@phosphor-icons/react"
import { getDatabase } from "@/lib/database"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Panel } from "@/components/ui/panel"
import { kbd } from "@/lib/shortcuts"
import { RecentFiles } from "@/components/chrome/recent-files"
import { CollabStatusBadge } from "@/components/chrome/collab-status"
import { TeamSwitcher } from "@/components/chrome/team-switcher"
import { UsersThree as TeamsIcon, Key as KeyIcon, Sparkle as SparkleIcon } from "@phosphor-icons/react"
import { useZenithAI } from "@/lib/ai/ai-store"

export function TopCorner() {
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const isReadOnly = useSquig((s) => s.isReadOnly)
  const hasPassword = useSquig((s) => s.hasPassword)
  const currentUser = useSquig((s) => s.currentUser)
  const connectedDb = selectedDbId ? getDatabase(selectedDbId) : null
  const st = useSquig.getState
  // Rename hands focus to the floating name field, so the menu must not yank
  // focus back to its trigger on the way out.
  const keepFocus = useRef(false)

  return (
    <Panel className="fixed top-3 left-3 z-30 flex-row items-center gap-1 sm:gap-1.5 p-1 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar shadow-panel">
      <DropdownMenu>
        <DropdownMenuTrigger
          title="file menu"
          className="flex items-center gap-1.5 rounded-chrome-sm px-2.5 py-1.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-[var(--sq-ink)]/40"
        >
          {/* deliberately off the chrome type scale — this is the wordmark, not a
              control, and it should out-weigh every label around it */}
          <span
            className="font-sans text-[17px] leading-none font-bold tracking-[-0.03em] select-none"
            style={{ color: "var(--sq-ink)" }}
          >
            zenithsui
          </span>
          <CaretDownIcon className="size-3 text-muted-foreground" weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56"
          // Rename hands focus to the floating name field; returning focus to
          // the wordmark here would snatch it straight back.
          finalFocus={() => {
            if (!keepFocus.current) return true
            keepFocus.current = false
            return false
          }}
        >
          <DropdownMenuItem onClick={() => st().newFile()}>New file</DropdownMenuItem>
          <RecentFiles />
          
          {/* Import Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="flex items-center gap-2">
                <ImportIcon className="size-3.5 text-muted-foreground" weight="bold" />
                Import / Open…
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuItem onClick={() => importZenithsuiOrJson()}>
                <span className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-indigo-500" weight="bold" />
                  Zenithsui (.zenithsui)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importZenithsuiOrJson()}>
                <span className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-emerald-500" weight="bold" />
                  JSON Document (.json)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importPdf()}>
                <span className="flex items-center gap-2">
                  <FilePdfIcon className="size-3.5 text-red-500" weight="bold" />
                  PDF Document (.pdf)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importImage()}>
                <span className="flex items-center gap-2">
                  <FileImageIcon className="size-3.5 text-blue-500" weight="bold" />
                  Image (.png, .jpg, .svg)
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={importDoc}>Universal open from disk…</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => st().saveNow()}>
            Save
            <DropdownMenuShortcut>{kbd("mod+s")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Share Page */}
          <DropdownMenuItem onClick={() => st().setShareModalOpen(true)}>
            <span className="flex items-center gap-2">
              <ShareIcon className="size-3.5 text-muted-foreground" weight="bold" />
              Share page…
            </span>
          </DropdownMenuItem>

          {/* Export Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="flex items-center gap-2">
                <ExportIcon className="size-3.5 text-muted-foreground" weight="bold" />
                Export canvas as…
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuItem onClick={() => exportZenithsui()}>
                <span className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-indigo-500" weight="bold" />
                  Zenithsui (.zenithsui)
                </span>
                <DropdownMenuShortcut>{kbd("mod+shift+s")}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportJson()}>
                <span className="flex items-center gap-2">
                  <FileCodeIcon className="size-3.5 text-emerald-500" weight="bold" />
                  JSON Document (.json)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdfDoc()}>
                <span className="flex items-center gap-2">
                  <FilePdfIcon className="size-3.5 text-red-500" weight="bold" />
                  PDF Document (.pdf)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportSvgDoc()}>
                <span className="flex items-center gap-2">
                  <FileSvgIcon className="size-3.5 text-amber-500" weight="bold" />
                  Vector SVG (.svg)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPngDoc()}>
                <span className="flex items-center gap-2">
                  <FileImageIcon className="size-3.5 text-blue-500" weight="bold" />
                  Raster PNG (.png)
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => copyPngClipboard()}>
                Copy PNG to clipboard
                <DropdownMenuShortcut>{kbd("mod+shift+c")}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Version History */}
          {selectedDbId && (
            <DropdownMenuItem onClick={() => st().openVersionHistory()}>
              <span className="flex items-center gap-2">
                <HistoryIcon className="size-3.5 text-muted-foreground" weight="bold" />
                Version history…
              </span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Document Password / Permissions */}
          {selectedDbId && (
            <>
              {isReadOnly ? (
                <DropdownMenuItem onClick={() => st().setUnlockModalOpen(true)}>
                  <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <LockKeyIcon className="size-3.5" weight="bold" />
                    Unlock for editing…
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => st().setPasswordModalOpen(true)}>
                  <span className="flex items-center gap-2">
                    <ShieldIcon className="size-3.5 text-muted-foreground" weight="bold" />
                    {hasPassword ? "Manage password…" : "Protect with password…"}
                  </span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => {
              keepFocus.current = true
              st().setRenamingFile(true)
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => st().setCommandOpen(true)}>
            Find anything
            <DropdownMenuShortcut>{kbd("mod+k")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => st().setShortcutsOpen(true)}>
            Keyboard shortcuts
            <DropdownMenuShortcut>{kbd("shift+/")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => st().undo()}>
            Undo
            <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => st().redo()}>
            Redo
            <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* ink, paper, lettering and the grid used to sit here; they live in
              the Page panel now — deselect and the inspector is holding them */}
          <DropdownMenuItem onClick={() => st().setViewport({ x: 0, y: 0, zoom: 1 })}>
            Reset zoom
            <DropdownMenuShortcut>{kbd("mod+0")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => st().clearCanvas()}>
            Clear canvas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Account & Profile */}
          <DropdownMenuItem onClick={() => st().setAuthModalOpen(true)}>
            <span className="flex items-center gap-2">
              <UserIcon className="size-3.5 text-muted-foreground" weight="bold" />
              {currentUser ? `Account (@${currentUser.username})…` : "Sign In / Register…"}
            </span>
          </DropdownMenuItem>
          {/* Teams & Shared Workspaces */}
          <DropdownMenuItem onClick={() => st().setTeamSettingsModalOpen(true)}>
            <span className="flex items-center gap-2">
              <TeamsIcon className="size-3.5 text-muted-foreground" weight="bold" />
              Team Settings…
            </span>
          </DropdownMenuItem>
          {/* AI Provider Settings & BYOK Vault */}
          <DropdownMenuItem onClick={() => useZenithAI.getState().setSettingsOpen(true)}>
            <span className="flex items-center gap-2">
              <KeyIcon className="size-3.5 text-muted-foreground" weight="bold" />
              AI Providers & Keys…
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Database connection for shared files */}
          <DropdownMenuItem onClick={() => st().setDatabaseModalOpen(true)}>
            <span className="flex items-center gap-2">
              <DatabaseIcon className="size-3.5 text-muted-foreground" weight="bold" />
              Select Database
            </span>
            <DropdownMenuShortcut>
              {connectedDb ? (
                <span className="rounded-chrome-xs bg-[var(--sq-ink)]/10 px-1.5 py-0.5 text-micro font-medium text-[var(--sq-ink)]">
                  Connected
                </span>
              ) : (
                <span className="text-micro text-muted-foreground">Local</span>
              )}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Team / Workspace Switcher */}
      <TeamSwitcher />

      {/* Real-time Collaboration Status Badge */}
      <CollabStatusBadge />

      {/* Share Page Action */}
      <button
        type="button"
        onClick={() => st().setShareModalOpen(true)}
        className="flex items-center gap-1 rounded-chrome-xs border border-border/80 bg-accent/60 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        title="Share page"
      >
        <ShareIcon size={12} weight="bold" className="text-muted-foreground" />
        <span>Share</span>
      </button>

      {/* User Account Trigger */}
      <button
        type="button"
        onClick={() => st().setAuthModalOpen(true)}
        className="flex items-center gap-1.5 rounded-chrome-xs border border-border/80 bg-accent/60 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        title={currentUser ? `Signed in as @${currentUser.username}` : "Sign In / Register"}
      >
        {currentUser ? (
          <span
            className="size-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: currentUser.avatarColor || "#2563eb" }}
          >
            {(currentUser.displayName?.[0] || currentUser.username?.[0] || "U").toUpperCase()}
          </span>
        ) : (
          <UserIcon size={12} weight="bold" className="text-muted-foreground" />
        )}
        <span className="truncate max-w-[80px]">
          {currentUser ? (currentUser.displayName ? currentUser.displayName.split(" ")[0] : currentUser.username || "Account") : "Account"}
        </span>
      </button>

      {/* If Read-Only / Protected, show badge in top rail */}
      {isReadOnly && (
        <button
          type="button"
          onClick={() => st().setUnlockModalOpen(true)}
          className="flex items-center gap-1.5 rounded-chrome-xs bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors"
          title="Read-only mode. Click to unlock."
        >
          <LockIcon size={12} weight="bold" />
          <span>Read-Only</span>
          <span className="text-[10px] underline ml-0.5">Unlock</span>
        </button>
      )}
    </Panel>
  )
}

export function ZoomPill() {
  const zoom = useSquig((s) => s.viewport.zoom)
  const st = useSquig.getState

  const zoomBy = (factor: number) => {
    const v = st().viewport
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const z = Math.min(4, Math.max(0.1, v.zoom * factor))
    const k = z / v.zoom
    st().setViewport({ zoom: z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k })
  }

  return (
    <Panel className="hidden sm:flex fixed bottom-4 left-4 md:left-4 z-30 flex-row items-center gap-0.5 px-1 py-0.5 shadow-panel">
      <button
        type="button"
        className="size-ctl rounded-chrome-sm text-row text-muted-foreground hover:bg-accent"
        onClick={() => zoomBy(1 / 1.25)}
      >
        −
      </button>
      <button
        type="button"
        className="h-ctl min-w-12 rounded-chrome-sm px-1 text-center text-label text-muted-foreground tabular-nums hover:bg-accent"
        onClick={() => st().setViewport({ x: 0, y: 0, zoom: 1 })}
        title="reset view (⌘0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className="size-ctl rounded-chrome-sm text-row text-muted-foreground hover:bg-accent"
        onClick={() => zoomBy(1.25)}
      >
        +
      </button>
    </Panel>
  )
}

/** Bottom-right nudge toward ⌘K. */
export function CommandHint() {
  const st = useSquig.getState
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => st().setCommandOpen(true)}
      data-zenithsui-chrome
      className="hidden lg:flex absolute bottom-4 left-1/2 z-30 h-ctl -translate-x-1/2 items-center gap-2 rounded-full border border-border/80 bg-background px-gutter text-label text-muted-foreground shadow-panel hover:text-foreground"
    >
      search everything
      <kbd className="inline-flex h-4 items-center rounded-chrome-xs border bg-muted px-1 font-mono text-micro">⌘K</kbd>
    </button>
  )
}

