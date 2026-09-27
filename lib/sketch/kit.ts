// ---------------------------------------------------------------------------
// Sketch Primitive Kit — building blocks for napkin wireframe components.
// ---------------------------------------------------------------------------

export const INK = "var(--sq-ink, #1f1e1d)"
export const SHADE = "var(--sq-shade, rgba(31, 30, 29, 0.07))"

export interface RectPrim {
  t: "rect"
  x: number
  y: number
  w: number
  h: number
  fill?: string
  stroke?: string
  rough?: boolean
  seed?: number
  r?: number
}

export interface PillPrim {
  t: "pill"
  x: number
  y: number
  w: number
  h: number
  label?: string
  fill?: string
  stroke?: string
  seed?: number
  size?: "xs" | "sm" | "md" | "lg"
}

export interface LinePrim {
  t: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  stroke?: string
  seed?: number
  dashed?: boolean
}

export interface TextPrim {
  t: "text"
  x: number
  y: number
  text: string
  size?: number
  weight?: "normal" | "medium" | "bold"
  align?: "left" | "center" | "right"
  color?: string
}

export interface EllipsePrim {
  t: "ellipse"
  x: number
  y: number
  w: number
  h: number
  fill?: string
  stroke?: string
  seed?: number
}

export interface IconPrim {
  t: "icon"
  name: string
  x: number
  y: number
  size: number
  color?: string
}

export type Prim =
  | RectPrim
  | PillPrim
  | LinePrim
  | TextPrim
  | EllipsePrim
  | IconPrim

export function rect(x: number, y: number, w: number, h: number, opts: Partial<RectPrim> = {}): RectPrim {
  return { t: "rect", x, y, w, h, stroke: INK, ...opts }
}

export function pill(x: number, y: number, w: number, h: number, opts: Partial<PillPrim> = {}): PillPrim {
  return { t: "pill", x, y, w, h, stroke: INK, ...opts }
}

export function line(x1: number, y1: number, x2: number, y2: number, opts: Partial<LinePrim> = {}): LinePrim {
  return { t: "line", x1, y1, x2, y2, stroke: INK, ...opts }
}

export function text(x: number, y: number, str: string, opts: Partial<TextPrim> = {}): TextPrim {
  return { t: "text", x, y, text: str, color: INK, ...opts }
}

export function ellipse(x: number, y: number, w: number, h: number, opts: Partial<EllipsePrim> = {}): EllipsePrim {
  return { t: "ellipse", x, y, w, h, stroke: INK, ...opts }
}

export function icon(name: string, x: number, y: number, size = 16, opts: Partial<IconPrim> = {}): IconPrim {
  return { t: "icon", name, x, y, size, color: INK, ...opts }
}

export function place(prims: Prim[], ox: number, oy: number): Prim[] {
  return prims.map((p) => {
    switch (p.t) {
      case "rect":
      case "pill":
      case "ellipse":
      case "icon":
        return { ...p, x: p.x + ox, y: p.y + oy }
      case "line":
        return { ...p, x1: p.x1 + ox, y1: p.y1 + oy, x2: p.x2 + ox, y2: p.y2 + oy }
      case "text":
        return { ...p, x: p.x + ox, y: p.y + oy }
      default:
        return p
    }
  })
}
