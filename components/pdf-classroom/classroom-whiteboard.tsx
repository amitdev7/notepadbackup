"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — Whiteboard Scratchpad
// Infinite digital chalkboard/scratchpad for teaching explanations,
// brainstorming, and working out equations alongside the PDF slides.
// ---------------------------------------------------------------------------

import React, { useRef, useState, useEffect } from "react"
import type {
  PdfAnnotationTool,
  PdfSmartTool,
  SmartBoardGridKind,
  PdfAnnotation,
  LaserPointerState,
  DisappearingStroke,
} from "@/lib/pdf-types"
import { PdfAnnotationSvg } from "./pdf-annotation-svg"
import { SmartBoardOverlays } from "./smart-board-overlays"
import { PdfTextEditorOverlay } from "./pdf-text-editor-overlay"
import { nanoid } from "nanoid"

interface ClassroomWhiteboardProps {
  tool: PdfAnnotationTool | PdfSmartTool
  drawColor: string
  strokeWidth: number
  grid: SmartBoardGridKind
  annotations: PdfAnnotation[]
  onAddAnnotation: (ann: PdfAnnotation) => void
  onDeleteAnnotation: (id: string) => void
  onClearAnnotations: () => void
}

export function ClassroomWhiteboard({
  tool,
  drawColor,
  strokeWidth,
  grid,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  onClearAnnotations,
}: ClassroomWhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1400, height: 900 })
  const [activePoints, setActivePoints] = useState<[number, number][] | null>(null)
  const [laser, setLaser] = useState<LaserPointerState>({ x: 0.5, y: 0.5, active: false, trail: [] })
  const [tempStrokes, setTempStrokes] = useState<DisappearingStroke[]>([])
  const [editingText, setEditingText] = useState<{
    id?: string
    x: number
    y: number
    text: string
  } | null>(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 1400,
          height: containerRef.current.clientHeight || 900,
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  // Disappearing strokes timer loop
  useEffect(() => {
    if (!tempStrokes.length) return
    const interval = setInterval(() => {
      const now = Date.now()
      setTempStrokes((prev) => prev.filter((s) => s.expiresAt > now))
    }, 100)
    return () => clearInterval(interval)
  }, [tempStrokes.length])

  // Coordinate conversion helper
  const getNormalizedPoint = (e: React.PointerEvent): [number, number] => {
    if (!containerRef.current) return [0, 0]
    const rect = containerRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / dimensions.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / dimensions.height))
    return [nx, ny]
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const pt = getNormalizedPoint(e)

    if (tool === "laser") {
      setLaser({ x: pt[0], y: pt[1], active: true, trail: [{ x: pt[0], y: pt[1], t: Date.now() }] })
      return
    }

    if (tool === "tempMarker") {
      setActivePoints([pt])
      return
    }

    if (tool === "pencil" || tool === "highlighter" || tool === "line" || tool === "arrow" || tool === "rect" || tool === "ellipse") {
      setActivePoints([pt])
      return
    }

    if (tool === "text") {
      setEditingText({
        x: pt[0],
        y: pt[1],
        text: "",
      })
      return
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = getNormalizedPoint(e)

    if (tool === "laser" && laser.active) {
      const now = Date.now()
      const newTrail = [...laser.trail.filter((p) => now - p.t < 600), { x: pt[0], y: pt[1], t: now }]
      setLaser({ x: pt[0], y: pt[1], active: true, trail: newTrail })
      return
    }

    if (!activePoints) return

    if (tool === "pencil" || tool === "highlighter" || tool === "tempMarker") {
      setActivePoints((prev) => (prev ? [...prev, pt] : [pt]))
    } else if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "ellipse") {
      setActivePoints([activePoints[0], pt])
    }
  }

  const handlePointerUp = () => {
    if (tool === "laser") {
      setLaser((prev) => ({ ...prev, active: false, trail: [] }))
      return
    }

    if (!activePoints || activePoints.length < 2) {
      setActivePoints(null)
      return
    }

    if (tool === "tempMarker") {
      setTempStrokes((prev) => [
        ...prev,
        {
          id: nanoid(8),
          points: activePoints,
          createdAt: Date.now(),
          expiresAt: Date.now() + 2500,
          color: drawColor || "#ef4444",
        },
      ])
      setActivePoints(null)
      return
    }

    if (tool === "pencil" || tool === "highlighter") {
      onAddAnnotation({
        id: nanoid(8),
        page: 0,
        type: tool,
        points: activePoints,
        color: drawColor || (tool === "highlighter" ? "#eab308" : "var(--sq-ink)"),
        strokeWidth: tool === "highlighter" ? 5 : strokeWidth,
        opacity: tool === "highlighter" ? 0.38 : 1,
        createdAt: Date.now(),
      })
    } else if (tool === "line" || tool === "arrow") {
      onAddAnnotation({
        id: nanoid(8),
        page: 0,
        type: tool,
        x1: activePoints[0][0],
        y1: activePoints[0][1],
        x2: activePoints[1][0],
        y2: activePoints[1][1],
        color: drawColor || "var(--sq-ink)",
        strokeWidth,
        createdAt: Date.now(),
      })
    } else if (tool === "rect" || tool === "ellipse") {
      const minX = Math.min(activePoints[0][0], activePoints[1][0])
      const minY = Math.min(activePoints[0][1], activePoints[1][1])
      const w = Math.abs(activePoints[1][0] - activePoints[0][0])
      const h = Math.abs(activePoints[1][1] - activePoints[0][1])
      onAddAnnotation({
        id: nanoid(8),
        page: 0,
        type: tool,
        x: minX,
        y: minY,
        w,
        h,
        color: drawColor || "var(--sq-ink)",
        fill: "none",
        strokeWidth,
        createdAt: Date.now(),
      })
    }

    setActivePoints(null)
  }

  // Active stroke live preview
  const liveAnnotation: PdfAnnotation | null =
    activePoints && activePoints.length >= 2
      ? tool === "pencil" || tool === "highlighter"
        ? {
            id: "live",
            page: 0,
            type: tool,
            points: activePoints,
            color: drawColor || (tool === "highlighter" ? "#eab308" : "var(--sq-ink)"),
            strokeWidth,
            createdAt: 0,
          }
        : tool === "line" || tool === "arrow"
          ? {
              id: "live",
              page: 0,
              type: tool,
              x1: activePoints[0][0],
              y1: activePoints[0][1],
              x2: activePoints[1][0],
              y2: activePoints[1][1],
              color: drawColor || "var(--sq-ink)",
              createdAt: 0,
            }
          : tool === "rect" || tool === "ellipse"
            ? {
                id: "live",
                page: 0,
                type: tool,
                x: Math.min(activePoints[0][0], activePoints[1][0]),
                y: Math.min(activePoints[0][1], activePoints[1][1]),
                w: Math.abs(activePoints[1][0] - activePoints[0][0]),
                h: Math.abs(activePoints[1][1] - activePoints[0][1]),
                color: drawColor || "var(--sq-ink)",
                createdAt: 0,
              }
            : null
      : null

  const renderedAnnotations = liveAnnotation ? [...annotations, liveAnnotation] : annotations

  return (
    <div
      ref={containerRef}
      className="relative size-full overflow-hidden bg-[var(--sq-bg)] cursor-crosshair select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <PdfAnnotationSvg
          annotations={renderedAnnotations}
          width={dimensions.width}
          height={dimensions.height}
          tempStrokes={tempStrokes}
        />
      </svg>

      <SmartBoardOverlays
        width={dimensions.width}
        height={dimensions.height}
        laser={laser}
        grid={grid}
      />

      {editingText && (
        <PdfTextEditorOverlay
          initialText={editingText.text}
          x={editingText.x}
          y={editingText.y}
          fontSize={18}
          color={drawColor || "var(--sq-ink)"}
          onCommit={(trimmedText) => {
            if (editingText.id) {
              const existing = annotations.find((a) => a.id === editingText.id)
              if (existing && existing.type === "text") {
                onDeleteAnnotation(editingText.id)
                onAddAnnotation({
                  ...existing,
                  text: trimmedText,
                })
              }
            } else {
              onAddAnnotation({
                id: nanoid(8),
                page: 0,
                type: "text",
                x: editingText.x,
                y: editingText.y,
                text: trimmedText,
                fontSize: 18,
                color: drawColor || "var(--sq-ink)",
                createdAt: Date.now(),
              })
            }
            setEditingText(null)
          }}
          onCancel={() => {
            setEditingText(null)
          }}
        />
      )}
    </div>
  )
}
