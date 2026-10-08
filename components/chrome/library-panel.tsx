"use client"

// ---------------------------------------------------------------------------
// Zenithsui Unified Library Panel — Spacious & Expanded Edition
//
// Combines Components, Blocks, and Templates into ONE unified library experience.
// - Generous area with responsive 3 to 4 column catalog layout
// - Expand / Compact width toggle
// - Full library search with live filter counts
// - Category selector (Student, Education, Forms, Navigation, Cards, etc.)
// - Live risograph sketch previews with instant canvas click-to-place & drag-to-place
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import {
  searchUnifiedLibrary,
  groupUnifiedDefs,
  type ComponentDef,
  type LibraryFilterType,
} from "@/lib/library/registry"
import { SketchPrims } from "@/components/canvas/sketch"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  MagnifyingGlassIcon,
  X,
  Sparkle,
  ArrowsOut,
  ArrowsIn,
  GridFour,
} from "@phosphor-icons/react"

const BOX_W = 160
const BOX_H = 96
const DRAG_THRESHOLD = 4

const CATEGORIES = [
  "All",
  "Education",
  "Buttons",
  "Forms",
  "Navigation",
  "Cards",
  "Data",
  "Display",
  "Feedback",
  "Marketing",
  "Screens",
  "Commerce",
]

function Preview({
  def,
  active,
  onPick,
  onDragOut,
}: {
  def: ComponentDef
  active: boolean
  onPick: () => void
  onDragOut: () => void
}) {
  const prims = useMemo(() => def.render(def.defaults, def.size.w, def.size.h), [def])
  const scale = Math.min((BOX_W - 16) / def.size.w, (BOX_H - 16) / def.size.h, 1)
  const ox = (BOX_W - def.size.w * scale) / 2
  const oy = (BOX_H - def.size.h * scale) / 2
  const dragged = useRef(false)

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary) return
    const el = e.currentTarget
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
        } catch { }
        onDragOut()
      },
      { signal: ac.signal }
    )
    window.addEventListener("pointerup", stop, { signal: ac.signal })
    window.addEventListener("pointercancel", stop, { signal: ac.signal })
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={() => {
        if (dragged.current) return
        onPick()
      }}
      title={`${def.name} — Click to place or drag to canvas`}
      className={cn(
        "group tactile-card flex flex-col items-center gap-2 rounded-xl border border-stone-200/90 dark:border-stone-800 p-2.5 outline-none cursor-pointer text-left w-full",
        "bg-white dark:bg-stone-900/80 hover:bg-stone-50 dark:hover:bg-stone-800/90 hover:border-blue-400/80 dark:hover:border-blue-500/80 hover:shadow-md",
        active && "border-blue-600 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs"
      )}
    >
      <div className="w-full h-[96px] flex items-center justify-center overflow-hidden rounded-lg bg-stone-50/70 dark:bg-stone-950/40 border border-stone-100 dark:border-stone-800/60 group-hover:border-stone-200 dark:group-hover:border-stone-700 transition-colors">
        <svg width={BOX_W} height={BOX_H} className="overflow-visible">
          <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
            <SketchPrims prims={prims} seed={13} />
          </g>
        </svg>
      </div>
      <div className="w-full flex items-center justify-between gap-1.5 px-0.5">
        <span
          className="truncate text-xs font-medium text-stone-800 dark:text-stone-200 group-hover:text-stone-950 dark:group-hover:text-white"
          title={def.name}
        >
          {def.name}
        </span>
        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 uppercase font-mono font-medium">
          {def.category === "blocks" ? (def.group === "Screens" ? "Template" : "Block") : "UI"}
        </span>
      </div>
    </button>
  )
}

export function LibraryPanel() {
  const panel = useSquig((s) => s.panel)
  const setPanel = useSquig((s) => s.setPanel)
  const placing = useSquig((s) => s.placing)
  const placingDrag = useSquig((s) => s.placingDrag)
  const setPlacing = useSquig((s) => s.setPlacing)

  const isLibraryOpen = panel === "components" || panel === "blocks"

  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<LibraryFilterType>("all")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isWide, setIsWide] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLibraryOpen) {
      inputRef.current?.focus()
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
        // Don't close if clicking the dock library trigger
        if (!target.closest("[data-dock-library-btn]") && !target.closest("[aria-label='Library']")) {
          // Keep open if currently placing an item on canvas
          if (!useSquig.getState().placing) {
            setPanel(null)
          }
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

  const defs = useMemo(() => {
    return searchUnifiedLibrary(query, activeFilter, selectedCategory)
  }, [query, activeFilter, selectedCategory])

  const sections = useMemo(() => groupUnifiedDefs(defs), [defs])
  const total = defs.length
  const first = defs[0]

  // Category counts
  const counts = useMemo(() => {
    return {
      all: searchUnifiedLibrary(query, "all", selectedCategory).length,
      components: searchUnifiedLibrary(query, "components", selectedCategory).length,
      blocks: searchUnifiedLibrary(query, "blocks", selectedCategory).length,
      templates: searchUnifiedLibrary(query, "templates", selectedCategory).length,
    }
  }, [query, selectedCategory])

  if (!isLibraryOpen) return null

  const handleClose = () => {
    setPanel(null)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Zenithsui Library"
      className={cn(
        "fixed top-14 sm:top-16 left-3 right-3 sm:right-auto sm:left-6 md:left-8 z-[45] flex flex-col",
        "max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-5.5rem)]",
        isWide
          ? "w-auto sm:w-[740px] md:w-[860px] lg:w-[980px] xl:w-[1080px]"
          : "w-auto sm:w-[540px] md:w-[640px]",
        "rounded-2xl border border-stone-200/90 dark:border-stone-800/90",
        "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-2xl shadow-2xl shadow-stone-950/20 dark:shadow-black/70",
        "overflow-hidden font-sans animate-modal-enter select-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shadow-2xs">
            <Sparkle size={16} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50 leading-tight">
                Library
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                {total} {total === 1 ? "item" : "items"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Reusable components, wireframe blocks & templates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Wide / Standard Area */}
          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            className="tactile-btn hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            title={isWide ? "Compact layout" : "Spacious layout"}
            aria-label="Toggle library width"
          >
            {isWide ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
            <span className="text-[11px]">{isWide ? "Compact" : "Expand"}</span>
          </button>

          <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="tactile-btn rounded-lg p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            title="Close (Esc)"
            aria-label="Close library"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar & Primary Filters */}
      <div className="px-5 py-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components, wireframe blocks, formulas, syllabus cards..."
              className="h-9 pl-10 pr-8 text-xs rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Escape") handleClose()
                if (e.key === "Enter" && first) setPlacing(first.kind)
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

          {/* Secondary Filters: All | Components | Blocks | Templates */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-stone-200/70 dark:bg-stone-800/70 text-xs shrink-0">
            {(
              [
                { id: "all", label: "All", count: counts.all },
                { id: "components", label: "Components", count: counts.components },
                { id: "blocks", label: "Blocks", count: counts.blocks },
                { id: "templates", label: "Templates", count: counts.templates },
              ] as const
            ).map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveFilter(id)}
                className={cn(
                  "tactile-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer",
                  activeFilter === id
                    ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold scale-102"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1 rounded",
                    activeFilter === id
                      ? "bg-stone-100 dark:bg-stone-600 text-stone-700 dark:text-stone-200"
                      : "text-stone-400 dark:text-stone-500"
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "tactile-pill shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border cursor-pointer",
                selectedCategory === cat
                  ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-transparent shadow-xs scale-104"
                  : "bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of live previews */}
      <ScrollArea className="flex-1 min-h-[340px] max-h-[calc(100vh-14rem)] sm:max-h-[620px] p-5">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.group}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
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
                  isWide
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3"
                )}
              >
                {section.defs.map((def) => (
                  <Preview
                    key={def.kind}
                    def={def}
                    active={placing === def.kind}
                    onPick={() => setPlacing(placing === def.kind ? null : def.kind)}
                    onDragOut={() => setPlacing(def.kind, { drag: true })}
                  />
                ))}
              </div>
            </div>
          ))}

          {total === 0 && (
            <div className="py-20 text-center space-y-2">
              <div className="size-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                <GridFour size={20} />
              </div>
              <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                No items matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-stone-400">
                Try selecting &ldquo;All&rdquo; categories or a different search term.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {placingDrag
              ? "Drag onto canvas and release to drop"
              : placing
                ? "Click anywhere on canvas to place"
                : `${total} items ready to place`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span>Click to select • Drag to canvas</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/60">
            Esc to close
          </span>
        </div>
      </div>
    </div>
  )
}
