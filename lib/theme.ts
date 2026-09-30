// ---------------------------------------------------------------------------
// Themes — a duotone ink on paper, applied as CSS custom properties so the
// whole canvas restyles without re-running a single rough.js path.
//
// The look is early-web risograph: one saturated ink, bright paper, and flat
// shaded fills doing the "analog" work that wobbly lines used to do. Lines
// stay clean and closed.
//
// Area fills come from exactly three tones — paper, shade, shadeStrong — so a
// wireframe reads as a small tonal ladder rather than a pile of tints. Both
// shades are the ink mixed into the paper (8% and 20%), which keeps every
// theme's fills in that theme's own hue. If you retune a palette's ink or
// paper, recompute the two shades from them rather than nudging them by eye.
// ---------------------------------------------------------------------------

export interface Palette {
  /** shown in the menu */
  label: string
  /** infinite canvas behind everything */
  bg: string
  /** surfaces that should occlude what's under them */
  paper: string
  /** the ink: strokes and text */
  ink: string
  /** secondary text and strokes */
  muted: string
  /** dividers, hairlines, disabled */
  faint: string
  /** fill tone 1 — the light wash: inert surfaces, tracks, image placeholders */
  shade: string
  /** fill tone 2 — one clear step darker: emphasis, selection, chart bars */
  shadeStrong: string
  /** the canvas dot grid */
  grid: string
  /** selection UI — deliberately NOT the ink, so it reads against the art */
  select: string
}

export const THEMES = {
  "internet-blue": {
    label: "Internet blue",
    bg: "#FBFAF5",
    paper: "#FFFFFF",
    ink: "#2438FF",
    muted: "#6E7DFF",
    faint: "#BFC6FF",
    shade: "#EDEFFF",
    shadeStrong: "#D3D7FF",
    grid: "#E6E1D3",
    select: "#A200FF",
  },
  "riso-red": {
    label: "Riso red",
    bg: "#FCFAF7",
    paper: "#FFFFFF",
    ink: "#E0342B",
    muted: "#EE7B72",
    faint: "#F7B9B3",
    shade: "#FDEFEE",
    shadeStrong: "#F9D6D5",
    grid: "#E8E0D3",
    select: "#2438FF",
  },
  "terminal-green": {
    label: "Terminal green",
    bg: "#F8FBF7",
    paper: "#FFFFFF",
    ink: "#137A3D",
    muted: "#54A472",
    faint: "#A3CDB2",
    shade: "#ECF4EF",
    shadeStrong: "#D0E4D8",
    grid: "#D9E4D5",
    select: "#E8622F",
  },
  plum: {
    label: "Purple drizzle",
    bg: "#FCF9FC",
    paper: "#FFFFFF",
    ink: "#71268A",
    muted: "#A566B8",
    faint: "#D0AADB",
    shade: "#F4EEF6",
    shadeStrong: "#E3D4E8",
    grid: "#E7DFE9",
    select: "#D9A441",
  },
  marigold: {
    label: "Dirty blond",
    bg: "#FDFAF2",
    paper: "#FFFFFF",
    ink: "#B26A0F",
    muted: "#D69B4E",
    faint: "#EDCC96",
    shade: "#F9F3EC",
    shadeStrong: "#F0E1CF",
    grid: "#EAE0C7",
    select: "#2438FF",
  },
  graphite: {
    label: "Hipster black",
    bg: "#FCFCFA",
    paper: "#FFFFFF",
    ink: "#2D2A26",
    muted: "#8A857D",
    faint: "#C9C4BB",
    shade: "#EEEEEE",
    shadeStrong: "#D5D4D4",
    grid: "#E2DDD3",
    select: "#E0653A",
  },
} satisfies Record<string, Palette>

export const DARK_THEMES: Record<string, Palette> = {
  "internet-blue": {
    label: "Internet blue",
    bg: "#0E121A",
    paper: "#171D28",
    ink: "#5B8BF7",
    muted: "#93C5FD",
    faint: "#283548",
    shade: "#1C2536",
    shadeStrong: "#2A3A56",
    grid: "#242E40",
    select: "#C084FC",
  },
  "riso-red": {
    label: "Riso red",
    bg: "#140F0F",
    paper: "#201717",
    ink: "#F87171",
    muted: "#FCA5A5",
    faint: "#4A2828",
    shade: "#311A1A",
    shadeStrong: "#4D2323",
    grid: "#2C1E1E",
    select: "#60A5FA",
  },
  "terminal-green": {
    label: "Terminal green",
    bg: "#0D1410",
    paper: "#14221A",
    ink: "#4ADE80",
    muted: "#86EFAC",
    faint: "#1C3B29",
    shade: "#172F21",
    shadeStrong: "#234934",
    grid: "#1C3224",
    select: "#FB923C",
  },
  plum: {
    label: "Purple drizzle",
    bg: "#130F17",
    paper: "#201726",
    ink: "#C084FC",
    muted: "#D8B4FE",
    faint: "#3D254C",
    shade: "#2D1939",
    shadeStrong: "#452458",
    grid: "#2C1F34",
    select: "#FBBF24",
  },
  marigold: {
    label: "Dirty blond",
    bg: "#14120E",
    paper: "#221C14",
    ink: "#FBBF24",
    muted: "#FDE68A",
    faint: "#4A3A22",
    shade: "#332513",
    shadeStrong: "#4F3718",
    grid: "#2E2416",
    select: "#60A5FA",
  },
  graphite: {
    label: "Hipster black",
    bg: "#121214",
    paper: "#1C1C20",
    ink: "#F4F4F6",
    muted: "#A1A1AA",
    faint: "#3F3F46",
    shade: "#242429",
    shadeStrong: "#383842",
    grid: "#27272E",
    select: "#FB923C",
  },
} satisfies Record<string, Palette>

export type ThemeName = keyof typeof THEMES

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[]
export const DEFAULT_THEME: ThemeName = "internet-blue"

/**
 * The face the canvas letters in — the "is this decided yet" dial.
 *
 * Hand says nothing is settled. Sans and serif are the two ways a wireframe
 * starts admitting it might ship, and picking between them is a real question
 * early on, which is why it's a choice of three rather than a switch.
 */
export type FontMode = "hand" | "sans" | "serif"
export const DEFAULT_FONT: FontMode = "hand"

/** What each mode puts in --sq-font. */
export const FONT_FAMILY: Record<FontMode, string> = {
  hand: "var(--font-sketch)",
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
}

// ---------------------------------------------------------------------------
// Paper.
//
// Each palette ships one sheet colour — the warm off-white it was drawn
// against. This is the dial off it: bleach it to pure white for a screenshot,
// leave it as authored, or take it a step down toward the grid so a
// mostly-white wireframe has something to sit on.
//
// It moves --sq-bg only. --sq-paper, the opaque fill a card uses to occlude
// what's behind it, stays the palette's white: darkening the sheet is exactly
// how you make those cards lift off it.
// ---------------------------------------------------------------------------

export type PaperShade = "white" | "subtle" | "shaded"
export const DEFAULT_PAPER: PaperShade = "subtle"

export const PAPER_SHADES: readonly { value: PaperShade; label: string }[] = [
  { value: "white", label: "White" },
  { value: "subtle", label: "Subtle" },
  { value: "shaded", label: "Shaded" },
]

/** Linear blend of two hex colours — `t` of `b` into `a`. */
function mix(a: string, b: string, t: number): string {
  const hex = (s: string) => {
    const v = s.replace("#", "")
    const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

/** The sheet colour: what sits behind the whole drawing. */
export function bgOf(p: Palette, shade: PaperShade, isDark?: boolean): string {
  const dark = isDark ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
  if (shade === "white") return dark ? "#0A0B0E" : "#FFFFFF"
  // far enough toward the grid colour to read as a choice — at half that, the
  // three shades look like the same white three times
  if (shade === "shaded") return dark ? mix(p.bg, p.grid, 0.8) : mix(p.bg, p.grid, 0.7)
  return p.bg
}

/** The dot grid, kept readable against whatever the sheet just became. */
export function gridOf(p: Palette, shade: PaperShade): string {
  return shade === "shaded" ? mix(p.grid, p.ink, 0.15) : p.grid
}

export function paletteOf(name: string, isDark?: boolean): Palette {
  const darkActive = isDark ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
  if (darkActive) {
    return DARK_THEMES[name as ThemeName] ?? DARK_THEMES[DEFAULT_THEME] ?? THEMES[name as ThemeName] ?? THEMES[DEFAULT_THEME]
  }
  return THEMES[name as ThemeName] ?? THEMES[DEFAULT_THEME]
}

// ---------------------------------------------------------------------------
// The look.
//
// Ink, paper, font and grid belong to the drawing, not to the app: a red
// marker-on-white flow chart and a graphite-on-shaded interface study are two
// documents you keep side by side, and opening one shouldn't repaint the other.
// So a look is saved inside the document, and the last one you set is only the
// default a NEW document starts from.
// ---------------------------------------------------------------------------

export interface Look {
  theme: ThemeName
  paper: PaperShade
  font: FontMode
  /** the canvas dot grid is drawn */
  grid: boolean
}

export const DEFAULT_LOOK: Look = {
  theme: DEFAULT_THEME,
  paper: DEFAULT_PAPER,
  font: DEFAULT_FONT,
  grid: true,
}

/** Write a look onto the document element. `grid` is drawn by the canvas, not
    by a custom property, so it is the one part this doesn't touch. */
export function applyLook({ theme, font, paper }: Look) {
  if (typeof document === "undefined") return
  const isDark = document.documentElement.classList.contains("dark")
  const p = paletteOf(theme, isDark)
  const root = document.documentElement
  root.style.setProperty("--sq-bg", bgOf(p, paper, isDark))
  root.style.setProperty("--sq-paper", p.paper)
  root.style.setProperty("--sq-ink", p.ink)
  root.style.setProperty("--sq-muted", p.muted)
  root.style.setProperty("--sq-faint", p.faint)
  root.style.setProperty("--sq-shade", p.shade)
  root.style.setProperty("--sq-shade-strong", p.shadeStrong)
  root.style.setProperty("--sq-grid", gridOf(p, paper))
  root.style.setProperty("--sq-select", p.select)
  root.style.setProperty("--sq-font", FONT_FAMILY[font] ?? FONT_FAMILY.hand)
}
