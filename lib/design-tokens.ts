// ---------------------------------------------------------------------------
// Zenithsui Design Tokens — single source of truth for the UI visual system
// ---------------------------------------------------------------------------

export const SPACING = {
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  dock: 20,
  full: 9999,
} as const

export const SHADOW = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.06)",
  md: "0 4px 8px -1px rgb(0 0 0 / 0.08)",
  lg: "0 10px 24px -4px rgb(0 0 0 / 0.12)",
  xl: "0 20px 40px -8px rgb(0 0 0 / 0.16)",
} as const

export const CONTROL_HEIGHT = {
  xs: 24,
  sm: 28,
  md: 32,
  lg: 36,
  xl: 40,
} as const

export const ACCENT = {
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryActive: "#1E40AF",
} as const

export const TYPOGRAPHY = {
  display: { size: "2rem", weight: 700, lineHeight: 1.2 },
  heading: { size: "1.25rem", weight: 600, lineHeight: 1.3 },
  section: { size: "0.875rem", weight: 600, lineHeight: 1.4 },
  body: { size: "0.8125rem", weight: 400, lineHeight: 1.5 },
  small: { size: "0.75rem", weight: 400, lineHeight: 1.5 },
  caption: { size: "0.6875rem", weight: 500, lineHeight: 1.4 },
  micro: { size: "0.625rem", weight: 500, lineHeight: 1.3 },
} as const
