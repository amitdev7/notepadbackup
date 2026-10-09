"use client"

import { useMemo } from "react"
import { useSquig } from "@/lib/store"
import { computeCanvasStats } from "@/lib/canvas-core/stats"
import { ChartPieSlice, X, Selection, Shapes, VectorThree } from "@phosphor-icons/react"

export function StatsDialog() {
  const open = useSquig((s) => s.statsOpen)
  const setOpen = useSquig((s) => s.setStatsOpen)
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const selection = useSquig((s) => s.selection)

  const stats = useMemo(() => {
    return computeCanvasStats(nodes, order, selection)
  }, [nodes, order, selection])

  if (!open) return null

  return (
    <div className="fixed top-16 right-4 z-40 w-80 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-xl animate-popover-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60 dark:border-stone-800/60">
        <div className="flex items-center gap-2">
          <ChartPieSlice size={16} weight="bold" className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">Canvas & Element Stats</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 text-xs">
        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-800/50">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Total Elements</span>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">{stats.totalNodes}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-800/50">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Selected</span>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{stats.selectedCount}</div>
          </div>
        </div>

        {/* Selected Geometry */}
        {stats.selectionBounds && (
          <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
              <Selection size={14} />
              <span>Selection Bounds</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] text-stone-600 dark:text-stone-300 font-mono mt-1">
              <div>X: {stats.selectionBounds.x}</div>
              <div>Y: {stats.selectionBounds.y}</div>
              <div>W: {stats.selectionBounds.w}</div>
              <div>H: {stats.selectionBounds.h}</div>
            </div>
          </div>
        )}

        {/* Canvas Extents */}
        {stats.canvasBounds && (
          <div className="space-y-1.5 p-3 rounded-xl bg-stone-50/60 dark:bg-stone-800/30 border border-stone-200/40 dark:border-stone-800/40">
            <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
              <VectorThree size={14} />
              <span>Canvas Total Dimensions</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600 dark:text-stone-400 font-mono mt-1">
              <div>Span: {stats.canvasBounds.w} × {stats.canvasBounds.h} px</div>
              <div>Est. Vertices: ~{stats.totalVertices}</div>
            </div>
          </div>
        )}

        {/* Elements by Type */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
            <Shapes size={14} />
            <span>Element Distribution</span>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {Object.entries(stats.byType).length === 0 ? (
              <div className="text-stone-400 italic">No elements on canvas</div>
            ) : (
              Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1 px-2 rounded-lg bg-stone-100/60 dark:bg-stone-800/40 text-[11px]">
                  <span className="capitalize text-stone-700 dark:text-stone-300">{type}</span>
                  <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
