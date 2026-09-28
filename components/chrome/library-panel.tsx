"use client"

import React, { useState } from "react"
import { ALL_DEFS, renderComponent, type ComponentDef } from "@/lib/library/registry"
import { useSquig } from "@/lib/store"
import { RoughRenderer } from "@/components/canvas/rough-renderer"
import { MagnifyingGlass, GraduationCap } from "@phosphor-icons/react"

export function LibraryPanel() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("student")
  const { addNode, pan, zoom } = useSquig()

  const filteredDefs = ALL_DEFS.filter((d) => {
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.kind.toLowerCase().includes(search.toLowerCase()) ||
      d.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()))
    const matchesTab = activeTab === "all" || d.category === activeTab
    return matchesSearch && matchesTab
  })

  const handleAdd = (def: ComponentDef) => {
    // Insert into center of viewport
    const cx = -pan.x / zoom + 300
    const cy = -pan.y / zoom + 200
    addNode({
      id: `node-${Date.now()}`,
      type: "component",
      kind: def.kind,
      x: Math.round(cx),
      y: Math.round(cy),
      w: def.defaultWidth,
      h: def.defaultHeight,
      props: Object.fromEntries(
        Object.entries(def.props || {}).map(([k, v]) => [k, v.default])
      ),
    })
  }

  return (
    <div
      id="library-panel"
      className="w-80 h-full flex flex-col bg-[var(--sq-surface)] border-r border-[var(--sq-border)] select-none z-10"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--sq-border)] flex flex-col gap-2">
        <div className="relative flex items-center">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 text-[var(--sq-ink-subtle)] pointer-events-none"
          />
          <input
            id="library-search-input"
            type="text"
            placeholder="Search student components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--sq-bg)] border border-[var(--sq-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sq-accent)] text-[var(--sq-ink)] placeholder:text-[var(--sq-ink-subtle)]"
          />
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            id="tab-student"
            onClick={() => setActiveTab("student")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "student"
                ? "bg-[var(--sq-ink)] text-[var(--sq-bg)] font-medium"
                : "bg-[var(--sq-bg)] text-[var(--sq-ink)] hover:bg-[var(--sq-shade)]"
            }`}
          >
            <GraduationCap size={14} />
            Student Kit (20)
          </button>
        </div>
      </div>

      {/* Component Grid */}
      <div
        id="library-items-list"
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
      >
        <div className="text-[11px] font-semibold tracking-wider text-[var(--sq-ink-subtle)] uppercase">
          {filteredDefs.length} Components Available
        </div>

        {filteredDefs.map((def) => {
          const defaultProps = Object.fromEntries(
            Object.entries(def.props || {}).map(([k, v]) => [k, v.default])
          )
          const prims = renderComponent(def.kind, def.defaultWidth, def.defaultHeight, defaultProps)
          const scale = Math.min(260 / def.defaultWidth, 120 / def.defaultHeight, 0.9)

          return (
            <div
              key={def.kind}
              id={`lib-item-${def.kind.replace(/\./g, "-")}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/zenithsui-component",
                  JSON.stringify(def)
                )
              }}
              onClick={() => handleAdd(def)}
              className="group relative flex flex-col p-2.5 bg-[var(--sq-bg)] border border-[var(--sq-border)] hover:border-[var(--sq-accent)] rounded-lg cursor-pointer transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[var(--sq-ink)]">
                  {def.name}
                </span>
                <span className="text-[10px] text-[var(--sq-ink-subtle)] font-mono">
                  {def.kind}
                </span>
              </div>

              {/* Preview Thumbnail */}
              <div className="w-full h-28 bg-[var(--sq-surface)] border border-dashed border-[var(--sq-border)] rounded flex items-center justify-center overflow-hidden pointer-events-none">
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    width: def.defaultWidth,
                    height: def.defaultHeight,
                  }}
                  className="flex items-center justify-center shrink-0"
                >
                  <RoughRenderer prims={prims} width={def.defaultWidth} height={def.defaultHeight} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
