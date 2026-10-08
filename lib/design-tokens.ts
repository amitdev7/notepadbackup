// ---------------------------------------------------------------------------
// Zenithsui Design Tokens — Single Source of Truth for the UI Visual System
//
// Centralized typography, colors, geometry, and motion tokens.
// Strict separation between:
// - APPLICATION UI FONT (Inter / system-ui for chrome, settings, student hub)
// - CANVAS DOCUMENT FONT (Hand, Sans, Serif for sketch rendering)
// - APPLICATION ACCENT (UI buttons, active states, focus rings)
// - CANVAS DOCUMENT INK (Drawing strokes, shapes, risograph palette)
// ---------------------------------------------------------------------------

export const FONTS = {
  /** Application UI Font - used across all chrome, settings, dialogs, student hub */
  ui: "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** Monospace / Code Font */
  mono: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  /** Serif / Editorial Font */
  serif: "var(--font-serif), Georgia, Cambria, 'Times New Roman', Times, serif",
  /** Canvas Document Fonts (independent from application UI) */
  canvas: {
    hand: "var(--font-sketch)",
    sans: "var(--font-sans)",
    serif: "var(--font-serif)",
  },
} as const

export const TYPOGRAPHY = {
  display: { size: "2rem", weight: 700, lineHeight: 1.2, letterSpacing: "-0.025em" },
  heading: { size: "1.25rem", weight: 600, lineHeight: 1.3, letterSpacing: "-0.015em" },
  section: { size: "0.875rem", weight: 600, lineHeight: 1.4, letterSpacing: "-0.01em" },
  body: { size: "0.8125rem", weight: 400, lineHeight: 1.5, letterSpacing: "normal" },
  small: { size: "0.75rem", weight: 400, lineHeight: 1.5, letterSpacing: "normal" },
  caption: { size: "0.6875rem", weight: 500, lineHeight: 1.4, letterSpacing: "0.01em" },
  micro: { size: "0.625rem", weight: 500, lineHeight: 1.3, letterSpacing: "0.02em" },
} as const

export const SPACING = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const

export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  dock: 20,
  full: 9999,
} as const

export const CONTROL_HEIGHT = {
  xs: 24,
  sm: 28,
  md: 32,
  lg: 36,
  xl: 40,
} as const

export const ICON_SIZE = {
  micro: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 26,
} as const

export const SHADOW = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.06)",
  md: "0 4px 8px -1px rgb(0 0 0 / 0.08)",
  lg: "0 10px 24px -4px rgb(0 0 0 / 0.12)",
  xl: "0 20px 40px -8px rgb(0 0 0 / 0.16)",
} as const

export const MOTION = {
  fast: "100ms cubic-bezier(0.16, 1, 0.3, 1)",
  normal: "150ms cubic-bezier(0.16, 1, 0.3, 1)",
  slow: "250ms cubic-bezier(0.16, 1, 0.3, 1)",
} as const

/** Application UI Accent Colors (Customizable via Settings -> Appearance -> Accent) */
export interface UIAccentOption {
  id: string
  label: string
  primary: string
  hover: string
  active: string
}

export const UI_ACCENTS: readonly UIAccentOption[] = [
  { id: "blue", label: "Blue", primary: "#2563EB", hover: "#1D4ED8", active: "#1E40AF" },
  { id: "indigo", label: "Indigo", primary: "#4F46E5", hover: "#4338CA", active: "#3730A3" },
  { id: "purple", label: "Purple", primary: "#9333EA", hover: "#7E22CE", active: "#6B21A8" },
  { id: "violet", label: "Violet", primary: "#7C3AED", hover: "#6D28D9", active: "#5B21B6" },
  { id: "cyan", label: "Cyan", primary: "#0D9488", hover: "#0F766E", active: "#115E59" },
  { id: "emerald", label: "Emerald", primary: "#059669", hover: "#047857", active: "#065F46" },
  { id: "lime", label: "Lime", primary: "#65A30D", hover: "#4D7C0F", active: "#3F6212" },
  { id: "amber", label: "Amber", primary: "#D97706", hover: "#B45309", active: "#92400E" },
  { id: "orange", label: "Orange", primary: "#EA580C", hover: "#C2410C", active: "#9A3412" },
  { id: "rose", label: "Rose", primary: "#E11D48", hover: "#BE123C", active: "#9F1239" },
  { id: "pink", label: "Pink", primary: "#DB2777", hover: "#BE185D", active: "#9D174D" },
  { id: "neutral", label: "Neutral", primary: "#18181B", hover: "#27272A", active: "#09090B" },
]

export const ACCENT = UI_ACCENTS[0] // Default Blue

export interface ColorSwatchOption {
  id: string
  label: string
  hex: string
}

export const COLOR_SWATCHES: readonly ColorSwatchOption[] = [
  { id: "red", label: "Laser Red", hex: "#EF4444" },
  { id: "rose", label: "Rose", hex: "#F43F5E" },
  { id: "pink", label: "Hot Pink", hex: "#EC4899" },
  { id: "purple", label: "Purple", hex: "#A855F7" },
  { id: "violet", label: "Electric Violet", hex: "#7C3AED" },
  { id: "indigo", label: "Royal Indigo", hex: "#6366F1" },
  { id: "blue", label: "Zenith Blue", hex: "#3B82F6" },
  { id: "cyan", label: "Cyan Aqua", hex: "#06B6D4" },
  { id: "teal", label: "Teal Emerald", hex: "#14B8A6" },
  { id: "emerald", label: "Neon Green", hex: "#10B981" },
  { id: "lime", label: "Lime Neon", hex: "#84CC16" },
  { id: "yellow", label: "Electric Yellow", hex: "#EAB308" },
  { id: "amber", label: "Sunset Amber", hex: "#F59E0B" },
  { id: "orange", label: "Coral Orange", hex: "#F97316" },
  { id: "graphite", label: "Graphite", hex: "#3F3F46" },
  { id: "black", label: "Pure Black", hex: "#18181B" },
  { id: "white", label: "Pure White", hex: "#FFFFFF" },
]

/** Canvas Document Pen Colors (Customizable via Page -> Ink -> Pen Color) */
export interface PenColorOption {
  id: string
  label: string
  color: string
  themeMapping: string // maps to a Look theme
}

export const PEN_COLORS: readonly PenColorOption[] = [
  { id: "hipster-black", label: "Hipster Black", color: "#2D2A26", themeMapping: "graphite" },
  { id: "ink-blue", label: "Ink Blue", color: "#2438FF", themeMapping: "internet-blue" },
  { id: "warm-brown", label: "Warm Brown", color: "#B26A0F", themeMapping: "marigold" },
  { id: "graphite", label: "Graphite", color: "#4B5563", themeMapping: "graphite" },
  { id: "slate", label: "Slate", color: "#71268A", themeMapping: "plum" },
  { id: "forest", label: "Forest", color: "#137A3D", themeMapping: "terminal-green" },
  { id: "burgundy", label: "Burgundy", color: "#E0342B", themeMapping: "riso-red" },
]
