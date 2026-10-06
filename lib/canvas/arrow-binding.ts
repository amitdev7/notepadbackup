// ---------------------------------------------------------------------------
// Zenithsui Arrow Bindings — Dynamic perimeter snapping & anchoring
// ---------------------------------------------------------------------------

import type { ArrowBinding, ArrowNode, SquigNode } from "@/lib/types"

/**
 * Calculates the center point of any canvas node in world coordinates.
 */
export function getNodeCenter(node: SquigNode): [number, number] {
  return [node.x + node.w / 2, node.y + node.h / 2]
}

/**
 * Intersects a line segment from (cx, cy) to (tx, ty) with an axis-aligned box
 * [minX, minY, maxX, maxY]. Returns the intersection point with an outward gap.
 */
export function intersectBoxPerimeter(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tx: number,
  ty: number,
  gap = 6
): [number, number] {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const dx = tx - cx
  const dy = ty - cy

  if (Math.abs(dx) < 1e-5 && Math.abs(dy) < 1e-5) {
    return [maxX + gap, cy]
  }

  const halfW = (maxX - minX) / 2 + gap
  const halfH = (maxY - minY) / 2 + gap

  const scaleX = halfW / Math.abs(dx)
  const scaleY = halfH / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY)

  return [cx + dx * scale, cy + dy * scale]
}

/**
 * Intersects a line from (cx, cy) to (tx, ty) with an ellipse centered at (cx, cy)
 * with radii rx and ry.
 */
export function intersectEllipsePerimeter(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tx: number,
  ty: number,
  gap = 6
): [number, number] {
  const dx = tx - cx
  const dy = ty - cy

  if (Math.abs(dx) < 1e-5 && Math.abs(dy) < 1e-5) {
    return [cx + rx + gap, cy]
  }

  const angle = Math.atan2(dy / (ry + gap), dx / (rx + gap))
  return [cx + (rx + gap) * Math.cos(angle), cy + (ry + gap) * Math.sin(angle)]
}

/**
 * Intersects a line with a diamond polygon (rhombus).
 */
export function intersectDiamondPerimeter(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tx: number,
  ty: number,
  gap = 6
): [number, number] {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const dx = tx - cx
  const dy = ty - cy

  if (Math.abs(dx) < 1e-5 && Math.abs(dy) < 1e-5) {
    return [maxX + gap, cy]
  }

  const halfW = (maxX - minX) / 2 + gap
  const halfH = (maxY - minY) / 2 + gap

  // Diamond boundary equation: |dx| / halfW + |dy| / halfH = 1
  const t = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH)
  return [cx + dx * t, cy + dy * t]
}

/**
 * Calculates the exact point on a node's perimeter pointing toward (targetX, targetY).
 */
export function getNodePerimeterPoint(
  node: SquigNode,
  targetX: number,
  targetY: number,
  gap = 6
): [number, number] {
  if (node.type === "shape") {
    if (node.shape === "ellipse") {
      return intersectEllipsePerimeter(
        node.x + node.w / 2,
        node.y + node.h / 2,
        node.w / 2,
        node.h / 2,
        targetX,
        targetY,
        gap
      )
    }
    if (node.shape === "diamond") {
      return intersectDiamondPerimeter(
        node.x,
        node.y,
        node.x + node.w,
        node.y + node.h,
        targetX,
        targetY,
        gap
      )
    }
  }

  return intersectBoxPerimeter(
    node.x,
    node.y,
    node.x + node.w,
    node.y + node.h,
    targetX,
    targetY,
    gap
  )
}

/**
 * Finds if a point (wx, wy) is close to the perimeter of any candidate node.
 * Returns the candidate node if within snapRadius (default 24px).
 */
export function findSnapCandidateNode(
  wx: number,
  wy: number,
  nodes: Record<string, SquigNode>,
  excludeId?: string,
  snapRadius = 24
): SquigNode | null {
  for (const node of Object.values(nodes)) {
    if (node.id === excludeId || node.type === "arrow") continue

    // Expanded bounds check
    if (
      wx >= node.x - snapRadius &&
      wx <= node.x + node.w + snapRadius &&
      wy >= node.y - snapRadius &&
      wy <= node.y + node.h + snapRadius
    ) {
      return node
    }
  }
  return null
}

/**
 * Updates arrow points dynamically when bound nodes are moved.
 * Returns a dictionary of node updates to apply in the store.
 */
export function getArrowPatchesForMovedNodes(
  allNodes: Record<string, SquigNode>,
  movedNodeIds: Set<string>
): Record<string, Partial<SquigNode>> {
  const patches: Record<string, Partial<SquigNode>> = {}

  for (const node of Object.values(allNodes)) {
    if (node.type !== "arrow") continue
    const arrow = node as ArrowNode

    const startBound = arrow.startBinding?.elementId && allNodes[arrow.startBinding.elementId]
    const endBound = arrow.endBinding?.elementId && allNodes[arrow.endBinding.elementId]

    const startNeedsUpdate = arrow.startBinding?.elementId && movedNodeIds.has(arrow.startBinding.elementId)
    const endNeedsUpdate = arrow.endBinding?.elementId && movedNodeIds.has(arrow.endBinding.elementId)

    if (!startNeedsUpdate && !endNeedsUpdate) continue

    // World coordinates of start and end
    let startWorld: [number, number] = [arrow.x + arrow.points[0][0], arrow.y + arrow.points[0][1]]
    let endWorld: [number, number] = [arrow.x + arrow.points[1][0], arrow.y + arrow.points[1][1]]

    if (endBound) {
      const center = getNodeCenter(endBound)
      endWorld = getNodePerimeterPoint(endBound, startBound ? getNodeCenter(startBound)[0] : startWorld[0], startBound ? getNodeCenter(startBound)[1] : startWorld[1])
    }

    if (startBound) {
      startWorld = getNodePerimeterPoint(startBound, endWorld[0], endWorld[1])
    }

    // Recompute arrow node box and relative points
    const minX = Math.min(startWorld[0], endWorld[0])
    const minY = Math.min(startWorld[1], endWorld[1])
    const maxX = Math.max(startWorld[0], endWorld[0])
    const maxY = Math.max(startWorld[1], endWorld[1])

    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)

    const p0: [number, number] = [startWorld[0] - minX, startWorld[1] - minY]
    const p1: [number, number] = [endWorld[0] - minX, endWorld[1] - minY]

    patches[arrow.id] = {
      x: minX,
      y: minY,
      w,
      h,
      points: [p0, p1],
    }
  }

  return patches
}

/**
 * Clears bindings from arrows when their target nodes are deleted.
 */
export function cleanBindingsForDeletedNodes(
  allNodes: Record<string, SquigNode>,
  deletedNodeIds: Set<string>
): Record<string, Partial<SquigNode>> {
  const patches: Record<string, Partial<SquigNode>> = {}

  for (const node of Object.values(allNodes)) {
    if (node.type !== "arrow") continue
    const arrow = node as ArrowNode

    let modified = false
    let startBinding: ArrowBinding | null | undefined = arrow.startBinding
    let endBinding: ArrowBinding | null | undefined = arrow.endBinding

    if (startBinding?.elementId && deletedNodeIds.has(startBinding.elementId)) {
      startBinding = null
      modified = true
    }

    if (endBinding?.elementId && deletedNodeIds.has(endBinding.elementId)) {
      endBinding = null
      modified = true
    }

    if (modified) {
      patches[arrow.id] = {
        startBinding,
        endBinding,
      }
    }
  }

  return patches
}
