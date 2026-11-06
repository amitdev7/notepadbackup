// ---------------------------------------------------------------------------
// Zenithsui Library Definition — Math Study Tracker
//
// 100% faithful paper stationery study tracker matching the reference design:
// - Physical ivory torn deckle paper sheet with subtle paper grain texture
// - Metallic wire paperclip with drop shadow clipped over top-left margin
// - Cute sketched hollow orange stars (#FC883F) around title and paperclip
// - Friendly rounded handwritten title: "math study tracker"
// - Authentic table layout: CHAPTERS column separated by solid ink line from
//   the 4 study resources: NCERT, Ushank Sir, Shobhit Sir, NCERT Exemplar
// - 5 default Class 10 Math syllabus chapters with hand-drawn math geometry icons:
//   01 Statistics (Ch 13) — Sketched bar chart
//   02 Surface Areas and Volumes (Ch 12) — 3D cylinder & cone
//   03 Some Applications of Trigonometry (Ch 9) — Right-angled triangles
//   04 Areas Related to Circles (Ch 11) — Circle with hatched shaded sector
//   05 Circles (Ch 10) — Circle tangent & secant geometry
// - Hand-drawn square checkboxes with tactile check toggles and audio feedback
// - In-place editing of title, column headers, and chapter names
// - Progress bar counter ("X of Y completed") + quick action controls
// - Full IndexedDB persistence and real-time collaboration sync
// ---------------------------------------------------------------------------

import type { ComponentDef, Props } from "./registry"
import type { Prim } from "@/lib/sketch/kit"
import { rect, line, text, poly, ellipse } from "@/lib/sketch/kit"

export interface StudyTrackerColumn {
  id: string
  title: string
  subtitle?: string
}

export interface StudyTrackerChapter {
  id: string
  number: string
  name: string
  iconKind: "bar-chart" | "geometry-3d" | "trigonometry" | "circle-sector" | "circle-tangent" | "calculus" | "algebra" | "custom"
  checks: Record<string, boolean>
}

export const DEFAULT_TRACKER_COLUMNS: StudyTrackerColumn[] = [
  { id: "ncert", title: "NCERT" },
  { id: "ushank", title: "Ushank", subtitle: "Sir" },
  { id: "shobhit", title: "Shobhit", subtitle: "Sir" },
  { id: "exemplar", title: "NCERT", subtitle: "Exemplar" },
]

export const DEFAULT_TRACKER_CHAPTERS: StudyTrackerChapter[] = [
  {
    id: "ch-1",
    number: "01",
    name: "Statistics (Ch 13)",
    iconKind: "bar-chart",
    checks: {},
  },
  {
    id: "ch-2",
    number: "02",
    name: "Surface Areas and Volumes (Ch 12)",
    iconKind: "geometry-3d",
    checks: {},
  },
  {
    id: "ch-3",
    number: "03",
    name: "Some Applications of Trigonometry (Ch 9)",
    iconKind: "trigonometry",
    checks: {},
  },
  {
    id: "ch-4",
    number: "04",
    name: "Areas Related to Circles (Ch 11)",
    iconKind: "circle-sector",
    checks: {},
  },
  {
    id: "ch-5",
    number: "05",
    name: "Circles (Ch 10)",
    iconKind: "circle-tangent",
    checks: {},
  },
]

// 5-point star vertex generator
export function starPts(cx: number, cy: number, rOuter: number, rInner: number, rotDeg = 0): [number, number][] {
  const pts: [number, number][] = []
  const rotRad = (rotDeg * Math.PI) / 180
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2 + rotRad
    const r = i % 2 === 0 ? rOuter : rInner
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return pts
}

// 1:1 CSS Polygon Clip-Path with deckle torn paper ripples on all 4 edges
export const MATH_TRACKER_DECKLE_CLIP_PATH = `polygon(
  /* Top edge with ripples */
  2% 0.8%, 6% 0.4%, 10% 1.2%, 14% 0.6%, 18% 1.0%, 22% 0.5%, 26% 0.9%, 30% 0.3%,
  35% 1.1%, 40% 0.5%, 45% 0.8%, 50% 0.4%, 55% 1.2%, 60% 0.6%, 65% 0.9%, 70% 0.4%,
  75% 1.0%, 80% 0.5%, 85% 0.9%, 90% 0.3%, 94% 0.8%, 98% 0.5%,
  /* Top-right & Right deckle edge */
  99.5% 1.5%, 98.8% 5%, 99.6% 10%, 98.6% 15%, 99.4% 20%, 98.5% 25%, 99.5% 30%,
  98.7% 35%, 99.3% 40%, 98.4% 45%, 99.6% 50%, 98.8% 55%, 99.4% 60%, 98.5% 65%,
  99.5% 70%, 98.6% 75%, 99.3% 80%, 98.4% 85%, 99.5% 90%, 98.7% 95%, 99.4% 98%,
  /* Bottom deckle edge */
  98% 99.4%, 94% 98.8%, 90% 99.6%, 86% 98.5%, 82% 99.2%, 78% 98.6%, 74% 99.5%,
  70% 98.7%, 66% 99.3%, 62% 98.4%, 58% 99.6%, 54% 98.8%, 50% 99.4%, 46% 98.5%,
  42% 99.5%, 38% 98.6%, 34% 99.2%, 30% 98.5%, 26% 99.4%, 22% 98.7%, 18% 99.3%,
  14% 98.4%, 10% 99.5%, 6% 98.8%, 2% 99.3%,
  /* Left deckle edge */
  0.5% 98.5%, 1.4% 95%, 0.6% 90%, 1.5% 85%, 0.5% 80%, 1.3% 75%, 0.6% 70%,
  1.4% 65%, 0.5% 60%, 1.5% 55%, 0.7% 50%, 1.3% 45%, 0.5% 40%, 1.4% 35%,
  0.6% 30%, 1.5% 25%, 0.5% 20%, 1.3% 15%, 0.6% 10%, 1.4% 5%, 0.6% 1.5%
)`

// Vector torn paper polygon points generator for vector render()
export function decklePaperPoly(w: number, h: number): [number, number][] {
  const pts: [number, number][] = []

  // Top edge
  const topSteps = 24
  for (let i = 0; i <= topSteps; i++) {
    const x = (i / topSteps) * w
    const ripple = ((i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2) * 1.2)
    pts.push([x, 2 + ripple])
  }

  // Right edge
  const rightSteps = 24
  for (let i = 0; i <= rightSteps; i++) {
    const y = (i / rightSteps) * h
    const ripple = ((i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2) * 1.2)
    pts.push([w - 2 - ripple, y])
  }

  // Bottom edge
  const bottomSteps = 24
  for (let i = bottomSteps; i >= 0; i--) {
    const x = (i / bottomSteps) * w
    const ripple = ((i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2) * 1.4)
    pts.push([x, h - 2 - ripple])
  }

  // Left edge
  const leftSteps = 24
  for (let i = leftSteps; i >= 0; i--) {
    const y = (i / leftSteps) * h
    const ripple = ((i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2) * 1.2)
    pts.push([2 + ripple, y])
  }

  return pts
}

export const mathStudyTrackerDef: ComponentDef = {
  kind: "math-study-tracker",
  name: "Math Study Tracker",
  category: "blocks",
  group: "Education",
  keywords: [
    "math",
    "study",
    "tracker",
    "ncert",
    "chapters",
    "paper",
    "stationery",
    "checklist",
    "ushank",
    "shobhit",
    "exemplar",
    "exam",
    "board",
    "class 10",
    "cbse",
    "syllabus",
    "homework",
    "revision",
  ],
  size: { w: 520, h: 560 },
  interactive: true,
  defaults: {
    title: "math study tracker",
    accentColor: "orange",
    showPaperclip: true,
    showStars: true,
    columns: DEFAULT_TRACKER_COLUMNS,
    chapters: DEFAULT_TRACKER_CHAPTERS,
  },
  controls: [
    { key: "title", label: "Title", type: "text" },
    {
      key: "accentColor",
      label: "Star Accent Color",
      type: "select",
      options: ["orange", "pink", "emerald", "sky", "violet", "black"],
      quick: true,
    },
    { key: "showPaperclip", label: "Paperclip", type: "toggle", quick: true },
    { key: "showStars", label: "Stars", type: "toggle", quick: true },
  ],
  render(p: Props, w: number, h: number): Prim[] {
    const prims: Prim[] = []
    const pad = 24
    const title = String(p.title || "math study tracker")
    const showClip = p.showPaperclip !== false
    const showStars = p.showStars !== false
    const accent = p.accentColor === "pink"
      ? "#EC4899"
      : p.accentColor === "emerald"
      ? "#10B981"
      : p.accentColor === "sky"
      ? "#0284C7"
      : p.accentColor === "violet"
      ? "#8B5CF6"
      : p.accentColor === "black"
      ? "#1C1917"
      : "#FC883F"

    const columns = Array.isArray(p.columns) && p.columns.length > 0
      ? (p.columns as StudyTrackerColumn[])
      : DEFAULT_TRACKER_COLUMNS

    const chapters = Array.isArray(p.chapters) && p.chapters.length > 0
      ? (p.chapters as StudyTrackerChapter[])
      : DEFAULT_TRACKER_CHAPTERS

    // 1. Torn deckle stationery paper sheet background
    const paperPts = decklePaperPoly(w, h)
    prims.push(
      poly(paperPts, true, {
        fill: "solid",
        customFill: "#FAF7F2",
        customStroke: "#E5DEC9",
        strokeWidth: 1.2,
      })
    )

    // 2. Metallic Wire Paperclip on Top-Left
    if (showClip) {
      // Folded paper scrap shadow & slip
      prims.push(
        poly([
          [48, 14],
          [74, 12],
          [72, 34],
          [46, 32],
        ], true, {
          fill: "solid",
          customFill: "#F1EBE0",
          customStroke: "#D9D0C1",
          strokeWidth: 1,
        }),
        // Paperclip soft drop shadow
        line(52, 2, 70, 2, {
          customStroke: "rgba(0,0,0,0.18)",
          strokeWidth: 4,
        }),
        // Metallic paperclip loops
        line(54, 46, 54, -6, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(54, -6, 70, -6, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(70, -6, 70, 54, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(70, 54, 59, 54, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(59, 54, 59, 14, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(59, 14, 65, 14, { customStroke: "#64748B", strokeWidth: 2.2 }),
        line(65, 14, 65, 46, { customStroke: "#64748B", strokeWidth: 2.2 })
      )
    }

    // 3. Cute Hand-Drawn Orange Outline Stars
    if (showStars) {
      // Small star top left of clip
      prims.push(
        poly(starPts(36, 30, 8, 3.5, -14), true, {
          fill: "none",
          customStroke: accent,
          strokeWidth: 1.6,
        })
      )
      // Medium star lower left of clip
      prims.push(
        poly(starPts(32, 60, 10, 4.2, 16), true, {
          fill: "none",
          customStroke: accent,
          strokeWidth: 1.6,
        })
      )
      // Large star to the right of clip above title
      prims.push(
        poly(starPts(112, 36, 11, 4.6, -8), true, {
          fill: "none",
          customStroke: accent,
          strokeWidth: 1.6,
        })
      )
      // Little sparkle crosses
      prims.push(
        line(24, 46, 28, 46, { customStroke: accent, strokeWidth: 1.2 }),
        line(26, 44, 26, 48, { customStroke: accent, strokeWidth: 1.2 }),
        line(124, 24, 128, 24, { customStroke: accent, strokeWidth: 1.2 }),
        line(126, 22, 126, 26, { customStroke: accent, strokeWidth: 1.2 })
      )
    }

    // 4. Title Header: "math study tracker" (handwritten bold rounded display)
    prims.push(
      text(w / 2 + 14, 48, title, 22, {
        align: "center",
        bold: true,
        customColor: "#1E293B",
      })
    )

    // Layout coordinates
    const headerTopY = 82
    const headerBottomY = 120
    const listBottomY = h - 34
    const splitX = pad + 246 // Divider between CHAPTERS and check columns
    const colCount = Math.max(1, columns.length)
    const rightWidth = (w - pad) - splitX
    const colW = rightWidth / colCount

    // 5. Solid Ink Divider Lines
    // Vertical line between Chapters and Checks
    prims.push(
      line(splitX, headerTopY, splitX, listBottomY, {
        customStroke: "#1E293B",
        strokeWidth: 1.6,
      })
    )
    // Horizontal solid line directly below the headers
    prims.push(
      line(pad + 4, headerBottomY, w - pad - 4, headerBottomY, {
        customStroke: "#1E293B",
        strokeWidth: 1.6,
      })
    )

    // 6. Header Labels
    // Left: CHAPTERS
    prims.push(
      text(pad + 124, 106, "CHAPTERS", 13, {
        align: "center",
        bold: true,
        customColor: "#1E293B",
      })
    )

    // Right: 4 Columns (NCERT, Ushank Sir, Shobhit Sir, NCERT Exemplar)
    columns.forEach((col, idx) => {
      const cx = splitX + idx * colW + colW / 2
      if (col.subtitle) {
        prims.push(
          text(cx, 101, col.title, 10.5, { align: "center", bold: true, customColor: "#1E293B" }),
          text(cx, 114, col.subtitle, 10.5, { align: "center", bold: true, customColor: "#1E293B" })
        )
      } else {
        prims.push(
          text(cx, 107, col.title, 11, { align: "center", bold: true, customColor: "#1E293B" })
        )
      }
    })

    // 7. Chapter Rows
    const rowCount = Math.max(1, chapters.length)
    const rowH = (listBottomY - headerBottomY) / rowCount

    chapters.forEach((ch, idx) => {
      const rowY = headerBottomY + idx * rowH
      const rowCenter = rowY + rowH / 2

      // Dashed horizontal line between chapter rows
      if (idx > 0) {
        prims.push(
          line(pad + 4, rowY, w - pad - 4, rowY, {
            dashed: true,
            customStroke: "#64748B",
            strokeWidth: 1.2,
          })
        )
      }

      // Math Illustration Circular Icon
      const iconX = pad + 10
      const iconY = rowCenter - 22
      const iconD = 44
      prims.push(
        ellipse(iconX, iconY, iconD, iconD, {
          customStroke: "#334155",
          strokeWidth: 1.4,
        })
      )

      // Inner sketch for each iconKind
      const icx = iconX + iconD / 2
      const icy = iconY + iconD / 2
      if (ch.iconKind === "bar-chart" || idx === 0) {
        // Statistics: Bar chart sketch with vertical hatching
        prims.push(
          line(icx - 14, icy + 12, icx + 14, icy + 12, { customStroke: "#334155", strokeWidth: 1.2 }),
          line(icx - 14, icy + 12, icx - 14, icy - 12, { customStroke: "#334155", strokeWidth: 1.2 }),
          rect(icx - 10, icy + 2, 5, 10, { customStroke: "#334155", strokeWidth: 1.1 }),
          rect(icx - 3, icy - 6, 5, 18, { customStroke: "#334155", strokeWidth: 1.1 }),
          rect(icx + 4, icy - 10, 5, 22, { customStroke: "#334155", strokeWidth: 1.1 }),
          line(icx - 1, icy - 4, icx - 1, icy + 10, { customStroke: "#334155", strokeWidth: 0.8 }),
          line(icx + 6, icy - 8, icx + 6, icy + 10, { customStroke: "#334155", strokeWidth: 0.8 })
        )
      } else if (ch.iconKind === "geometry-3d" || idx === 1) {
        // Surface Areas: 3D Cylinder on left & Cone on right
        prims.push(
          ellipse(icx - 12, icy - 9, 12, 6, { customStroke: "#334155", strokeWidth: 1.1 }),
          line(icx - 12, icy - 6, icx - 12, icy + 8, { customStroke: "#334155", strokeWidth: 1.1 }),
          line(icx, icy - 6, icx, icy + 8, { customStroke: "#334155", strokeWidth: 1.1 }),
          ellipse(icx - 12, icy + 5, 12, 6, { customStroke: "#334155", strokeWidth: 1.1 }),
          // Cone
          line(icx + 8, icy - 10, icx + 1, icy + 9, { customStroke: "#334155", strokeWidth: 1.1 }),
          line(icx + 8, icy - 10, icx + 15, icy + 9, { customStroke: "#334155", strokeWidth: 1.1 }),
          ellipse(icx + 1, icy + 6, 14, 6, { customStroke: "#334155", strokeWidth: 1.1 })
        )
      } else if (ch.iconKind === "trigonometry" || idx === 2) {
        // Trigonometry: Two right-angled triangles with angles
        prims.push(
          poly([
            [icx - 14, icy + 9],
            [icx - 14, icy - 5],
            [icx - 2, icy + 9],
          ], true, { customStroke: "#334155", strokeWidth: 1.2 }),
          rect(icx - 14, icy + 5, 4, 4, { customStroke: "#334155", strokeWidth: 0.9 }),
          poly([
            [icx - 1, icy + 9],
            [icx - 1, icy - 11],
            [icx + 13, icy + 9],
          ], true, { customStroke: "#334155", strokeWidth: 1.2 }),
          rect(icx - 1, icy + 5, 4, 4, { customStroke: "#334155", strokeWidth: 0.9 })
        )
      } else if (ch.iconKind === "circle-sector" || idx === 3) {
        // Areas Related to Circles: Circle with shaded sector
        prims.push(
          ellipse(icx - 13, icy - 13, 26, 26, { customStroke: "#334155", strokeWidth: 1.2 }),
          ellipse(icx - 11, icy - 11, 22, 22, { customStroke: "#334155", strokeWidth: 0.8 }),
          line(icx, icy, icx + 11, icy - 2, { customStroke: "#334155", strokeWidth: 1.2 }),
          line(icx, icy, icx + 4, icy + 10, { customStroke: "#334155", strokeWidth: 1.2 }),
          // Hatched lines inside sector
          line(icx + 2, icy + 2, icx + 6, icy + 4, { customStroke: "#334155", strokeWidth: 0.9 }),
          line(icx + 4, icy + 1, icx + 9, icy + 4, { customStroke: "#334155", strokeWidth: 0.9 }),
          line(icx + 6, icy - 1, icx + 10, icy + 2, { customStroke: "#334155", strokeWidth: 0.9 })
        )
      } else {
        // Circles: Circle with tangent line & chord geometry
        prims.push(
          ellipse(icx - 12, icy - 12, 24, 24, { customStroke: "#334155", strokeWidth: 1.2 }),
          line(icx - 15, icy + 12, icx + 15, icy - 12, { customStroke: "#334155", strokeWidth: 1.2 }),
          line(icx - 13, icy, icx + 12, icy + 8, { customStroke: "#334155", strokeWidth: 0.9 }),
          ellipse(icx - 10, icy - 4, 10, 10, { customStroke: "#334155", strokeWidth: 0.9 })
        )
      }

      // Chapter Title & Number
      const labelX = pad + 60
      const fullLabel = `${ch.number} ${ch.name}`
      prims.push(
        text(labelX, rowCenter - 2, fullLabel, 11.5, {
          bold: true,
          customColor: "#1E293B",
          maxW: splitX - labelX - 8,
        })
      )

      // 4 Checkboxes
      columns.forEach((col, cIdx) => {
        const cx = splitX + cIdx * colW + colW / 2
        const boxSize = 28
        const bx = cx - boxSize / 2
        const by = rowCenter - boxSize / 2

        // Hand-drawn square checkbox outline
        prims.push(
          rect(bx, by, boxSize, boxSize, {
            r: 3,
            customStroke: "#1E293B",
            strokeWidth: 1.5,
          })
        )

        // If checked in props
        const isChecked = Boolean(ch.checks && ch.checks[col.id])
        if (isChecked) {
          prims.push(
            line(bx + 6, by + 14, bx + 12, by + 21, {
              customStroke: "#16A34A",
              strokeWidth: 2.4,
            }),
            line(bx + 12, by + 21, bx + 22, by + 7, {
              customStroke: "#16A34A",
              strokeWidth: 2.4,
            })
          )
        }
      })
    })

    return prims
  },
}
