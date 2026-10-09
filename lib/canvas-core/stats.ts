// ---------------------------------------------------------------------------
// Zenithsui Canvas & Element Statistics Inspector
// Computes metrics on selected nodes and whole canvas
// ---------------------------------------------------------------------------

import type { SquigNode } from "@/lib/types"

export interface CanvasStats {
  totalNodes: number
  selectedCount: number
  byType: Record<string, number>
  selectionBounds: { x: number; y: number; w: number; h: number } | null
  canvasBounds: { x: number; y: number; w: number; h: number } | null
  totalVertices: number
}

export function computeCanvasStats(
  nodes: Record<string, SquigNode>,
  order: readonly string[],
  selection: readonly string[]
): CanvasStats {
  const byType: Record<string, number> = {}
  let totalVertices = 0

  let cMinX = Infinity
  let cMinY = Infinity
  let cMaxX = -Infinity
  let cMaxY = -Infinity

  for (const id of order) {
    const n = nodes[id]
    if (!n) continue
    byType[n.type] = (byType[n.type] || 0) + 1

    cMinX = Math.min(cMinX, n.x)
    cMinY = Math.min(cMinY, n.y)
    cMaxX = Math.max(cMaxX, n.x + n.w)
    cMaxY = Math.max(cMaxY, n.y + n.h)

    if (n.type === "draw" && (n as any).points) {
      totalVertices += (n as any).points.length
    } else {
      totalVertices += 4
    }
  }

  let sMinX = Infinity
  let sMinY = Infinity
  let sMaxX = -Infinity
  let sMaxY = -Infinity
  let hasSelected = false

  for (const id of selection) {
    const n = nodes[id]
    if (!n) continue
    hasSelected = true
    sMinX = Math.min(sMinX, n.x)
    sMinY = Math.min(sMinY, n.y)
    sMaxX = Math.max(sMaxX, n.x + n.w)
    sMaxY = Math.max(sMaxY, n.y + n.h)
  }

  return {
    totalNodes: order.length,
    selectedCount: selection.length,
    byType,
    selectionBounds: hasSelected
      ? { x: Math.round(sMinX), y: Math.round(sMinY), w: Math.round(sMaxX - sMinX), h: Math.round(sMaxY - sMinY) }
      : null,
    canvasBounds: order.length > 0
      ? { x: Math.round(cMinX), y: Math.round(cMinY), w: Math.round(cMaxX - cMinX), h: Math.round(cMaxY - cMinY) }
      : null,
    totalVertices,
  }
}
