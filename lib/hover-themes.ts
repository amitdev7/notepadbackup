// ---------------------------------------------------------------------------
// Zenithsui Smart Hover Notes — Universal Theme Registry
//
// Defines all rich aesthetic visual presentations for floating canvas hover notes.
// ---------------------------------------------------------------------------

export type HoverThemeCategory = "spatial" | "glass" | "tech" | "editorial"

export interface HoverThemeMeta {
  id: string
  label: string
  shortLabel: string
  emoji: string
  category: HoverThemeCategory
  description: string
  previewColor: string
}

export const HOVER_THEME_CATEGORIES: Array<{ id: HoverThemeCategory; label: string; icon: string }> = [
  { id: "spatial", label: "Spatial & Clouds", icon: "⛅" },
  { id: "glass", label: "Apple & Glass", icon: "✨" },
  { id: "tech", label: "Tech & Cyber", icon: "⚡" },
  { id: "editorial", label: "Editorial & Art", icon: "🎨" },
]

export const HOVER_THEMES: HoverThemeMeta[] = [
  // 1. Spatial & Clouds
  {
    id: "wordcloud",
    label: "Word Cloud (Text)",
    shortLabel: "Word Cloud",
    emoji: "☁️",
    category: "spatial",
    description: "Pure floating typography with word-level emphasis & color harmony",
    previewColor: "#7C3AED",
  },
  {
    id: "frosted",
    label: "3D Frosted Cloud",
    shortLabel: "3D Cloud",
    emoji: "⛅",
    category: "spatial",
    description: "Apple VisionOS frosted glass cloud with dynamic celestial accents",
    previewColor: "#38BDF8",
  },
  {
    id: "hologram",
    label: "Spatial Hologram",
    shortLabel: "Hologram",
    emoji: "🥽",
    category: "spatial",
    description: "Vision Pro spatial computing glass with chromatic dispersion ring",
    previewColor: "#06B6D4",
  },

  // 2. Apple & Modern Glass
  {
    id: "macos",
    label: "macOS Sequoia",
    shortLabel: "macOS",
    emoji: "🍏",
    category: "glass",
    description: "Cupertino desktop frosted glass with specular rim light & sparkle tags",
    previewColor: "#94A3B8",
  },
  {
    id: "ios",
    label: "iOS Dynamic Glass",
    shortLabel: "iOS Glass",
    emoji: "📱",
    category: "glass",
    description: "Deep obsidian glass with electric iridescent neon border gradient",
    previewColor: "#8B5CF6",
  },
  {
    id: "aurora",
    label: "Northern Aurora",
    shortLabel: "Aurora",
    emoji: "🌌",
    category: "glass",
    description: "Ethereal emerald and amethyst starlight aurora refraction",
    previewColor: "#10B981",
  },
  {
    id: "golden-gate",
    label: "Golden Gate OS",
    shortLabel: "Golden Gate",
    emoji: "🌉",
    category: "glass",
    description: "24k champagne gold & sunset bronze liquid glass luxury finish",
    previewColor: "#F59E0B",
  },

  // 3. High-Tech & Cyber
  {
    id: "cyberpunk",
    label: "Cyberpunk HUD",
    shortLabel: "Cyberpunk",
    emoji: "⚡",
    category: "tech",
    description: "High-tech amber & cyan telemetry HUD with scanline micro-grid",
    previewColor: "#EAB308",
  },
  {
    id: "matrix",
    label: "Matrix Terminal",
    shortLabel: "Matrix",
    emoji: "💻",
    category: "tech",
    description: "Retro CRT phosphor green monospace terminal with pulse cursor",
    previewColor: "#22C55E",
  },
  {
    id: "blueprint",
    label: "Blueprint CAD",
    shortLabel: "Blueprint",
    emoji: "📐",
    category: "tech",
    description: "Drafting cyan grid with white chalk precision coordinates",
    previewColor: "#0284C7",
  },

  // 4. Editorial & Specialized
  {
    id: "minimalist",
    label: "Notion Minimalist",
    shortLabel: "Minimalist",
    emoji: "📄",
    category: "editorial",
    description: "Swiss editorial stark paper card with hairline precision borders",
    previewColor: "#64748B",
  },
  {
    id: "stealth",
    label: "Obsidian Stealth",
    shortLabel: "Stealth",
    emoji: "🖤",
    category: "editorial",
    description: "Matte carbon black tactical finish with understated graphite rim",
    previewColor: "#334155",
  },
  {
    id: "synthwave",
    label: "80s Retro Synthwave",
    shortLabel: "Synthwave",
    emoji: "🌴",
    category: "editorial",
    description: "Neon magenta sunset horizon with retro arcade text glow",
    previewColor: "#EC4899",
  },
  {
    id: "parchment",
    label: "Vintage Parchment",
    shortLabel: "Parchment",
    emoji: "📜",
    category: "editorial",
    description: "Antique sepia parchment with classic literary serif typography",
    previewColor: "#D97706",
  },
]

export const CLOUD_WEATHER_STYLES = [
  { id: "sun", label: "Sun ☀️", description: "Golden radiant sun with ambient aura" },
  { id: "rain", label: "Rain 🌧️", description: "Cyan rain droplet shower" },
  { id: "lightning", label: "Thunder ⚡", description: "Electric cyan lightning bolt" },
  { id: "wind", label: "Breeze ❄️", description: "Geometric ice crystal breeze" },
  { id: "classic", label: "Pure ☁️", description: "Pure cloud formation without weather" },
]
