"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — Smart Board Tool Overlays
// Laser Pointer, Spotlight, Magnifier, Ruler, and Background Grid overlays.
// ---------------------------------------------------------------------------

import React, { useState } from "react"
import type {
  LaserPointerState,
  SpotlightState,
  MagnifierState,
  RulerState,
  SmartBoardGridKind,
} from "@/lib/pdf-types"

interface SmartBoardOverlaysProps {
  width: number
  height: number
  laser?: LaserPointerState
  spotlight?: SpotlightState
  magnifier?: MagnifierState
  ruler?: RulerState
  grid?: SmartBoardGridKind
  pdfPreviewSrc?: string
  onUpdateSpotlight?: (patch: Partial<SpotlightState>) => void
  onUpdateRuler?: (patch: Partial<RulerState>) => void
  onUpdateMagnifier?: (patch: Partial<MagnifierState>) => void
}

export function SmartBoardOverlays({
  width,
  height,
  laser,
  spotlight,
  magnifier,
  ruler,
  grid = "none",
  pdfPreviewSrc,
  onUpdateSpotlight,
  onUpdateRuler,
  onUpdateMagnifier,
}: SmartBoardOverlaysProps) {
  // Ruler dragging and rotation state
  const [rulerDragging, setRulerDragging] = useState(false)
  const [rulerRotating, setRulerRotating] = useState(false)

  // Spotlight dragging & resizing
  const [spotlightDragging, setSpotlightDragging] = useState(false)
  const [spotlightResizing, setSpotlightResizing] = useState(false)

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height }}
    >
      <defs>
        {/* Spotlight mask */}
        {spotlight?.enabled && (
          <mask id="spotlight-mask">
            <rect x={0} y={0} width={width} height={height} fill="white" />
            <circle
              cx={spotlight.x * width}
              cy={spotlight.y * height}
              r={spotlight.radius}
              fill="black"
            />
          </mask>
        )}

        {/* Magnifier clip path */}
        {magnifier?.enabled && (
          <clipPath id="magnifier-clip">
            <circle
              cx={magnifier.x * width}
              cy={magnifier.y * height}
              r={80}
            />
          </clipPath>
        )}

        {/* Laser glow filter */}
        <filter id="laser-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Grid Overlay */}
      {grid === "dots" && (
        <g opacity={0.35}>
          {Array.from({ length: Math.ceil(width / 24) }).map((_, xi) =>
            Array.from({ length: Math.ceil(height / 24) }).map((_, yi) => (
              <circle
                key={`${xi}-${yi}`}
                cx={xi * 24 + 12}
                cy={yi * 24 + 12}
                r={1}
                fill="var(--sq-ink)"
              />
            ))
          )}
        </g>
      )}

      {grid === "grid" && (
        <g opacity={0.2}>
          {Array.from({ length: Math.ceil(width / 24) }).map((_, xi) => (
            <line
              key={`gx-${xi}`}
              x1={xi * 24}
              y1={0}
              x2={xi * 24}
              y2={height}
              stroke="var(--sq-ink)"
              strokeWidth={0.75}
            />
          ))}
          {Array.from({ length: Math.ceil(height / 24) }).map((_, yi) => (
            <line
              key={`gy-${yi}`}
              x1={0}
              y1={yi * 24}
              x2={width}
              y2={yi * 24}
              stroke="var(--sq-ink)"
              strokeWidth={0.75}
            />
          ))}
        </g>
      )}

      {grid === "ruled" && (
        <g opacity={0.25}>
          {Array.from({ length: Math.ceil(height / 28) }).map((_, yi) => (
            <line
              key={`ry-${yi}`}
              x1={0}
              y1={yi * 28 + 20}
              x2={width}
              y2={yi * 28 + 20}
              stroke="var(--sq-ink)"
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* 2. Spotlight Overlay */}
      {spotlight?.enabled && (
        <g>
          {/* Dimmed backdrop */}
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="black"
            opacity={0.68}
            mask="url(#spotlight-mask)"
          />
          {/* Spotlight outline & interactive handle */}
          <circle
            cx={spotlight.x * width}
            cy={spotlight.y * height}
            r={spotlight.radius}
            fill="none"
            stroke="var(--sq-paper)"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="pointer-events-auto cursor-move"
            onPointerDown={(e) => {
              e.stopPropagation()
              setSpotlightDragging(true)
              const startX = e.clientX
              const startY = e.clientY
              const initialNx = spotlight.x
              const initialNy = spotlight.y

              const handleMove = (me: PointerEvent) => {
                const dx = (me.clientX - startX) / width
                const dy = (me.clientY - startY) / height
                onUpdateSpotlight?.({
                  x: Math.max(0, Math.min(1, initialNx + dx)),
                  y: Math.max(0, Math.min(1, initialNy + dy)),
                })
              }
              const handleUp = () => {
                setSpotlightDragging(false)
                window.removeEventListener("pointermove", handleMove)
                window.removeEventListener("pointerup", handleUp)
              }
              window.addEventListener("pointermove", handleMove)
              window.addEventListener("pointerup", handleUp)
            }}
          />
          {/* Resize handle at right rim */}
          <circle
            cx={spotlight.x * width + spotlight.radius}
            cy={spotlight.y * height}
            r={8}
            fill="var(--sq-paper)"
            stroke="var(--sq-ink)"
            strokeWidth={1.5}
            className="pointer-events-auto cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation()
              setSpotlightResizing(true)
              const startX = e.clientX
              const initRadius = spotlight.radius

              const handleMove = (me: PointerEvent) => {
                const diff = me.clientX - startX
                const nextRadius = Math.max(40, Math.min(width * 0.4, initRadius + diff))
                onUpdateSpotlight?.({ radius: nextRadius })
              }
              const handleUp = () => {
                setSpotlightResizing(false)
                window.removeEventListener("pointermove", handleMove)
                window.removeEventListener("pointerup", handleUp)
              }
              window.addEventListener("pointermove", handleMove)
              window.addEventListener("pointerup", handleUp)
            }}
          />
        </g>
      )}

      {/* 3. Magnifier Loupe */}
      {magnifier?.enabled && pdfPreviewSrc && (
        <g
          className="pointer-events-auto cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            e.stopPropagation()
            const startX = e.clientX
            const startY = e.clientY
            const initNx = magnifier.x
            const initNy = magnifier.y

            const handleMove = (me: PointerEvent) => {
              const dx = (me.clientX - startX) / width
              const dy = (me.clientY - startY) / height
              onUpdateMagnifier?.({
                x: Math.max(0, Math.min(1, initNx + dx)),
                y: Math.max(0, Math.min(1, initNy + dy)),
              })
            }
            const handleUp = () => {
              window.removeEventListener("pointermove", handleMove)
              window.removeEventListener("pointerup", handleUp)
            }
            window.addEventListener("pointermove", handleMove)
            window.addEventListener("pointerup", handleUp)
          }}
        >
          {/* Magnified content under clip */}
          <g clipPath="url(#magnifier-clip)">
            <image
              href={pdfPreviewSrc}
              x={magnifier.x * width - magnifier.x * width * 2.2}
              y={magnifier.y * height - magnifier.y * height * 2.2}
              width={width * 2.2}
              height={height * 2.2}
              preserveAspectRatio="none"
            />
          </g>
          {/* Loupe bezel */}
          <circle
            cx={magnifier.x * width}
            cy={magnifier.y * height}
            r={80}
            fill="none"
            stroke="var(--sq-ink)"
            strokeWidth={4}
          />
          {/* Subtle reflection & handle */}
          <line
            x1={magnifier.x * width + 56}
            y1={magnifier.y * height + 56}
            x2={magnifier.x * width + 84}
            y2={magnifier.y * height + 84}
            stroke="var(--sq-ink)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <text
            x={magnifier.x * width}
            y={magnifier.y * height - 88}
            textAnchor="middle"
            fill="var(--sq-ink)"
            fontFamily="var(--sq-font)"
            fontSize={11}
            fontWeight="bold"
          >
            2.2× Loupe
          </text>
        </g>
      )}

      {/* 4. Interactive Ruler */}
      {ruler?.enabled && (
        <g
          transform={`translate(${ruler.x * width}, ${ruler.y * height}) rotate(${ruler.angle})`}
          className="pointer-events-auto"
        >
          {/* Ruler body (acrylic paper aesthetic) */}
          <rect
            x={0}
            y={-24}
            width={ruler.length}
            height={48}
            rx={4}
            fill="var(--sq-paper)"
            stroke="var(--sq-ink)"
            strokeWidth={1.5}
            fillOpacity={0.88}
            className="cursor-move"
            onPointerDown={(e) => {
              e.stopPropagation()
              setRulerDragging(true)
              const startX = e.clientX
              const startY = e.clientY
              const initNx = ruler.x
              const initNy = ruler.y

              const handleMove = (me: PointerEvent) => {
                const dx = (me.clientX - startX) / width
                const dy = (me.clientY - startY) / height
                onUpdateRuler?.({
                  x: Math.max(0, Math.min(1, initNx + dx)),
                  y: Math.max(0, Math.min(1, initNy + dy)),
                })
              }
              const handleUp = () => {
                setRulerDragging(false)
                window.removeEventListener("pointermove", handleMove)
                window.removeEventListener("pointerup", handleUp)
              }
              window.addEventListener("pointermove", handleMove)
              window.addEventListener("pointerup", handleUp)
            }}
          />

          {/* Tick marks */}
          {Array.from({ length: Math.floor(ruler.length / 10) }).map((_, i) => {
            const isMajor = i % 5 === 0
            const isCm = i % 10 === 0
            const tickH = isCm ? 18 : isMajor ? 12 : 7
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={i * 10}
                  y1={-24}
                  x2={i * 10}
                  y2={-24 + tickH}
                  stroke="var(--sq-ink)"
                  strokeWidth={isCm ? 1.5 : 1}
                />
                {isCm && i > 0 && (
                  <text
                    x={i * 10}
                    y={-24 + tickH + 11}
                    textAnchor="middle"
                    fill="var(--sq-ink)"
                    fontFamily="monospace"
                    fontSize={9}
                  >
                    {i / 10}
                  </text>
                )}
              </g>
            )
          })}

          {/* Rotation Handle on right end */}
          <circle
            cx={ruler.length - 12}
            cy={0}
            r={8}
            fill="var(--sq-ink)"
            className="cursor-pointer"
            onPointerDown={(e) => {
              e.stopPropagation()
              setRulerRotating(true)
              const centerX = ruler.x * width
              const centerY = ruler.y * height

              const handleMove = (me: PointerEvent) => {
                const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect()
                if (!rect) return
                const mouseX = me.clientX - rect.left
                const mouseY = me.clientY - rect.top
                const rad = Math.atan2(mouseY - centerY, mouseX - centerX)
                const deg = Math.round((rad * 180) / Math.PI)
                onUpdateRuler?.({ angle: deg })
              }
              const handleUp = () => {
                setRulerRotating(false)
                window.removeEventListener("pointermove", handleMove)
                window.removeEventListener("pointerup", handleUp)
              }
              window.addEventListener("pointermove", handleMove)
              window.addEventListener("pointerup", handleUp)
            }}
          />
          <text
            x={ruler.length / 2}
            y={16}
            textAnchor="middle"
            fill="var(--sq-muted)"
            fontFamily="var(--sq-font)"
            fontSize={10}
          >
            {Math.round(ruler.angle)}°
          </text>
        </g>
      )}

      {/* 5. Laser Pointer & Fading Trail */}
      {laser?.active && (
        <g filter="url(#laser-glow)">
          {/* Laser motion trail */}
          {laser.trail && laser.trail.length > 1 && (
            <polyline
              points={laser.trail
                .map((p) => `${(p.x * width).toFixed(1)},${(p.y * height).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke="#ef4444"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
          {/* Pulsing laser head */}
          <circle
            cx={laser.x * width}
            cy={laser.y * height}
            r={7}
            fill="#ff0000"
          />
          <circle
            cx={laser.x * width}
            cy={laser.y * height}
            r={2.5}
            fill="#ffffff"
          />
        </g>
      )}
    </svg>
  )
}
