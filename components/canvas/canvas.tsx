"use client"

import React, { useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { renderComponent } from "@/lib/library/registry"
import { RoughRenderer } from "./rough-renderer"

export function Canvas() {
  const { nodes, selectedIds, select, updateNode, pan, zoom, setPan, addNode } = useSquig()
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [nodeOffset, setNodeOffset] = useState<{ ox: number; oy: number }>({ ox: 0, oy: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === "canvas-plane") {
      select([])
      if (e.button === 0 || e.button === 1 || e.spaceKey) {
        setIsPanning(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && dragStart) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    } else if (draggingNodeId) {
      const newX = (e.clientX - pan.x) / zoom - nodeOffset.ox
      const newY = (e.clientY - pan.y) / zoom - nodeOffset.oy
      updateNode(draggingNodeId, { x: Math.round(newX), y: Math.round(newY) })
    }
  }

  const handlePointerUp = () => {
    setIsPanning(false)
    setDragStart(null)
    setDraggingNodeId(null)
  }

  const handleNodePointerDown = (e: React.PointerEvent, id: string, nodeX: number, nodeY: number) => {
    e.stopPropagation()
    select([id])
    setDraggingNodeId(id)
    const mouseCanvasX = (e.clientX - pan.x) / zoom
    const mouseCanvasY = (e.clientY - pan.y) / zoom
    setNodeOffset({ ox: mouseCanvasX - nodeX, oy: mouseCanvasY - nodeY })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData("application/zenithsui-component")
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasX = (e.clientX - rect.left - pan.x) / zoom
      const canvasY = (e.clientY - rect.top - pan.y) / zoom

      addNode({
        id: `node-${Date.now()}`,
        type: "component",
        kind: data.kind,
        x: Math.round(canvasX - data.defaultWidth / 2),
        y: Math.round(canvasY - data.defaultHeight / 2),
        w: data.defaultWidth,
        h: data.defaultHeight,
        props: Object.fromEntries(
          Object.entries(data.props || {}).map(([k, v]: [string, any]) => [k, v.default])
        ),
      })
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
      className="relative w-full h-full overflow-hidden bg-[var(--sq-bg)] cursor-crosshair select-none"
    >
      {/* Subtle Dot Grid */}
      <div
        id="canvas-plane"
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{
          backgroundImage: "radial-gradient(var(--sq-dot, rgba(0,0,0,0.12)) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {nodes.map((node) => {
            if (node.type !== "component") return null
            const isSelected = selectedIds.includes(node.id)
            const prims = renderComponent(node.kind, node.w, node.h, node.props, node.seed)

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                onPointerDown={(e) => handleNodePointerDown(e, node.id, node.x, node.y)}
                className={`absolute cursor-move transition-shadow ${
                  isSelected ? "ring-2 ring-[var(--sq-accent)] ring-offset-2 rounded-lg" : ""
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.w,
                  height: node.h,
                }}
              >
                <RoughRenderer prims={prims} width={node.w} height={node.h} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
