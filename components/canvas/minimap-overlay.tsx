"use client"

// ---------------------------------------------------------------------------
// Zenithsui Frosted Glass Mini-Map & Radar Navigation Overlay
//
// Features:
// 1. Apple-inspired frosted glass capsule with 4-corner dockable positioning
//    (Bottom-Right, Bottom-Left, Top-Right, Top-Left).
// 2. Real-time miniature vector rendering of canvas elements.
// 3. Highlighted viewport rectangle reflecting current camera position.
// 4. Interactive click-to-pan and drag-to-navigate with boundary clamping.
// 5. Collapsible toggle with keyboard shortcut (⌘M).
// 6. Header drag-to-snap to nearest corner and quick corner quadrant picker (⇧⌘M).
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore, type MiniMapPosition } from "@/lib/shell-store"
import { audioFx } from "@/lib/canvas/audio-fx"
import { cn } from "@/lib/utils"
import { Compass, CaretDown, CaretUp, CornersOut, SquaresFour, Check, X } from "@phosphor-icons/react"
import { kbd } from "@/lib/shortcuts"

const MAP_WIDTH = 190
const MAP_HEIGHT = 125
const PADDING = 140

const POSITION_CLASSES: Record<MiniMapPosition, string> = {
  "bottom-right": "bottom-20 right-4",
  "bottom-left": "bottom-20 left-4",
  "top-right": "top-16 right-4",
  "top-left": "top-16 left-4",
}

const CORNER_OPTIONS: Array<{
  id: MiniMapPosition
  label: string
  shortLabel: string
  arrow: string
}> = [
  { id: "top-left", label: "Top-Left", shortLabel: "TL", arrow: "↖" },
  { id: "top-right", label: "Top-Right", shortLabel: "TR", arrow: "↗" },
  { id: "bottom-left", label: "Bottom-Left", shortLabel: "BL", arrow: "↙" },
  { id: "bottom-right", label: "Bottom-Right", shortLabel: "BR", arrow: "↘" },
]

export function MiniMapOverlay() {
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const viewport = useSquig((s) => s.viewport)
  const setViewport = useSquig((s) => s.setViewport)
  const resetViewport = useSquig((s) => s.resetViewport)
  const showMiniMap = useShellStore((s) => s.miniMapOpen && s.preferences.showMiniMap !== false)
  const toggleMiniMap = useShellStore((s) => s.toggleMiniMap)
  const miniMapPosition = useShellStore((s) => s.preferences.miniMapPosition || "bottom-right")
  const setMiniMapPosition = useShellStore((s) => s.setMiniMapPosition)
  const cycleMiniMapPosition = useShellStore((s) => s.cycleMiniMapPosition)
  const isCollapsed = useShellStore((s) => s.preferences.miniMapCollapsed ?? false)
  const setMiniMapCollapsed = useShellStore((s) => s.setMiniMapCollapsed)
  const uiHidden = useSquig((s) => s.uiHidden)

  const [isDragging, setIsDragging] = useState(false)
  const [showPositionPicker, setShowPositionPicker] = useState(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ startX: number; startY: number } | null>(null)

  // Calculate world bounding box covering all nodes
  const worldBounds = useMemo(() => {
    if (order.length === 0) {
      return { minX: -800, minY: -500, maxX: 800, maxY: 500, w: 1600, h: 1000 }
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (let i = 0; i < order.length; i++) {
      const n = nodes[order[i]]
      if (!n) continue
      if (n.x < minX) minX = n.x
      if (n.y < minY) minY = n.y
      if (n.x + n.w > maxX) maxX = n.x + n.w
      if (n.y + n.h > maxY) maxY = n.y + n.h
    }

    // Expand with viewport coverage
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1280
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800
    const vpMinX = -viewport.x / viewport.zoom
    const vpMinY = -viewport.y / viewport.zoom
    const vpMaxX = vpMinX + screenW / viewport.zoom
    const vpMaxY = vpMinY + screenH / viewport.zoom

    minX = Math.min(minX - PADDING, vpMinX - PADDING)
    minY = Math.min(minY - PADDING, vpMinY - PADDING)
    maxX = Math.max(maxX + PADDING, vpMaxX + PADDING)
    maxY = Math.max(maxY + PADDING, vpMaxY + PADDING)

    return {
      minX,
      minY,
      maxX,
      maxY,
      w: Math.max(maxX - minX, 400),
      h: Math.max(maxY - minY, 300),
    }
  }, [nodes, order, viewport])

  // Coordinate transforms
  const scale = Math.min(MAP_WIDTH / worldBounds.w, MAP_HEIGHT / worldBounds.h)
  const offsetX = (MAP_WIDTH - worldBounds.w * scale) / 2
  const offsetY = (MAP_HEIGHT - worldBounds.h * scale) / 2

  const worldToMap = useCallback(
    (wx: number, wy: number): [number, number] => {
      const mx = (wx - worldBounds.minX) * scale + offsetX
      const my = (wy - worldBounds.minY) * scale + offsetY
      return [mx, my]
    },
    [worldBounds, scale, offsetX, offsetY]
  )

  const mapToWorld = useCallback(
    (mx: number, my: number): [number, number] => {
      const wx = (mx - offsetX) / scale + worldBounds.minX
      const wy = (my - offsetY) / scale + worldBounds.minY
      return [wx, wy]
    },
    [worldBounds, scale, offsetX, offsetY]
  )

  // Render miniature nodes onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isCollapsed || !showMiniMap) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    // Background grid tint
    ctx.fillStyle = "rgba(0, 0, 0, 0.03)"
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    // Draw miniature nodes
    for (let i = 0; i < order.length; i++) {
      const n = nodes[order[i]]
      if (!n) continue
      const [nx, ny] = worldToMap(n.x, n.y)
      const nw = Math.max(n.w * scale, 2)
      const nh = Math.max(n.h * scale, 2)

      if (n.type === "frame") {
        ctx.strokeStyle = "rgba(0, 122, 255, 0.5)"
        ctx.lineWidth = 1
        ctx.strokeRect(nx, ny, nw, nh)
      } else if (n.type === "sticky") {
        ctx.fillStyle = n.tone === "yellow" ? "#fef08a" : n.tone === "blue" ? "#bae6fd" : "#fed7aa"
        ctx.fillRect(nx, ny, nw, nh)
      } else if (n.type === "draw" && n.highlighter) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.45)"
        ctx.fillRect(nx, ny, nw, nh)
      } else if (n.type === "image" || n.type === "document") {
        ctx.fillStyle = "rgba(100, 116, 139, 0.4)"
        ctx.fillRect(nx, ny, nw, nh)
      } else {
        ctx.fillStyle = "rgba(71, 85, 105, 0.35)"
        ctx.fillRect(nx, ny, nw, nh)
      }
    }

    // Draw active viewport rectangle
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1280
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800
    const vpMinX = -viewport.x / viewport.zoom
    const vpMinY = -viewport.y / viewport.zoom
    const vpW = screenW / viewport.zoom
    const vpH = screenH / viewport.zoom

    const [vx, vy] = worldToMap(vpMinX, vpMinY)
    const vw = Math.max(vpW * scale, 12)
    const vh = Math.max(vpH * scale, 8)

    // Outer glow for camera rect
    ctx.fillStyle = "rgba(0, 122, 255, 0.12)"
    ctx.strokeStyle = "rgba(0, 122, 255, 0.85)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(vx, vy, vw, vh, 4)
    ctx.fill()
    ctx.stroke()
  }, [order, nodes, viewport, worldToMap, scale, isCollapsed, showMiniMap])

  // Handle click / drag to pan
  const handleMapPointer = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const [wx, wy] = mapToWorld(mx, my)
      const screenW = window.innerWidth
      const screenH = window.innerHeight

      // Center viewport on clicked point
      setViewport({
        x: -(wx * viewport.zoom) + screenW / 2,
        y: -(wy * viewport.zoom) + screenH / 2,
        zoom: viewport.zoom,
      })
    },
    [mapToWorld, setViewport, viewport.zoom]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    handleMapPointer(e)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    handleMapPointer(e)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  // Header dragging to dynamically reposition & snap to nearest corner
  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return
    dragStartRef.current = { startX: e.clientX, startY: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY
    setDragOffset({ x: dx, y: dy })
  }

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    const el = containerRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const isLeft = cx < window.innerWidth / 2
      const isTop = cy < window.innerHeight / 2
      const targetPos: MiniMapPosition = isTop
        ? isLeft
          ? "top-left"
          : "top-right"
        : isLeft
        ? "bottom-left"
        : "bottom-right"

      if (targetPos !== miniMapPosition) {
        setMiniMapPosition(targetPos)
        audioFx.playToolSwitch()
      }
    }

    dragStartRef.current = null
    setDragOffset(null)
  }

  // Close picker on outside click
  useEffect(() => {
    if (!showPositionPicker) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPositionPicker(false)
      }
    }
    window.addEventListener("mousedown", onDocClick)
    return () => window.removeEventListener("mousedown", onDocClick)
  }, [showPositionPicker])

  // Keyboard shortcut (⌘M toggle, ⇧⌘M cycle position)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "m" && !e.altKey) {
        e.preventDefault()
        if (e.shiftKey) {
          cycleMiniMapPosition()
        } else {
          toggleMiniMap()
        }
        audioFx.playToolSwitch()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleMiniMap, cycleMiniMapPosition])

  if (uiHidden || !showMiniMap) return null

  const posClass = POSITION_CLASSES[miniMapPosition] || POSITION_CLASSES["bottom-right"]
  const isTop = miniMapPosition.startsWith("top")
  const isRight = miniMapPosition.endsWith("right")

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-30 select-none apple-glass-pill rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 transition-all duration-200 overflow-visible",
        posClass,
        dragOffset ? "transition-none shadow-3xl ring-2 ring-blue-500/40" : "",
        isCollapsed ? "p-1.5" : "p-2.5"
      )}
      style={{
        backdropFilter: "blur(24px) saturate(190%)",
        WebkitBackdropFilter: "blur(24px) saturate(190%)",
        transform: dragOffset ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` : undefined,
      }}
    >
      {/* Mini-Map Header Bar (Draggable to move between corners) */}
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        className="flex items-center justify-between pb-1.5 px-1 border-b border-white/10 text-stone-600 dark:text-stone-300 text-xs font-semibold cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <Compass size={13} className="text-blue-500 shrink-0" />
          <span className="text-[11px] font-sans tracking-tight">Mini-Map</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Change Position Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowPositionPicker(!showPositionPicker)
              audioFx.playToolSwitch()
            }}
            title={`Dock position: ${miniMapPosition.replace("-", " ")} (Click to change, ${kbd("mod+shift+m")} to cycle)`}
            className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-0.5",
              showPositionPicker
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-600 dark:text-stone-300"
            )}
          >
            <SquaresFour size={11} weight="bold" />
            <span>
              {miniMapPosition === "bottom-right"
                ? "BR"
                : miniMapPosition === "bottom-left"
                ? "BL"
                : miniMapPosition === "top-right"
                ? "TR"
                : "TL"}
            </span>
          </button>

          {/* Reset Zoom & Fit Content */}
          <button
            type="button"
            onClick={() => {
              resetViewport()
              audioFx.playToolSwitch()
            }}
            title="Fit content"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <CornersOut size={12} />
          </button>

          {/* Collapse / Expand */}
          <button
            type="button"
            onClick={() => {
              setMiniMapCollapsed(!isCollapsed)
              audioFx.playToolSwitch()
            }}
            title={isCollapsed ? "Expand Mini-Map" : "Collapse Mini-Map"}
            aria-label={isCollapsed ? "Expand Mini-Map" : "Collapse Mini-Map"}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </button>

          {/* Close Mini-Map */}
          <button
            type="button"
            onClick={() => {
              toggleMiniMap()
              audioFx.playToolSwitch()
            }}
            title="Close Mini-Map"
            aria-label="Close Mini-Map"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      </div>

      {/* Position Selection Popover */}
      {showPositionPicker && (
        <div
          className={cn(
            "absolute z-40 p-2.5 apple-glass-panel rounded-2xl shadow-2xl border border-white/20 dark:border-white/15 bg-background/95 backdrop-blur-2xl animate-popover-enter select-none",
            isTop ? "top-full mt-2" : "bottom-full mb-2",
            isRight ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-[11px] font-semibold text-foreground px-0.5">
            <span>Mini-Map Position</span>
            <button
              type="button"
              onClick={() => {
                cycleMiniMapPosition()
                audioFx.playToolSwitch()
              }}
              className="text-[10px] text-blue-500 hover:underline cursor-pointer font-normal flex items-center gap-1"
            >
              Cycle ({kbd("mod+shift+m")})
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-48">
            {CORNER_OPTIONS.map((c) => {
              const isCurrent = miniMapPosition === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setMiniMapPosition(c.id)
                    setShowPositionPicker(false)
                    audioFx.playToolSwitch()
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border",
                    isCurrent
                      ? "bg-blue-600 text-white font-semibold border-blue-600 shadow-sm"
                      : "bg-muted/60 hover:bg-muted border-border/60 text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold opacity-80">{c.arrow}</span>
                    <span>{c.label}</span>
                  </span>
                  {isCurrent && <Check size={13} weight="bold" />}
                </button>
              )
            })}
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground leading-tight px-0.5 text-center">
            💡 Tip: You can also drag the header to drop it in any corner!
          </p>
        </div>
      )}

      {/* Mini-Map Canvas Body */}
      {!isCollapsed && (
        <div className="pt-2 relative">
          <canvas
            ref={canvasRef}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="rounded-xl border border-black/5 dark:border-white/10 cursor-crosshair block bg-stone-100/50 dark:bg-stone-900/50 shadow-inner"
          />
          <div className="mt-1 flex items-center justify-between px-1 text-[9px] text-stone-400 font-mono">
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <span>{kbd("mod+m")}</span>
          </div>
        </div>
      )}
    </div>
  )
}
