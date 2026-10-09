"use client"

// ---------------------------------------------------------------------------
// Zenithsui Bottom Dock — the Mac-style floating navigation bar.
//
// Centralizes: Brand/Workspace menu, Tool picker (with unified Library),
// Search, Page, Settings, and Zoom controls.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
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
  TreeStructure,
  DownloadSimple,
} from "@phosphor-icons/react"
import { exportExcalidrawDoc, importDoc } from "@/lib/file-io"
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

// ── macOS Dock Item with Continuous Cosine Magnification & Indicator ─────────

interface DockItemButtonProps {
  id: string
  label: string
  shortcut?: string
  active?: boolean
  onClick?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  mouseX: number | null
  bouncing?: boolean
  children: React.ReactNode
  className?: string
  showIndicator?: boolean
  "data-dock-page-btn"?: boolean
}

function DockItemButton({
  label,
  shortcut,
  active = false,
  onClick,
  onPointerDown,
  mouseX,
  bouncing = false,
  children,
  className,
  showIndicator = false,
  "data-dock-page-btn": dataDockPageBtn,
}: DockItemButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    if (bouncing) {
      el.style.transform = ""
      return
    }
    if (mouseX === null) {
      el.style.transform = "translateY(0px) scale(1)"
      return
    }
    const rect = el.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const dist = Math.abs(mouseX - center)
    const maxDist = 72
    if (dist < maxDist) {
      const factor = Math.cos((dist / maxDist) * (Math.PI / 2))
      const scale = 1 + 0.3 * factor
      const translateY = -((scale - 1) * 12)
      el.style.transform = `translateY(${translateY}px) scale(${scale})`
    } else {
      el.style.transform = "translateY(0px) scale(1)"
    }
  }, [mouseX, bouncing])

  return (
    <div className="relative flex flex-col items-center">
      {/* macOS floating tooltip pill */}
      {isHovered && (
        <div className="macos-tooltip absolute -top-8.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap px-2.5 py-0.5 rounded-md text-[11px] font-medium tracking-tight animate-in fade-in-0 zoom-in-95 duration-100">
          {label}{shortcut ? ` (${shortcut})` : ""}
        </div>
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={label}
        aria-pressed={active}
        data-dock-page-btn={dataDockPageBtn ? "" : undefined}
        style={{
          transformOrigin: "bottom center",
        }}
        className={cn(
          "relative flex items-center justify-center size-7.5 sm:size-8 rounded-xl cursor-pointer select-none",
          "transition-transform duration-100 ease-[cubic-bezier(0.2,0.9,0.3,1)]",
          bouncing && "animate-macos-bounce",
          active
            ? "bg-blue-600 text-white shadow-xs shadow-blue-600/30"
            : "text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10",
          className
        )}
      >
        {children}
      </button>

      {/* macOS running indicator dot */}
      {showIndicator && active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs pointer-events-none" />
      )}
    </div>
  )
}

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
  const statsOpen = useSquig((s) => s.statsOpen)
  const setChartDialogOpen = useSquig((s) => s.setChartDialogOpen)
  const setMermaidDialogOpen = useSquig((s) => s.setMermaidDialogOpen)

  const togglePagePopover = useShellStore((s) => s.togglePagePopover)
  const pagePopoverOpen = useShellStore((s) => s.pagePopoverOpen)
  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)
  const settingsOpen = useShellStore((s) => s.settingsOpen)

  const [mouseX, setMouseX] = useState<number | null>(null)
  const [bouncingId, setBouncingId] = useState<string | null>(null)

  const triggerBounce = (id: string) => {
    setBouncingId(id)
    setTimeout(() => {
      setBouncingId((curr) => (curr === id ? null : curr))
    }, 900)
  }

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
      onMouseMove={(e) => setMouseX(e.clientX)}
      onMouseLeave={() => setMouseX(null)}
      className={cn(
        "macos-dock fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 max-w-[calc(100vw-1rem)] overflow-visible",
        "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
        "bg-white/90 dark:bg-[#1C1C1F]/90 backdrop-blur-xl",
        "shadow-lg shadow-stone-900/8 dark:shadow-black/40",
        "animate-dock-enter gpu-accelerated select-none"
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
            <DropdownMenuItem onClick={() => importDoc()}>
              <FolderOpen size={14} className="mr-2" aria-hidden="true" /> Open Drawing / Universal Sketch…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportExcalidrawDoc()}>
              <DownloadSimple size={14} className="mr-2" aria-hidden="true" /> Export as Universal Sketch (.sketch)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setChartDialogOpen(true)}>
              <ChartBar size={14} className="mr-2" aria-hidden="true" /> Insert Chart…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMermaidDialogOpen(true)}>
              <TreeStructure size={14} className="mr-2" aria-hidden="true" /> Insert Mermaid Diagram…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatsOpen(!statsOpen)}>
              <ChartBar size={14} className="mr-2" aria-hidden="true" /> Canvas Stats
            </DropdownMenuItem>
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

      {/* ── Tool Picker with Magnification & Indicator Dots ── */}
      {visibleTools.length > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          {visibleTools.map((t) => {
            const Icon = t.icon
            const active = isToolActive(t)
            return (
              <DockItemButton
                key={t.id}
                id={t.id}
                label={t.label}
                shortcut={t.shortcut}
                active={active}
                mouseX={mouseX}
                bouncing={bouncingId === t.id}
                showIndicator
                onClick={() => {
                  triggerBounce(t.id)
                  handleToolClick(t)
                }}
              >
                <Icon size={16} weight={active ? "bold" : "regular"} aria-hidden="true" />
              </DockItemButton>
            )
          })}
        </div>
      )}

      {/* ── Separator between Tools and Quick Actions ── */}
      {visibleTools.length > 0 && hasQuickActions && (
        <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
      )}

      {/* ── Quick Actions: Search / Stats / Page / Settings ── */}
      {hasQuickActions && (
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Find in canvas (⌘F) */}
          {dockControls.actionSearch && (
            <DockItemButton
              id="search"
              label="Find in canvas"
              shortcut="⌘F"
              mouseX={mouseX}
              bouncing={bouncingId === "search"}
              onClick={() => {
                triggerBounce("search")
                setSearchOpen(true)
              }}
            >
              <MagnifyingGlass size={16} aria-hidden="true" />
            </DockItemButton>
          )}

          {/* Canvas Stats (⌘/) */}
          {dockControls.actionStats && (
            <DockItemButton
              id="stats"
              label="Canvas Statistics"
              shortcut="⌘/"
              mouseX={mouseX}
              bouncing={bouncingId === "stats"}
              onClick={() => {
                triggerBounce("stats")
                setStatsOpen(true)
              }}
            >
              <ChartBar size={16} aria-hidden="true" />
            </DockItemButton>
          )}

          {/* Page Popover Toggle */}
          {dockControls.actionPage && (
            <DockItemButton
              id="page"
              label="Page & Canvas"
              data-dock-page-btn
              active={pagePopoverOpen}
              mouseX={mouseX}
              bouncing={bouncingId === "page"}
              showIndicator
              onClick={() => {
                triggerBounce("page")
                togglePagePopover()
              }}
            >
              <File size={16} aria-hidden="true" />
            </DockItemButton>
          )}

          {/* Settings Toggle */}
          {dockControls.actionSettings && (
            <DockItemButton
              id="settings"
              label="Settings"
              active={settingsOpen}
              mouseX={mouseX}
              bouncing={bouncingId === "settings"}
              showIndicator
              onClick={() => {
                triggerBounce("settings")
                setSettingsOpen(!settingsOpen)
              }}
            >
              <Gear size={16} aria-hidden="true" />
            </DockItemButton>
          )}
        </div>
      )}

      {/* ── Separator before Zoom Controls ── */}
      {(dockControls.brandMenu || visibleTools.length > 0 || hasQuickActions) && dockControls.zoomControls && (
        <div className="hidden sm:block h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
      )}

      {/* ── macOS Segmented Zoom Pill ── */}
      {dockControls.zoomControls && (
        <div className="hidden sm:flex items-center gap-0.5 px-1 py-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            title="Zoom Out"
            aria-label="Zoom out"
            className="flex items-center justify-center size-6.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minus size={13} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={zoomTo100}
            title="Reset to 100%"
            aria-label={`Current zoom ${zoomPercent}%, click to reset to 100%`}
            className="min-w-[42px] text-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {zoomPercent}%
          </button>

          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            title="Zoom In"
            aria-label="Zoom in"
            className="flex items-center justify-center size-6.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}
