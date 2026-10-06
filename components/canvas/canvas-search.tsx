"use client"

// ---------------------------------------------------------------------------
// Zenithsui In-Canvas Element Search Modal
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useRef } from "react"
import {
  MagnifyingGlass,
  X,
  TextT,
  File,
  Note,
  SquaresFour,
  ArrowsClockwise,
  Globe,
  Shapes,
} from "@phosphor-icons/react"
import { useSquig } from "@/lib/store"
import type { SquigNode } from "@/lib/types"

interface SearchMatch {
  id: string
  title: string
  subtitle: string
  node: SquigNode
  icon: typeof TextT
}

function getNodeSearchInfo(node: SquigNode): { title: string; subtitle: string; icon: typeof TextT } | null {
  switch (node.type) {
    case "text":
      return {
        title: node.text.trim().split("\n")[0] || "Empty Text",
        subtitle: `Text (${Math.round(node.w)}×${Math.round(node.h)})`,
        icon: TextT,
      }
    case "document":
      return {
        title: node.name,
        subtitle: `Document (${node.extension?.toUpperCase() || "FILE"}${node.pageCount ? ` · ${node.pageCount}p` : ""})`,
        icon: File,
      }
    case "sticky":
      return {
        title: (node as { text?: string }).text?.trim().split("\n")[0] || "Sticky Note",
        subtitle: `Sticky note (${(node as { tone?: string }).tone || "paper"})`,
        icon: Note,
      }
    case "frame":
      return {
        title: (node as { name?: string }).name || "Frame",
        subtitle: `Frame (${Math.round(node.w)}×${Math.round(node.h)})`,
        icon: SquaresFour,
      }
    case "embed":
      return {
        title: (node as { title?: string; url?: string }).title || (node as { url?: string }).url || "Embed",
        subtitle: (node as { url?: string }).url || "Web Embed",
        icon: Globe,
      }
    case "component":
      return {
        title: `${node.kind} component`,
        subtitle: `Library component (${Math.round(node.w)}×${Math.round(node.h)})`,
        icon: SquaresFour,
      }
    case "arrow":
      if ((node as { label?: string }).label) {
        return {
          title: (node as { label?: string }).label || "Arrow",
          subtitle: "Labeled Arrow",
          icon: ArrowsClockwise,
        }
      }
      return null
    case "shape":
      return {
        title: `${node.shape} shape`,
        subtitle: `Shape (${node.fill} fill)`,
        icon: Shapes,
      }
    default:
      return null
  }
}

export function CanvasSearch() {
  const searchOpen = useSquig((s) => s.searchOpen)
  const setSearchOpen = useSquig((s) => s.setSearchOpen)
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const viewport = useSquig((s) => s.viewport)
  const setViewport = useSquig((s) => s.setViewport)
  const setSelection = useSquig((s) => s.setSelection)

  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  const matches = useMemo<SearchMatch[]>(() => {
    if (!nodes || !order) return []
    const q = query.trim().toLowerCase()

    const results: SearchMatch[] = []
    for (const id of order) {
      const node = nodes[id]
      if (!node) continue

      const info = getNodeSearchInfo(node)
      if (!info) continue

      if (!q || info.title.toLowerCase().includes(q) || info.subtitle.toLowerCase().includes(q)) {
        results.push({
          id: node.id,
          title: info.title,
          subtitle: info.subtitle,
          node,
          icon: info.icon,
        })
      }
    }
    return results
  }, [nodes, order, query])

  function jumpToNode(node: SquigNode) {
    const zoom = Math.max(0.7, Math.min(viewport.zoom, 1.5))
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800

    const nodeCenterX = node.x + node.w / 2
    const nodeCenterY = node.y + node.h / 2

    const newX = screenW / 2 - nodeCenterX * zoom
    const newY = screenH / 2 - nodeCenterY * zoom

    setViewport({ x: newX, y: newY, zoom })
    setSelection([node.id])
    setSearchOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault()
      setSearchOpen(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (matches.length > 0 ? (prev + 1) % matches.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0))
    } else if (e.key === "Enter" && matches[activeIndex]) {
      e.preventDefault()
      jumpToNode(matches[activeIndex].node)
    }
  }

  if (!searchOpen) return null

  return (
    <div
      data-zenithsui-chrome
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-foreground/15 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSearchOpen(false)
      }}
    >
      <div
        className="w-full max-w-lg rounded-chrome-lg border border-border/80 bg-background shadow-popup overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
          <MagnifyingGlass className="size-4.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search text, stickies, frames, docs, shapes…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
          <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded border border-border/60">
            Esc
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {query ? `No canvas elements match "${query}"` : "No elements on canvas"}
            </div>
          ) : (
            matches.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === activeIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToNode(item.node)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-chrome-sm text-left transition-colors ${isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                    }`}
                >
                  <div
                    className={`size-7 rounded flex items-center justify-center shrink-0 border ${isSelected
                      ? "border-accent-foreground/20 bg-background/50"
                      : "border-border/60 bg-muted/40"
                      }`}
                  >
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    x:{Math.round(item.node.x)} y:{Math.round(item.node.y)}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
