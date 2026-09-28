"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — SVG Annotation Renderer
// Renders vector annotations (pencil, highlighter, text, shapes, arrows)
// over any width/height surface using normalized page coordinates.
// ---------------------------------------------------------------------------

import React from "react"
import type { PdfAnnotation, DisappearingStroke } from "@/lib/pdf-types"

interface PdfAnnotationSvgProps {
  annotations?: PdfAnnotation[]
  width: number
  height: number
  offsetX?: number
  offsetY?: number
  selectedId?: string | null
  tempStrokes?: DisappearingStroke[]
  interactive?: boolean
  onSelectAnnotation?: (id: string, e: React.MouseEvent) => void
}

export function PdfAnnotationSvg({
  annotations = [],
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  selectedId = null,
  tempStrokes = [],
  interactive = false,
  onSelectAnnotation,
}: PdfAnnotationSvgProps) {
  if (width <= 0 || height <= 0) return null

  return (
    <g transform={`translate(${offsetX}, ${offsetY})`} className="pdf-annotations-layer">
      {/* Image Annotations (rendered on base so ink/annotations can draw over them) */}
      {annotations
        .filter((a): a is any => a.type === "image" && Boolean(a.src))
        .map((ann: any) => {
          const x = (ann.x ?? 0) * width
          const y = (ann.y ?? 0) * height
          const w = (ann.w ?? 0.8) * width
          const h = (ann.h ?? 0.6) * height
          const isSelected = ann.id === selectedId

          return (
            <g
              key={ann.id}
              id={`ann-${ann.id}`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={(e) => {
                if (interactive && onSelectAnnotation) {
                  e.stopPropagation()
                  onSelectAnnotation(ann.id, e)
                }
              }}
            >
              <image
                href={ann.src}
                x={x}
                y={y}
                width={w}
                height={h}
                preserveAspectRatio="xMidYMid meet"
              />
              {isSelected && (
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={w + 4}
                  height={h + 4}
                  fill="none"
                  stroke="var(--sq-accent, #3b82f6)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </g>
          )
        })}

      {/* Highlighters first (rendered underneath solid ink) */}
      {annotations
        .filter((a) => a.type === "highlighter")
        .map((ann) => {
          if (ann.type !== "highlighter" || !ann.points || ann.points.length < 2) return null
          const pts = ann.points
            .map(([nx, ny]) => `${(nx * width).toFixed(1)},${(ny * height).toFixed(1)}`)
            .join(" ")
          const strokeW = Math.max(16, (ann.strokeWidth || 4) * 4.5)
          const isSelected = ann.id === selectedId

          return (
            <g key={ann.id} id={`ann-${ann.id}`}>
              <polyline
                points={pts}
                fill="none"
                stroke={ann.color || "#eab308"}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={ann.opacity || 0.4}
                style={{ mixBlendMode: "multiply" }}
                className={interactive ? "cursor-pointer hover:opacity-60 transition-opacity" : ""}
                onClick={(e) => {
                  if (interactive && onSelectAnnotation) {
                    e.stopPropagation()
                    onSelectAnnotation(ann.id, e)
                  }
                }}
              />
              {isSelected && (
                <polyline
                  points={pts}
                  fill="none"
                  stroke="var(--sq-ink)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              )}
            </g>
          )
        })}

      {/* Shapes (rectangles, ellipses) */}
      {annotations
        .filter((a) => a.type === "rect" || a.type === "ellipse")
        .map((ann) => {
          if (ann.type !== "rect" && ann.type !== "ellipse") return null
          const x = ann.x * width
          const y = ann.y * height
          const w = ann.w * width
          const h = ann.h * height
          const isSelected = ann.id === selectedId
          const stroke = ann.color || "var(--sq-ink)"
          const strokeW = ann.strokeWidth || 2.2
          const fill =
            ann.fill === "solid"
              ? ann.fillColor || "var(--sq-paper)"
              : ann.fill === "shade"
                ? "var(--sq-shade)"
                : "none"

          return (
            <g
              key={ann.id}
              id={`ann-${ann.id}`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={(e) => {
                if (interactive && onSelectAnnotation) {
                  e.stopPropagation()
                  onSelectAnnotation(ann.id, e)
                }
              }}
            >
              {ann.type === "rect" ? (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                  strokeDasharray={ann.dashed ? "6 4" : undefined}
                />
              ) : (
                <ellipse
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={Math.max(1, w / 2)}
                  ry={Math.max(1, h / 2)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                  strokeDasharray={ann.dashed ? "6 4" : undefined}
                />
              )}
              {isSelected && (
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={w + 8}
                  height={h + 8}
                  fill="none"
                  stroke="var(--sq-ink)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
              )}
            </g>
          )
        })}

      {/* Lines & Arrows */}
      {annotations
        .filter((a) => a.type === "line" || a.type === "arrow")
        .map((ann) => {
          if (ann.type !== "line" && ann.type !== "arrow") return null
          const x1 = ann.x1 * width
          const y1 = ann.y1 * height
          const x2 = ann.x2 * width
          const y2 = ann.y2 * height
          const isSelected = ann.id === selectedId
          const stroke = ann.color || "var(--sq-ink)"
          const strokeW = ann.strokeWidth || 2.2

          // Calculate arrowhead
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.hypot(dx, dy)
          const angle = Math.atan2(dy, dx)
          const headLen = Math.min(18, Math.max(10, len * 0.2))

          const arrowP1X = x2 - headLen * Math.cos(angle - Math.PI / 6)
          const arrowP1Y = y2 - headLen * Math.sin(angle - Math.PI / 6)
          const arrowP2X = x2 - headLen * Math.cos(angle + Math.PI / 6)
          const arrowP2Y = y2 - headLen * Math.sin(angle + Math.PI / 6)

          return (
            <g
              key={ann.id}
              id={`ann-${ann.id}`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={(e) => {
                if (interactive && onSelectAnnotation) {
                  e.stopPropagation()
                  onSelectAnnotation(ann.id, e)
                }
              }}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              {ann.type === "arrow" && (
                <polygon
                  points={`${x2},${y2} ${arrowP1X},${arrowP1Y} ${arrowP2X},${arrowP2Y}`}
                  fill={stroke}
                  stroke={stroke}
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
              )}
              {isSelected && (
                <>
                  <circle cx={x1} cy={y1} r={4} fill="var(--sq-paper)" stroke="var(--sq-ink)" strokeWidth={1.5} />
                  <circle cx={x2} cy={y2} r={4} fill="var(--sq-paper)" stroke="var(--sq-ink)" strokeWidth={1.5} />
                </>
              )}
            </g>
          )
        })}

      {/* Pencil Strokes */}
      {annotations
        .filter((a) => a.type === "pencil")
        .map((ann) => {
          if (ann.type !== "pencil" || !ann.points || ann.points.length < 2) return null
          const pts = ann.points
            .map(([nx, ny]) => `${(nx * width).toFixed(1)},${(ny * height).toFixed(1)}`)
            .join(" ")
          const strokeW = ann.strokeWidth || 2
          const isSelected = ann.id === selectedId

          return (
            <g key={ann.id} id={`ann-${ann.id}`}>
              <polyline
                points={pts}
                fill="none"
                stroke={ann.color || "var(--sq-ink)"}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={interactive ? "cursor-pointer" : ""}
                onClick={(e) => {
                  if (interactive && onSelectAnnotation) {
                    e.stopPropagation()
                    onSelectAnnotation(ann.id, e)
                  }
                }}
              />
              {isSelected && (
                <polyline
                  points={pts}
                  fill="none"
                  stroke="var(--sq-accent, #3b82f6)"
                  strokeWidth={strokeW + 2}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              )}
            </g>
          )
        })}

      {/* Text Annotations */}
      {annotations
        .filter((a) => a.type === "text")
        .map((ann) => {
          if (ann.type !== "text" || !ann.text) return null
          const x = ann.x * width
          const y = ann.y * height
          const isSelected = ann.id === selectedId
          const color = ann.color || "var(--sq-ink)"
          const size = ann.fontSize || 16
          const lines = ann.text.split("\n")

          return (
            <g
              key={ann.id}
              id={`ann-${ann.id}`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={(e) => {
                if (interactive && onSelectAnnotation) {
                  e.stopPropagation()
                  onSelectAnnotation(ann.id, e)
                }
              }}
            >
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={x}
                  y={y + (li + 1) * (size * 1.25)}
                  fill={color}
                  fontFamily="var(--sq-font)"
                  fontSize={size}
                  fontWeight={ann.bold ? "bold" : "normal"}
                  fontStyle={ann.italic ? "italic" : "normal"}
                  textDecoration={ann.underline ? "underline" : "none"}
                >
                  {line}
                </text>
              ))}
              {isSelected && (
                <rect
                  x={x - 4}
                  y={y - 2}
                  width={Math.max(60, (ann.w || 0.1) * width)}
                  height={Math.max(24, lines.length * (size * 1.3) + 6)}
                  fill="none"
                  stroke="var(--sq-ink)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
              )}
            </g>
          )
        })}

      {/* Temporary Disappearing Strokes (Smart Board Marker) */}
      {tempStrokes.map((ts) => {
        if (!ts.points || ts.points.length < 2) return null
        const pts = ts.points
          .map(([nx, ny]) => `${(nx * width).toFixed(1)},${(ny * height).toFixed(1)}`)
          .join(" ")

        return (
          <polyline
            key={ts.id}
            points={pts}
            fill="none"
            stroke={ts.color || "#ef4444"}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )
      })}
    </g>
  )
}

