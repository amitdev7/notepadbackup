"use client"

import React, { useEffect, useRef } from "react"
import rough from "roughjs"
import type { Prim } from "@/lib/sketch/kit"
import { getIconComponent } from "@/lib/sketch/icons"

interface RoughRendererProps {
  prims: Prim[]
  width: number
  height: number
  className?: string
}

export function RoughRenderer({ prims, width, height, className }: RoughRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    // Clear previous rough elements
    const existing = svg.querySelectorAll(".rough-primitive")
    existing.forEach((el) => el.remove())

    const rc = rough.svg(svg)

    for (const p of prims) {
      if (p.t === "rect") {
        const node = rc.rectangle(p.x, p.y, p.w, p.h, {
          stroke: p.stroke || "currentColor",
          strokeWidth: 1.5,
          roughness: 1.2,
          fill: p.fill && p.fill !== "transparent" ? p.fill : undefined,
          fillStyle: "solid",
          seed: p.seed,
        })
        node.setAttribute("class", "rough-primitive")
        svg.appendChild(node)
      } else if (p.t === "pill") {
        // Render pill shape
        const r = Math.min(p.h / 2, 12)
        const node = rc.path(
          `M ${p.x + r} ${p.y} L ${p.x + p.w - r} ${p.y} A ${r} ${r} 0 0 1 ${p.x + p.w} ${p.y + r} L ${p.x + p.w} ${p.y + p.h - r} A ${r} ${r} 0 0 1 ${p.x + p.w - r} ${p.y + p.h} L ${p.x + r} ${p.y + p.h} A ${r} ${r} 0 0 1 ${p.x} ${p.y + p.h - r} L ${p.x} ${p.y + r} A ${r} ${r} 0 0 1 ${p.x + r} ${p.y} Z`,
          {
            stroke: p.stroke || "currentColor",
            strokeWidth: 1.4,
            roughness: 1.1,
            fill: p.fill && p.fill !== "transparent" ? p.fill : undefined,
            fillStyle: "solid",
            seed: p.seed,
          }
        )
        node.setAttribute("class", "rough-primitive")
        svg.appendChild(node)
      } else if (p.t === "line") {
        const node = rc.line(p.x1, p.y1, p.x2, p.y2, {
          stroke: p.stroke || "currentColor",
          strokeWidth: 1.4,
          roughness: 1.2,
          strokeLineDash: p.dashed ? [4, 4] : undefined,
          seed: p.seed,
        })
        node.setAttribute("class", "rough-primitive")
        svg.appendChild(node)
      } else if (p.t === "ellipse") {
        const node = rc.ellipse(p.x, p.y, p.w, p.h, {
          stroke: p.stroke || "currentColor",
          strokeWidth: 1.4,
          roughness: 1.2,
          fill: p.fill && p.fill !== "transparent" ? p.fill : undefined,
          fillStyle: "solid",
          seed: p.seed,
        })
        node.setAttribute("class", "rough-primitive")
        svg.appendChild(node)
      }
    }
  }, [prims, width, height])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={`relative select-none overflow-visible ${className || ""}`}
      style={{ width, height }}
    >
      {prims.map((p, idx) => {
        if (p.t === "text") {
          return (
            <text
              key={`txt-${idx}`}
              x={p.x}
              y={p.y + (p.size || 12)}
              fontSize={p.size || 12}
              fontWeight={p.weight === "bold" ? 700 : 500}
              textAnchor={p.align === "center" ? "middle" : p.align === "right" ? "end" : "start"}
              fill={p.color || "currentColor"}
              fontFamily="system-ui, -apple-system, sans-serif"
              className="select-none pointer-events-none"
            >
              {p.text}
            </text>
          )
        }
        if (p.t === "pill" && p.label) {
          return (
            <text
              key={`pill-lbl-${idx}`}
              x={p.x + p.w / 2}
              y={p.y + p.h / 2 + 3.5}
              fontSize={p.size === "xs" ? 10 : 12}
              fontWeight={600}
              textAnchor="middle"
              fill={p.stroke || "currentColor"}
              fontFamily="system-ui, -apple-system, sans-serif"
              className="select-none pointer-events-none"
            >
              {p.label}
            </text>
          )
        }
        if (p.t === "icon") {
          const IconComp = getIconComponent(p.name)
          if (!IconComp) return null
          return (
            <g
              key={`ico-${idx}`}
              transform={`translate(${p.x}, ${p.y})`}
              className="select-none pointer-events-none text-current"
            >
              <IconComp size={p.size} color={p.color || "currentColor"} />
            </g>
          )
        }
        return null
      })}
    </svg>
  )
}
