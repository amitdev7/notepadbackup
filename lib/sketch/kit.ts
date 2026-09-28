// ---------------------------------------------------------------------------
// Sketch Primitive Kit — building blocks for wireframe components.
//
// Pure geometry, no React/DOM: defs author Prim[] with the helpers below, the
// canvas renderer draws them, and break-apart / the editor read them back.
// The look is early-web risograph — one ink on paper, flat shaded fills — so
// colours never appear here as literals: INK/SHADE resolve the CSS theme and
// prims only name tones (InkColor) or pressures (PrimOpts.stroke).
// ---------------------------------------------------------------------------

import { resolveIconData } from "./icons"

/** Every tone a prim may name. Lines all print in one ink; the name picks the pen pressure / fill tone. */
export type InkColor = "ink" | "accent" | "muted" | "faint" | "paper"

/** The one pen, pressed lighter or harder — css colours resolved from the canvas theme. */
export const INK: Record<InkColor, string> = {
  ink: "var(--sq-ink, #2d2a26)",
  accent: "var(--sq-accent, #3b82f6)",
  muted: "var(--sq-muted, #8a857d)",
  faint: "var(--sq-faint, #c9c4bb)",
  paper: "var(--sq-paper, #ffffff)",
}

/** The only two flat fill tones: inert areas vs the one emphasised surface. */
export const SHADE: { shade: string; shadeStrong: string } = {
  shade: "var(--sq-shade, #eeeeee)",
  shadeStrong: "var(--sq-shade-strong, #d5d4d4)",
}

/** The default hand: deliberately small irregularity — drawn, not napkin. */
export const HAND: { roughness: number; bowing: number; strokeWidth: number; radius: number } = {
  roughness: 0.9,
  bowing: 0.8,
  strokeWidth: 1.6,
  radius: 6,
}

/** Per-prim rendering options. `stroke` is pen PRESSURE, not colour. */
export interface PrimOpts {
  /** how hard the pen presses — default "ink" */
  stroke?: InkColor
  /** literal css stroke, bypassing the pressure ladder (user-picked colours) */
  strokeColor?: string
  strokeWidth?: number
  dashed?: boolean
  opacity?: number
  /** leave unset unless you mean it — HAND.roughness is the default */
  roughness?: number
  fill?: "none" | "shade" | "solid"
  fillStyle?: string
  fillColor?: InkColor
  /** literal css fill (user-picked colours) */
  customFillColor?: string
  /** corner radius for rects — the renderer falls back to HAND.radius */
  r?: number
  /** print the early-desktop block shadow behind this surface */
  shadow?: boolean
}

export interface RectPrim {
  t: "rect"
  x: number
  y: number
  w: number
  h: number
  r?: number
  o?: PrimOpts
}

export interface EllipsePrim {
  t: "ellipse"
  x: number
  y: number
  w: number
  h: number
  o?: PrimOpts
}

export interface LinePrim {
  t: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  o?: PrimOpts
}

export interface PolyPrim {
  t: "poly"
  pts: [number, number][]
  close?: boolean
  o?: PrimOpts
}

export interface PathPrim {
  t: "path"
  /** filled subpaths in a square viewBox (Phosphor data via resolveIconData) */
  d: string[]
  /** drawn size in canvas units */
  size: number
  /** the viewBox the subpaths are authored in */
  vb: number
  mode: "fill" | "stroke"
  /** icon name, when this path is an icon — lets break-apart rebuild it */
  name?: string
  x: number
  y: number
  o?: PrimOpts
}

export interface TextPrim {
  t: "text"
  x: number
  /** baseline, not top — centred in a box of height h sits at h/2 + size*0.35 */
  y: number
  text: string
  size: number
  align?: "left" | "center" | "right"
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: InkColor
  customColor?: string
  opacity?: number
  mirrorX?: boolean
  mirrorY?: boolean
}

export type Prim = RectPrim | EllipsePrim | LinePrim | PolyPrim | PathPrim | TextPrim

/** Attach opts only when given, so prims stay lean. */
function withOpts<P extends { o?: PrimOpts }>(p: P, o: PrimOpts | undefined): P {
  if (o && Object.keys(o).length > 0) p.o = o
  return p
}

/** opts.r for corner radius — read as p.r ?? p.o?.r ?? HAND.radius. */
export function rect(x: number, y: number, w: number, h: number, o?: PrimOpts): Prim {
  const p: RectPrim = { t: "rect", x, y, w, h }
  if (o?.r !== undefined) p.r = o.r
  return withOpts(p, o)
}

/** A rect with fully rounded ends — never ellipse() for pill shapes. */
export function pill(x: number, y: number, w: number, h: number, o?: PrimOpts): Prim {
  return rect(x, y, w, h, { ...o, r: h / 2 })
}

/** x,y = top-left of the bounding box. */
export function ellipse(x: number, y: number, w: number, h: number, o?: PrimOpts): Prim {
  return withOpts<EllipsePrim>({ t: "ellipse", x, y, w, h }, o)
}

export function line(x1: number, y1: number, x2: number, y2: number, o?: PrimOpts): Prim {
  return withOpts<LinePrim>({ t: "line", x1, y1, x2, y2 }, o)
}

/** Open polyline by default; close=true fills the polygon. */
export function poly(pts: [number, number][], close?: boolean, o?: PrimOpts): Prim {
  const p: PolyPrim = { t: "poly", pts }
  if (close) p.close = true
  return withOpts(p, o)
}

export interface TextOpts {
  align?: "left" | "center" | "right"
  color?: InkColor
  customColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  opacity?: number
  mirrorX?: boolean
  mirrorY?: boolean
}

/** y is the baseline. */
export function text(x: number, y: number, str: string, size: number, o?: TextOpts): Prim {
  const p: TextPrim = { t: "text", x, y, text: str, size }
  if (o?.align) p.align = o.align
  if (o?.color) p.color = o.color
  if (o?.customColor) p.customColor = o.customColor
  if (o?.bold) p.bold = true
  if (o?.italic) p.italic = true
  if (o?.underline) p.underline = true
  if (o?.opacity !== undefined) p.opacity = o.opacity
  if (o?.mirrorX) p.mirrorX = true
  if (o?.mirrorY) p.mirrorY = true
  return p
}

/**
 * Phosphor-backed icon centred on cx/cy. Returns Prim[] — always SPREAD it.
 * Unknown names resolve to the fallback glyph, never nothing.
 */
export function icon(name: string, cx: number, cy: number, size = 16, o?: PrimOpts): Prim[] {
  const safeName = typeof name === "string" && name.trim() ? name : ""
  const { d, vb } = resolveIconData(safeName)
  const p: PathPrim = { t: "path", d, size, vb, mode: "fill", name: safeName, x: cx - size / 2, y: cy - size / 2 }
  return [withOpts(p, o)]
}

/** A point is only a point when both halves are finite numbers. */
function validPt(pt: unknown): pt is [number, number] {
  return Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
}

/** Translate a batch — the composition helper blocks are built with. */
export function place(prims: Prim[], dx: number, dy: number): Prim[] {
  if (!Array.isArray(prims)) return []
  if (!dx && !dy) return prims
  const out: Prim[] = []
  for (const p of prims) {
    if (!p || typeof p.t !== "string") continue
    switch (p.t) {
      case "rect":
      case "ellipse":
        out.push({ ...p, x: p.x + dx, y: p.y + dy })
        break
      case "line":
        out.push({ ...p, x1: p.x1 + dx, y1: p.y1 + dy, x2: p.x2 + dx, y2: p.y2 + dy })
        break
      case "poly":
        out.push({ ...p, pts: (Array.isArray(p.pts) ? p.pts : []).filter(validPt).map(([px, py]) => [px + dx, py + dy] as [number, number]) })
        break
      case "path":
      case "text":
        out.push({ ...p, x: p.x + dx, y: p.y + dy })
        break
    }
  }
  return out
}

/**
 * Mirror prims about their own box. Labels stay readable — the layout mirrors
 * around them and the anchor swaps edge — while a real text layer (flipText)
 * turns over for real via mirror flags the renderer draws.
 */
export function mirrorPrims(
  prims: Prim[],
  w: number,
  h: number,
  flipX?: boolean,
  flipY?: boolean,
  flipText?: boolean
): Prim[] {
  if (!flipX && !flipY) return prims
  if (!Array.isArray(prims)) return []
  const mx = (x: number): number => (flipX ? w - x : x)
  const my = (y: number): number => (flipY ? h - y : y)
  const out: Prim[] = []
  for (const p of prims) {
    if (!p || typeof p.t !== "string") continue
    switch (p.t) {
      case "rect":
      case "ellipse":
        out.push({
          ...p,
          x: flipX ? w - p.x - p.w : p.x,
          y: flipY ? h - p.y - p.h : p.y,
        })
        break
      case "line":
        out.push({ ...p, x1: mx(p.x1), y1: my(p.y1), x2: mx(p.x2), y2: my(p.y2) })
        break
      case "poly":
        out.push({ ...p, pts: (Array.isArray(p.pts) ? p.pts : []).filter(validPt).map(([px, py]) => [mx(px), my(py)] as [number, number]) })
        break
      case "path":
        out.push({ ...p, x: flipX ? w - p.x - p.size : p.x, y: flipY ? h - p.y - p.size : p.y })
        break
      case "text": {
        if (flipText) {
          out.push({
            ...p,
            x: mx(p.x),
            y: my(p.y),
            ...(flipX ? { mirrorX: !p.mirrorX } : {}),
            ...(flipY ? { mirrorY: !p.mirrorY } : {}),
          })
          break
        }
        // a label hangs off its anchor, so the anchor swaps edge with it
        const align = flipX
          ? p.align === "left"
            ? "right"
            : p.align === "right"
              ? "left"
              : p.align
          : p.align
        out.push({ ...p, x: mx(p.x), y: my(p.y), align })
        break
      }
    }
  }
  return out
}

/** Placeholder body-copy lines — a wireframe shouldn't pretend to final copy. */
export function loremLines(x: number, y: number, w: number, count: number, gap = 16): Prim[] {
  const out: Prim[] = []
  const n = Math.max(0, Math.floor(count))
  for (let i = 0; i < n; i++) {
    const last = i === n - 1 && n > 1
    const lw = Math.max(0, last ? w * 0.55 : w)
    if (lw <= 0) continue
    out.push(line(x, y + i * gap, x + lw, y + i * gap, { stroke: "faint" }))
  }
  return out
}

/** The sketch face runs ~0.46em wide — the same ratio text-metrics falls back to. */
const GLYPH_ADVANCE = 0.46

/** Measure one line before laying out. DOM-free: the em-ratio estimate. */
export function textWidth(s: string, size: number): number {
  if (typeof s !== "string" || !Number.isFinite(size)) return 0
  return s.length * size * GLYPH_ADVANCE
}

/** Ellipsize to fit maxW, measured with textWidth. */
export function truncate(s: string, size: number, maxW: number): string {
  if (typeof s !== "string") return ""
  if (!s || textWidth(s, size) <= maxW) return s
  const ell = "…"
  if (textWidth(ell, size) >= maxW) return maxW > 0 ? ell : ""
  let lo = 0
  let hi = s.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (textWidth(s.slice(0, mid) + ell, size) <= maxW) lo = mid
    else hi = mid - 1
  }
  return s.slice(0, lo) + ell
}
