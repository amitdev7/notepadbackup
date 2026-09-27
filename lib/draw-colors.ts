// ---------------------------------------------------------------------------
// Zenithsui Drawing Colors & Highlighter Palette
// ---------------------------------------------------------------------------

export interface ColorOption {
  id: string
  label: string
  value: string // hex or css variable
  isThemeInk?: boolean
  isHighlighter?: boolean
}

/** Standard solid pen / marker colors */
export const SOLID_DRAW_COLORS: readonly ColorOption[] = [
  { id: "theme-ink", label: "Theme Ink", value: "var(--sq-ink)", isThemeInk: true },
  { id: "charcoal", label: "Charcoal Black", value: "#18181b" },
  { id: "slate", label: "Slate Grey", value: "#64748b" },
  { id: "red", label: "Crimson Red", value: "#dc2626" },
  { id: "coral", label: "Flame Orange", value: "#ea580c" },
  { id: "amber", label: "Warm Amber", value: "#d97706" },
  { id: "green", label: "Forest Green", value: "#16a34a" },
  { id: "teal", label: "Mint Teal", value: "#0d9488" },
  { id: "blue", label: "Cobalt Blue", value: "#2563eb" },
  { id: "purple", label: "Royal Purple", value: "#7c3aed" },
  { id: "pink", label: "Berry Pink", value: "#db2777" },
  { id: "brown", label: "Espresso Brown", value: "#78350f" },
] as const

/** Translucent vibrant highlighter colors */
export const HIGHLIGHTER_COLORS: readonly ColorOption[] = [
  { id: "hl-yellow", label: "Neon Yellow", value: "#fde047", isHighlighter: true },
  { id: "hl-green", label: "Neon Green", value: "#86efac", isHighlighter: true },
  { id: "hl-cyan", label: "Sky Cyan", value: "#7dd3fc", isHighlighter: true },
  { id: "hl-pink", label: "Neon Pink", value: "#f472b6", isHighlighter: true },
  { id: "hl-orange", label: "Neon Orange", value: "#fb923c", isHighlighter: true },
  { id: "hl-lavender", label: "Pastel Lavender", value: "#c084fc", isHighlighter: true },
  { id: "hl-peach", label: "Sunset Peach", value: "#fca5a5", isHighlighter: true },
  { id: "hl-lime", label: "Electric Lime", value: "#a3e635", isHighlighter: true },
] as const

/** All standard presets */
export const ALL_DRAW_COLORS = [...SOLID_DRAW_COLORS, ...HIGHLIGHTER_COLORS]

export type DrawToolMode = "pen" | "marker" | "highlighter"

export interface DrawToolConfig {
  mode: DrawToolMode
  color: string
  opacity: number
  strokeWidth: number
}
