"use client"

// ---------------------------------------------------------------------------
// Zenithsui Frosted Glass Mini-Map & Radar Navigation Overlay
//
// Features:
// 1. Apple-inspired frosted glass capsule docked at bottom-right.
// 2. Real-time miniature vector rendering of canvas elements.
// 3. Highlighted viewport rectangle reflecting current camera position.
// 4. Interactive click-to-pan and drag-to-navigate with boundary clamping.
// 5. Collapsible toggle with keyboard shortcut (⌘M).
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { audioFx } from "@/lib/canvas/audio-fx"
import { cn } from "@/lib/utils"
import { Compass, CaretDown, CaretUp, CornersOut } from "@phosphor-icons/react"
import { kbd } from "@/lib/shortcuts"

const MAP_WIDTH = 190
const MAP_HEIGHT = 125
const PADDING = 140

export function MiniMapOverlay() {
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const viewport = useSquig((s) => s.viewport)
  const setViewport = useSquig((s) => s.setViewport)
  const resetViewport = useSquig((s) => s.resetViewport)
  const showMiniMap = useShellStore((s) => s.miniMapOpen)
  const toggleMiniMap = useShellStore((s) => s.toggleMiniMap)
  const uiHidden = useSquig((s) => s.uiHidden)

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  // Keyboard shortcut (⌘M) to toggle mini-map
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "m" && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        toggleMiniMap()
        audioFx.playToolSwitch()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleMiniMap])

  if (uiHidden || !showMiniMap) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-20 right-4 z-30 select-none apple-glass-pill rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 transition-all duration-200 overflow-hidden",
        isCollapsed ? "p-1.5" : "p-2.5"
      )}
      style={{
        backdropFilter: "blur(24px) saturate(190%)",
        WebkitBackdropFilter: "blur(24px) saturate(190%)",
      }}
    >
      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-white/10 text-stone-600 dark:text-stone-300 text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <Compass size={13} className="text-blue-500" />
          <span className="text-[11px] font-sans tracking-tight">Mini-Map</span>
        </div>
        <div className="flex items-center gap-1">
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
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(!isCollapsed)
              audioFx.playToolSwitch()
            }}
            title={isCollapsed ? "Expand Mini-Map" : "Collapse Mini-Map"}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </button>
        </div>
      </div>

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
