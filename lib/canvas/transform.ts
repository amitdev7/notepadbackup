// ---------------------------------------------------------------------------
// Resize maths — pure. One code path for "resize this node" and "resize these
// twelve nodes", because a single node is just a selection of one.
//
// Everything is computed from the gesture-start snapshot, never from live
// state, so dragging back and forth is lossless instead of drifting.
// ---------------------------------------------------------------------------

import type { SquigNode } from "../types"
import type { Bounds } from "../selection"
import { textBlockHeight } from "../sketch/text-layout"
import { wrapText } from "./text-metrics"

export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const
export type Handle = (typeof HANDLES)[number]

/** Smallest a selection bounding box may get. */
export const MIN_SIZE = 8

const EPS = 1e-6

export interface ResizeOpts {
  /** Shift — lock the original aspect ratio. */
  aspect?: boolean
  /** Alt — grow/shrink around the centre instead of the opposite edge. */
  fromCenter?: boolean
}

/**
 * Where the bounding box ends up after dragging `handle` by (dx, dy) in world
 * units. Clamps rather than flipping — zenithsui has never supported mirrored
 * nodes and a surprise flip mid-drag is worse than a hard stop.
 */
export function resizeBounds(orig: Bounds, handle: Handle, dx: number, dy: number, opts: ResizeOpts = {}): Bounds {
  const h = typeof handle === "string" ? handle : ""
  const movesW = h.includes("w")
  const movesE = h.includes("e")
  const movesN = h.includes("n")
  const movesS = h.includes("s")
  const ox = Number.isFinite(orig?.x) ? orig.x : 0
  const oy = Number.isFinite(orig?.y) ? orig.y : 0
  const ow = Number.isFinite(orig?.w) && (orig.w as number) > 0 ? orig.w : 0
  const oh = Number.isFinite(orig?.h) && (orig.h as number) > 0 ? orig.h : 0
  dx = Number.isFinite(dx) ? dx : 0
  dy = Number.isFinite(dy) ? dy : 0

  let left = ox
  let right = ox + ow
  let top = oy
  let bottom = oy + oh

  if (movesW) {
    left = orig.x + dx
    if (opts.fromCenter) right = orig.x + orig.w - dx
  }
  if (movesE) {
    right = orig.x + orig.w + dx
    if (opts.fromCenter) left = orig.x - dx
  }
  if (movesN) {
    top = orig.y + dy
    if (opts.fromCenter) bottom = orig.y + orig.h - dy
  }
  if (movesS) {
    bottom = orig.y + orig.h + dy
    if (opts.fromCenter) top = orig.y - dy
  }

  // -- aspect lock ----------------------------------------------------------
  if (opts.aspect && ow > EPS && oh > EPS) {
    const isCorner = h.length === 2
    const cx = ox + ow / 2
    const cy = oy + oh / 2

    if (isCorner) {
      // uniform scale driven by whichever axis the user pulled harder.
      // Inverted spans floor at zero rather than going through Math.abs: an
      // absolute value turns "dragged 250px past the anchor" into "250px wide
      // again", so the box would shrink, bottom out, then grow back the other
      // way — the exact mirroring this function promises not to do.
      const s = Math.max(Math.max(0, right - left) / ow, Math.max(0, bottom - top) / oh)
      const w = ow * s
      const h = oh * s
      if (opts.fromCenter) {
        left = cx - w / 2
        right = cx + w / 2
        top = cy - h / 2
        bottom = cy + h / 2
      } else {
        // pin the corner opposite the one being dragged
        if (movesW) {
          right = ox + ow
          left = right - w
        } else {
          left = ox
          right = left + w
        }
        if (movesN) {
          bottom = oy + oh
          top = bottom - h
        } else {
          top = oy
          bottom = top + h
        }
      }
    } else if (movesE || movesW) {
      // side handle: the perpendicular axis grows about the centre
      const h = (Math.max(0, right - left) * oh) / ow
      top = cy - h / 2
      bottom = cy + h / 2
    } else {
      const w = (Math.max(0, bottom - top) * ow) / oh
      left = cx - w / 2
      right = cx + w / 2
    }
  }

  // -- clamp (never flip) ---------------------------------------------------
  if (right - left < MIN_SIZE) {
    if (opts.fromCenter) {
      const c = (left + right) / 2
      left = c - MIN_SIZE / 2
      right = c + MIN_SIZE / 2
    } else if (movesW) {
      left = right - MIN_SIZE
    } else {
      right = left + MIN_SIZE
    }
  }
  if (bottom - top < MIN_SIZE) {
    if (opts.fromCenter) {
      const c = (top + bottom) / 2
      top = c - MIN_SIZE / 2
      bottom = c + MIN_SIZE / 2
    } else if (movesN) {
      top = bottom - MIN_SIZE
    } else {
      bottom = top + MIN_SIZE
    }
  }

  return { x: left, y: top, w: right - left, h: bottom - top }
}

/**
 * Map every node from its slot in `orig` to the matching slot in `next`.
 *
 * A degenerate axis (a perfectly horizontal arrow, a single zero-width node)
 * gets a scale of 1 and rides along on the translation — dividing by zero here
 * would smear the whole selection into NaN.
 */
export function scaleNodes(
  origNodes: readonly SquigNode[],
  orig: Bounds,
  next: Bounds
): Record<string, Partial<SquigNode>> {
  const ow = Number.isFinite(orig?.w) && (orig.w as number) > EPS ? (orig.w as number) : 0
  const oh = Number.isFinite(orig?.h) && (orig.h as number) > EPS ? (orig.h as number) : 0
  const nw = Number.isFinite(next?.w) ? (next.w as number) : 0
  const nh = Number.isFinite(next?.h) ? (next.h as number) : 0
  const nx = Number.isFinite(next?.x) ? (next.x as number) : 0
  const ny = Number.isFinite(next?.y) ? (next.y as number) : 0
  const ox = Number.isFinite(orig?.x) ? (orig.x as number) : 0
  const oy = Number.isFinite(orig?.y) ? (orig.y as number) : 0
  const sx = ow > EPS ? nw / ow : 1
  const sy = oh > EPS ? nh / oh : 1
  const patches: Record<string, Partial<SquigNode>> = {}
  if (!Array.isArray(origNodes)) return patches

  const validPt = (pt: unknown): pt is [number, number] =>
    Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])

  for (const n of origNodes) {
    if (!n || !(n as any).id) continue
    const nx0 = Number.isFinite((n as any).x) ? (n as any).x : 0
    const ny0 = Number.isFinite((n as any).y) ? (n as any).y : 0
    const nw0 = Number.isFinite((n as any).w) ? (n as any).w : 0
    const nh0 = Number.isFinite((n as any).h) ? (n as any).h : 0
    const patch: Record<string, unknown> = {
      x: nx + (nx0 - ox) * sx,
      y: ny + (ny0 - oy) * sy,
      w: Math.max(nw0 * sx, 0),
      h: Math.max(nh0 * sy, 0),
    }

    if (n.type === "draw") {
      const pts: unknown[] = Array.isArray((n as any).points) ? (n as any).points : []
      patch.points = pts
        .filter((pt): pt is [number, number] => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
        .map(([px, py]) => [px * sx, py * sy] as [number, number])
    } else if (n.type === "arrow") {
      const pts: unknown[] = Array.isArray((n as any).points) ? (n as any).points : []
      patch.points = pts
        .filter((pt): pt is [number, number] => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
        .map(([px, py]) => [px * sx, py * sy]) as [[number, number], [number, number]]
    } else if (n.type === "text") {
      // the renderer lays every baseline out in multiples of the type size, so
      // the type has to follow the vertical scale or the box and the words
      // come apart — see lib/sketch/text-layout
      const nfs = Number.isFinite((n as any).fontSize) ? (n as any).fontSize : 16
      const fontSize = Math.max(4, nfs * sy)
      patch.fontSize = fontSize
      // a fixed-width layer scaled off-ratio re-breaks its lines, so the box
      // height has to come from the new wrap, not from the old height scaled
      if ((n as any).fixedW && Math.abs(sx - sy) > EPS) {
        const lines = wrapText(String((n as any).text ?? ""), nw0 * sx, { size: fontSize, bold: (n as any).bold, italic: (n as any).italic })
        patch.h = textBlockHeight(lines.length, fontSize)
      }
    }

    patches[(n as any).id] = patch as Partial<SquigNode>
  }

  return patches
}

/** Handle offsets within a bbox of the given size, for the overlay. */
export function handleOffset(handle: Handle, w: number, h: number): [number, number] {
  const hh = typeof handle === "string" ? handle : ""
  const x = hh.includes("w") ? 0 : hh.includes("e") ? w : w / 2
  const y = hh.includes("n") ? 0 : hh.includes("s") ? h : h / 2
  return [x, y]
}

export const HANDLE_CURSORS: Record<Handle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
}
