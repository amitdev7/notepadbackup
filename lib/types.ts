export type ToolKind =
  | "select"
  | "hand"
  | "rect"
  | "ellipse"
  | "line"
  | "draw"
  | "text"
  | "component"

export interface BaseNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  seed?: number
}

export interface RectNode extends BaseNode {
  type: "rect"
  fill?: string
  stroke?: string
  roughness?: number
}

export interface EllipseNode extends BaseNode {
  type: "ellipse"
  fill?: string
  stroke?: string
}

export interface LineNode extends BaseNode {
  type: "line"
  x2?: number
  y2?: number
  stroke?: string
}

export interface TextNode extends BaseNode {
  type: "text"
  text: string
  fontSize?: number
  color?: string
}

export interface DrawNode extends BaseNode {
  type: "draw"
  points: { x: number; y: number }[]
  stroke?: string
}

export interface ComponentNode extends BaseNode {
  type: "component"
  kind: string
  props: Record<string, unknown>
}

export type SquigNode =
  | RectNode
  | EllipseNode
  | LineNode
  | TextNode
  | DrawNode
  | ComponentNode
