"use client"

// ---------------------------------------------------------------------------
// Zenithsui Board Statistics HUD
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import {
  ChartBar,
  X,
  Shapes,
  TextT,
  File,
  Note,
  ArrowsClockwise,
  SquaresFour,
  Image as ImageIcon,
  ClockCounterClockwise,
} from "@phosphor-icons/react"
import { useSquig } from "@/lib/store"
import { unionBox, type SquigNode } from "@/lib/types"

export function CanvasStats() {
  const statsOpen = useSquig((s) => s.statsOpen)
  const setStatsOpen = useSquig((s) => s.setStatsOpen)
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const selection = useSquig((s) => s.selection)
  const viewport = useSquig((s) => s.viewport)
  const past = useSquig((s) => s.past)
  const future = useSquig((s) => s.future)

  const stats = useMemo(() => {
    if (!nodes) {
      return {
        total: 0,
        shapes: 0,
        texts: 0,
        arrows: 0,
        images: 0,
        docs: 0,
        stickies: 0,
        frames: 0,
        components: 0,
        bounds: null,
        jsonKb: "0",
      }
    }

    const all: SquigNode[] = Object.values(nodes)
    let shapes = 0
    let texts = 0
    let arrows = 0
    let images = 0
    let docs = 0
    let stickies = 0
    let frames = 0
    let components = 0

    for (const n of all) {
      switch (n.type) {
        case "shape":
          shapes++
          break
        case "text":
          texts++
          break
        case "arrow":
          arrows++
          break
        case "image":
          images++
          break
        case "document":
          docs++
          break
        case "sticky":
          stickies++
          break
        case "frame":
          frames++
          break
        case "component":
          components++
          break
      }
    }

    const bounds = unionBox(all)
    let jsonKb = "0"
    try {
      jsonKb = (new Blob([JSON.stringify({ nodes, order })]).size / 1024).toFixed(1)
    } catch { }

    return {
      total: all.length,
      shapes,
      texts,
      arrows,
      images,
      docs,
      stickies,
      frames,
      components,
      bounds,
      jsonKb,
    }
  }, [nodes, order])

  if (!statsOpen) return null

  return (
    <div
      data-zenithsui-chrome
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/10 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setStatsOpen(false)
      }}
    >
      <div className="w-full max-w-sm rounded-chrome-lg border border-border/80 bg-background shadow-popup p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <ChartBar className="size-4.5 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Canvas Statistics</h2>
          </div>
          <button
            type="button"
            onClick={() => setStatsOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-chrome-sm"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Overview Numbers */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-chrome-sm border border-border/60 bg-muted/30">
            <div className="text-[11px] text-muted-foreground">Total Elements</div>
            <div className="text-base font-bold text-foreground mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-chrome-sm border border-border/60 bg-muted/30">
            <div className="text-[11px] text-muted-foreground">Selected</div>
            <div className="text-base font-bold text-foreground mt-0.5">{selection.length}</div>
          </div>
        </div>

        {/* Element Kind Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Breakdown
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shapes className="size-3.5" /> Shapes
              </span>
              <span className="font-mono text-foreground">{stats.shapes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TextT className="size-3.5" /> Text
              </span>
              <span className="font-mono text-foreground">{stats.texts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowsClockwise className="size-3.5" /> Arrows
              </span>
              <span className="font-mono text-foreground">{stats.arrows}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> Images
              </span>
              <span className="font-mono text-foreground">{stats.images}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <File className="size-3.5" /> Documents
              </span>
              <span className="font-mono text-foreground">{stats.docs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Note className="size-3.5" /> Stickies
              </span>
              <span className="font-mono text-foreground">{stats.stickies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <SquaresFour className="size-3.5" /> Frames / Lib
              </span>
              <span className="font-mono text-foreground">{stats.frames + stats.components}</span>
            </div>
          </div>
        </div>

        {/* Viewport & Board Dimensions */}
        <div className="space-y-1.5 text-xs pt-1 border-t border-border/60">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Canvas Geometry
          </div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Zoom Level</span>
              <span className="font-mono text-foreground">{Math.round(viewport.zoom * 100)}%</span>
            </div>
            {stats.bounds && (
              <div className="flex items-center justify-between">
                <span>Bounding Box</span>
                <span className="font-mono text-foreground">
                  {Math.round(stats.bounds.maxX - stats.bounds.minX)} ×{" "}
                  {Math.round(stats.bounds.maxY - stats.bounds.minY)} px
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ClockCounterClockwise className="size-3.5" /> History Depth
              </span>
              <span className="font-mono text-foreground">
                {past.length} undo · {future.length} redo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Document Payload</span>
              <span className="font-mono text-foreground">{stats.jsonKb} KB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
