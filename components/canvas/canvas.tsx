"use client"

import React, { useEffect, useRef, useState } from "react"
import { nanoid } from "nanoid"
import { useSquig } from "@/lib/store"
import { NodeSketch } from "./sketch"
import { TextEditOverlay } from "./text-edit-overlay"
import { pickAt, pickInRect, pickSoftAt } from "@/lib/canvas/hit-test"
import { editTarget, hasEditableText } from "@/lib/canvas/edit-target"
import { getDef } from "@/lib/library/registry"
import { useSpacebarPan } from "@/lib/canvas/use-spacebar-pan"
import { useClipboard } from "@/lib/canvas/use-clipboard"
import { DEFAULT_ELEMENT_DEFAULTS } from "@/lib/element-defaults"
import type { SquigNode } from "@/lib/types"

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
  // In-progress creation preview — dashed, accent-coloured, never saved.
  const [preview, setPreview] = useState<
    | null
    | { kind: "shape"; shape: "rect" | "ellipse"; x: number; y: number; w: number; h: number }
    | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number }
    | { kind: "draw"; points: [number, number][] }
  >(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const spaceRef = useRef(false)
  spaceRef.current = isSpacebarHeld

  // ⌘V lands where the pointer last was.
  const pointerWorld = useRef<[number, number] | null>(null)
  useClipboard(pointerWorld)

  const editingId = useSquig((s) => s.editingId)
  const tool = useSquig((s) => s.tool)

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
        alt: boolean
        pendingToggleOff: boolean
        snapshot: Map<string, { x: number; y: number }>
        pushedHistory: boolean
      }
    | { mode: "marquee"; startWX: number; startWY: number; shift: boolean; active: boolean }
    | { mode: "create-shape"; startWX: number; startWY: number }
    | { mode: "create-draw"; points: [number, number][] }
  >({ mode: "idle" })

  const resetGesture = () => {
    gesture.current = { mode: "idle" }
    setPanning(false)
    setPreview(null)
    try { useSquig.getState().setTransforming(false) } catch { /* noop */ }
  }

  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { sx: 0, sy: 0, wx: 0, wy: 0 }
    const st = useSquig.getState()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const z = st.zoom || 1
    return { sx, sy, wx: (sx - st.pan.x) / z, wy: (sy - st.pan.y) / z }
  }

  /** Element-studio defaults for one tool family, with the built-ins as floor. */
  const styleFor = (family: "rectangle" | "ellipse" | "line" | "arrow" | "draw" | "text") => {
    const s = useSquig.getState()
    const ed = (s.elementDefaults as any)?.[family] ?? {}
    const fb = (DEFAULT_ELEMENT_DEFAULTS as any)[family] ?? {}
    return { ...fb, ...ed }
  }

  const commitDraw = (points: [number, number][]) => {
    const st = useSquig.getState()
    if (points.length < 2) return
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(1, Math.max(...xs) - minX)
    const h = Math.max(1, Math.max(...ys) - minY)
    // A tap, not a stroke — an invisible node can never be clicked again.
    if (w < 2 && h < 2) return
    const d = styleFor("draw")
    const node = {
      id: nanoid(),
      seed: Math.random(),
      type: "draw",
      x: Math.round(minX * 10) / 10,
      y: Math.round(minY * 10) / 10,
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
      points: points.map(([x, y]) => [Math.round((x - minX) * 10) / 10, Math.round((y - minY) * 10) / 10]),
      drawMode: d.mode ?? "pen",
      color: d.color || st.drawColor || "",
      strokeWidth: d.strokeWidth,
      opacity: d.opacity,
      stroke: d.stroke,
      dashed: d.dashed || undefined,
    } as unknown as SquigNode
    st.addNode(node, { select: true })
    // Smart Sketch: offer to convert recognised shapes, locally and silently
    // when the ink is just ink. The recognizer loads lazily — the main bundle
    // never pays for it until a stroke actually lands.
    if (st.smartSketch) {
      const bounds = { x: node.x, y: node.y, w: node.w, h: node.h }
      const inkId = node.id
      // Absolute world points: the recognizer derives its bounds from the
      // same frame, so a suggestion lands where the ink is.
      const absolute: [number, number][] = points.map(([x, y]) => [x, y])
      void (async () => {
        try {
          const { recognizeSketch } = await import("@/lib/sketch-recognition/orchestrator")
          const res = await recognizeSketch([absolute], bounds)
          if (!res.recognized || !res.kind) return
          const cur = useSquig.getState()
          if (!cur.nodes[inkId]) return
          const kind = res.kind === "circle" ? "ellipse" : res.kind
          let suggestion: SquigNode | null = null
          let label = ""
          if (kind === "rectangle" || kind === "ellipse") {
            const b = res.bounds ?? bounds
            suggestion = commitShape(b.x, b.y, b.x + b.w, b.y + b.h, kind === "ellipse" ? "ellipse" : "rect")
            label = kind === "rectangle" ? "Rectangle" : "Ellipse"
          } else if (kind === "line" || kind === "arrow") {
            // The gestural axis runs from where the stroke started to where
            // it ended — the arrowhead belongs at the stroke's end.
            const a = absolute[0]
            const b2 = absolute[absolute.length - 1]
            suggestion = commitArrow(a[0], a[1], b2[0], b2[1], kind === "arrow")
            label = kind === "arrow" ? "Arrow" : "Line"
          }
          if (!suggestion) return
          useSquig.setState({
            pendingSuggestion: { label, bounds: res.bounds ?? bounds, node: suggestion, replaceId: inkId },
          })
        } catch {
          /* ink without recognition is still ink */
        }
      })()
    }
  }

  const commitShape = (x0: number, y0: number, x1: number, y1: number, shapeOverride?: "rect" | "ellipse") => {
    const st = useSquig.getState()
    let w = Math.abs(x1 - x0)
    let h = Math.abs(y1 - y0)
    let x = Math.min(x0, x1)
    let y = Math.min(y0, y1)
    // A click, not a drag — a sensible default box centred on the cursor.
    if (w < 4 && h < 4) {
      w = 140
      h = 90
      x = x0 - w / 2
      y = y0 - h / 2
    }
    const kind = shapeOverride ?? (st.shapeKind === "ellipse" ? "ellipse" : "rect")
    const d = styleFor(kind === "ellipse" ? "ellipse" : "rectangle")
    const node = {
      id: nanoid(),
      seed: Math.random(),
      type: "shape",
      shape: kind,
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
      fill: d.fill ?? "none",
      ...(d.fillColor ? { fillColor: d.fillColor } : {}),
      color: d.color || st.drawColor || "",
      strokeWidth: d.strokeWidth,
      stroke: d.stroke,
      dashed: d.dashed || undefined,
      opacity: d.opacity,
    } as unknown as SquigNode
    return node
  }

  const placeShape = (x0: number, y0: number, x1: number, y1: number) => {
    useSquig.getState().addNode(commitShape(x0, y0, x1, y1), { select: true })
  }

  const commitArrow = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    headOverride?: boolean
  ): SquigNode | null => {
    const st = useSquig.getState()
    if (Math.hypot(x1 - x0, y1 - y0) < 4) return null
    const head = headOverride ?? !!st.arrowHead
    const family = head ? "arrow" : "line"
    const d = styleFor(family)
    const x = Math.min(x0, x1)
    const y = Math.min(y0, y1)
    const node = {
      id: nanoid(),
      seed: Math.random(),
      type: "arrow",
      x: Math.round(x),
      y: Math.round(y),
      w: Math.max(1, Math.round(Math.abs(x1 - x0))),
      h: Math.max(1, Math.round(Math.abs(y1 - y0))),
      points: [
        [Math.round(x0 - x), Math.round(y0 - y)],
        [Math.round(x1 - x), Math.round(y1 - y)],
      ],
      head,
      color: d.color || st.drawColor || "",
      strokeWidth: d.strokeWidth,
      stroke: d.stroke,
      dashed: d.dashed || undefined,
      opacity: d.opacity,
    } as unknown as SquigNode
    return node
  }

  const placeArrow = (x0: number, y0: number, x1: number, y1: number) => {
    const node = commitArrow(x0, y0, x1, y1)
    if (node) useSquig.getState().addNode(node, { select: true })
  }

  const commitText = (wx: number, wy: number) => {
    const st = useSquig.getState()
    const d = styleFor("text")
    const fontSize = d.fontSize || 18
    const node = {
      id: nanoid(),
      seed: Math.random(),
      type: "text",
      text: "",
      x: Math.round(wx),
      y: Math.round(wy),
      w: 240,
      h: Math.round(fontSize * 1.4),
      fontSize,
      align: d.align ?? "left",
      bold: !!d.bold,
      italic: !!d.italic,
      color: d.color || st.textColor || "",
      opacity: d.opacity,
    } as unknown as SquigNode
    // The pre-placement checkpoint: dismissing the empty editor reverts it
    // (see TextEditOverlay), so placing text is one undo step, not two.
    st.checkpoint()
    st.addNode(node, { select: true, checkpoint: false })
    st.setEditing(node.id)
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
    setPreview(null)

    // Creation tools own the press when the document is writable.
    if (!st.isReadOnly && !st.isLocked) {
      if (st.tool === "draw") {
        gesture.current = { mode: "create-draw", points: [[wx, wy]] }
        st.setTransforming(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* noop */
        }
        return
      }
      if (st.tool === "shape" || st.tool === "arrow") {
        gesture.current = { mode: "create-shape", startWX: wx, startWY: wy }
        st.setTransforming(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* noop */
        }
        return
      }
      if (st.tool === "text") {
        const hit = pickAt(st.nodes, st.order, wx, wy, st.zoom)
        if (hit && hasEditableText(st.nodes[hit])) {
          st.select([hit])
          st.setEditing(hit)
        } else if (!hit) {
          commitText(wx, wy)
        } else {
          st.select([hit])
        }
        return
      }
    }

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
            alt: e.altKey,
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
            alt: e.altKey,
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
          alt: e.altKey,
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
    pointerWorld.current = [wx, wy]
    if (g.mode === "create-draw") {
      const last = g.points[g.points.length - 1]
      const z = st.zoom || 1
      // One point per ~2 screen px — enough for ink, cheap to render.
      if (Math.hypot(wx - last[0], wy - last[1]) * z < 2) return
      g.points = [...g.points, [wx, wy]]
      setPreview({ kind: "draw", points: g.points })
      return
    }
    if (g.mode === "create-shape") {
      const tool = st.tool
      if (tool === "arrow") {
        setPreview({ kind: "arrow", x1: g.startWX, y1: g.startWY, x2: wx, y2: wy })
      } else {
        setPreview({
          kind: "shape",
          shape: st.shapeKind === "ellipse" ? "ellipse" : "rect",
          x: Math.min(g.startWX, wx),
          y: Math.min(g.startWY, wy),
          w: Math.abs(wx - g.startWX),
          h: Math.abs(wy - g.startWY),
        })
      }
      return
    }
    if (g.mode === "maybe-drag") {
      const dxPx = sx - g.startSX
      const dyPx = sy - g.startSY
      if (Math.hypot(dxPx, dyPx) < 3) return
      // ⌥-drag duplicates first, then moves the copies.
      if (g.alt && !g.pushedHistory && !g.pendingToggleOff && !st.isReadOnly && !st.isLocked) {
        st.duplicateSelected()
        const ids = st.selection
        g.snapshot = new Map(ids.map((id) => [id, { x: st.nodes[id]?.x ?? 0, y: st.nodes[id]?.y ?? 0 }]))
      }
      const z = st.zoom || 1
      const dx = dxPx / z
      const dy = dyPx / z
      const checkpoint = !g.pushedHistory
      g.pushedHistory = true
      st.setTransforming(true)
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
    setPreview(null)
    if (g.mode === "idle" || g.mode === "pan") return
    const st = useSquig.getState()
    st.setTransforming(false)
    if (g.mode === "create-draw") {
      commitDraw(g.points)
      return
    }
    if (g.mode === "create-shape") {
      const { wx, wy } = toLocal(e.clientX, e.clientY)
      if (st.tool === "arrow") placeArrow(g.startWX, g.startWY, wx, wy)
      else placeShape(g.startWX, g.startWY, wx, wy)
      return
    }
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    const st = useSquig.getState()
    if (st.isReadOnly || st.isLocked) return
    const { wx, wy } = toLocal(e.clientX, e.clientY)
    const hit = pickAt(st.nodes, st.order, wx, wy, st.zoom)
    if (hit && hasEditableText(st.nodes[hit])) {
      st.select([hit])
      st.setEditing(hit)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    useSquig.getState().setPlacingDrag(false)
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

  // A cancelled gesture (touch interruption, alert) never leaves a preview or
  // a stuck "dragging" flag behind.
  // A new tool clears any in-progress preview.
  useEffect(() => {
    setPreview(null)
  }, [tool])

  const editingNode = editingId ? nodes[editingId] : undefined
  const editingTarget = editingNode ? editTarget(editingNode) : null

  const cursor =
    panning || isSpacebarHeld ? "grab" : tool === "text" ? "text" : tool === "select" ? "default" : "crosshair"

  return (
    <div
      ref={containerRef}
      id="canvas-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetGesture}
      onDoubleClick={handleDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => useSquig.getState().setPlacingDrag(true)}
      onDragLeave={() => useSquig.getState().setPlacingDrag(false)}
      onDrop={handleDrop}
      className="relative w-full h-full overflow-hidden bg-[var(--sq-bg)] select-none touch-none"
      style={{ cursor }}
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
                <NodeSketch
                  node={node}
                  hiddenText={id === editingId ? (editingTarget?.hidden ?? undefined) : undefined}
                />
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
          {preview?.kind === "shape" &&
            (preview.shape === "ellipse" ? (
              <ellipse
                cx={preview.x + preview.w / 2}
                cy={preview.y + preview.h / 2}
                rx={Math.max(0.5, preview.w / 2)}
                ry={Math.max(0.5, preview.h / 2)}
                fill="none"
                stroke="var(--sq-accent)"
                strokeWidth={1.5 / (zoom || 1)}
                strokeDasharray={`${6 / (zoom || 1)} ${4 / (zoom || 1)}`}
                pointerEvents="none"
              />
            ) : (
              <rect
                x={preview.x}
                y={preview.y}
                width={Math.max(0.5, preview.w)}
                height={Math.max(0.5, preview.h)}
                fill="none"
                stroke="var(--sq-accent)"
                strokeWidth={1.5 / (zoom || 1)}
                strokeDasharray={`${6 / (zoom || 1)} ${4 / (zoom || 1)}`}
                rx={6}
                pointerEvents="none"
              />
            ))}
          {preview?.kind === "arrow" && (
            <line
              x1={preview.x1}
              y1={preview.y1}
              x2={preview.x2}
              y2={preview.y2}
              stroke="var(--sq-accent)"
              strokeWidth={1.5 / (zoom || 1)}
              strokeDasharray={`${6 / (zoom || 1)} ${4 / (zoom || 1)}`}
              pointerEvents="none"
            />
          )}
          {preview?.kind === "draw" && preview.points.length > 1 && (
            <polyline
              points={preview.points.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="var(--sq-accent)"
              strokeWidth={2 / (zoom || 1)}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
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
      {editingNode && editingTarget && <TextEditOverlay node={editingNode} target={editingTarget} />}
    </div>
  )
}
