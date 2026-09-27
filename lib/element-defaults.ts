import type { FillTone, StrokeWeight, TextAlign } from "./types"
import type { PencilGrade } from "./pencil-grades"

export interface ShapeStyleConfig {
  color: string // stroke color, empty string = theme ink
  fill: FillTone
  fillColor?: string // custom fill hex / css color
  strokeWidth: number
  stroke: StrokeWeight
  dashed: boolean
  opacity: number
}

export interface LineStyleConfig {
  color: string
  strokeWidth: number
  stroke: StrokeWeight
  dashed: boolean
  opacity: number
}

export interface ArrowStyleConfig {
  color: string
  strokeWidth: number
  stroke: StrokeWeight
  dashed: boolean
  opacity: number
  head: boolean
}

export interface DrawStyleConfig {
  color: string
  pencilGrade: PencilGrade
  strokeWidth: number
  opacity: number
  mode: "pen" | "marker" | "highlighter"
  stroke: StrokeWeight
  dashed: boolean
}

export interface TextStyleConfig {
  color: string
  fontSize: number
  align: TextAlign
  opacity: number
  bold: boolean
  italic: boolean
}

export interface ElementDefaults {
  rectangle: ShapeStyleConfig
  ellipse: ShapeStyleConfig
  line: LineStyleConfig
  arrow: ArrowStyleConfig
  draw: DrawStyleConfig
  text: TextStyleConfig
}

export type ElementTypeKey = keyof ElementDefaults

export const DEFAULT_ELEMENT_DEFAULTS: ElementDefaults = {
  rectangle: {
    color: "",
    fill: "none",
    fillColor: "",
    strokeWidth: 1.4,
    stroke: "regular",
    dashed: false,
    opacity: 1,
  },
  ellipse: {
    color: "",
    fill: "none",
    fillColor: "",
    strokeWidth: 1.4,
    stroke: "regular",
    dashed: false,
    opacity: 1,
  },
  line: {
    color: "",
    strokeWidth: 1.6,
    stroke: "regular",
    dashed: false,
    opacity: 1,
  },
  arrow: {
    color: "",
    strokeWidth: 1.6,
    stroke: "regular",
    dashed: false,
    opacity: 1,
    head: true,
  },
  draw: {
    color: "",
    pencilGrade: "HB",
    strokeWidth: 2.0,
    opacity: 1,
    mode: "pen",
    stroke: "regular",
    dashed: false,
  },
  text: {
    color: "",
    fontSize: 18,
    align: "left",
    opacity: 1,
    bold: false,
    italic: false,
  },
}

export interface StudioPreset {
  id: string
  name: string
  description: string
  badgeColor: string
  defaults: ElementDefaults
}

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: "classic",
    name: "Classic Graphite",
    description: "Authentic monochrome sketch ink with hand-drawn roughness",
    badgeColor: "#1c1917",
    defaults: {
      rectangle: { color: "", fill: "none", fillColor: "", strokeWidth: 1.4, stroke: "regular", dashed: false, opacity: 1 },
      ellipse: { color: "", fill: "none", fillColor: "", strokeWidth: 1.4, stroke: "regular", dashed: false, opacity: 1 },
      line: { color: "", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 1 },
      arrow: { color: "", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 1, head: true },
      draw: { color: "", pencilGrade: "HB", strokeWidth: 2.0, opacity: 1, mode: "pen", stroke: "regular", dashed: false },
      text: { color: "", fontSize: 18, align: "left", opacity: 1, bold: false, italic: false },
    },
  },
  {
    id: "blueprint",
    name: "Architect Blueprint",
    description: "Crisp technical drafting tones with deep cyan and sky blue lines",
    badgeColor: "#0284c7",
    defaults: {
      rectangle: { color: "#0284c7", fill: "light", fillColor: "", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 1 },
      ellipse: { color: "#0284c7", fill: "none", fillColor: "", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 1 },
      line: { color: "#0369a1", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 1 },
      arrow: { color: "#0284c7", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 1, head: true },
      draw: { color: "#0369a1", pencilGrade: "2H", strokeWidth: 1.8, opacity: 0.95, mode: "pen", stroke: "regular", dashed: false },
      text: { color: "#075985", fontSize: 18, align: "left", opacity: 1, bold: true, italic: false },
    },
  },
  {
    id: "highlighter",
    name: "Marker Review",
    description: "Fluorescent markers and amber highlights for notes and auditing",
    badgeColor: "#eab308",
    defaults: {
      rectangle: { color: "#ca8a04", fill: "none", fillColor: "#fef08a", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 0.9 },
      ellipse: { color: "#ea580c", fill: "none", fillColor: "#ffedd5", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 0.9 },
      line: { color: "#ca8a04", strokeWidth: 3.5, stroke: "heavy", dashed: false, opacity: 0.8 },
      arrow: { color: "#ea580c", strokeWidth: 3.5, stroke: "heavy", dashed: false, opacity: 0.85, head: true },
      draw: { color: "#eab308", pencilGrade: "4B", strokeWidth: 12.0, opacity: 0.45, mode: "highlighter", stroke: "heavy", dashed: false },
      text: { color: "#a16207", fontSize: 20, align: "left", opacity: 1, bold: true, italic: false },
    },
  },
  {
    id: "redline",
    name: "Editorial Redline",
    description: "Punchy crimson corrections, arrows, callout boxes, and markup",
    badgeColor: "#dc2626",
    defaults: {
      rectangle: { color: "#dc2626", fill: "none", fillColor: "", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 1 },
      ellipse: { color: "#dc2626", fill: "none", fillColor: "", strokeWidth: 2.0, stroke: "regular", dashed: false, opacity: 1 },
      line: { color: "#b91c1c", strokeWidth: 2.2, stroke: "regular", dashed: false, opacity: 1 },
      arrow: { color: "#dc2626", strokeWidth: 2.4, stroke: "regular", dashed: false, opacity: 1, head: true },
      draw: { color: "#ef4444", pencilGrade: "B", strokeWidth: 2.4, opacity: 1, mode: "pen", stroke: "regular", dashed: false },
      text: { color: "#b91c1c", fontSize: 18, align: "left", opacity: 1, bold: true, italic: false },
    },
  },
  {
    id: "sepia",
    name: "Warm Sepia",
    description: "Vintage sketchbook feel with burnt amber and earthy wood shades",
    badgeColor: "#d97706",
    defaults: {
      rectangle: { color: "#78350f", fill: "none", fillColor: "#fef3c7", strokeWidth: 1.5, stroke: "regular", dashed: false, opacity: 0.95 },
      ellipse: { color: "#78350f", fill: "none", fillColor: "#fef3c7", strokeWidth: 1.5, stroke: "regular", dashed: false, opacity: 0.95 },
      line: { color: "#92400e", strokeWidth: 1.8, stroke: "regular", dashed: false, opacity: 1 },
      arrow: { color: "#b45309", strokeWidth: 1.8, stroke: "regular", dashed: false, opacity: 1, head: true },
      draw: { color: "#78350f", pencilGrade: "2B", strokeWidth: 2.2, opacity: 0.9, mode: "pen", stroke: "regular", dashed: false },
      text: { color: "#78350f", fontSize: 18, align: "left", opacity: 1, bold: false, italic: true },
    },
  },
  {
    id: "forest",
    name: "Botanical Forest",
    description: "Calm sage greens and deep emerald botanical sketching",
    badgeColor: "#059669",
    defaults: {
      rectangle: { color: "#065f46", fill: "none", fillColor: "#d1fae5", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 0.95 },
      ellipse: { color: "#065f46", fill: "none", fillColor: "#d1fae5", strokeWidth: 1.6, stroke: "regular", dashed: false, opacity: 0.95 },
      line: { color: "#047857", strokeWidth: 1.8, stroke: "regular", dashed: false, opacity: 1 },
      arrow: { color: "#059669", strokeWidth: 1.8, stroke: "regular", dashed: false, opacity: 1, head: true },
      draw: { color: "#059669", pencilGrade: "HB", strokeWidth: 2.0, opacity: 0.95, mode: "pen", stroke: "regular", dashed: false },
      text: { color: "#065f46", fontSize: 18, align: "left", opacity: 1, bold: false, italic: false },
    },
  },
]
