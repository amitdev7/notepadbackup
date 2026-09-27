"use client"

import React from "react"
import { useSquig } from "@/lib/store"
import { Sparkle, Plus, Minus, ArrowsClockwise, GraduationCap } from "@phosphor-icons/react"

export function TopBar() {
  const { zoom, setZoom, setPan, nodes } = useSquig()

  const handleZoomIn = () => setZoom(Math.min(2, Math.round((zoom + 0.1) * 10) / 10))
  const handleZoomOut = () => setZoom(Math.max(0.3, Math.round((zoom - 0.1) * 10) / 10))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <header
      id="zenithsui-topbar"
      className="h-12 w-full flex items-center justify-between px-4 bg-[var(--sq-surface)] border-b border-[var(--sq-border)] select-none z-20"
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border-2 border-[var(--sq-ink)] flex items-center justify-center font-bold text-xs">
            Z
          </div>
          <h1 className="text-sm font-bold tracking-tight text-[var(--sq-ink)]">
            Zenithsui
          </h1>
        </div>
        <div className="h-4 w-px bg-[var(--sq-border)]" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--sq-shade)] text-[11px] font-medium text-[var(--sq-ink)]">
          <GraduationCap size={13} />
          Student Components
        </div>
      </div>

      {/* Center status */}
      <div className="text-xs text-[var(--sq-ink-subtle)] font-mono">
        {nodes.length} items on canvas
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-[var(--sq-border)] rounded-md overflow-hidden bg-[var(--sq-bg)]">
          <button
            id="btn-zoom-out"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
            title="Zoom Out"
          >
            <Minus size={13} />
          </button>
          <button
            id="btn-zoom-reset"
            onClick={handleResetView}
            className="px-2 text-xs font-mono text-[var(--sq-ink)] hover:bg-[var(--sq-shade)] py-1 transition-colors"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
            title="Zoom In"
          >
            <Plus size={13} />
          </button>
        </div>

        <button
          id="btn-reset-canvas"
          onClick={handleResetView}
          className="p-1.5 border border-[var(--sq-border)] rounded-md hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
          title="Reset View Position"
        >
          <ArrowsClockwise size={14} />
        </button>
      </div>
    </header>
  )
}
