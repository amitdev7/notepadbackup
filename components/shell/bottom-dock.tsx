"use client"

// ---------------------------------------------------------------------------
// Zenithsui Bottom Dock — the Mac-style floating navigation bar.
//
// Replaces the old LeftRail, ZoomPill, TopCorner and CommandHint.
// Centralizes: Brand/File menu, Tool picker, Search, Page, Settings,
// Student Hub link, and Zoom controls.
// ---------------------------------------------------------------------------

import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { useWifiSessionStore } from "@/lib/lan/session"
import type { Tool } from "@/lib/types"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Cursor,
  Rectangle,
  Circle,
  PencilLine,
  TextT,
  ArrowRight,
  MagnifyingGlass,
  File,
  Minus,
  Plus,
  GraduationCap,
  Gear,
  CaretDown,
  FolderOpen,
  FloppyDisk,
  Export,
  ShareNetwork,
  WifiHigh,
  ClockCounterClockwise,
  Trash,
  House,
  ArrowCounterClockwise,
  ArrowClockwise,
  Keyboard,
  GithubLogo,
  PencilSimple,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Tool definitions ──────────────────────────────────────────────────────────

interface ToolDef {
  id: Tool | "components" | "blocks"
  label: string
  icon: React.ElementType
  shortcut?: string
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: Cursor, shortcut: "V" },
  { id: "shape", label: "Rectangle", icon: Rectangle, shortcut: "R" },
  { id: "draw", label: "Draw", icon: PencilLine, shortcut: "D" },
  { id: "text", label: "Text", icon: TextT, shortcut: "T" },
  { id: "arrow", label: "Arrow", icon: ArrowRight, shortcut: "A" },
  { id: "components", label: "Components", icon: File },
  { id: "blocks", label: "Blocks", icon: File },
]

// ── BottomDock ────────────────────────────────────────────────────────────────

export function BottomDock() {
  const tool = useSquig((s) => s.tool)
  const setTool = useSquig((s) => s.setTool)
  const panel = useSquig((s) => s.panel)
  const setPanel = useSquig((s) => s.setPanel)
  const viewport = useSquig((s) => s.viewport)
  const zoomBy = useSquig((s) => s.zoomBy)
  const zoomTo100 = useSquig((s) => s.zoomTo100)
  const setCommandOpen = useSquig((s) => s.setCommandOpen)
  const undo = useSquig((s) => s.undo)
  const redo = useSquig((s) => s.redo)
  const clearCanvas = useSquig((s) => s.clearCanvas)
  const setViewport = useSquig((s) => s.setViewport)
  const setShareOpen = useSquig((s) => s.setShareOpen)
  const setHistoryOpen = useSquig((s) => s.setHistoryOpen)
  const fileName = useSquig((s) => s.fileName)

  const togglePagePopover = useShellStore((s) => s.togglePagePopover)
  const pagePopoverOpen = useShellStore((s) => s.pagePopoverOpen)
  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)
  const settingsOpen = useShellStore((s) => s.settingsOpen)

  const zoomPercent = Math.round(viewport.zoom * 100)

  const handleToolClick = (t: ToolDef) => {
    if (t.id === "components") {
      setPanel("components")
    } else if (t.id === "blocks") {
      setPanel("blocks")
    } else {
      setTool(t.id as Tool)
    }
  }

  const isToolActive = (t: ToolDef): boolean => {
    if (t.id === "components") return panel === "components"
    if (t.id === "blocks") return panel === "blocks"
    return tool === t.id && panel === null
  }

  return (
    <nav
      aria-label="Main dock"
      className={cn(
        "fixed bottom-3 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-1 px-2 py-1.5",
        "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
        "bg-white/90 dark:bg-[#1C1C1F]/90 backdrop-blur-xl",
        "shadow-lg shadow-stone-900/8 dark:shadow-black/40",
      )}
    >
      {/* ── Brand / File Menu ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <span className="text-blue-600 font-bold tracking-tight">zenithsui</span>
            <CaretDown size={10} weight="bold" className="text-stone-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-56">
          <DropdownMenuItem onSelect={() => { window.location.href = "/" }}>
            <File size={14} className="mr-2" /> New Canvas
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCommandOpen(true)}>
            <FolderOpen size={14} className="mr-2" /> Open / Recent…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <ShareNetwork size={14} className="mr-2" /> Share…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => useWifiSessionStore.getState().openPublishDialog()}>
            <WifiHigh size={14} className="mr-2" /> Publish on Wi-Fi…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
            <ClockCounterClockwise size={14} className="mr-2" /> Version History
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => undo()}>
            <ArrowCounterClockwise size={14} className="mr-2" /> Undo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => redo()}>
            <ArrowClockwise size={14} className="mr-2" /> Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
            <ArrowCounterClockwise size={14} className="mr-2" /> Reset Zoom
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => { if (window.confirm("Clear all items?")) clearCanvas() }}
            className="text-red-600 dark:text-red-400"
          >
            <Trash size={14} className="mr-2" /> Clear Canvas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="https://github.com/amitdev7/notepadbackup" target="_blank" rel="noopener noreferrer">
              <GithubLogo size={14} className="mr-2" /> GitHub
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Separator ── */}
      <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5" />

      {/* ── Tool Picker ── */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map((t) => {
          const Icon = t.icon
          const active = isToolActive(t)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleToolClick(t)}
              title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ""}`}
              className={cn(
                "relative flex items-center justify-center size-8 rounded-xl transition-all duration-100",
                active
                  ? "bg-blue-600 text-white shadow-xs shadow-blue-600/30"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
              )}
            >
              <Icon size={16} weight={active ? "bold" : "regular"} />
            </button>
          )
        })}
      </div>

      {/* ── Separator ── */}
      <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5" />

      {/* ── Quick Actions: Search / Page / Settings / Student ── */}
      <div className="flex items-center gap-0.5">
        {/* Search / Command Palette */}
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          title="Search (⌘K)"
          className="flex items-center justify-center size-8 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <MagnifyingGlass size={16} />
        </button>

        {/* Page Popover Toggle */}
        <button
          type="button"
          data-dock-page-btn
          onClick={togglePagePopover}
          title="Page & Canvas"
          className={cn(
            "flex items-center justify-center size-8 rounded-xl transition-colors",
            pagePopoverOpen
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
          )}
        >
          <File size={16} />
        </button>

        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Settings"
          className={cn(
            "flex items-center justify-center size-8 rounded-xl transition-colors",
            settingsOpen
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
          )}
        >
          <Gear size={16} />
        </button>

        {/* Student Hub */}
        <Link
          href="/student"
          title="Student Hub"
          className="flex items-center justify-center size-8 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <GraduationCap size={16} />
        </Link>
      </div>

      {/* ── Separator ── */}
      <div className="h-5 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5" />

      {/* ── Zoom Controls ── */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          title="Zoom Out"
          className="flex items-center justify-center size-7 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <Minus size={13} />
        </button>

        <button
          type="button"
          onClick={zoomTo100}
          title="Reset to 100%"
          className="min-w-[42px] text-center px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          {zoomPercent}%
        </button>

        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          title="Zoom In"
          className="flex items-center justify-center size-7 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </nav>
  )
}
