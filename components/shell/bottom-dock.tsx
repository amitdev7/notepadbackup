"use client"

// ---------------------------------------------------------------------------
// Zenithsui Bottom Dock — macOS-Inspired Floating Navigation & Tool Bar
//
// Features:
// 1. Continuous cosine proximity magnification engine on cursor approach.
// 2. Sleek macOS-style active indicator dots below selected tools.
// 3. Apple-style translucent frosted glass material with specularity.
// 4. Base UI native tooltips with keybinding pills.
// 5. Adaptive responsive layout: full magnified bar on desktop, touch-friendly
//    compact drawer sheet on mobile viewports (<640px).
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { useWifiSessionStore } from "@/lib/lan/session"
import { kbd } from "@/lib/shortcuts"
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
  Archive,
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
  SquaresFour,
  House,
  Check,
  X,
} from "@phosphor-icons/react"
import { ViewMenu } from "@/components/shell/view-menu"
import { TopBarClock } from "@/components/shell/top-bar-clock"
import { exportExcalidrawDoc, importDoc } from "@/lib/file-io"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

// ── Magnified Dock Item Component ─────────────────────────────────────────────

interface MagnifiedItemProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  title: string
  shortcut?: string
  ariaLabel: string
  mouseX: number | null
  reducedMotion: boolean
  className?: string
  showIndicatorDot?: boolean
}

function MagnifiedDockItem({
  children,
  active,
  onClick,
  title,
  shortcut,
  ariaLabel,
  mouseX,
  reducedMotion,
  className,
  showIndicatorDot = false,
}: MagnifiedItemProps) {
  const itemRef = useRef<HTMLButtonElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (reducedMotion || mouseX === null || !itemRef.current) {
      setScale(1)
      return
    }
    const rect = itemRef.current.getBoundingClientRect()
    const itemCenter = rect.left + rect.width / 2
    const distance = Math.abs(mouseX - itemCenter)
    const maxDist = 80

    if (distance < maxDist) {
      const cosine = Math.cos((distance / maxDist) * (Math.PI / 2))
      const factor = cosine * cosine
      setScale(1 + factor * 0.28)
    } else {
      setScale(1)
    }
  }, [mouseX, reducedMotion])

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            ref={itemRef}
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            aria-pressed={active}
            style={{
              transform: `scale(${scale})`,
            }}
            className={cn(
              "dock-magnify-item relative flex items-center justify-center size-7 sm:size-8 rounded-xl cursor-pointer select-none outline-none",
              "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none",
              active
                ? "bg-[#007AFF]/15 text-[#007AFF] dark:text-[#0A84FF] font-semibold shadow-xs border border-[#007AFF]/30"
                : "text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 border border-transparent",
              className
            )}
          >
            {children}
            {showIndicatorDot && active && (
              <span className="dock-active-dot" aria-hidden="true" />
            )}
          </button>
        }
      />
      <TooltipContent
        side="top"
        sideOffset={10}
        className="px-2.5 py-1 text-xs font-sans rounded-xl shadow-2xl border border-white/10 bg-[#1d1d1f]/95 text-white backdrop-blur-xl z-50 pointer-events-none"
      >
        <span className="font-medium">{title}</span>
        {shortcut && (
          <kbd className="ml-1.5 px-1 py-0.5 rounded bg-white/20 dark:bg-white/10 text-[10px] font-mono tracking-wide">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ── BottomDock ────────────────────────────────────────────────────────────────

export function BottomDock() {
  const showDock = useShellStore((s) => s.preferences.showDock)
  const showToolbar = useShellStore((s) => s.preferences.showToolbar ?? true)
  const showToolbarViewMenu = useShellStore((s) => s.preferences.showToolbarViewMenu ?? true)
  const showDockViewMenu = useShellStore((s) => s.preferences.showDockViewMenu ?? s.preferences.dockControls?.viewMenu ?? false)
  const toggleToolbar = useShellStore((s) => s.toggleToolbar)
  const toggleDock = useShellStore((s) => s.toggleDock)
  const toggleToolbarViewMenu = useShellStore((s) => s.toggleToolbarViewMenu)
  const toggleDockViewMenu = useShellStore((s) => s.toggleDockViewMenu)
  const toggleZoomControls = useShellStore((s) => s.toggleZoomControls)
  const showTimeInTopBar = useShellStore((s) => (s.preferences.clockSettings?.enabled ?? true) && (s.preferences.clockSettings?.showInTopBar ?? true))
  const showDockClock = useShellStore((s) => (s.preferences.clockSettings?.enabled ?? true) && (s.preferences.clockSettings?.showInDock ?? s.preferences.dockControls?.timeClock ?? false))
  const toggleTimeInTopBar = useShellStore((s) => s.toggleTimeInTopBar)
  const toggleTimeInDock = useShellStore((s) => s.toggleTimeInDock)
  const dockControls = useShellStore((s) => s.preferences.dockControls)
  const animationMode = useShellStore((s) => s.preferences.animationMode)
  const reducedMotion = animationMode === "reduced"

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
  const resetViewport = useSquig((s) => s.resetViewport)
  const goToHomeView = useSquig((s) => s.goToHomeView)
  const hasHomeView = useSquig((s) => Boolean(s.viewState?.homeView))
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

  // Cursor proximity tracking for macOS magnification
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return
    setMouseX(e.clientX)
  }, [])

  const handlePointerLeave = useCallback(() => {
    setMouseX(null)
  }, [])

  const handleToolClick = (t: ToolDef) => {
    if (t.id === "library") {
      setPanel(panel === "components" || panel === "blocks" ? null : "components")
    } else {
      setPanel(null)
      setTool(t.id as Tool)
    }
    setMobileDrawerOpen(false)
  }

  const isToolActive = (t: ToolDef): boolean => {
    if (t.id === "library") return panel === "components" || panel === "blocks"
    return tool === t.id && panel === null
  }

  if (!showDock) {
    return (
      <div
        className="fixed bottom-0 inset-x-0 h-3 z-30 group flex items-center justify-center pointer-events-auto"
        title="Hover to reveal dock (⌘⇧D)"
      >
        <button
          type="button"
          onClick={toggleDock}
          aria-label="Show bottom dock (⌘⇧D)"
          className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:-translate-y-2 transition-all duration-200 apple-glass-pill px-3 py-1 rounded-full text-[10px] font-semibold text-stone-700 dark:text-stone-300 shadow-md cursor-pointer flex items-center gap-1.5"
        >
          <span>Show Dock</span>
          <kbd className="font-mono text-[9px] text-stone-400">⌘⇧D</kbd>
        </button>
      </div>
    )
  }

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
    dockControls.zoomControls ||
    showDockViewMenu

  if (!hasAnyContent) return null

  // Mobile slice: primary tools for narrow screen dock
  const mobilePrimaryTools = visibleTools.slice(0, 4)

  return (
    <TooltipProvider delay={150}>
      {/* ── Mobile Tools Drawer Sheet (<640px) ── */}
      {mobileDrawerOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl border-t border-stone-200/90 dark:border-stone-800/90 rounded-t-3xl p-5 shadow-2xl animate-drawer-enter">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Canvas Tools</span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-full text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                aria-label="Close tools drawer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 pt-4">
              {visibleTools.map((t) => {
                const Icon = t.icon
                const active = isToolActive(t)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToolClick(t)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer tactile-press min-h-[58px]",
                      active
                        ? "bg-blue-600/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-semibold"
                        : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    )}
                  >
                    <Icon size={22} weight={active ? "bold" : "regular"} />
                    <span className="text-[11px] mt-1.5 truncate max-w-full">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main macOS Floating Dock ── */}
      <nav
        aria-label="Main dock"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40",
          "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 max-w-[calc(100vw-1rem)]",
          "apple-glass-pill rounded-2xl",
          "animate-dock-enter gpu-accelerated select-none"
        )}
      >
        {/* ── Brand / Workspace Menu ── */}
        {dockControls.brandMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Zenithsui workspace menu"
              className="tactile-press flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors outline-none cursor-pointer shrink-0"
            >
              <span className="flex items-center gap-1 font-bold tracking-tight hidden sm:inline-flex text-blue-600 dark:text-blue-400"><span className="size-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-[0_0_6px_rgba(37,99,235,0.7)]" />zenithsui</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold tracking-tight sm:hidden">z</span>
              <CaretDown size={10} weight="bold" className="text-stone-400" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-56 font-sans animate-popover-enter">
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
              <DropdownMenuItem onClick={() => useShellStore.getState().setExpiredArchiveOpen(true)}>
                <Archive size={14} className="mr-2" aria-hidden="true" /> Expired Elements Archive…
              </DropdownMenuItem>
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

              {hasHomeView && (
                <DropdownMenuItem onClick={goToHomeView}>
                  <House size={14} className="mr-2 text-emerald-500" aria-hidden="true" /> Go to Home View
                </DropdownMenuItem>
              )}
              {dockControls.menuResetView && (
                <DropdownMenuItem onClick={resetViewport}>
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

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleToolbar} className="cursor-pointer">
                <span className="flex-1">Top Toolbar</span>
                <span className="text-[10px] text-muted-foreground mr-1.5">{kbd("mod+shift+t")}</span>
                {showToolbar && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleDock} className="cursor-pointer">
                <span className="flex-1">Bottom Dock</span>
                <span className="text-[10px] text-muted-foreground mr-1.5">{kbd("mod+shift+d")}</span>
                {showDock && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleToolbarViewMenu} className="cursor-pointer">
                <span className="flex-1">View Menu in Toolbar</span>
                {showToolbarViewMenu && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleDockViewMenu} className="cursor-pointer">
                <span className="flex-1">View Menu in Dock</span>
                {showDockViewMenu && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleZoomControls} className="cursor-pointer">
                <span className="flex-1">Zoom Stepper in Dock</span>
                {dockControls.zoomControls && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTimeInTopBar} className="cursor-pointer">
                <span className="flex-1">Clock in Toolbar</span>
                {showTimeInTopBar && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTimeInDock} className="cursor-pointer">
                <span className="flex-1">Clock in Dock</span>
                {showDockClock && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
              </DropdownMenuItem>

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
          <div className="h-5 w-px bg-gradient-to-b from-transparent via-stone-300 dark:via-stone-600 to-transparent mx-0.5 sm:mx-1 shrink-0" />
        )}

        {/* ── Desktop Tool Picker with Magnification Engine (sm:flex) ── */}
        {visibleTools.length > 0 && (
          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
            {visibleTools.map((t) => {
              const Icon = t.icon
              const active = isToolActive(t)
              return (
                <MagnifiedDockItem
                  key={t.id}
                  active={active}
                  onClick={() => handleToolClick(t)}
                  title={t.label}
                  shortcut={t.shortcut}
                  ariaLabel={t.label}
                  mouseX={mouseX}
                  reducedMotion={reducedMotion}
                  showIndicatorDot={true}
                >
                  <Icon size={16} weight={active ? "bold" : "regular"} aria-hidden="true" />
                </MagnifiedDockItem>
              )
            })}
          </div>
        )}

        {/* ── Mobile Tool Picker (sm:hidden) ── */}
        {visibleTools.length > 0 && (
          <div className="flex sm:hidden items-center gap-0.5 shrink-0">
            {mobilePrimaryTools.map((t) => {
              const Icon = t.icon
              const active = isToolActive(t)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToolClick(t)}
                  aria-label={t.label}
                  aria-pressed={active}
                  className={cn(
                    "relative flex items-center justify-center size-8 rounded-xl cursor-pointer tactile-tool",
                    active
                      ? "bg-blue-600/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400 font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50"
                  )}
                >
                  <Icon size={17} weight={active ? "bold" : "regular"} aria-hidden="true" />
                  {active && <span className="dock-active-dot" aria-hidden="true" />}
                </button>
              )
            })}
            {visibleTools.length > 4 && (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                title="All Tools"
                aria-label="Open all tools drawer"
                className="flex items-center justify-center size-8 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 tactile-press"
              >
                <SquaresFour size={17} aria-hidden="true" />
              </button>
            )}
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
              <MagnifiedDockItem
                onClick={() => setSearchOpen(true)}
                title="Find in Canvas"
                shortcut="⌘F"
                ariaLabel="Find in canvas (⌘F)"
                mouseX={mouseX}
                reducedMotion={reducedMotion}
              >
                <MagnifyingGlass size={16} aria-hidden="true" />
              </MagnifiedDockItem>
            )}

            {/* Canvas Stats (⌘/) */}
            {dockControls.actionStats && (
              <MagnifiedDockItem
                onClick={() => setStatsOpen(true)}
                title="Canvas Statistics"
                shortcut="⌘/"
                ariaLabel="Canvas Statistics (⌘/)"
                mouseX={mouseX}
                reducedMotion={reducedMotion}
              >
                <ChartBar size={16} aria-hidden="true" />
              </MagnifiedDockItem>
            )}

            {/* Page Popover Toggle */}
            {dockControls.actionPage && (
              <MagnifiedDockItem
                onClick={togglePagePopover}
                title="Page & Canvas"
                ariaLabel="Page settings"
                active={pagePopoverOpen}
                mouseX={mouseX}
                reducedMotion={reducedMotion}
                showIndicatorDot={true}
              >
                <File size={16} aria-hidden="true" />
              </MagnifiedDockItem>
            )}

            {/* Settings Toggle */}
            {dockControls.actionSettings && (
              <MagnifiedDockItem
                onClick={() => setSettingsOpen(!settingsOpen)}
                title="Settings"
                ariaLabel="Settings"
                active={settingsOpen}
                mouseX={mouseX}
                reducedMotion={reducedMotion}
                showIndicatorDot={true}
              >
                <Gear size={16} aria-hidden="true" />
              </MagnifiedDockItem>
            )}
          </div>
        )}

        {/* ── Separator before Zoom & View Controls ── */}
        {(dockControls.brandMenu || visibleTools.length > 0 || hasQuickActions) && (dockControls.zoomControls || showDockViewMenu || showDockClock) && (
          <div className="hidden sm:block h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
        )}

        {/* ── Zoom Controls ── */}
        {dockControls.zoomControls && (
          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
            <MagnifiedDockItem
              onClick={() => zoomBy(1 / 1.2)}
              title="Zoom Out"
              shortcut="-"
              ariaLabel="Zoom out"
              mouseX={mouseX}
              reducedMotion={reducedMotion}
            >
              <Minus size={13} aria-hidden="true" />
            </MagnifiedDockItem>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={zoomTo100}
                    aria-label={`Current zoom ${zoomPercent}%, click to reset to 100%`}
                    className="tactile-pill min-w-[42px] text-center px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/60"
                  >
                    {zoomPercent}%
                  </button>
                }
              />
              <TooltipContent
                side="top"
                sideOffset={10}
                className="px-2 py-1 text-xs font-sans rounded-lg shadow-lg border border-stone-200/60 dark:border-white/10 bg-stone-900/90 dark:bg-stone-900/95 text-white backdrop-blur-md z-50 pointer-events-none"
              >
                Reset to 100%
              </TooltipContent>
            </Tooltip>

            <MagnifiedDockItem
              onClick={() => zoomBy(1.2)}
              title="Zoom In"
              shortcut="+"
              ariaLabel="Zoom in"
              mouseX={mouseX}
              reducedMotion={reducedMotion}
            >
              <Plus size={13} aria-hidden="true" />
            </MagnifiedDockItem>
          </div>
        )}

        {/* ── View Menu on Dock ── */}
        {showDockViewMenu && (
          <>
            {dockControls.zoomControls && (
              <div className="hidden sm:block h-4 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              <ViewMenu side="top" variant="dock" />
            </div>
          </>
        )}

        {/* ── Real-Time Clock on Dock ── */}
        {showDockClock && (
          <>
            {(dockControls.zoomControls || showDockViewMenu) && (
              <div className="hidden sm:block h-4 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              <TopBarClock variant="dock" side="top" />
            </div>
          </>
        )}
      </nav>
    </TooltipProvider>
  )
}
