// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Dataset Archetypes & Base Stroke Definitions
// Multi-style canonical vector strokes across handwriting, geometry, symbols,
// semantic objects, and negative/scribble classes for real CNN training.
// ---------------------------------------------------------------------------

import type { Point } from "./types"

export function line(x1: number, y1: number, x2: number, y2: number, steps = 8): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
  }
  return pts
}

export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  steps = 12
): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const th = startAngle + (endAngle - startAngle) * (i / steps)
    pts.push([cx + rx * Math.cos(th), cy + ry * Math.sin(th)])
  }
  return pts
}

export function circle(cx: number, cy: number, r: number, steps = 18): Point[] {
  return arc(cx, cy, r, r, 0, Math.PI * 2, steps)
}

// ---------------------------------------------------------------------------
// Handwriting Stroke Archetypes (A–Z, 0–9)
// Multiple drawing variations per character (e.g. style 1, style 2)
// ---------------------------------------------------------------------------

export const HANDWRITING_CLASSES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "UNKNOWN"
]

export function getHandwritingArchetypes(char: string): Point[][][] {
  const x = 5, y = 5, w = 40, h = 55
  const x2 = x + w, y2 = y + h, xm = x + w / 2, ym = y + h / 2

  switch (char) {
    case "A":
      return [
        // Style 1: 3 strokes (left leg up, right leg down, crossbar left-to-right)
        [line(x, y2, xm, y), line(xm, y, x2, y2), line(x + w * 0.22, ym + 4, x2 - w * 0.22, ym + 4)],
        // Style 2: 2 strokes (continuous inverted V, separate crossbar)
        [[...line(x, y2, xm, y), ...line(xm, y, x2, y2)], line(x + w * 0.25, ym + 5, x2 - w * 0.25, ym + 5)],
        // Style 3: 1 stroke (continuous: up to apex, down right, loop back across middle)
        [[...line(x, y2, xm, y), ...line(xm, y, x2, y2), ...line(x2, y2, x2 - w * 0.15, ym + 4), ...line(x2 - w * 0.15, ym + 4, x + w * 0.22, ym + 4)]],
        // Style 4: 2 strokes (left leg up, right leg down curving into crossbar)
        [line(x, y2, xm, y), [...line(xm, y, x2, y2), ...line(x2, y2, x + w * 0.22, ym + 4)]],
        // Style 5: 3 strokes drawn downwards from apex
        [line(xm, y, x, y2), line(xm, y, x2, y2), line(x + w * 0.22, ym + 4, x2 - w * 0.22, ym + 4)],
      ]
    case "B":
      return [
        // Style 1: stem + 2 rounded bumps
        [
          line(x, y, x, y2),
          [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.42, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
          [...line(x, ym, xm, ym), ...arc(xm, y + h * 0.75, w * 0.46, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)],
        ],
        // Style 2: continuous B
        [
          [
            ...line(x, y2, x, y),
            ...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI / 2, Math.PI / 2),
            ...arc(xm, y + h * 0.75, w * 0.48, h * 0.25, -Math.PI / 2, Math.PI / 2),
            ...line(xm, y2, x, y2),
          ],
        ],
      ]
    case "C":
      return [
        [arc(xm + 4, ym, w * 0.46, h * 0.48, -Math.PI * 0.75, Math.PI * 0.75)],
        [arc(xm + 2, ym, w * 0.42, h * 0.46, -Math.PI * 0.8, Math.PI * 0.8)],
      ]
    case "D":
      return [
        [line(x, y, x, y2), [...line(x, y, xm, y), ...arc(xm, ym, w * 0.48, h * 0.5, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)]],
        [[...line(x, y2, x, y), ...arc(xm, ym, w * 0.48, h * 0.5, -Math.PI / 2, Math.PI / 2), ...line(xm, y2, x, y2)]],
      ]
    case "E":
      return [
        [line(x, y, x, y2), line(x, y, x2, y), line(x, ym, x + w * 0.7, ym), line(x, y2, x2, y2)],
        [[...line(x2, y, x, y), ...line(x, y, x, y2), ...line(x, y2, x2, y2)], line(x, ym, x + w * 0.65, ym)],
      ]
    case "F":
      return [
        [line(x, y, x, y2), line(x, y, x2, y), line(x, ym, x + w * 0.7, ym)],
        [[...line(x, y2, x, y), ...line(x, y, x2, y)], line(x, ym, x + w * 0.65, ym)],
      ]
    case "G":
      return [
        [[...arc(xm + 3, ym, w * 0.48, h * 0.48, -Math.PI * 0.75, Math.PI * 0.5), ...line(x2 - 2, y2 - 4, x2 - 2, ym), ...line(x2 - 2, ym, xm, ym)]],
      ]
    case "H":
      return [
        [line(x, y, x, y2), line(x2, y, x2, y2), line(x, ym, x2, ym)],
      ]
    case "I":
      return [
        [line(xm, y, xm, y2)],
        [line(x + 4, y, x2 - 4, y), line(xm, y, xm, y2), line(x + 4, y2, x2 - 4, y2)],
      ]
    case "J":
      return [
        [[...line(x2 - 4, y, x2 - 4, y2 - 12), ...arc(xm + 2, y2 - 12, w * 0.4, h * 0.22, 0, Math.PI)]],
        [line(x, y, x2, y), [...line(xm + 6, y, xm + 6, y2 - 12), ...arc(xm, y2 - 12, w * 0.35, h * 0.2, 0, Math.PI)]],
      ]
    case "K":
      return [
        [line(x, y, x, y2), line(x2, y, x, ym), line(x, ym, x2, y2)],
        [line(x, y, x, y2), [...line(x2, y, x + 2, ym), ...line(x + 2, ym, x2, y2)]],
      ]
    case "L":
      return [
        [line(x, y, x, y2), line(x, y2, x2, y2)],
        [[...line(x, y, x, y2), ...line(x, y2, x2, y2)]],
      ]
    case "M":
      return [
        [[...line(x, y2, x, y), ...line(x, y, xm, ym), ...line(xm, ym, x2, y), ...line(x2, y, x2, y2)]],
        [line(x, y, x, y2), line(x, y, xm, ym), line(xm, ym, x2, y), line(x2, y, x2, y2)],
      ]
    case "N":
      return [
        [[...line(x, y2, x, y), ...line(x, y, x2, y2), ...line(x2, y2, x2, y)]],
        [line(x, y, x, y2), line(x, y, x2, y2), line(x2, y, x2, y2)],
      ]
    case "O":
      return [
        [circle(xm, ym, Math.min(w, h) * 0.48)],
        [[...arc(xm, ym, w * 0.47, h * 0.48, -Math.PI / 2, Math.PI * 1.5)]],
      ]
    case "P":
      return [
        [line(x, y, x, y2), [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.46, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)]],
        [[...line(x, y2, x, y), ...arc(xm, y + h * 0.25, w * 0.46, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)]],
      ]
    case "Q":
      return [
        [circle(xm, ym, Math.min(w, h) * 0.46), line(xm + 2, ym + 8, x2 + 2, y2 + 2)],
      ]
    case "R":
      return [
        [
          line(x, y, x, y2),
          [...line(x, y, xm, y), ...arc(xm, y + h * 0.25, w * 0.46, h * 0.25, -Math.PI / 2, Math.PI / 2), ...line(xm, ym, x, ym)],
          line(xm, ym, x2, y2),
        ],
      ]
    case "S":
      return [
        [[...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, 0, -Math.PI * 1.05), ...arc(xm, y + h * 0.75, w * 0.46, h * 0.25, Math.PI * 0.95, 0)]],
      ]
    case "T":
      return [
        [line(x, y, x2, y), line(xm, y, xm, y2)],
      ]
    case "U":
      return [
        [[...line(x, y, x, y2 - 12), ...arc(xm, y2 - 12, w * 0.48, h * 0.22, Math.PI, 0), ...line(x2, y2 - 12, x2, y)]],
      ]
    case "V":
      return [
        [[...line(x, y, xm, y2), ...line(xm, y2, x2, y)]],
        [line(x, y, xm, y2), line(xm, y2, x2, y)],
      ]
    case "W":
      return [
        [[...line(x, y, x + w * 0.25, y2), ...line(x + w * 0.25, y2, xm, ym), ...line(xm, ym, x + w * 0.75, y2), ...line(x + w * 0.75, y2, x2, y)]],
      ]
    case "X":
      return [
        [line(x, y, x2, y2), line(x2, y, x, y2)],
        [line(x, y2, x2, y), line(x, y, x2, y2)],
      ]
    case "Y":
      return [
        [[...line(x, y, xm, ym), ...line(xm, ym, xm, y2)], line(x2, y, xm, ym)],
        [line(x, y, xm, ym), line(x2, y, xm, ym), line(xm, ym, xm, y2)],
      ]
    case "Z":
      return [
        [[...line(x, y, x2, y), ...line(x2, y, x, y2), ...line(x, y2, x2, y2)]],
        [[...line(x, y, x2, y), ...line(x2, y, x, y2), ...line(x, y2, x2, y2)], line(xm - 5, ym, xm + 5, ym)], // with crossbar
      ]
    case "0":
      return [
        // Slashed zero or tall oval
        [arc(xm, ym, w * 0.38, h * 0.48, -Math.PI / 2, Math.PI * 1.5)],
        [arc(xm, ym, w * 0.36, h * 0.48, -Math.PI / 2, Math.PI * 1.5), line(x + 8, y + 10, x2 - 8, y2 - 10)],
      ]
    case "1":
      return [
        [line(xm, y, xm, y2)],
        [[...line(xm - 8, y + 10, xm, y), ...line(xm, y, xm, y2)]],
        [[...line(xm - 8, y + 10, xm, y), ...line(xm, y, xm, y2)], line(x + 4, y2, x2 - 4, y2)],
      ]
    case "2":
      return [
        [[...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI, 0), ...line(x2 - 2, y + h * 0.25, x, y2), ...line(x, y2, x2, y2)]],
      ]
    case "3":
      return [
        [[...arc(xm, y + h * 0.25, w * 0.45, h * 0.25, -Math.PI * 0.8, Math.PI * 0.5), ...arc(xm, y + h * 0.75, w * 0.48, h * 0.25, -Math.PI * 0.5, Math.PI * 0.8)]],
      ]
    case "4":
      return [
        // Open 4
        [[...line(x + w * 0.75, y, x, ym + 6), ...line(x, ym + 6, x2, ym + 6)], line(x + w * 0.75, y, x + w * 0.75, y2)],
        // Closed 4
        [[...line(x + w * 0.7, y, x, ym + 4), ...line(x, ym + 4, x2, ym + 4)], line(x + w * 0.7, y, x + w * 0.7, y2)],
      ]
    case "5":
      return [
        [[...line(x2, y, x, y), ...line(x, y, x, ym), ...arc(xm, y + h * 0.7, w * 0.48, h * 0.28, -Math.PI, Math.PI * 0.7)]],
      ]
    case "6":
      return [
        [[...arc(xm, y + h * 0.25, w * 0.45, h * 0.35, -Math.PI * 0.3, -Math.PI), ...arc(xm, y + h * 0.65, w * 0.46, h * 0.35, Math.PI, -Math.PI)]],
      ]
    case "7":
      return [
        [[...line(x, y, x2, y), ...line(x2, y, xm - 4, y2)]],
        [[...line(x, y, x2, y), ...line(x2, y, xm - 4, y2)], line(xm - 8, ym, xm + 4, ym)],
      ]
    case "8":
      return [
        [[...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, 0, Math.PI * 2), ...arc(xm, y + h * 0.75, w * 0.46, h * 0.25, 0, Math.PI * 2)]],
        // Single continuous figure-8 stroke
        [
          [
            ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, -Math.PI / 2, Math.PI / 2),
            ...arc(xm, y + h * 0.75, w * 0.46, h * 0.25, -Math.PI / 2, Math.PI / 2),
            ...arc(xm, y + h * 0.75, w * 0.46, h * 0.25, Math.PI / 2, Math.PI * 1.5),
            ...arc(xm, y + h * 0.25, w * 0.4, h * 0.25, Math.PI / 2, Math.PI * 1.5),
          ],
        ],
      ]
    case "9":
      return [
        [[...arc(xm, y + h * 0.35, w * 0.46, h * 0.35, 0, Math.PI * 2), ...line(x2 - 2, y + h * 0.35, xm - 2, y2)]],
      ]
    case "UNKNOWN":
    default:
      return [
        // Scribble 1: back-and-forth zigzag
        [[line(x, y, x2, y + 8), line(x2, y + 8, x, y + 16), line(x, y + 16, x2, y + 24), line(x2, y + 24, x, y + 32)].flat()],
        // Scribble 2: random jagged scratch
        [[line(x + 2, ym, x2 - 2, ym), line(x2 - 2, ym, xm, y2), line(xm, y2, x + 6, y + 4)].flat()],
      ]
  }
}

// ---------------------------------------------------------------------------
// Geometry & Symbol Stroke Archetypes
// ---------------------------------------------------------------------------

export const GEOMETRY_CLASSES = [
  "line", "rect", "rectangle", "square", "circle", "ellipse", "triangle",
  "rounded_rect", "rounded_rectangle", "arrow", "checkmark", "x", "plus", "minus",
  "star", "heart", "cloud", "UNKNOWN"
]

export function getGeometryArchetypes(kind: string): Point[][][] {
  const x = 5, y = 5, w = 50, h = 50
  const x2 = x + w, y2 = y + h, xm = x + w / 2, ym = y + h / 2

  switch (kind) {
    case "line":
      return [
        [line(x, ym, x2, ym)],
        [line(x, y, x2, y2)],
        [line(xm, y, xm, y2)],
      ]
    case "rect":
    case "rectangle":
    case "square":
      return [
        // 1 continuous loop
        [[...line(x, y, x2, y), ...line(x2, y, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, x, y)]],
        // 4 separate edge strokes
        [line(x, y, x2, y), line(x2, y, x2, y2), line(x2, y2, x, y2), line(x, y2, x, y)],
      ]
    case "circle":
      return [
        [circle(xm, ym, w * 0.46)],
        [[...arc(xm, ym, w * 0.45, h * 0.45, 0, Math.PI * 2)]],
      ]
    case "ellipse":
      return [
        [arc(xm, ym, w * 0.48, h * 0.32, 0, Math.PI * 2)],
        [arc(xm, ym, w * 0.32, h * 0.48, 0, Math.PI * 2)],
      ]
    case "triangle":
      return [
        // 1 continuous stroke
        [[...line(xm, y, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, xm, y)]],
        // 3 separate strokes
        [line(xm, y, x2, y2), line(x2, y2, x, y2), line(x, y2, xm, y)],
      ]
    case "rounded_rect":
    case "rounded_rectangle":
      return [
        [
          [
            ...line(x + 8, y, x2 - 8, y),
            ...arc(x2 - 8, y + 8, 8, 8, -Math.PI / 2, 0),
            ...line(x2, y + 8, x2, y2 - 8),
            ...arc(x2 - 8, y2 - 8, 8, 8, 0, Math.PI / 2),
            ...line(x2 - 8, y2, x + 8, y2),
            ...arc(x + 8, y2 - 8, 8, 8, Math.PI / 2, Math.PI),
            ...line(x, y2 - 8, x, y + 8),
            ...arc(x + 8, y + 8, 8, 8, Math.PI, Math.PI * 1.5),
          ],
        ],
      ]
    case "arrow":
      return [
        // Line + 2 arrow heads
        [line(x, ym, x2, ym), line(x2 - 12, ym - 10, x2, ym), line(x2 - 12, ym + 10, x2, ym)],
        // Continuous arrow stroke
        [[...line(x, ym, x2, ym), ...line(x2, ym, x2 - 12, ym - 10)], line(x2, ym, x2 - 12, ym + 10)],
      ]
    case "checkmark":
      return [
        [[...line(x + 4, ym, x + w * 0.38, y2 - 4), ...line(x + w * 0.38, y2 - 4, x2, y + 4)]],
      ]
    case "x":
      return [
        [line(x + 4, y + 4, x2 - 4, y2 - 4), line(x2 - 4, y + 4, x + 4, y2 - 4)],
      ]
    case "plus":
      return [
        [line(xm, y + 4, xm, y2 - 4), line(x + 4, ym, x2 - 4, ym)],
      ]
    case "minus":
      return [
        [line(x + 4, ym, x2 - 4, ym)],
      ]
    case "star":
      return [
        [
          // 5-point star path
          [
            [xm, y], [xm + 8, ym - 4], [x2, ym - 4], [xm + 12, ym + 6],
            [x2 - 4, y2], [xm, ym + 10], [x + 4, y2], [xm - 12, ym + 6],
            [x, ym - 4], [xm - 8, ym - 4], [xm, y]
          ]
        ]
      ]
    case "heart":
      return [
        [
          [
            ...arc(x + w * 0.28, y + h * 0.32, w * 0.26, h * 0.28, Math.PI, 0),
            ...arc(x + w * 0.72, y + h * 0.32, w * 0.26, h * 0.28, Math.PI, 0),
            ...line(x2 - 4, y + h * 0.45, xm, y2),
            ...line(xm, y2, x + 4, y + h * 0.45),
          ],
        ],
      ]
    case "cloud":
      return [
        [
          [
            ...arc(x + 12, ym + 4, 10, 8, Math.PI * 0.5, Math.PI * 1.5),
            ...arc(x + 22, y + 14, 12, 10, Math.PI, 0),
            ...arc(x2 - 14, ym + 2, 12, 10, -Math.PI * 0.6, Math.PI * 0.5),
            ...line(x2 - 14, y2 - 4, x + 12, y2 - 4),
          ],
        ],
      ]
    case "UNKNOWN":
    default:
      return [
        [[line(x, y, x2, y2), line(x, y2, x2, y), line(xm, y, xm, y2), line(x, ym, x2, ym)].flat()],
        [[line(x, y, x2, y + 10), line(x2, y + 10, x, y + 20), line(x, y + 20, x2, y + 30)].flat()],
      ]
  }
}

// ---------------------------------------------------------------------------
// Semantic Object Stroke Archetypes
// ---------------------------------------------------------------------------

export const OBJECT_CLASSES = [
  "apple", "house", "tree", "lightbulb", "phone", "computer", "camera",
  "folder", "document", "envelope", "lock", "calendar", "gear",
  "person", "car", "clock", "database", "server", "UNKNOWN"
]

export function getObjectArchetypes(kind: string): Point[][][] {
  const x = 5, y = 5, w = 50, h = 50
  const x2 = x + w, y2 = y + h, xm = x + w / 2, ym = y + h / 2

  switch (kind) {
    case "house":
      return [
        // Roof triangle + wall rectangle + door
        [
          [...line(x, ym, xm, y), ...line(xm, y, x2, ym), ...line(x2, ym, x, ym)],
          [...line(x + 4, ym, x2 - 4, ym), ...line(x2 - 4, ym, x2 - 4, y2), ...line(x2 - 4, y2, x + 4, y2), ...line(x + 4, y2, x + 4, ym)],
          [...line(xm - 5, y2, xm - 5, ym + 14), ...line(xm - 5, ym + 14, xm + 5, ym + 14), ...line(xm + 5, ym + 14, xm + 5, y2)],
        ],
      ]
    case "apple":
      return [
        // Round apple body + stem + small leaf
        [
          [
            ...arc(xm - 6, ym + 4, w * 0.38, h * 0.38, -Math.PI * 0.7, Math.PI * 0.7),
            ...arc(xm + 6, ym + 4, w * 0.38, h * 0.38, Math.PI * 0.3, -Math.PI * 0.7),
          ],
          line(xm, ym - 14, xm + 4, y),
          [...arc(xm + 8, y + 4, 6, 4, 0, Math.PI)],
        ],
      ]
    case "tree":
      return [
        // Fluffy cloud top + trunk
        [
          [
            ...arc(xm - 10, ym - 4, 12, 12, Math.PI * 0.5, Math.PI * 1.5),
            ...arc(xm, y + 10, 14, 12, Math.PI, 0),
            ...arc(xm + 10, ym - 4, 12, 12, -Math.PI * 0.5, Math.PI * 0.5),
            ...line(xm + 10, ym + 8, xm - 10, ym + 8),
          ],
          line(xm - 4, ym + 8, xm - 4, y2),
          line(xm + 4, ym + 8, xm + 4, y2),
        ],
      ]
    case "lightbulb":
      return [
        [
          // Bulb circle + neck + base lines
          [...arc(xm, y + 18, 16, 16, -Math.PI * 0.75, Math.PI * 0.75), ...line(xm + 10, ym + 8, xm + 8, y2 - 8), ...line(xm + 8, y2 - 8, xm - 8, y2 - 8), ...line(xm - 8, y2 - 8, xm - 10, ym + 8)],
          line(xm - 6, y2 - 4, xm + 6, y2 - 4),
        ],
      ]
    case "phone":
      return [
        // Vertical rounded rect + speaker + home button
        [
          [...line(x + 12, y, x2 - 12, y), ...line(x2 - 12, y, x2 - 12, y2), ...line(x2 - 12, y2, x + 12, y2), ...line(x + 12, y2, x + 12, y)],
          line(xm - 6, y + 6, xm + 6, y + 6),
          circle(xm, y2 - 8, 3),
        ],
      ]
    case "computer":
      return [
        // Monitor rect + stand + base
        [
          [...line(x, y + 4, x2, y + 4), ...line(x2, y + 4, x2, ym + 8), ...line(x2, ym + 8, x, ym + 8), ...line(x, ym + 8, x, y + 4)],
          line(xm, ym + 8, xm, y2 - 6),
          line(xm - 12, y2 - 6, xm + 12, y2 - 6),
        ],
      ]
    case "camera":
      return [
        [
          [...line(x, ym - 6, x2, ym - 6), ...line(x2, ym - 6, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, x, ym - 6)],
          [...line(xm - 8, ym - 6, xm - 6, y + 8), ...line(xm - 6, y + 8, xm + 6, y + 8), ...line(xm + 6, y + 8, xm + 8, ym - 6)],
          circle(xm, ym + 8, 10),
        ],
      ]
    case "folder":
      return [
        [
          [...line(x, y + 10, xm - 6, y + 10), ...line(xm - 6, y + 10, xm, y + 4), ...line(xm, y + 4, x2, y + 4), ...line(x2, y + 4, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, x, y + 10)],
        ],
      ]
    case "document":
      return [
        // Document page with folded top-right corner + text lines
        [
          [...line(x + 6, y, x2 - 14, y), ...line(x2 - 14, y, x2 - 6, y + 10), ...line(x2 - 6, y + 10, x2 - 6, y2), ...line(x2 - 6, y2, x + 6, y2), ...line(x + 6, y2, x + 6, y)],
          line(x + 12, ym, x2 - 12, ym),
          line(x + 12, ym + 8, x2 - 16, ym + 8),
        ],
      ]
    case "envelope":
      return [
        // Rectangle + V flap
        [
          [...line(x, y + 8, x2, y + 8), ...line(x2, y + 8, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, x, y + 8)],
          [...line(x, y + 8, xm, ym + 6), ...line(xm, ym + 6, x2, y + 8)],
        ],
      ]
    case "lock":
      return [
        // Shackle arc + body rectangle
        [
          arc(xm, ym - 6, 12, 14, Math.PI, 0),
          [...line(x + 8, ym, x2 - 8, ym), ...line(x2 - 8, ym, x2 - 8, y2), ...line(x2 - 8, y2, x + 8, y2), ...line(x + 8, y2, x + 8, ym)],
          line(xm, ym + 6, xm, ym + 14),
        ],
      ]
    case "calendar":
      return [
        [
          [...line(x, y + 8, x2, y + 8), ...line(x2, y + 8, x2, y2), ...line(x2, y2, x, y2), ...line(x, y2, x, y + 8)],
          line(x, ym - 6, x2, ym - 6),
          line(x + 12, y + 2, x + 12, y + 10),
          line(x2 - 12, y + 2, x2 - 12, y + 10),
        ],
      ]
    case "gear":
      return [
        [
          circle(xm, ym, 18),
          circle(xm, ym, 8),
          line(xm, y + 2, xm, y + 10),
          line(xm, y2 - 10, xm, y2 - 2),
          line(x + 2, ym, x + 10, ym),
          line(x2 - 10, ym, x2 - 2, ym),
        ],
      ]
    case "person":
      return [
        // Head circle + body stick + arms + legs
        [
          circle(xm, y + 8, 8),
          line(xm, y + 16, xm, ym + 10),
          line(x + 6, ym, x2 - 6, ym),
          line(xm, ym + 10, x + 8, y2),
          line(xm, ym + 10, x2 - 8, y2),
        ],
      ]
    case "car":
      return [
        // Wheels + body chassis
        [
          circle(x + 12, y2 - 8, 6),
          circle(x2 - 12, y2 - 8, 6),
          [...line(x, ym + 6, x + 10, ym - 4), ...line(x + 10, ym - 4, xm + 10, ym - 4), ...line(xm + 10, ym - 4, x2, ym + 6), ...line(x2, ym + 6, x2, y2 - 8)],
        ],
      ]
    case "clock":
      return [
        [
          circle(xm, ym, 20),
          line(xm, ym, xm, y + 12),
          line(xm, ym, xm + 10, ym),
        ],
      ]
    case "database":
      return [
        // Stacked cylinders (3 tiers)
        [
          arc(xm, y + 8, 18, 6, 0, Math.PI * 2),
          [...arc(xm, ym, 18, 6, 0, Math.PI), ...line(x + 7, y + 8, x + 7, ym), ...line(x2 - 7, y + 8, x2 - 7, ym)],
          [...arc(xm, y2 - 8, 18, 6, 0, Math.PI), ...line(x + 7, ym, x + 7, y2 - 8), ...line(x2 - 7, ym, x2 - 7, y2 - 8)],
        ],
      ]
    case "server":
      return [
        // Stacked horizontal server units
        [
          [...line(x, y + 6, x2, y + 6), ...line(x2, y + 6, x2, ym - 2), ...line(x2, ym - 2, x, ym - 2), ...line(x, ym - 2, x, y + 6)],
          circle(x2 - 8, y + 12, 2),
          [...line(x, ym + 2, x2, ym + 2), ...line(x2, ym + 2, x2, y2 - 6), ...line(x2, y2 - 6, x, y2 - 6), ...line(x, y2 - 6, x, ym + 2)],
          circle(x2 - 8, ym + 8, 2),
        ],
      ]
    case "UNKNOWN":
    default:
      return [
        [[line(x, y, x2, y2), line(x2, y, x, y2)].flat()],
        [[line(x, ym, x2, ym), line(x, ym + 6, x2, ym + 6)].flat()],
      ]
  }
}
