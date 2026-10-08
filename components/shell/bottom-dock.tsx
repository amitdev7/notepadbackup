"use client"

// ---------------------------------------------------------------------------
// Zenithsui Bottom Dock — the Mac-style floating navigation bar.
//
// Centralizes: Brand/Workspace menu, Tool picker (with unified Library),
// Search, Page, Settings, and Zoom controls.
// ---------------------------------------------------------------------------

import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { useWifiSessionStore } from "@/lib/lan/session"
import type { Tool } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Cursor,
  Rectangle,
  PencilLine,
  TextT,
  ArrowRight,
  File,
  Minus,
  Plus,
  Gear,
  CaretDown,
  FolderOpen,
  ShareNetwork,
  WifiHigh,
  ClockCounterClockwise,
  Trash,
  ArrowCounterClockwise,
  ArrowClockwise,
  GithubLogo,
  Sparkle,
  Hand,
  Eraser,
  Note,
  Crop,
  Flashlight,
  MagnifyingGlass,
  ChartBar,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DockControlsVisibility } from "@/lib/shell-store"

// ── Tool definitions ──────────────────────────────────────────────────────────

interface ToolDef {
  id: Tool | "library"
  label: string
  icon: React.ElementType
  shortcut?: string
  prefKey: keyof DockControlsVisibility
}

const ALL_TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: Cursor, shortcut: "V", prefKey: "toolSelect" },
  { id: "hand", label: "Hand (Pan)", icon: Hand, shortcut: "H", prefKey: "toolHand" },
  { id: "shape", label: "Shape", icon: Rectangle, shortcut: "R", prefKey: "toolShape" },
  { id: "draw", label: "Draw", icon: PencilLine, shortcut: "P", prefKey: "toolDraw" },
  { id: "eraser", label: "Eraser", icon: Eraser, shortcut: "E", prefKey: "toolEraser" },
  { id: "arrow", label: "Arrow", icon: ArrowRight, shortcut: "A", prefKey: "toolArrow" },
  { id: "text", label: "Text", icon: TextT, shortcut: "T", prefKey: "toolText" },
  { id: "sticky", label: "Sticky Note", icon: Note, shortcut: "S", prefKey: "toolSticky" },
  { id: "frame", label: "Frame", icon: Crop, shortcut: "F", prefKey: "toolFrame" },
  { id: "laser", label: "Laser Pointer", icon: Flashlight, shortcut: "K", prefKey: "toolLaser" },
  { id: "library", label: "Library", icon: Sparkle, shortcut: "L", prefKey: "toolLibrary" },
]

// ── BottomDock ────────────────────────────────────────────────────────────────

export function BottomDock() {
  const showDock = useShellStore((s) => s.preferences.showDock)
  const dockControls = useShellStore((s) => s.preferences.dockControls)

  const tool = useSquig((s) => s.tool)
  const setTool = useSquig((s) => s.setTool)
  const panel = useSquig((s) => s.panel)
  const setPanel = useSquig((s) => s.setPanel)
  const zoomPercent = useSquig((s) => Math.round(s.viewport.zoom * 100))
  const zoomBy = useSquig((s) => s.zoomBy)
  const zoomTo100 = useSquig((s) => s.zoomTo100)
  const setCommandOpen = useSquig((s) => s.setCommandOpen)
  const undo = useSquig((s) => s.undo)
  const redo = useSquig((s) => s.redo)
  const clearCanvas = useSquig((s) => s.clearCanvas)
  const setViewport = useSquig((s) => s.setViewport)
  const setShareOpen = useSquig((s) => s.setShareOpen)
  const setHistoryOpen = useSquig((s) => s.setHistoryOpen)
  const setSearchOpen = useSquig((s) => s.setSearchOpen)
  const setStatsOpen = useSquig((s) => s.setStatsOpen)

  const togglePagePopover = useShellStore((s) => s.togglePagePopover)
  const pagePopoverOpen = useShellStore((s) => s.pagePopoverOpen)
  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)
  const settingsOpen = useShellStore((s) => s.settingsOpen)

  const handleToolClick = (t: ToolDef) => {
    if (t.id === "library") {
      setPanel(panel === "components" || panel === "blocks" ? null : "components")
    } else {
      setPanel(null)
      setTool(t.id as Tool)
    }
  }

  const isToolActive = (t: ToolDef): boolean => {
    if (t.id === "library") return panel === "components" || panel === "blocks"
    return tool === t.id && panel === null
  }

  if (!showDock) return null

  const visibleTools = ALL_TOOLS.filter((t) => dockControls[t.prefKey])
  const hasQuickActions =
    dockControls.actionSearch ||
    dockControls.actionStats ||
    dockControls.actionPage ||
    dockControls.actionSettings

  const hasAnyContent =
    dockControls.brandMenu ||
    visibleTools.length > 0 ||
    hasQuickActions ||
    dockControls.zoomControls

  if (!hasAnyContent) return null

  return (
    <nav
      aria-label="Main dock"
      className={cn(
        "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 max-w-[calc(100vw-1rem)] overflow-x-auto no-scrollbar",
        "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
        "bg-white/90 dark:bg-[#1C1C1F]/90 backdrop-blur-xl",
        "shadow-lg shadow-stone-900/8 dark:shadow-black/40",
        "animate-dock-enter"
      )}
    >
      {/* ── Brand / Workspace Menu (Image 1) ── */}
      {dockControls.brandMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Zenithsui workspace menu"
            className="tactile-press flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors outline-none cursor-pointer shrink-0"
          >
            <span className="text-blue-600 font-bold tracking-tight hidden sm:inline">zenithsui</span>
            <span className="text-blue-600 font-bold tracking-tight sm:hidden">z</span>
            <CaretDown size={10} weight="bold" className="text-stone-400" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="w-56 font-sans animate-popover-enter">
            {/* Menu Items (Image 2) */}
            {dockControls.menuNewCanvas && (
              <DropdownMenuItem onClick={() => { window.location.href = "/" }}>
                <File size={14} className="mr-2" aria-hidden="true" /> New Canvas
              </DropdownMenuItem>
            )}
            {dockControls.menuOpenRecent && (
              <DropdownMenuItem onClick={() => setCommandOpen(true)}>
                <FolderOpen size={14} className="mr-2" aria-hidden="true" /> Open / Recent…
              </DropdownMenuItem>
            )}
            {(dockControls.menuNewCanvas || dockControls.menuOpenRecent) &&
              (dockControls.menuShare || dockControls.menuPublishWifi) && <DropdownMenuSeparator />}

            {dockControls.menuShare && (
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <ShareNetwork size={14} className="mr-2" aria-hidden="true" /> Share…
              </DropdownMenuItem>
            )}
            {dockControls.menuPublishWifi && (
              <DropdownMenuItem onClick={() => useWifiSessionStore.getState().openPublishDialog()}>
                <WifiHigh size={14} className="mr-2" aria-hidden="true" /> Publish on Wi-Fi…
              </DropdownMenuItem>
            )}
            {(dockControls.menuShare || dockControls.menuPublishWifi) &&
              (dockControls.menuVersionHistory || dockControls.menuUndo || dockControls.menuRedo) && (
                <DropdownMenuSeparator />
              )}

            {dockControls.menuVersionHistory && (
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <ClockCounterClockwise size={14} className="mr-2" aria-hidden="true" /> Version History
              </DropdownMenuItem>
            )}
            {dockControls.menuUndo && (
              <DropdownMenuItem onClick={() => undo()}>
                <ArrowCounterClockwise size={14} className="mr-2" aria-hidden="true" /> Undo
              </DropdownMenuItem>
            )}
            {dockControls.menuRedo && (
              <DropdownMenuItem onClick={() => redo()}>
                <ArrowClockwise size={14} className="mr-2" aria-hidden="true" /> Redo
              </DropdownMenuItem>
            )}
            {(dockControls.menuVersionHistory || dockControls.menuUndo || dockControls.menuRedo) &&
              dockControls.menuSettings && <DropdownMenuSeparator />}

            {dockControls.menuSettings && (
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Gear size={14} className="mr-2" aria-hidden="true" /> Settings…
              </DropdownMenuItem>
            )}
            {dockControls.menuSettings &&
              (dockControls.menuResetView || dockControls.menuClearCanvas) && <DropdownMenuSeparator />}

            {dockControls.menuResetView && (
              <DropdownMenuItem onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
                <ArrowCounterClockwise size={14} className="mr-2" aria-hidden="true" /> Reset View
              </DropdownMenuItem>
            )}
            {dockControls.menuClearCanvas && (
              <DropdownMenuItem
                onClick={() => { if (window.confirm("Clear all items?")) clearCanvas() }}
                className="text-red-600 dark:text-red-400"
              >
                <Trash size={14} className="mr-2" aria-hidden="true" /> Clear Canvas
              </DropdownMenuItem>
            )}
            {(dockControls.menuResetView || dockControls.menuClearCanvas) &&
              dockControls.menuGithub && <DropdownMenuSeparator />}

            {dockControls.menuGithub && (
              <DropdownMenuItem onClick={() => window.open("https://github.com/amitdev7/notepadbackup", "_blank", "noopener,noreferrer")}>
                <GithubLogo size={14} className="mr-2" aria-hidden="true" /> GitHub
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* ── Separator after Brand Menu ── */}
      {dockControls.brandMenu && (visibleTools.length > 0 || hasQuickActions || dockControls.zoomControls) && (
        <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
      )}

      {/* ── Tool Picker (Image 4) ── */}
      {visibleTools.length > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          {visibleTools.map((t) => {
            const Icon = t.icon
            const active = isToolActive(t)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToolClick(t)}
                title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ""}`}
                aria-label={t.label}
                aria-pressed={active}
                className={cn(
                  "relative flex items-center justify-center size-7 sm:size-8 rounded-xl cursor-pointer tactile-tool",
                  active
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-600/30 scale-105"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                )}
              >
                <Icon size={16} weight={active ? "bold" : "regular"} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      )}

      {/* ── Separator between Tools and Quick Actions ── */}
      {visibleTools.length > 0 && hasQuickActions && (
        <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
      )}

      {/* ── Quick Actions: Search / Stats / Page / Settings (Image 4 right) ── */}
      {hasQuickActions && (
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Find in canvas (⌘F) */}
          {dockControls.actionSearch && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              title="Find in canvas (⌘F)"
              aria-label="Find in canvas (⌘F)"
              className="tactile-btn flex items-center justify-center size-7 sm:size-8 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <MagnifyingGlass size={16} aria-hidden="true" />
            </button>
          )}

          {/* Canvas Stats (⌘/) */}
          {dockControls.actionStats && (
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              title="Canvas Statistics (⌘/)"
              aria-label="Canvas Statistics (⌘/)"
              className="tactile-btn flex items-center justify-center size-7 sm:size-8 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <ChartBar size={16} aria-hidden="true" />
            </button>
          )}

          {/* Page Popover Toggle */}
          {dockControls.actionPage && (
            <button
              type="button"
              data-dock-page-btn
              onClick={togglePagePopover}
              title="Page & Canvas"
              aria-label="Page settings"
              aria-expanded={pagePopoverOpen}
              className={cn(
                "tactile-btn flex items-center justify-center size-7 sm:size-8 rounded-xl",
                pagePopoverOpen
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 scale-105"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
              )}
            >
              <File size={16} aria-hidden="true" />
            </button>
          )}

          {/* Settings Toggle */}
          {dockControls.actionSettings && (
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Settings"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              className={cn(
                "tactile-btn flex items-center justify-center size-7 sm:size-8 rounded-xl",
                settingsOpen
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 scale-105"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
              )}
            >
              <Gear size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* ── Separator before Zoom Controls ── */}
      {(dockControls.brandMenu || visibleTools.length > 0 || hasQuickActions) && dockControls.zoomControls && (
        <div className="hidden sm:block h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
      )}

      {/* ── Zoom Controls (Image 3) ── */}
      {dockControls.zoomControls && (
        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            title="Zoom Out"
            aria-label="Zoom out"
            className="tactile-btn flex items-center justify-center size-7 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Minus size={13} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={zoomTo100}
            title="Reset to 100%"
            aria-label={`Current zoom ${zoomPercent}%, click to reset to 100%`}
            className="tactile-pill min-w-[42px] text-center px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            {zoomPercent}%
          </button>

          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            title="Zoom In"
            aria-label="Zoom in"
            className="tactile-btn flex items-center justify-center size-7 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}
