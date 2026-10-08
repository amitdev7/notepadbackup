// ---------------------------------------------------------------------------
// Zenithsui Chart Engine — Ported from Excalidraw Charts
// Generates hand-drawn Bar Charts, Line Charts, and Radar Charts from
// tabular / spreadsheet data (CSV, TSV, tables).
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { ShapeNode, ArrowNode, TextNode, SquigNode } from "@/lib/types"

export interface SpreadsheetSeries {
  title: string | null
  values: number[]
}

export interface SpreadsheetData {
  title: string | null
  labels: string[] | null
  series: SpreadsheetSeries[]
}

export type ParseSpreadsheetResult =
  | { ok: true; data: SpreadsheetData }
  | { ok: false; reason: string }

export type ChartType = "bar" | "line" | "radar"

/** Parse a cell value as a number */
export const tryParseNumber = (s: string): number | null => {
  const match = /^([-+]?)[$\u20AC\u00A3\u00A5\u20A9]?([-+]?)([\d.,]+)[%]?$/.exec(s.trim())
  if (!match) return null
  const num = parseFloat(`${(match[1] || match[2]) + match[3]}`.replace(/,/g, ""))
  return isNaN(num) ? null : num
}

/** Check if text might be tabular spreadsheet data */
export const isMaybeSpreadsheet = (text: string): boolean => {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return false
  const first = lines[0]
  return first.includes("\t") || first.includes(",") || first.includes("|")
}

/**
 * Parses TSV, CSV, or Markdown table text into a structured spreadsheet.
 */
export function tryParseSpreadsheet(text: string): ParseSpreadsheetResult {
  const rawLines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (rawLines.length === 0) {
    return { ok: false, reason: "Empty text" }
  }

  // Detect delimiter: tab, pipe, or comma
  let delimiter = "\t"
  if (rawLines[0].includes("\t")) {
    delimiter = "\t"
  } else if (rawLines[0].includes("|")) {
    delimiter = "|"
  } else if (rawLines[0].includes(",")) {
    delimiter = ","
  }

  const cells = rawLines
    .map((line) => {
      let parts = line.split(delimiter)
      if (delimiter === "|") {
        parts = parts.filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      }
      return parts.map((cell) => cell.trim().replace(/^"|"$/g, ""))
    })
    .filter((row) => row.length > 0 && !row.every((c) => /^-+$/.test(c))) // filter out markdown separator row

  if (cells.length < 2) {
    return { ok: false, reason: "At least 2 rows required" }
  }

  const numCols = cells[0].length
  if (numCols < 1) {
    return { ok: false, reason: "No columns found" }
  }

  // Two or more columns: Col 0 is label, Col 1..N are numeric series
  if (numCols >= 2) {
    const hasHeader = cells[0].slice(1).every((cell) => tryParseNumber(cell) === null)
    const rows = hasHeader ? cells.slice(1) : cells

    if (rows.length < 1) {
      return { ok: false, reason: "No data rows" }
    }

    const labels = rows.map((r) => r[0] || "")
    const seriesCols = numCols - 1

    const series: SpreadsheetSeries[] = []
    for (let col = 1; col <= seriesCols; col++) {
      const title = hasHeader ? cells[0][col] || `Series ${col}` : `Series ${col}`
      const values: number[] = []
      for (const row of rows) {
        const val = tryParseNumber(row[col]) ?? 0
        values.push(val)
      }
      series.push({ title, values })
    }

    const title = hasHeader && cells[0][0] ? cells[0][0] : null

    return {
      ok: true,
      data: {
        title,
        labels,
        series,
      },
    }
  }

  // Single column
  const hasHeader = tryParseNumber(cells[0][0]) === null
  const title = hasHeader ? cells[0][0] : null
  const rows = hasHeader ? cells.slice(1) : cells
  const values = rows.map((r) => tryParseNumber(r[0]) ?? 0)

  return {
    ok: true,
    data: {
      title,
      labels: rows.map((_, i) => `${i + 1}`),
      series: [{ title, values }],
    },
  }
}

const DEFAULT_SERIES_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
]

function makeSeed(): number {
  return Math.floor(Math.random() * 1000000)
}

/**
 * Generate a Bar Chart as SquigNodes
 */
export function renderBarChart(
  spreadsheet: SpreadsheetData,
  startX = 100,
  startY = 350
): SquigNode[] {
  const nodes: SquigNode[] = []
  const { series, labels, title } = spreadsheet
  if (!series.length || !series[0].values.length) return nodes

  const numCategories = series[0].values.length
  const numSeries = series.length

  const chartHeight = 240
  const slotWidth = Math.max(50, Math.min(120, Math.floor(600 / numCategories)))
  const gap = 20
  const barWidth = Math.max(12, Math.floor((slotWidth - (numSeries - 1) * 4) / numSeries))

  let maxVal = 1
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxVal) maxVal = v
    }
  }

  const chartWidth = numCategories * (slotWidth + gap) + gap

  // Title
  if (title) {
    const titleNode: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: startX + chartWidth / 2 - (title.length * 5),
      y: startY - chartHeight - 50,
      w: title.length * 10,
      h: 28,
      text: title,
      fontSize: 20,
      bold: true,
      align: "center",
    }
    nodes.push(titleNode)
  }

  // Base Axes (X and Y lines)
  const xAxis: ArrowNode = {
    id: nanoid(8),
    seed: makeSeed(),
    type: "arrow",
    x: startX,
    y: startY,
    w: chartWidth,
    h: 0,
    points: [[0, 0], [chartWidth, 0]],
    head: false,
    stroke: "regular",
  }
  nodes.push(xAxis)

  const yAxis: ArrowNode = {
    id: nanoid(8),
    seed: makeSeed(),
    type: "arrow",
    x: startX,
    y: startY - chartHeight,
    w: 0,
    h: chartHeight,
    points: [[0, chartHeight], [0, 0]],
    head: false,
    stroke: "regular",
  }
  nodes.push(yAxis)

  // Ticks & Grid guidelines
  const ticks = 4
  for (let i = 1; i <= ticks; i++) {
    const tickY = startY - (chartHeight / ticks) * i
    const tickVal = Math.round((maxVal / ticks) * i)
    const tickLine: ArrowNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "arrow",
      x: startX - 6,
      y: tickY,
      w: 6,
      h: 0,
      points: [[0, 0], [6, 0]],
      head: false,
      stroke: "light",
    }
    const tickLabel: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: startX - 45,
      y: tickY - 8,
      w: 36,
      h: 16,
      text: `${tickVal}`,
      fontSize: 12,
      align: "right",
    }
    nodes.push(tickLine, tickLabel)
  }

  // Bars
  for (let catIdx = 0; catIdx < numCategories; catIdx++) {
    const slotX = startX + gap + catIdx * (slotWidth + gap)

    for (let sIdx = 0; sIdx < numSeries; sIdx++) {
      const val = series[sIdx].values[catIdx] ?? 0
      const h = Math.max(2, Math.round((val / maxVal) * chartHeight))
      const bx = slotX + sIdx * (barWidth + 4)
      const by = startY - h
      const color = DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length]

      const bar: ShapeNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "shape",
        shape: "rect",
        x: bx,
        y: by,
        w: barWidth,
        h,
        fill: "strong",
        color,
        stroke: "light",
        roundness: true,
      }
      nodes.push(bar)
    }

    // Category Label
    const labelText = labels?.[catIdx] || `${catIdx + 1}`
    const labelNode: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: slotX,
      y: startY + 10,
      w: slotWidth,
      h: 20,
      text: labelText,
      fontSize: 12,
      align: "center",
    }
    nodes.push(labelNode)
  }

  // Legend
  if (numSeries > 1) {
    let legX = startX + gap
    const legY = startY + 45
    for (let sIdx = 0; sIdx < numSeries; sIdx++) {
      const s = series[sIdx]
      const color = DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length]
      const swatch: ShapeNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "shape",
        shape: "rect",
        x: legX,
        y: legY + 2,
        w: 12,
        h: 12,
        fill: "strong",
        color,
      }
      const labelText = s.title || `Series ${sIdx + 1}`
      const legLabel: TextNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "text",
        x: legX + 18,
        y: legY,
        w: labelText.length * 8,
        h: 16,
        text: labelText,
        fontSize: 12,
      }
      nodes.push(swatch, legLabel)
      legX += 24 + labelText.length * 8 + 16
    }
  }

  return nodes
}

/**
 * Generate a Line Chart as SquigNodes
 */
export function renderLineChart(
  spreadsheet: SpreadsheetData,
  startX = 100,
  startY = 350
): SquigNode[] {
  const nodes: SquigNode[] = []
  const { series, labels, title } = spreadsheet
  if (!series.length || !series[0].values.length) return nodes

  const numPoints = series[0].values.length
  const chartHeight = 240
  const pointGap = Math.max(50, Math.min(120, Math.floor(600 / Math.max(1, numPoints - 1))))
  const chartWidth = Math.max(200, (numPoints - 1) * pointGap + 60)

  let maxVal = 1
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxVal) maxVal = v
    }
  }

  // Title
  if (title) {
    const titleNode: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: startX + chartWidth / 2 - (title.length * 5),
      y: startY - chartHeight - 50,
      w: title.length * 10,
      h: 28,
      text: title,
      fontSize: 20,
      bold: true,
      align: "center",
    }
    nodes.push(titleNode)
  }

  // Axes
  const xAxis: ArrowNode = {
    id: nanoid(8),
    seed: makeSeed(),
    type: "arrow",
    x: startX,
    y: startY,
    w: chartWidth,
    h: 0,
    points: [[0, 0], [chartWidth, 0]],
    head: false,
    stroke: "regular",
  }
  const yAxis: ArrowNode = {
    id: nanoid(8),
    seed: makeSeed(),
    type: "arrow",
    x: startX,
    y: startY - chartHeight,
    w: 0,
    h: chartHeight,
    points: [[0, chartHeight], [0, 0]],
    head: false,
    stroke: "regular",
  }
  nodes.push(xAxis, yAxis)

  // Series Lines & Points
  series.forEach((s, sIdx) => {
    const color = DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length]
    let prevX = 0
    let prevY = 0

    s.values.forEach((val, pIdx) => {
      const px = startX + 30 + pIdx * pointGap
      const py = startY - Math.round((val / maxVal) * chartHeight)

      // Connect with line segment
      if (pIdx > 0) {
        const seg: ArrowNode = {
          id: nanoid(8),
          seed: makeSeed(),
          type: "arrow",
          x: Math.min(prevX, px),
          y: Math.min(prevY, py),
          w: Math.abs(px - prevX),
          h: Math.abs(py - prevY),
          points: [
            [prevX - Math.min(prevX, px), prevY - Math.min(prevY, py)],
            [px - Math.min(prevX, px), py - Math.min(prevY, py)],
          ],
          head: false,
          color,
          stroke: "regular",
        }
        nodes.push(seg)
      }

      // Point marker
      const marker: ShapeNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "shape",
        shape: "ellipse",
        x: px - 4,
        y: py - 4,
        w: 8,
        h: 8,
        fill: "strong",
        color,
      }
      nodes.push(marker)

      prevX = px
      prevY = py

      // Label on X axis (for the first series only)
      if (sIdx === 0) {
        const labelText = labels?.[pIdx] || `${pIdx + 1}`
        const labelNode: TextNode = {
          id: nanoid(8),
          seed: makeSeed(),
          type: "text",
          x: px - 25,
          y: startY + 10,
          w: 50,
          h: 20,
          text: labelText,
          fontSize: 12,
          align: "center",
        }
        nodes.push(labelNode)
      }
    })
  })

  return nodes
}

/**
 * Generate a Radar Chart as SquigNodes
 */
export function renderRadarChart(
  spreadsheet: SpreadsheetData,
  centerX = 300,
  centerY = 300
): SquigNode[] {
  const nodes: SquigNode[] = []
  const { series, labels, title } = spreadsheet
  if (!series.length || !series[0].values.length) return nodes

  const numAxes = series[0].values.length
  const radius = 140

  let maxVal = 1
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxVal) maxVal = v
    }
  }

  // Title
  if (title) {
    const titleNode: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: centerX - 100,
      y: centerY - radius - 60,
      w: 200,
      h: 28,
      text: title,
      fontSize: 20,
      bold: true,
      align: "center",
    }
    nodes.push(titleNode)
  }

  // Background Concentric Rings (3 rings)
  for (let rStep = 1; rStep <= 3; rStep++) {
    const ringRadius = (radius / 3) * rStep
    const ring: ShapeNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "shape",
      shape: "ellipse",
      x: centerX - ringRadius,
      y: centerY - ringRadius,
      w: ringRadius * 2,
      h: ringRadius * 2,
      fill: "none",
      stroke: "light",
      opacity: 40,
    }
    nodes.push(ring)
  }

  // Spoke axes
  for (let i = 0; i < numAxes; i++) {
    const angle = (Math.PI * 2 / numAxes) * i - Math.PI / 2
    const spokeX = centerX + Math.cos(angle) * radius
    const spokeY = centerY + Math.sin(angle) * radius

    const spoke: ArrowNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "arrow",
      x: Math.min(centerX, spokeX),
      y: Math.min(centerY, spokeY),
      w: Math.abs(spokeX - centerX),
      h: Math.abs(spokeY - centerY),
      points: [
        [centerX - Math.min(centerX, spokeX), centerY - Math.min(centerY, spokeY)],
        [spokeX - Math.min(centerX, spokeX), spokeY - Math.min(centerY, spokeY)],
      ],
      head: false,
      stroke: "light",
      opacity: 60,
    }
    nodes.push(spoke)

    // Label
    const labelText = labels?.[i] || `Axis ${i + 1}`
    const labelDist = radius + 24
    const labelX = centerX + Math.cos(angle) * labelDist - 30
    const labelY = centerY + Math.sin(angle) * labelDist - 10

    const labelNode: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: labelX,
      y: labelY,
      w: 60,
      h: 20,
      text: labelText,
      fontSize: 12,
      align: "center",
    }
    nodes.push(labelNode)
  }

  // Data polygons
  series.forEach((s, sIdx) => {
    const color = DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length]
    const pts: [number, number][] = []

    for (let i = 0; i < numAxes; i++) {
      const val = s.values[i] ?? 0
      const r = (val / maxVal) * radius
      const angle = (Math.PI * 2 / numAxes) * i - Math.PI / 2
      const px = centerX + Math.cos(angle) * r
      const py = centerY + Math.sin(angle) * r
      pts.push([px, py])
    }

    // Connect polygon segments
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i]
      const p2 = pts[(i + 1) % pts.length]

      const seg: ArrowNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "arrow",
        x: Math.min(p1[0], p2[0]),
        y: Math.min(p1[1], p2[1]),
        w: Math.abs(p2[0] - p1[0]),
        h: Math.abs(p2[1] - p1[1]),
        points: [
          [p1[0] - Math.min(p1[0], p2[0]), p1[1] - Math.min(p1[1], p2[1])],
          [p2[0] - Math.min(p1[0], p2[0]), p2[1] - Math.min(p1[1], p2[1])],
        ],
        head: false,
        color,
        stroke: "regular",
      }
      nodes.push(seg)

      // Vertex dot
      const dot: ShapeNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "shape",
        shape: "ellipse",
        x: p1[0] - 3,
        y: p1[1] - 3,
        w: 6,
        h: 6,
        fill: "strong",
        color,
      }
      nodes.push(dot)
    }
  })

  return nodes
}
