"use client"

import React, { useEffect, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { NodeSketch } from "./sketch"
import { pickAt, pickInRect, pickSoftAt } from "@/lib/canvas/hit-test"
import { getDef } from "@/lib/library/registry"
import { useSpacebarPan } from "@/lib/canvas/use-spacebar-pan"

interface Marquee {
  x: number
  y: number
  w: number
  h: number
}

export function Canvas() {
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const selectedIds = useSquig((s) => s.selectedIds)
  const pan = useSquig((s) => s.pan)
  const zoom = useSquig((s) => s.zoom)
  const { isSpacebarHeld } = useSpacebarPan()

  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const [panning, setPanning] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const spaceRef = useRef(false)
  spaceRef.current = isSpacebarHeld

  // Gesture state lives in refs — pointer moves shouldn't re-render.
  const gesture = useRef<
    | { mode: "idle" }
    | { mode: "pan"; startSX: number; startSY: number; origX: number; origY: number }
    | {
        mode: "maybe-drag"
        id: string
        startSX: number
        startSY: number
        shift: boolean
        pendingToggleOff: boolean
        snapshot: Map<string, { x: number; y: number }>
        pushedHistory: boolean
      }
    | { mode: "marquee"; startWX: number; startWY: number; shift: boolean; active: boolean }
  >({ mode: "idle" })

  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { sx: 0, sy: 0, wx: 0, wy: 0 }
    const st = useSquig.getState()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const z = st.zoom || 1
    return { sx, sy, wx: (sx - st.pan.x) / z, wy: (sy - st.pan.y) / z }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const st = useSquig.getState()
    if (e.button === 1) e.preventDefault()
    if (st.tool === "hand" || e.button === 1 || spaceRef.current) {
      if (e.button !== 0 && e.button !== 1) return
      gesture.current = {
        mode: "pan",
        startSX: e.clientX,
        startSY: e.clientY,
        origX: st.pan.x,
        origY: st.pan.y,
      }
      setPanning(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
      return
    }
    if (e.button !== 0) return
    const { sx, sy, wx, wy } = toLocal(e.clientX, e.clientY)
    const hit = pickAt(st.nodes, st.order, wx, wy, st.zoom)
    if (hit) {
      const sel = st.selection
      if (e.shiftKey) {
        if (sel.includes(hit)) {
          // Defer removal until pointer-up so shift-drag still moves the group.
          gesture.current = {
            mode: "maybe-drag",
            id: hit,
            startSX: sx,
            startSY: sy,
            shift: true,
            pendingToggleOff: true,
            snapshot: new Map(sel.map((id) => [id, { x: st.nodes[id]?.x ?? 0, y: st.nodes[id]?.y ?? 0 }])),
            pushedHistory: false,
          }
        } else {
          st.select([...sel, hit])
          gesture.current = {
            mode: "maybe-drag",
            id: hit,
            startSX: sx,
            startSY: sy,
            shift: true,
            pendingToggleOff: false,
            snapshot: new Map([...sel, hit].map((id) => [id, { x: st.nodes[id]?.x ?? 0, y: st.nodes[id]?.y ?? 0 }])),
            pushedHistory: false,
          }
        }
      } else {
        if (!sel.includes(hit)) st.select([hit])
        const ids = sel.includes(hit) ? sel : [hit]
        gesture.current = {
          mode: "maybe-drag",
          id: hit,
          startSX: sx,
          startSY: sy,
          shift: false,
          pendingToggleOff: false,
          snapshot: new Map(ids.map((id) => [id, { x: st.nodes[id]?.x ?? 0, y: st.nodes[id]?.y ?? 0 }])),
          pushedHistory: false,
        }
      }
    } else {
      gesture.current = { mode: "marquee", startWX: wx, startWY: wy, shift: e.shiftKey, active: false }
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (g.mode === "idle") return
    const st = useSquig.getState()
    if (g.mode === "pan") {
      st.setPan({ x: g.origX + (e.clientX - g.startSX), y: g.origY + (e.clientY - g.startSY) })
      return
    }
    const { sx, sy, wx, wy } = toLocal(e.clientX, e.clientY)
    if (g.mode === "maybe-drag") {
      const dxPx = sx - g.startSX
      const dyPx = sy - g.startSY
      if (Math.hypot(dxPx, dyPx) < 3) return
      const z = st.zoom || 1
      const dx = dxPx / z
      const dy = dyPx / z
      const checkpoint = !g.pushedHistory
      g.pushedHistory = true
      for (const [id, orig] of g.snapshot) {
        if (!st.nodes[id]) continue
        st.updateNode(
          id,
          { x: Math.round(orig.x + dx), y: Math.round(orig.y + dy) },
          { checkpoint: checkpoint ? undefined : false }
        )
      }
      return
    }
    if (g.mode === "marquee") {
      const dx = wx - g.startWX
      const dy = wy - g.startWY
      if (!g.active && Math.hypot(dx, dy) * (st.zoom || 1) < 4) return
      g.active = true
      setMarquee({
        x: Math.min(g.startWX, wx),
        y: Math.min(g.startWY, wy),
        w: Math.abs(dx),
        h: Math.abs(dy),
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = { mode: "idle" }
    setPanning(false)
    if (g.mode === "idle" || g.mode === "pan") return
    const st = useSquig.getState()
    if (g.mode === "maybe-drag") {
      if (!g.pushedHistory) {
        // It was a click, not a drag.
        if (g.shift && g.pendingToggleOff) {
          st.select(st.selection.filter((id) => id !== g.id))
        } else if (!g.shift) {
          st.select([g.id])
        }
      }
      return
    }
    if (g.mode === "marquee") {
      if (!g.active) {
        // Plain click on empty space — the hollow-interior fallback gets its
        // say before we clear the selection (see hit-test pickSoftAt).
        const { wx, wy } = toLocal(e.clientX, e.clientY)
        const soft = pickSoftAt(st.nodes, st.order, wx, wy)
        st.select(soft ? [soft] : [])
      } else {
        setMarquee(null)
        const rect = marqueeRef.current
        if (rect) {
          const ids = pickInRect(st.nodes, st.order, rect, st.zoom)
          st.select(g.shift ? Array.from(new Set([...st.selection, ...ids])) : ids)
        }
      }
    }
  }

  const marqueeRef = useRef<Marquee | null>(null)
  marqueeRef.current = marquee

  // Wheel zoom at the cursor — native listener so we can preventDefault.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const st = useSquig.getState()
      if (st.tool !== "select" && st.tool !== "hand") return
      const factor = Math.exp(-e.deltaY * 0.0015)
      st.zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData("application/zenithsui-component")
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const kind = data?.kind
      if (!kind || typeof kind !== "string") return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const st = useSquig.getState()
      const z = st.zoom || 1
      const wx = (e.clientX - rect.left - st.pan.x) / z
      const wy = (e.clientY - rect.top - st.pan.y) / z
      // Centre the new node on the cursor from the def's own size.
      const def = getDef(kind)
      const w = def?.size?.w ?? data?.defaultWidth ?? 200
      const h = def?.size?.h ?? data?.defaultHeight ?? 120
      st.insertComponent(kind, Math.round(wx - w / 2), Math.round(wy - h / 2))
    } catch (err) {
      console.error("Drop error:", err)
    }
  }

  return (
    <div
      ref={containerRef}
      id="canvas-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative w-full h-full overflow-hidden bg-[var(--sq-bg)] select-none touch-none"
      style={{ cursor: panning || isSpacebarHeld ? "grab" : "crosshair" }}
    >
      {/* Subtle Dot Grid */}
      <div
        id="canvas-plane"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(var(--sq-dot, rgba(0,0,0,0.12)) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />
      <svg ref={svgRef} className="absolute inset-0 w-full h-full overflow-visible">
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {order.map((id) => {
            const node = nodes[id]
            if (!node) return null
            const isSelected = selectedIds.includes(id)
            return (
              <g key={id} id={`node-${id}`} transform={`translate(${node.x} ${node.y})`}>
                <NodeSketch node={node} />
                {isSelected && (
                  <rect
                    x={-6}
                    y={-6}
                    width={node.w + 12}
                    height={node.h + 12}
                    fill="none"
                    stroke="var(--sq-accent)"
                    strokeWidth={1.5 / (zoom || 1)}
                    strokeDasharray="6 4"
                    rx={8}
                    pointerEvents="none"
                  />
                )}
              </g>
            )
          })}
          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="var(--sq-accent)"
              fillOpacity={0.08}
              stroke="var(--sq-accent)"
              strokeWidth={1 / (zoom || 1)}
              strokeDasharray={`${4 / (zoom || 1)} ${4 / (zoom || 1)}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
    </div>
  )
}
