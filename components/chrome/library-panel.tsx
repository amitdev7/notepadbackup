"use client"

// ---------------------------------------------------------------------------
// Zenithsui Unified Library Panel
//
// Combines Components, Blocks, and Templates into ONE unified library experience.
// - Full library search ("Search library...")
// - Secondary filters (All, Components, Blocks, Templates)
// - Category selector (Student, Education, Forms, Navigation, Cards, etc.)
// - Live risograph sketch previews with instant canvas click-to-place & drag-to-place
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import {
  searchUnifiedLibrary,
  groupUnifiedDefs,
  type ComponentDef,
  type LibraryFilterType,
} from "@/lib/library/registry"
import { SketchPrims } from "@/components/canvas/sketch"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Panel, PanelFooter } from "@/components/ui/panel"
import { cn } from "@/lib/utils"
import { MagnifyingGlassIcon, X, Sparkle } from "@phosphor-icons/react"

const BOX_W = 124
const BOX_H = 84
const DRAG_THRESHOLD = 4

const CATEGORIES = [
  "All",
  "Student",
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
  const scale = Math.min((BOX_W - 14) / def.size.w, (BOX_H - 14) / def.size.h, 1)
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
        } catch {}
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
      title={def.name}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-xl border border-stone-200/80 dark:border-stone-800 p-2 transition-all outline-none",
        "bg-white/80 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs",
        active && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500"
      )}
    >
      <svg width={BOX_W} height={BOX_H} className="shrink-0 overflow-visible">
        <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
          <SketchPrims prims={prims} seed={13} />
        </g>
      </svg>
      <div className="w-full flex items-center justify-between px-1">
        <span className="truncate text-[11px] font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-950 dark:group-hover:text-white">
          {def.name}
        </span>
        {def.category === "blocks" && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 uppercase font-mono">
            Block
          </span>
        )}
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLibraryOpen) {
      inputRef.current?.focus()
    }
  }, [isLibraryOpen])

  const defs = useMemo(() => {
    return searchUnifiedLibrary(query, activeFilter, selectedCategory)
  }, [query, activeFilter, selectedCategory])

  const sections = useMemo(() => groupUnifiedDefs(defs), [defs])
  const total = defs.length
  const first = defs[0]

  if (!isLibraryOpen) return null

  const handleClose = () => {
    setPanel(null)
  }

  return (
    <div
      role="dialog"
      aria-label="Zenithsui Library"
      className={cn(
        "fixed top-16 left-6 z-40 flex flex-col w-[360px] max-h-[calc(100vh-6rem)]",
        "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
        "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-2xl shadow-stone-900/15 dark:shadow-black/60",
        "overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 ease-out"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/70 dark:border-stone-800/70">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            <Sparkle size={14} weight="bold" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50 leading-tight">
              Library
            </h2>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">
              Reusable components, blocks & academic templates
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/30 space-y-2">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library..."
            className="h-8 pl-9 text-xs rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Escape") handleClose()
              if (e.key === "Enter" && first) setPlacing(first.kind)
            }}
          />
        </div>

        {/* Secondary Filters: All | Components | Blocks | Templates */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-200/60 dark:bg-stone-800/60 text-xs">
          {(["all", "components", "blocks", "templates"] as const).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setActiveFilter(ft)}
              className={cn(
                "flex-1 py-1 text-[11px] font-medium rounded-md capitalize transition-all",
                activeFilter === ft
                  ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              )}
            >
              {ft}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                selectedCategory === cat
                  ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-transparent"
                  : "bg-white dark:bg-stone-800 border-stone-200/80 dark:border-stone-700/80 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of live previews */}
      <ScrollArea className="flex-1 min-h-[240px] max-h-[460px] p-3">
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.group}>
              <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 px-1">
                {section.group}
              </div>
              <div className="grid grid-cols-2 gap-2">
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
            <div className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
              No items matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/30 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
        <span>
          {placingDrag
            ? "Let go where you want it"
            : placing
            ? "Click canvas to place"
            : `${total} items available`}
        </span>
        <span className="font-mono text-[10px] text-stone-400">Esc to close</span>
      </div>
    </div>
  )
}
