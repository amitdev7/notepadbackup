// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Deterministic Sketch Renderers
// Converts recognized symbols and shapes into pristine Zenithsui canvas nodes
// adhering strictly to the hand-drawn rough.js napkin aesthetic.
// ---------------------------------------------------------------------------

import type {
  ArrowNode,
  FillTone,
  ShapeNode,
  SquigNode,
  StrokeWeight,
} from "@/lib/types"
import type { Point, RecognizedSketchKind } from "./types"

export interface RenderStyleOptions {
  color?: string
  stroke?: StrokeWeight
  strokeWidth?: number
  fill?: FillTone
  opacity?: number
  drawMode?: "pen" | "marker" | "highlighter"
}

export interface RenderBounds {
  x: number
  y: number
  w: number
  h: number
}

function createBaseProps(id: string, bounds: RenderBounds, style: RenderStyleOptions) {
  return {
    id,
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    w: Math.max(16, Math.round(bounds.w)),
    h: Math.max(16, Math.round(bounds.h)),
    color: style.color,
    stroke: style.stroke || "regular",
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    seed: Math.floor(Math.random() * 1000000) + 1,
  }
}

/**
 * Generate a 5-pointed star path normalized to (w, h)
 */
function generateStarPoints(w: number, h: number): Point[] {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2
  const ry = h / 2
  const points: Point[] = []
  const numPoints = 5

  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints - Math.PI / 2
    const factor = i % 2 === 0 ? 1 : 0.42
    const px = cx + rx * factor * Math.cos(angle)
    const py = cy + ry * factor * Math.sin(angle)
    points.push([Math.round(px), Math.round(py)])
  }
  points.push(points[0])
  return points
}

/**
 * Generate a heart path normalized to (w, h)
 */
function generateHeartPoints(w: number, h: number): Point[] {
  const points: Point[] = []
  const steps = 36
  const raw: [number, number][] = []

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    )
    raw.push([x, y])
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const rw = maxX - minX || 1
  const rh = maxY - minY || 1

  for (const [x, y] of raw) {
    const nx = ((x - minX) / rw) * (w * 0.9) + w * 0.05
    const ny = ((y - minY) / rh) * (h * 0.9) + h * 0.05
    points.push([Math.round(nx), Math.round(ny)])
  }
  return points
}

/**
 * Generate a cloud path normalized to (w, h)
 */
function generateCloudPoints(w: number, h: number): Point[] {
  const pts: Point[] = []
  const leftX = w * 0.12
  const rightX = w * 0.88
  const bottomY = h * 0.82

  // Flat curved bottom
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const x = leftX + t * (rightX - leftX)
    const y = bottomY + Math.sin(t * Math.PI) * (h * 0.05)
    pts.push([Math.round(x), Math.round(y)])
  }

  // Right arc
  const arc1Steps = 8
  for (let i = 0; i <= arc1Steps; i++) {
    const a = -Math.PI / 2 + (i / arc1Steps) * Math.PI
    const cx = rightX
    const cy = h * 0.58
    pts.push([
      Math.round(cx + Math.cos(a) * (w * 0.12)),
      Math.round(cy - Math.sin(a) * (h * 0.22)),
    ])
  }

  // Top-right lobe
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI
    const cx = w * 0.65
    const cy = h * 0.38
    pts.push([
      Math.round(cx + Math.cos(a) * (w * 0.2)),
      Math.round(cy - Math.sin(a) * (h * 0.28)),
    ])
  }

  // Top-left lobe
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI
    const cx = w * 0.35
    const cy = h * 0.32
    pts.push([
      Math.round(cx + Math.cos(a) * (w * 0.22)),
      Math.round(cy - Math.sin(a) * (h * 0.28)),
    ])
  }

  // Left arc back to bottom
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI
    const cx = leftX
    const cy = h * 0.6
    pts.push([
      Math.round(cx + Math.cos(a) * (w * 0.12)),
      Math.round(cy - Math.sin(a) * (h * 0.2)),
    ])
  }

  pts.push(pts[0])
  return pts
}

/**
 * Generate gear points normalized to (w, h)
 */
function generateGearStrokes(w: number, h: number): Point[][] {
  const cx = w / 2
  const cy = h / 2
  const numTeeth = 8
  const outerR = Math.min(w, h) * 0.46
  const innerR = Math.min(w, h) * 0.36
  const centerHoleR = Math.min(w, h) * 0.16

  const gearOutline: Point[] = []
  const totalSteps = numTeeth * 4
  for (let i = 0; i < totalSteps; i++) {
    const angle = (i * 2 * Math.PI) / totalSteps
    const isTooth = i % 4 === 1 || i % 4 === 2
    const r = isTooth ? outerR : innerR
    gearOutline.push([
      Math.round(cx + r * Math.cos(angle)),
      Math.round(cy + r * Math.sin(angle)),
    ])
  }
  gearOutline.push(gearOutline[0])

  // Center hole
  const centerHole: Point[] = []
  for (let i = 0; i <= 16; i++) {
    const angle = (i * 2 * Math.PI) / 16
    centerHole.push([
      Math.round(cx + centerHoleR * Math.cos(angle)),
      Math.round(cy + centerHoleR * Math.sin(angle)),
    ])
  }

  return [gearOutline, centerHole]
}

/**
 * Render a recognized symbol or shape into a pristine Zenithsui SquigNode.
 */
export function renderRecognizedNode(
  id: string,
  kind: RecognizedSketchKind | string,
  bounds: RenderBounds,
  style: RenderStyleOptions = {},
  metadata: Record<string, any> = {}
): SquigNode {
  const base = createBaseProps(id, bounds, style)
  const { w, h } = base

  switch (kind) {
    // --- BASIC GEOMETRY ---
    case "circle":
    case "ellipse": {
      const node: ShapeNode = {
        ...base,
        type: "shape",
        shape: "ellipse",
        fill: style.fill || "none",
      }
      return node
    }

    case "rectangle": {
      const node: ShapeNode = {
        ...base,
        type: "shape",
        shape: "rect",
        fill: style.fill || "none",
      }
      return node
    }

    case "line": {
      const x1 = metadata.x1 !== undefined ? Math.round(metadata.x1 - bounds.x) : 0
      const y1 = metadata.y1 !== undefined ? Math.round(metadata.y1 - bounds.y) : Math.round(h / 2)
      const x2 = metadata.x2 !== undefined ? Math.round(metadata.x2 - bounds.x) : w
      const y2 = metadata.y2 !== undefined ? Math.round(metadata.y2 - bounds.y) : Math.round(h / 2)

      const node: ArrowNode = {
        ...base,
        type: "arrow",
        points: [
          [x1, y1],
          [x2, y2],
        ],
        head: false,
      }
      return node
    }

    case "arrow": {
      const x1 = metadata.x1 !== undefined ? Math.round(metadata.x1 - bounds.x) : 0
      const y1 = metadata.y1 !== undefined ? Math.round(metadata.y1 - bounds.y) : Math.round(h / 2)
      const x2 = metadata.x2 !== undefined ? Math.round(metadata.x2 - bounds.x) : w
      const y2 = metadata.y2 !== undefined ? Math.round(metadata.y2 - bounds.y) : Math.round(h / 2)

      const node: ArrowNode = {
        ...base,
        type: "arrow",
        points: [
          [x1, y1],
          [x2, y2],
        ],
        head: true,
      }
      return node
    }

    case "triangle": {
      const pts: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.06)],
        [Math.round(w * 0.94), Math.round(h * 0.94)],
        [Math.round(w * 0.06), Math.round(h * 0.94)],
        [Math.round(w * 0.5), Math.round(h * 0.06)],
      ]
      return {
        ...base,
        type: "draw",
        points: pts,
        recognizedKind: "triangle",
      }
    }

    // --- SYMBOLS ---
    case "checkmark": {
      const pts: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.55)],
        [Math.round(w * 0.38), Math.round(h * 0.94)],
        [Math.round(w * 0.94), Math.round(h * 0.08)],
      ]
      return {
        ...base,
        type: "draw",
        points: pts,
        recognizedKind: "checkmark",
      }
    }

    case "x": {
      const s1: Point[] = [
        [Math.round(w * 0.12), Math.round(h * 0.12)],
        [Math.round(w * 0.88), Math.round(h * 0.88)],
      ]
      const s2: Point[] = [
        [Math.round(w * 0.88), Math.round(h * 0.12)],
        [Math.round(w * 0.12), Math.round(h * 0.88)],
      ]
      return {
        ...base,
        type: "draw",
        points: s1,
        strokes: [s1, s2],
        recognizedKind: "x",
      }
    }

    case "plus": {
      const s1: Point[] = [
        [Math.round(w * 0.1), Math.round(h * 0.5)],
        [Math.round(w * 0.9), Math.round(h * 0.5)],
      ]
      const s2: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.1)],
        [Math.round(w * 0.5), Math.round(h * 0.9)],
      ]
      return {
        ...base,
        type: "draw",
        points: s1,
        strokes: [s1, s2],
        recognizedKind: "plus",
      }
    }

    case "star": {
      const pts = generateStarPoints(w, h)
      return {
        ...base,
        type: "draw",
        points: pts,
        recognizedKind: "star",
      }
    }

    case "heart": {
      const pts = generateHeartPoints(w, h)
      return {
        ...base,
        type: "draw",
        points: pts,
        recognizedKind: "heart",
      }
    }

    case "cloud": {
      const pts = generateCloudPoints(w, h)
      return {
        ...base,
        type: "draw",
        points: pts,
        recognizedKind: "cloud",
      }
    }

    // --- OBJECTS ---
    case "house": {
      // Clean napkin sketch house: roof + body + door
      const roof: Point[] = [
        [Math.round(w * 0.06), Math.round(h * 0.44)],
        [Math.round(w * 0.5), Math.round(h * 0.06)],
        [Math.round(w * 0.94), Math.round(h * 0.44)],
      ]
      const body: Point[] = [
        [Math.round(w * 0.15), Math.round(h * 0.44)],
        [Math.round(w * 0.15), Math.round(h * 0.94)],
        [Math.round(w * 0.85), Math.round(h * 0.94)],
        [Math.round(w * 0.85), Math.round(h * 0.44)],
      ]
      const door: Point[] = [
        [Math.round(w * 0.38), Math.round(h * 0.94)],
        [Math.round(w * 0.38), Math.round(h * 0.65)],
        [Math.round(w * 0.62), Math.round(h * 0.65)],
        [Math.round(w * 0.62), Math.round(h * 0.94)],
      ]
      return {
        ...base,
        type: "draw",
        points: roof,
        strokes: [roof, body, door],
        recognizedKind: "house",
      }
    }

    case "apple": {
      // Apple silhouette + stem + leaf
      const body: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.22)],
        [Math.round(w * 0.28), Math.round(h * 0.15)],
        [Math.round(w * 0.08), Math.round(h * 0.38)],
        [Math.round(w * 0.15), Math.round(h * 0.82)],
        [Math.round(w * 0.38), Math.round(h * 0.95)],
        [Math.round(w * 0.5), Math.round(h * 0.9)],
        [Math.round(w * 0.62), Math.round(h * 0.95)],
        [Math.round(w * 0.85), Math.round(h * 0.82)],
        [Math.round(w * 0.92), Math.round(h * 0.38)],
        [Math.round(w * 0.72), Math.round(h * 0.15)],
        [Math.round(w * 0.5), Math.round(h * 0.22)],
      ]
      const stem: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.22)],
        [Math.round(w * 0.53), Math.round(h * 0.12)],
        [Math.round(w * 0.56), Math.round(h * 0.05)],
      ]
      const leaf: Point[] = [
        [Math.round(w * 0.53), Math.round(h * 0.12)],
        [Math.round(w * 0.7), Math.round(h * 0.08)],
        [Math.round(w * 0.62), Math.round(h * 0.18)],
        [Math.round(w * 0.53), Math.round(h * 0.12)],
      ]
      return {
        ...base,
        type: "draw",
        points: body,
        strokes: [body, stem, leaf],
        recognizedKind: "apple",
      }
    }

    case "lightbulb": {
      const bulb: Point[] = [
        [Math.round(w * 0.35), Math.round(h * 0.72)],
        [Math.round(w * 0.18), Math.round(h * 0.55)],
        [Math.round(w * 0.15), Math.round(h * 0.35)],
        [Math.round(w * 0.3), Math.round(h * 0.1)],
        [Math.round(w * 0.7), Math.round(h * 0.1)],
        [Math.round(w * 0.85), Math.round(h * 0.35)],
        [Math.round(w * 0.82), Math.round(h * 0.55)],
        [Math.round(w * 0.65), Math.round(h * 0.72)],
      ]
      const baseThreads: Point[] = [
        [Math.round(w * 0.32), Math.round(h * 0.78)],
        [Math.round(w * 0.68), Math.round(h * 0.78)],
      ]
      const baseBottom: Point[] = [
        [Math.round(w * 0.38), Math.round(h * 0.86)],
        [Math.round(w * 0.62), Math.round(h * 0.86)],
      ]
      const tip: Point[] = [
        [Math.round(w * 0.44), Math.round(h * 0.94)],
        [Math.round(w * 0.56), Math.round(h * 0.94)],
      ]
      const filament: Point[] = [
        [Math.round(w * 0.42), Math.round(h * 0.6)],
        [Math.round(w * 0.45), Math.round(h * 0.35)],
        [Math.round(w * 0.55), Math.round(h * 0.35)],
        [Math.round(w * 0.58), Math.round(h * 0.6)],
      ]
      return {
        ...base,
        type: "draw",
        points: bulb,
        strokes: [bulb, baseThreads, baseBottom, tip, filament],
        recognizedKind: "lightbulb",
      }
    }

    case "phone": {
      const frame: Point[] = [
        [Math.round(w * 0.12), Math.round(h * 0.08)],
        [Math.round(w * 0.88), Math.round(h * 0.08)],
        [Math.round(w * 0.88), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.08)],
      ]
      const screen: Point[] = [
        [Math.round(w * 0.2), Math.round(h * 0.16)],
        [Math.round(w * 0.8), Math.round(h * 0.16)],
        [Math.round(w * 0.8), Math.round(h * 0.84)],
        [Math.round(w * 0.2), Math.round(h * 0.84)],
        [Math.round(w * 0.2), Math.round(h * 0.16)],
      ]
      const speaker: Point[] = [
        [Math.round(w * 0.42), Math.round(h * 0.11)],
        [Math.round(w * 0.58), Math.round(h * 0.11)],
      ]
      const homeBar: Point[] = [
        [Math.round(w * 0.44), Math.round(h * 0.88)],
        [Math.round(w * 0.56), Math.round(h * 0.88)],
      ]
      return {
        ...base,
        type: "draw",
        points: frame,
        strokes: [frame, screen, speaker, homeBar],
        recognizedKind: "phone",
      }
    }

    case "tree": {
      const trunk: Point[] = [
        [Math.round(w * 0.42), Math.round(h * 0.62)],
        [Math.round(w * 0.42), Math.round(h * 0.95)],
        [Math.round(w * 0.58), Math.round(h * 0.95)],
        [Math.round(w * 0.58), Math.round(h * 0.62)],
      ]
      const crown = generateCloudPoints(w * 0.95, h * 0.65).map(([px, py]) => [
        Math.round(px + w * 0.025),
        Math.round(py + h * 0.02),
      ]) as Point[]
      return {
        ...base,
        type: "draw",
        points: crown,
        strokes: [trunk, crown],
        recognizedKind: "tree",
      }
    }

    case "folder": {
      const tab: Point[] = [
        [Math.round(w * 0.1), Math.round(h * 0.35)],
        [Math.round(w * 0.1), Math.round(h * 0.2)],
        [Math.round(w * 0.42), Math.round(h * 0.2)],
        [Math.round(w * 0.5), Math.round(h * 0.35)],
      ]
      const body: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.35)],
        [Math.round(w * 0.92), Math.round(h * 0.35)],
        [Math.round(w * 0.92), Math.round(h * 0.88)],
        [Math.round(w * 0.08), Math.round(h * 0.88)],
        [Math.round(w * 0.08), Math.round(h * 0.35)],
      ]
      return {
        ...base,
        type: "draw",
        points: body,
        strokes: [tab, body],
        recognizedKind: "folder",
      }
    }

    case "camera": {
      const body: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.3)],
        [Math.round(w * 0.3), Math.round(h * 0.3)],
        [Math.round(w * 0.38), Math.round(h * 0.18)],
        [Math.round(w * 0.62), Math.round(h * 0.18)],
        [Math.round(w * 0.7), Math.round(h * 0.3)],
        [Math.round(w * 0.92), Math.round(h * 0.3)],
        [Math.round(w * 0.92), Math.round(h * 0.88)],
        [Math.round(w * 0.08), Math.round(h * 0.88)],
        [Math.round(w * 0.08), Math.round(h * 0.3)],
      ]
      // Lens circle
      const lens: Point[] = []
      const lensR = Math.min(w, h) * 0.22
      const cx = w * 0.5
      const cy = h * 0.58
      for (let i = 0; i <= 16; i++) {
        const a = (i * 2 * Math.PI) / 16
        lens.push([Math.round(cx + lensR * Math.cos(a)), Math.round(cy + lensR * Math.sin(a))])
      }
      return {
        ...base,
        type: "draw",
        points: body,
        strokes: [body, lens],
        recognizedKind: "camera",
      }
    }

    case "lock": {
      // Shackle
      const shackle: Point[] = [
        [Math.round(w * 0.3), Math.round(h * 0.5)],
        [Math.round(w * 0.3), Math.round(h * 0.25)],
        [Math.round(w * 0.5), Math.round(h * 0.1)],
        [Math.round(w * 0.7), Math.round(h * 0.25)],
        [Math.round(w * 0.7), Math.round(h * 0.5)],
      ]
      // Body
      const lockBody: Point[] = [
        [Math.round(w * 0.18), Math.round(h * 0.48)],
        [Math.round(w * 0.82), Math.round(h * 0.48)],
        [Math.round(w * 0.82), Math.round(h * 0.92)],
        [Math.round(w * 0.18), Math.round(h * 0.92)],
        [Math.round(w * 0.18), Math.round(h * 0.48)],
      ]
      // Keyhole
      const keyhole: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.62)],
        [Math.round(w * 0.45), Math.round(h * 0.78)],
        [Math.round(w * 0.55), Math.round(h * 0.78)],
        [Math.round(w * 0.5), Math.round(h * 0.62)],
      ]
      return {
        ...base,
        type: "draw",
        points: lockBody,
        strokes: [shackle, lockBody, keyhole],
        recognizedKind: "lock",
      }
    }

    case "envelope": {
      const rectBox: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.18)],
        [Math.round(w * 0.92), Math.round(h * 0.18)],
        [Math.round(w * 0.92), Math.round(h * 0.84)],
        [Math.round(w * 0.08), Math.round(h * 0.84)],
        [Math.round(w * 0.08), Math.round(h * 0.18)],
      ]
      const flap: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.18)],
        [Math.round(w * 0.5), Math.round(h * 0.55)],
        [Math.round(w * 0.92), Math.round(h * 0.18)],
      ]
      const bottomDiags: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.84)],
        [Math.round(w * 0.42), Math.round(h * 0.5)],
      ]
      const bottomDiags2: Point[] = [
        [Math.round(w * 0.92), Math.round(h * 0.84)],
        [Math.round(w * 0.58), Math.round(h * 0.5)],
      ]
      return {
        ...base,
        type: "draw",
        points: rectBox,
        strokes: [rectBox, flap, bottomDiags, bottomDiags2],
        recognizedKind: "envelope",
      }
    }

    case "calendar": {
      const sheet: Point[] = [
        [Math.round(w * 0.1), Math.round(h * 0.15)],
        [Math.round(w * 0.9), Math.round(h * 0.15)],
        [Math.round(w * 0.9), Math.round(h * 0.9)],
        [Math.round(w * 0.1), Math.round(h * 0.9)],
        [Math.round(w * 0.1), Math.round(h * 0.15)],
      ]
      const headerLine: Point[] = [
        [Math.round(w * 0.1), Math.round(h * 0.36)],
        [Math.round(w * 0.9), Math.round(h * 0.36)],
      ]
      const ring1: Point[] = [
        [Math.round(w * 0.3), Math.round(h * 0.08)],
        [Math.round(w * 0.3), Math.round(h * 0.22)],
      ]
      const ring2: Point[] = [
        [Math.round(w * 0.7), Math.round(h * 0.08)],
        [Math.round(w * 0.7), Math.round(h * 0.22)],
      ]
      const gridRow1: Point[] = [
        [Math.round(w * 0.2), Math.round(h * 0.52)],
        [Math.round(w * 0.8), Math.round(h * 0.52)],
      ]
      const gridRow2: Point[] = [
        [Math.round(w * 0.2), Math.round(h * 0.7)],
        [Math.round(w * 0.8), Math.round(h * 0.7)],
      ]
      return {
        ...base,
        type: "draw",
        points: sheet,
        strokes: [sheet, headerLine, ring1, ring2, gridRow1, gridRow2],
        recognizedKind: "calendar",
      }
    }

    case "document": {
      const pageOutline: Point[] = [
        [Math.round(w * 0.12), Math.round(h * 0.08)],
        [Math.round(w * 0.68), Math.round(h * 0.08)],
        [Math.round(w * 0.88), Math.round(h * 0.26)],
        [Math.round(w * 0.88), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.08)],
      ]
      const dogEar: Point[] = [
        [Math.round(w * 0.68), Math.round(h * 0.08)],
        [Math.round(w * 0.68), Math.round(h * 0.26)],
        [Math.round(w * 0.88), Math.round(h * 0.26)],
      ]
      const line1: Point[] = [
        [Math.round(w * 0.25), Math.round(h * 0.42)],
        [Math.round(w * 0.75), Math.round(h * 0.42)],
      ]
      const line2: Point[] = [
        [Math.round(w * 0.25), Math.round(h * 0.58)],
        [Math.round(w * 0.75), Math.round(h * 0.58)],
      ]
      const line3: Point[] = [
        [Math.round(w * 0.25), Math.round(h * 0.74)],
        [Math.round(w * 0.6), Math.round(h * 0.74)],
      ]
      return {
        ...base,
        type: "draw",
        points: pageOutline,
        strokes: [pageOutline, dogEar, line1, line2, line3],
        recognizedKind: "document",
      }
    }

    case "gear": {
      const strokes = generateGearStrokes(w, h)
      return {
        ...base,
        type: "draw",
        points: strokes[0],
        strokes,
        recognizedKind: "gear",
      }
    }

    case "minus": {
      const line: Point[] = [
        [0, Math.round(h / 2)],
        [w, Math.round(h / 2)],
      ]
      return {
        ...base,
        type: "draw",
        points: line,
        strokes: [line],
        recognizedKind: "minus",
      }
    }

    case "computer": {
      // Laptop: display top + keyboard base bottom
      const screen: Point[] = [
        [Math.round(w * 0.15), Math.round(h * 0.15)],
        [Math.round(w * 0.85), Math.round(h * 0.15)],
        [Math.round(w * 0.85), Math.round(h * 0.7)],
        [Math.round(w * 0.15), Math.round(h * 0.7)],
        [Math.round(w * 0.15), Math.round(h * 0.15)],
      ]
      const basePlate: Point[] = [
        [Math.round(w * 0.05), Math.round(h * 0.7)],
        [Math.round(w * 0.95), Math.round(h * 0.7)],
        [Math.round(w * 0.9), Math.round(h * 0.85)],
        [Math.round(w * 0.1), Math.round(h * 0.85)],
        [Math.round(w * 0.05), Math.round(h * 0.7)],
      ]
      const trackpad: Point[] = [
        [Math.round(w * 0.42), Math.round(h * 0.75)],
        [Math.round(w * 0.58), Math.round(h * 0.75)],
      ]
      return {
        ...base,
        type: "draw",
        points: screen,
        strokes: [screen, basePlate, trackpad],
        recognizedKind: "computer",
      }
    }

    case "monitor": {
      const screen: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.1)],
        [Math.round(w * 0.92), Math.round(h * 0.1)],
        [Math.round(w * 0.92), Math.round(h * 0.7)],
        [Math.round(w * 0.08), Math.round(h * 0.7)],
        [Math.round(w * 0.08), Math.round(h * 0.1)],
      ]
      const stand: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.7)],
        [Math.round(w * 0.5), Math.round(h * 0.9)],
      ]
      const foot: Point[] = [
        [Math.round(w * 0.3), Math.round(h * 0.9)],
        [Math.round(w * 0.7), Math.round(h * 0.9)],
      ]
      return {
        ...base,
        type: "draw",
        points: screen,
        strokes: [screen, stand, foot],
        recognizedKind: "monitor",
      }
    }

    case "person": {
      // Head circle + shoulders
      const head: Point[] = []
      const r = Math.min(w, h) * 0.22
      const cx = w * 0.5
      const cy = h * 0.28
      for (let i = 0; i <= 16; i++) {
        const a = (i * 2 * Math.PI) / 16
        head.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))])
      }
      const shoulders: Point[] = [
        [Math.round(w * 0.12), Math.round(h * 0.9)],
        [Math.round(w * 0.25), Math.round(h * 0.65)],
        [Math.round(w * 0.75), Math.round(h * 0.65)],
        [Math.round(w * 0.88), Math.round(h * 0.9)],
      ]
      return {
        ...base,
        type: "draw",
        points: head,
        strokes: [head, shoulders],
        recognizedKind: "person",
      }
    }

    case "car": {
      // Car silhouette
      const body: Point[] = [
        [Math.round(w * 0.05), Math.round(h * 0.65)],
        [Math.round(w * 0.2), Math.round(h * 0.45)],
        [Math.round(w * 0.45), Math.round(h * 0.3)],
        [Math.round(w * 0.75), Math.round(h * 0.3)],
        [Math.round(w * 0.92), Math.round(h * 0.55)],
        [Math.round(w * 0.95), Math.round(h * 0.75)],
        [Math.round(w * 0.05), Math.round(h * 0.75)],
        [Math.round(w * 0.05), Math.round(h * 0.65)],
      ]
      // Wheels
      const makeWheel = (wcx: number) => {
        const wheel: Point[] = []
        const wr = Math.min(w, h) * 0.12
        for (let i = 0; i <= 12; i++) {
          const a = (i * 2 * Math.PI) / 12
          wheel.push([Math.round(wcx + wr * Math.cos(a)), Math.round(h * 0.75 + wr * Math.sin(a))])
        }
        return wheel
      }
      const w1 = makeWheel(w * 0.28)
      const w2 = makeWheel(w * 0.76)
      return {
        ...base,
        type: "draw",
        points: body,
        strokes: [body, w1, w2],
        recognizedKind: "car",
      }
    }

    case "clock": {
      const face: Point[] = []
      const r = Math.min(w, h) * 0.45
      const cx = w * 0.5
      const cy = h * 0.5
      for (let i = 0; i <= 20; i++) {
        const a = (i * 2 * Math.PI) / 20
        face.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))])
      }
      const hourHand: Point[] = [
        [Math.round(cx), Math.round(cy)],
        [Math.round(cx), Math.round(cy - r * 0.55)],
      ]
      const minHand: Point[] = [
        [Math.round(cx), Math.round(cy)],
        [Math.round(cx + r * 0.7), Math.round(cy)],
      ]
      return {
        ...base,
        type: "draw",
        points: face,
        strokes: [face, hourHand, minHand],
        recognizedKind: "clock",
      }
    }

    case "microphone": {
      const micHead: Point[] = [
        [Math.round(w * 0.38), Math.round(h * 0.15)],
        [Math.round(w * 0.62), Math.round(h * 0.15)],
        [Math.round(w * 0.62), Math.round(h * 0.55)],
        [Math.round(w * 0.38), Math.round(h * 0.55)],
        [Math.round(w * 0.38), Math.round(h * 0.15)],
      ]
      const cradle: Point[] = [
        [Math.round(w * 0.28), Math.round(h * 0.4)],
        [Math.round(w * 0.28), Math.round(h * 0.62)],
        [Math.round(w * 0.72), Math.round(h * 0.62)],
        [Math.round(w * 0.72), Math.round(h * 0.4)],
      ]
      const stem: Point[] = [
        [Math.round(w * 0.5), Math.round(h * 0.62)],
        [Math.round(w * 0.5), Math.round(h * 0.88)],
      ]
      const basePlate: Point[] = [
        [Math.round(w * 0.32), Math.round(h * 0.88)],
        [Math.round(w * 0.68), Math.round(h * 0.88)],
      ]
      return {
        ...base,
        type: "draw",
        points: micHead,
        strokes: [micHead, cradle, stem, basePlate],
        recognizedKind: "microphone",
      }
    }

    case "database": {
      // 3 horizontal ellipses/levels
      const makeEllipse = (ey: number) => {
        const pts: Point[] = []
        const rx = w * 0.42
        const ry = h * 0.12
        for (let i = 0; i <= 16; i++) {
          const a = (i * 2 * Math.PI) / 16
          pts.push([Math.round(w * 0.5 + rx * Math.cos(a)), Math.round(ey + ry * Math.sin(a))])
        }
        return pts
      }
      const topE = makeEllipse(h * 0.2)
      const midE = makeEllipse(h * 0.52)
      const botE = makeEllipse(h * 0.84)
      const leftWall: Point[] = [
        [Math.round(w * 0.08), Math.round(h * 0.2)],
        [Math.round(w * 0.08), Math.round(h * 0.84)],
      ]
      const rightWall: Point[] = [
        [Math.round(w * 0.92), Math.round(h * 0.2)],
        [Math.round(w * 0.92), Math.round(h * 0.84)],
      ]
      return {
        ...base,
        type: "draw",
        points: topE,
        strokes: [topE, midE, botE, leftWall, rightWall],
        recognizedKind: "database",
      }
    }

    case "server": {
      const rack: Point[] = [
        [Math.round(w * 0.12), Math.round(h * 0.08)],
        [Math.round(w * 0.88), Math.round(h * 0.08)],
        [Math.round(w * 0.88), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.92)],
        [Math.round(w * 0.12), Math.round(h * 0.08)],
      ]
      const slot1: Point[] = [
        [Math.round(w * 0.18), Math.round(h * 0.3)],
        [Math.round(w * 0.82), Math.round(h * 0.3)],
      ]
      const slot2: Point[] = [
        [Math.round(w * 0.18), Math.round(h * 0.55)],
        [Math.round(w * 0.82), Math.round(h * 0.55)],
      ]
      const slot3: Point[] = [
        [Math.round(w * 0.18), Math.round(h * 0.78)],
        [Math.round(w * 0.82), Math.round(h * 0.78)],
      ]
      return {
        ...base,
        type: "draw",
        points: rack,
        strokes: [rack, slot1, slot2, slot3],
        recognizedKind: "server",
      }
    }

    default:
      // Check if it's handwriting / text
      if (kind === "text" || metadata?.text) {
        const textStr = (metadata?.text as string) || "Text"
        const fontSize =
          (metadata?.fontSize as number) ||
          Math.max(16, Math.min(64, Math.round(h * 0.75)))
        return {
          ...base,
          type: "text",
          text: textStr,
          fontSize,
          align: "left",
        }
      }

      // Fallback: draw node
      return {
        ...base,
        type: "draw",
        points: [
          [0, 0],
          [w, h],
        ],
        recognizedKind: kind,
      }
  }
}
