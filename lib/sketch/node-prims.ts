// ---------------------------------------------------------------------------
// A node's marks, before anything draws them.
//
// The canvas renders these; the inline editor reads them to find out where a
// label actually sits. Both need the same answer, so the geometry lives here
// rather than inside the renderer.
// ---------------------------------------------------------------------------

import { HAND, mirrorPrims, type Prim, type PrimOpts } from "./kit"
import { textAnchorX, textBaseline } from "./text-layout"
import { wrapText } from "@/lib/canvas/text-metrics"
import { normalizeFill, type FillTone, type Outlined, type SquigNode, type StrokeWeight } from "@/lib/types"
import { renderComponent } from "@/lib/library/registry"

/**
 * A shape's fill tone, as prim options.
 *
 * These reuse the component ladder rather than inventing a second one: `light`
 * and `strong` are the same two shades every card and button prints with, so a
 * filled scribble sits in the same tonal world as the library. `paper` is
 * genuinely opaque — it's the tone you reach for when a box has to hide what
 * it overlaps rather than tint it.
 */
const FILL_OPTS: Record<FillTone, PrimOpts | undefined> = {
  none: undefined,
  paper: { fill: "solid", fillColor: "paper" },
  light: { fill: "shade", fillColor: "faint" },
  strong: { fill: "shade", fillColor: "ink" },
}

/**
 * Pen pressure, as a multiplier on whatever weight the mark draws at by
 * default. A multiplier rather than three absolute widths because an arrow, a
 * freehand line and a rectangle don't start from the same weight, and "heavy"
 * should mean the same *relative* press on all three.
 */
const PEN_SCALE: Record<StrokeWeight, number> = { light: 0.65, regular: 1, heavy: 1.7 }

/** How far a picture's frame is drawn outside the picture, in world units. */
const FRAME_GAP = 2.5

/** Merge a node's outline settings into the options for one of its marks. */
function outline(node: Outlined, baseWidth: number, o?: PrimOpts): PrimOpts {
  const scale = PEN_SCALE[(node.stroke as StrokeWeight) ?? "regular"] ?? 1
  const width = node.strokeWidth ?? (baseWidth * scale)
  return {
    ...o,
    strokeColor: node.color || o?.strokeColor,
    opacity: node.opacity !== undefined ? node.opacity : o?.opacity,
    strokeWidth: width,
    dashed: node.dashed !== undefined ? node.dashed : o?.dashed,
  }
}

/** A node's prims before any flip is applied. */
export function basePrims(node: SquigNode): Prim[] {
  switch (node.type) {
    case "component":
      return renderComponent(node.kind, node.props, node.w, node.h)
    case "shape": {
      const baseFillOpt = FILL_OPTS[normalizeFill(node.fill)]
      const fillOpt: PrimOpts | undefined = node.fillColor
        ? { fill: "solid", customFillColor: node.fillColor }
        : baseFillOpt
      const o = outline(node, node.strokeWidth ?? HAND.strokeWidth, fillOpt)
      if (node.shape === "ellipse") return [{ t: "ellipse", x: 0, y: 0, w: node.w, h: node.h, o }]
      return [{ t: "rect", x: 0, y: 0, w: node.w, h: node.h, r: 6, o }]
    }
    case "draw": {
      // freehand is already the user's own line — barely roughen it
      const isHighlighter = node.drawMode === "highlighter"
      const isMarker = node.drawMode === "marker"
      const defaultWidth = isHighlighter ? 14 : isMarker ? 4.5 : 1.9
      const baseWidth = node.strokeWidth ?? defaultWidth
      const defaultOpacity = isHighlighter ? 0.42 : isMarker ? 0.88 : 1
      const opacity = node.opacity ?? defaultOpacity
      const roughness = isHighlighter ? 0.1 : 0.2
      const strokeColor = node.color || (isHighlighter ? "#fde047" : undefined)

      const opt = outline(node, baseWidth, { roughness, strokeColor, opacity })
      if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
        return node.strokes.map((pts) => ({
          t: "poly",
          pts,
          o: opt,
        }))
      }

      return [
        {
          t: "poly",
          pts: Array.isArray(node.points) ? node.points : [],
          o: opt,
        },
      ]
    }
    case "arrow": {
      if (!Array.isArray(node.points) || node.points.length < 2) {
        return []
      }
      const p1 = node.points[0] || [0, 0]
      const p2 = node.points[1] || [node.w || 50, node.h || 50]
      const x1 = p1[0] ?? 0
      const y1 = p1[1] ?? 0
      const x2 = p2[0] ?? (node.w || 50)
      const y2 = p2[1] ?? (node.h || 50)
      const o = outline(node, node.strokeWidth ?? 1.6)
      const out: Prim[] = [{ t: "line", x1, y1, x2, y2, o }]
      if (node.head) {
        const a = Math.atan2(y2 - y1, x2 - x1)
        const L = 12
        out.push({
          t: "poly",
          pts: [
            [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)],
            [x2, y2],
            [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)],
          ],
          // a dashed arrowhead reads as a rendering fault, not a style
          o: { ...o, dashed: false },
        })
      }
      return out
    }
    // the picture itself is drawn by the renderer, which is the one thing here
    // that isn't made of pen marks. What the hand contributes is the frame
    // around it, so a pasted screenshot still sits on the same paper.
    //
    // Drawn just outside the box rather than on it: half a line sitting on the
    // picture disappears into whatever colour it happens to land on, and a red
    // screenshot in a red ink would come out with no frame at all.
    case "image": {
      const g = FRAME_GAP
      return [{ t: "rect", x: -g, y: -g, w: node.w + g * 2, h: node.h + g * 2, r: 2, o: { stroke: "muted" } }]
    }
    case "pdf": {
      // PDF document card wireframe
      const currentPage = node.currentPage || 1
      const totalPages = node.pageCount || 1
      const rawName = typeof node.name === "string" ? node.name : ""
      const pageBadge = totalPages > 1 ? `Page ${currentPage}/${totalPages}` : "PDF"
      const maxTitleLen = Math.max(12, Math.floor((node.w - 140) / 8))
      const displayTitle = rawName.length > maxTitleLen ? `${rawName.slice(0, maxTitleLen - 1)}…` : rawName

      const out: Prim[] = [
        // Card background
        { t: "rect", x: 0, y: 0, w: node.w, h: node.h, r: 8, o: { fill: "shade", fillColor: "faint", stroke: "ink" } },
        // Top header accent tag
        { t: "rect", x: 12, y: 12, w: 60, h: 22, r: 4, o: { fill: "solid", fillColor: "paper", stroke: "ink" } },
        { t: "text", x: 42, y: 27, text: pageBadge, size: 10, align: "center", bold: true },
        // Document title
        {
          t: "text",
          x: 78,
          y: 28,
          text: displayTitle,
          size: 12,
          align: "left",
          bold: true,
        },
        // Divider line
        { t: "line", x1: 12, y1: 42, x2: node.w - 12, y2: 42, o: { stroke: "muted" } },
      ]

      // Sub-details / preview placeholder
      if (node.h >= 90) {
        // Document preview frame
        const hasAnns = Boolean(
          node.annotationsByPage &&
          Object.values(node.annotationsByPage).some((list) => Array.isArray(list) && list.length > 0)
        )
        const hasContent = Boolean(node.previewSrc || hasAnns)

        out.push({
          t: "rect",
          x: 12,
          y: 50,
          w: node.w - 24,
          h: node.h - 62,
          r: 4,
          o: { fill: "solid", fillColor: "paper", stroke: "muted", dashed: !hasContent },
        })

        if (!hasContent) {
          const info = [
            totalPages > 1 ? `${totalPages} pages` : "1 page",
            node.fileSize ? `${Math.round(node.fileSize / 1024)} KB` : "",
          ]
            .filter(Boolean)
            .join(" • ")

          out.push({
            t: "text",
            x: node.w / 2,
            y: 50 + (node.h - 62) / 2 + 5,
            text: info || "PDF Document",
            size: 11,
            align: "center",
            italic: true,
          })
        }
      }
      return out
    }
    case "file": {
      const out: Prim[] = []
      out.push({
        t: "rect",
        x: 0,
        y: 0,
        w: node.w,
        h: node.h,
        r: 6,
        o: { fill: "solid", fillColor: "paper", stroke: "ink" },
      })
      out.push({
        t: "rect",
        x: 12,
        y: 12,
        w: 36,
        h: 36,
        r: 4,
        o: { fill: "shade", stroke: "ink" },
      })
      out.push({
        t: "text",
        x: 30,
        y: 34,
        text: "FILE",
        size: 9,
        align: "center",
        bold: true,
      })
      out.push({
        t: "text",
        x: 56,
        y: 26,
        text: node.name || "Attached File",
        size: 12,
        bold: true,
        align: "left",
      })
      const sizeStr = node.fileSize ? `${Math.round(node.fileSize / 1024)} KB` : "File"
      out.push({
        t: "text",
        x: 56,
        y: 42,
        text: `${sizeStr} • Double click to open`,
        size: 10,
        italic: true,
        align: "left",
      })
      return out
    }
    case "text": {
      const textContent = typeof node.text === "string" ? node.text : String(node.text ?? "")
      const fontSize = Number.isFinite(node.fontSize) && node.fontSize > 0 ? node.fontSize : 16
      const anchor = textAnchorX(node.align, node.w || 0)
      // an auto-sized layer's lines are its hard returns; a fixed-width layer
      // re-breaks them to the measure the side handles set
      const lines = node.fixedW
        ? wrapText(textContent, node.w || 0, { size: fontSize, bold: node.bold, italic: node.italic })
        : textContent.split("\n")
      return lines.map((lineText, i): Prim => ({
        t: "text",
        x: anchor,
        y: textBaseline(i, fontSize),
        text: lineText,
        size: fontSize,
        align: node.align,
        bold: node.bold,
        italic: node.italic,
        customColor: node.color,
        opacity: node.opacity,
        // a link is a link because it's underlined — no blue in a wireframe
        underline: node.underline || !!node.link,
      }))
    }
  }
}

/**
 * Everything a node draws, in node-local coordinates, flips applied.
 *
 * A text layer flips for real — the words turn over. Everywhere else the words
 * are labels on a wireframe and stay readable while the layout mirrors around
 * them; see mirrorPrims.
 */
export function nodePrims(node: SquigNode): Prim[] {
  try {
    if (!node || typeof node !== "object") return []
    const w = Number.isFinite(node.w) ? node.w : 100
    const h = Number.isFinite(node.h) ? node.h : 100
    return mirrorPrims(basePrims(node), w, h, !!node.flipX, !!node.flipY, node.type === "text")
  } catch (err) {
    console.warn("[nodePrims] Error generating prims for node:", node, err)
    return [{ t: "rect", x: 0, y: 0, w: Math.max(20, node?.w || 20), h: Math.max(20, node?.h || 20), r: 4, o: { stroke: "muted", dashed: true } }]
  }
}
