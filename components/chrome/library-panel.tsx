"use client"

// ---------------------------------------------------------------------------
// Zenithsui Unified Library Panel — Ultra-Fast, Responsive & Ergonomic
//
// Combines Components, Blocks, and Templates into ONE instant-loading experience:
// - Zero-lag opening: module-level cached sketch primitives & lazy viewport hydration
// - Multi-dock positioning: Center Spotlight, Right Drawer, or Left Drawer
// - Responsive layout: Compact / Wide mode, adaptive 2-to-4 column grid
// - 1-Click "Add to Canvas" + Drag-and-drop to place anywhere
// - Quick Starters shelf for 1-click popular primitives
// - Live search with instant single-pass category counts & keyboard navigation
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react"
import { useSquig } from "@/lib/store"
import { screenToWorld } from "@/lib/types"
import { useShellStore, type LibraryPosition, type LibrarySize } from "@/lib/shell-store"
import {
  ALL_DEFS,
  searchUnifiedLibrary,
  groupUnifiedDefs,
  getDef,
  matches,
  type ComponentDef,
  type LibraryFilterType,
} from "@/lib/library/registry"
import { getCachedComponentPrims } from "@/lib/library/preview-cache"
import { SketchPrims } from "@/components/canvas/sketch"
import { audioFx } from "@/lib/canvas/audio-fx"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  MagnifyingGlass as MagnifyingGlassIcon,
  X,
  Books,
  ArrowsOut,
  ArrowsIn,
  GridFour,
  Plus,
  SidebarSimple,
  Sidebar,
  AppWindow,
  Lightning,
  HandGrabbing,
  GraduationCap,
  RadioButton,
  Textbox,
  Compass,
  Cards,
  ChartBar,
  Lightbulb,
  Megaphone,
  DeviceMobile,
  ShoppingCart,
  Image,
} from "@phosphor-icons/react"

const BOX_W = 176
const BOX_H = 96
const DRAG_THRESHOLD = 4

// Curated Category Definitions with Icons
interface CategoryMeta {
  id: string
  label: string
  icon: React.ElementType
}

const CATEGORIES: CategoryMeta[] = [
  { id: "All", label: "All Items", icon: Books },
  { id: "Education", label: "Education & Study", icon: GraduationCap },
  { id: "Buttons", label: "Buttons & CTA", icon: RadioButton },
  { id: "Forms", label: "Forms & Inputs", icon: Textbox },
  { id: "Navigation", label: "Navigation & Bars", icon: Compass },
  { id: "Cards", label: "Cards & Tiles", icon: Cards },
  { id: "Data", label: "Data & Charts", icon: ChartBar },
  { id: "Feedback", label: "Feedback & Status", icon: Lightbulb },
  { id: "Marketing", label: "Marketing & Hero", icon: Megaphone },
  { id: "Screens", label: "Screens & Wireframes", icon: DeviceMobile },
  { id: "Commerce", label: "Commerce & Pricing", icon: ShoppingCart },
  { id: "Display", label: "Display & Media", icon: Image },
]

// 6 Essential Starter Components for 1-Click Canvas Insertion
const QUICK_STARTER_IDS = [
  "button",
  "input",
  "study-flashcard",
  "navbar",
  "hero",
  "card-stat",
]

/**
 * Lazy-loaded component preview card.
 * Uses IntersectionObserver to defer rough.js rendering for offscreen items,
 * eliminating initial panel lag and keeping FPS silky smooth.
 */
interface PreviewCardProps {
  def: ComponentDef
  index: number
  active: boolean
  onPick: () => void
  onDragOut: () => void
  onPlaceAtCenter: () => void
  isDrawer: boolean
}

const PreviewCard = memo(function PreviewCard({
  def,
  index,
  active,
  onPick,
  onDragOut,
  onPlaceAtCenter,
  isDrawer,
}: PreviewCardProps) {
  const [isVisible, setIsVisible] = useState(index < 16)
  const cardRef = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)

  // IntersectionObserver to lazy-load preview geometry when scrolled near viewport
  useEffect(() => {
    if (isVisible) return
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "250px 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible])

  // Get cached sketch prims without re-running def.render on each mount
  const prims = useMemo(() => {
    if (!isVisible) return []
    return getCachedComponentPrims(def)
  }, [def, isVisible])

  // Proportional scale that ensures small components (like buttons/badges) are clearly visible and wireframe blocks scale gracefully
  const scale = Math.min((BOX_W - 20) / def.size.w, (BOX_H - 20) / def.size.h, 1.35)
  const ox = (BOX_W - def.size.w * scale) / 2
  const oy = (BOX_H - def.size.h * scale) / 2

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return
    const el = e.currentTarget as HTMLElement
    const { pointerId } = e
    const sx = e.clientX
    const sy = e.clientY
    dragged.current = false
    const ac = new AbortController()
    const stop = () => {
      ac.abort()
      setTimeout(() => (dragged.current = false), 0)
    }

    window.addEventListener(
      "pointermove",
      (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || dragged.current) return
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return
        dragged.current = true
        try {
          el.setPointerCapture(pointerId)
        } catch {}
        onDragOut()
      },
      { signal: ac.signal }
    )
    window.addEventListener("pointerup", stop, { signal: ac.signal })
    window.addEventListener("pointercancel", stop, { signal: ac.signal })
  }

  const tagLabel =
    def.category === "blocks"
      ? def.group === "Screens"
        ? "Template"
        : "Block"
      : "UI"

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (dragged.current) return
        if (isDrawer) {
          onPick()
        } else {
          onPlaceAtCenter()
        }
      }}
      title={`${def.name} (${def.size.w}×${def.size.h}px) — Click to place at center, or drag to canvas`}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-xl border p-2 outline-none cursor-pointer text-left select-none",
        "transition-all duration-150 ease-out",
        "bg-white dark:bg-[#18181b] hover:bg-stone-50 dark:hover:bg-[#202025]",
        "border-stone-200/90 dark:border-stone-800/90",
        "hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:shadow-lg hover:-translate-y-0.5",
        active && "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500 shadow-sm"
      )}
    >
      {/* Thumbnail Stage — Authentic Miniature Canvas Artboard */}
      <div
        className="relative w-full h-[104px] flex items-center justify-center overflow-hidden rounded-lg border border-stone-200/80 dark:border-stone-750/70 shadow-2xs group-hover:border-blue-500/50 dark:group-hover:border-blue-400/50 transition-colors"
        style={{
          backgroundColor: "var(--sq-paper, #ffffff)",
        }}
      >
        {/* Subtle Canvas Dot Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, var(--sq-grid, #e2e2e8) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />

        {isVisible ? (
          <svg width={BOX_W} height={BOX_H} className="overflow-visible pointer-events-none transition-transform duration-200 group-hover:scale-[1.04]">
            <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
              <SketchPrims prims={prims} seed={13} cacheKey={`lib-thumb-${def.kind}`} />
            </g>
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-stone-400 dark:text-stone-500">
            <Books size={16} className="animate-pulse" />
            <span className="text-[10px] font-mono">Loading…</span>
          </div>
        )}

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-stone-950/45 dark:bg-black/60 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPlaceAtCenter()
            }}
            className="pointer-events-auto h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Place directly at Canvas Center"
          >
            <Plus size={13} weight="bold" />
            <span>Add</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPick()
            }}
            className="pointer-events-auto h-7 px-2.5 rounded-lg bg-white/95 dark:bg-stone-800 hover:bg-white text-stone-800 dark:text-stone-100 font-medium text-[11px] flex items-center gap-1 shadow-md active:scale-95 transition-all border border-stone-200/60 dark:border-stone-700/60 cursor-pointer"
            title="Click to stamp anywhere on canvas"
          >
            <HandGrabbing size={13} />
            <span>Stamp</span>
          </button>
        </div>
      </div>

      {/* Card Metadata */}
      <div className="w-full flex items-center justify-between gap-1.5 px-0.5 mt-0.5">
        <span
          className="truncate text-xs font-semibold text-stone-850 dark:text-stone-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          title={def.name}
        >
          {def.name}
        </span>
        <div className="shrink-0 flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 font-mono font-medium">
            {def.size.w}×{def.size.h}
          </span>
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-semibold",
            def.category === "blocks"
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
          )}>
            {tagLabel}
          </span>
        </div>
      </div>
    </div>
  )
})

export function LibraryPanel() {
  const panel = useSquig((s) => s.panel)
  const setPanel = useSquig((s) => s.setPanel)
  const placing = useSquig((s) => s.placing)
  const placingDrag = useSquig((s) => s.placingDrag)
  const setPlacing = useSquig((s) => s.setPlacing)

  // Layout preferences from ShellStore
  const preferences = useShellStore((s) => s.preferences)
  const setLibraryPosition = useShellStore((s) => s.setLibraryPosition)
  const setLibrarySize = useShellStore((s) => s.setLibrarySize)

  const position: LibraryPosition = preferences.libraryPosition || "center"
  const size: LibrarySize = preferences.librarySize || "standard"

  const isLibraryOpen = panel === "components" || panel === "blocks"

  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<LibraryFilterType>("all")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-focus search input on open
  useEffect(() => {
    if (isLibraryOpen) {
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [isLibraryOpen])

  // Close on Escape or click outside
  useEffect(() => {
    if (!isLibraryOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null)
    }
    const onPointer = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        // Don't close if clicking dock trigger or while placing on canvas
        if (
          !target.closest("[data-dock-library-btn]") &&
          !target.closest("[aria-label='Library']") &&
          !useSquig.getState().placing
        ) {
          setPanel(null)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [isLibraryOpen, setPanel])

  // Single-pass count calculation (eliminates redundant array filtering passes)
  const counts = useMemo(() => {
    if (!isLibraryOpen) return { all: 0, components: 0, blocks: 0, templates: 0 }
    const q = query.trim().toLowerCase()
    let all = 0
    let components = 0
    let blocks = 0
    let templates = 0

    for (const d of ALL_DEFS) {
      if (!matches(d, q)) continue
      if (selectedCategory !== "All") {
        if (d.group?.toLowerCase() !== selectedCategory.toLowerCase()) {
          const matchKey = d.keywords?.some(
            (k) => k.toLowerCase() === selectedCategory.toLowerCase()
          )
          if (!matchKey) continue
        }
      }
      all++
      if (d.category === "components") components++
      if (d.category === "blocks") blocks++
      const isTemplate =
        d.kind.startsWith("tmpl-") ||
        d.group === "Education" ||
        d.group === "Screens"
      if (isTemplate) templates++
    }

    return { all, components, blocks, templates }
  }, [isLibraryOpen, query, selectedCategory])

  // Filtered definitions matching query, active filter, and category
  const defs = useMemo(() => {
    if (!isLibraryOpen) return []
    return searchUnifiedLibrary(query, activeFilter, selectedCategory)
  }, [isLibraryOpen, query, activeFilter, selectedCategory])

  // Grouped sections
  const sections = useMemo(() => {
    if (!isLibraryOpen) return []
    return groupUnifiedDefs(defs)
  }, [isLibraryOpen, defs])

  // Quick Starters definitions
  const quickStarters = useMemo(() => {
    return QUICK_STARTER_IDS.map((id) => getDef(id)).filter(Boolean) as ComponentDef[]
  }, [])

  const total = defs.length
  const first = defs[0]

  // Handler: Place component directly at viewport center
  const handlePlaceAtCenter = useCallback(
    (kind: string) => {
      audioFx.playShapeSnap()
      const squig = useSquig.getState()
      const def = getDef(kind)
      if (!def) return

      const vw = typeof window !== "undefined" ? window.innerWidth : 1200
      const vh = typeof window !== "undefined" ? window.innerHeight : 800
      const [wx, wy] = screenToWorld(squig.viewport, vw / 2, vh / 2)

      squig.addNode({
        type: "component",
        kind: def.kind,
        props: { ...def.defaults },
        x: wx - def.size.w / 2,
        y: wy - def.size.h / 2,
        w: def.size.w,
        h: def.size.h,
      } as any)

      // In center spotlight mode, close after placement; in drawer mode, stay open
      if (position === "center") {
        setPanel(null)
      }
    },
    [position, setPanel]
  )

  if (!isLibraryOpen) return null

  const handleClose = () => {
    setPanel(null)
  }

  const isDrawer = position === "right" || position === "left"

  return (
    <>
      {/* Center Spotlight Backdrop Scrim */}
      {position === "center" && (
        <div
          onClick={handleClose}
          aria-hidden="true"
          className="fixed inset-0 bg-stone-950/45 dark:bg-black/65 backdrop-blur-sm z-[44] animate-fade-in"
        />
      )}

      {/* Main Library Panel Container */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Zenithsui Component & Wireframe Library"
        className={cn(
          "fixed z-[45] flex flex-col font-sans select-none",
          "rounded-2xl border border-stone-200/90 dark:border-stone-800/90",
          "bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-2xl shadow-2xl shadow-stone-950/25 dark:shadow-black/70",
          "overflow-hidden transition-all duration-200 ease-out",
          // Layout Positioning
          position === "center" && [
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            size === "wide"
              ? "w-[95vw] sm:w-[860px] md:w-[980px] xl:w-[1100px] max-w-[1100px]"
              : "w-[94vw] sm:w-[740px] md:w-[820px] lg:w-[880px] max-w-[920px]",
            "max-h-[min(82vh,740px)] animate-modal-enter",
          ],
          position === "right" && [
            "right-3 sm:right-5 top-16 bottom-20",
            "w-[94vw] sm:w-[400px] md:w-[440px] max-w-[calc(100vw-1.5rem)]",
            "max-h-[calc(100vh-9.5rem)] animate-slide-left",
          ],
          position === "left" && [
            "left-3 sm:left-5 top-16 bottom-20",
            "w-[94vw] sm:w-[400px] md:w-[440px] max-w-[calc(100vw-1.5rem)]",
            "max-h-[calc(100vh-9.5rem)] animate-slide-right",
          ]
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 flex items-center justify-center font-bold shadow-xs">
              <Books size={18} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                  Component & Wireframe Library
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                  {total} {total === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                168 UI components, wireframe blocks & study templates
              </p>
            </div>
          </div>

          {/* Header Controls: Dock Position & Sizing */}
          <div className="flex items-center gap-1.5">
            {/* Position Switcher: Left | Center | Right */}
            <div className="flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60">
              <button
                type="button"
                onClick={() => setLibraryPosition("left")}
                title="Dock to Left (Side Drawer)"
                className={cn(
                  "p-1 rounded-md transition-colors cursor-pointer",
                  position === "left"
                    ? "bg-white dark:bg-stone-700 text-[var(--ui-accent,#007AFF)] shadow-xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                )}
              >
                <SidebarSimple size={14} weight={position === "left" ? "bold" : "regular"} />
              </button>
              <button
                type="button"
                onClick={() => setLibraryPosition("center")}
                title="Center Spotlight (Floating Dialog)"
                className={cn(
                  "p-1 rounded-md transition-colors cursor-pointer",
                  position === "center"
                    ? "bg-white dark:bg-stone-700 text-[var(--ui-accent,#007AFF)] shadow-xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                )}
              >
                <AppWindow size={14} weight={position === "center" ? "bold" : "regular"} />
              </button>
              <button
                type="button"
                onClick={() => setLibraryPosition("right")}
                title="Dock to Right (Side Drawer)"
                className={cn(
                  "p-1 rounded-md transition-colors cursor-pointer",
                  position === "right"
                    ? "bg-white dark:bg-stone-700 text-[var(--ui-accent,#007AFF)] shadow-xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                )}
              >
                <Sidebar size={14} weight={position === "right" ? "bold" : "regular"} />
              </button>
            </div>

            {/* Width Toggle (Active in Center mode) */}
            {position === "center" && (
              <button
                type="button"
                onClick={() => setLibrarySize(size === "wide" ? "standard" : "wide")}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                title={size === "wide" ? "Switch to standard width" : "Expand to wide catalog"}
                aria-label="Toggle width"
              >
                {size === "wide" ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
                <span className="text-[11px]">{size === "wide" ? "Compact" : "Expand"}</span>
              </button>
            )}

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 mx-0.5" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
              title="Close (Esc)"
              aria-label="Close library"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar & Scope Filters */}
        <div className="px-4 sm:px-5 py-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-900/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search buttons, wireframe blocks, study cards, forms..."
                className="h-9 pl-10 pr-8 text-xs rounded-xl bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Escape") handleClose()
                  if (e.key === "Enter" && first) {
                    handlePlaceAtCenter(first.kind)
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-0.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Scope Filters: All | Components | Blocks | Templates */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 text-xs shrink-0 self-start sm:self-auto overflow-x-auto no-scrollbar max-w-full">
              {(
                [
                  { id: "all", label: "All", count: counts.all },
                  { id: "components", label: "UI", count: counts.components },
                  { id: "blocks", label: "Blocks", count: counts.blocks },
                  { id: "templates", label: "Templates", count: counts.templates },
                ] as const
              ).map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveFilter(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer transition-all",
                    activeFilter === id
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1 rounded",
                      activeFilter === id
                        ? "bg-stone-100 dark:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold"
                        : "text-stone-400 dark:text-stone-500"
                    )}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory(id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all",
                  selectedCategory === id
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-transparent shadow-xs font-semibold"
                    : "bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-200"
                )}
              >
                <Icon size={12} weight={selectedCategory === id ? "fill" : "regular"} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Body */}
        <ScrollArea className="flex-1 min-h-[340px] max-h-[calc(100vh-16rem)] sm:max-h-[620px] p-4 sm:p-5">
          <div className="space-y-6">
            {/* Quick Starters Shelf (Only when query is empty and All categories selected) */}
            {!query && selectedCategory === "All" && activeFilter === "all" && (
              <div className="pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <div className="size-4 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px]">
                    <Lightning size={11} weight="fill" />
                  </div>
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Quick Starters
                  </span>
                  <div className="h-px flex-1 bg-stone-200/60 dark:bg-stone-800/60" />
                </div>

                <div
                  className={cn(
                    "grid gap-3",
                    isDrawer
                      ? "grid-cols-2"
                      : size === "wide"
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6"
                  )}
                >
                  {quickStarters.map((def, idx) => (
                    <PreviewCard
                      key={`quick-${def.kind}`}
                      def={def}
                      index={idx}
                      active={placing === def.kind}
                      onPick={() => setPlacing(placing === def.kind ? null : def.kind)}
                      onDragOut={() => setPlacing(def.kind, { drag: true })}
                      onPlaceAtCenter={() => handlePlaceAtCenter(def.kind)}
                      isDrawer={isDrawer}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Sections */}
            {sections.map((section) => (
              <div key={section.group}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    {section.group}
                  </span>
                  <div className="h-px flex-1 bg-stone-200/80 dark:bg-stone-800/80" />
                  <span className="text-[11px] text-stone-400 font-mono">
                    {section.defs.length}
                  </span>
                </div>

                <div
                  className={cn(
                    "grid gap-3.5",
                    isDrawer
                      ? "grid-cols-1 sm:grid-cols-2"
                      : size === "wide"
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  )}
                >
                  {section.defs.map((def, idx) => (
                    <PreviewCard
                      key={def.kind}
                      def={def}
                      index={idx}
                      active={placing === def.kind}
                      onPick={() => setPlacing(placing === def.kind ? null : def.kind)}
                      onDragOut={() => setPlacing(def.kind, { drag: true })}
                      onPlaceAtCenter={() => handlePlaceAtCenter(def.kind)}
                      isDrawer={isDrawer}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Zero State */}
            {total === 0 && (
              <div className="py-20 text-center space-y-3">
                <div className="size-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                  <GridFour size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    No items found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Try searching for another keyword or switch category filter to &ldquo;All Items&rdquo;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    setSelectedCategory("All")
                    setActiveFilter("all")
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Bar */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-900/50 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-stone-700 dark:text-stone-300 text-[11px] sm:text-xs">
              {placingDrag
                ? "Drag onto canvas and release to drop"
                : placing
                  ? "Click anywhere on canvas to place"
                  : isDrawer
                    ? "Click to place on canvas or drag"
                    : "Click to add to center • Drag to canvas"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-stone-400">
            {placing && (
              <button
                type="button"
                onClick={() => setPlacing(null)}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Cancel Stamp
              </button>
            )}
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/60">
              Esc to close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
