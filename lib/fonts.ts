// ---------------------------------------------------------------------------
// Zenithsui Font System & 50+ Curated Fonts Library
//
// Includes:
// 1. Curated list of ~50 fonts ideal for wireframing, sketch, UI, serif, and code
// 2. Dynamic Google Font loader with automatic caching & stylesheet injection
// 3. Custom Font adding & persistent storage in localStorage
// 4. Fallback and font family resolution for canvas & SVG renderers
// ---------------------------------------------------------------------------

export interface FontDefinition {
  name: string
  category: "sketch" | "sans" | "serif" | "mono" | "display" | "custom"
  label: string
  sample?: string
  googleFont?: boolean
}

export const CURATED_FONTS: FontDefinition[] = [
  // --- Handwritten & Sketch (15 fonts) ---
  { name: "Patrick Hand", category: "sketch", label: "Patrick Hand (Sketch Default)" },
  { name: "Caveat", category: "sketch", label: "Caveat", googleFont: true },
  { name: "Kalam", category: "sketch", label: "Kalam", googleFont: true },
  { name: "Shadows Into Light", category: "sketch", label: "Shadows Into Light", googleFont: true },
  { name: "Indie Flower", category: "sketch", label: "Indie Flower", googleFont: true },
  { name: "Architects Daughter", category: "sketch", label: "Architects Daughter", googleFont: true },
  { name: "Gloria Hallelujah", category: "sketch", label: "Gloria Hallelujah", googleFont: true },
  { name: "Permanent Marker", category: "sketch", label: "Permanent Marker", googleFont: true },
  { name: "Gochi Hand", category: "sketch", label: "Gochi Hand", googleFont: true },
  { name: "Covered By Your Grace", category: "sketch", label: "Covered By Your Grace", googleFont: true },
  { name: "Schoolbell", category: "sketch", label: "Schoolbell", googleFont: true },
  { name: "Reenie Beanie", category: "sketch", label: "Reenie Beanie", googleFont: true },
  { name: "Just Another Hand", category: "sketch", label: "Just Another Hand", googleFont: true },
  { name: "Neucha", category: "sketch", label: "Neucha", googleFont: true },
  { name: "Pangolin", category: "sketch", label: "Pangolin", googleFont: true },

  // --- Clean & Modern Sans (16 fonts) ---
  { name: "Plus Jakarta Sans", category: "sans", label: "Plus Jakarta Sans", googleFont: true },
  { name: "Inter", category: "sans", label: "Inter", googleFont: true },
  { name: "Outfit", category: "sans", label: "Outfit", googleFont: true },
  { name: "DM Sans", category: "sans", label: "DM Sans", googleFont: true },
  { name: "Poppins", category: "sans", label: "Poppins", googleFont: true },
  { name: "Work Sans", category: "sans", label: "Work Sans", googleFont: true },
  { name: "Nunito", category: "sans", label: "Nunito", googleFont: true },
  { name: "Quicksand", category: "sans", label: "Quicksand", googleFont: true },
  { name: "Montserrat", category: "sans", label: "Montserrat", googleFont: true },
  { name: "Manrope", category: "sans", label: "Manrope", googleFont: true },
  { name: "Rubik", category: "sans", label: "Rubik", googleFont: true },
  { name: "Sora", category: "sans", label: "Sora", googleFont: true },
  { name: "Urbanist", category: "sans", label: "Urbanist", googleFont: true },
  { name: "Raleway", category: "sans", label: "Raleway", googleFont: true },
  { name: "Figtree", category: "sans", label: "Figtree", googleFont: true },
  { name: "Albert Sans", category: "sans", label: "Albert Sans", googleFont: true },

  // --- Elegant & Editorial Serif (10 fonts) ---
  { name: "Playfair Display", category: "serif", label: "Playfair Display", googleFont: true },
  { name: "Merriweather", category: "serif", label: "Merriweather", googleFont: true },
  { name: "Lora", category: "serif", label: "Lora", googleFont: true },
  { name: "Cormorant Garamond", category: "serif", label: "Cormorant Garamond", googleFont: true },
  { name: "Libre Baskerville", category: "serif", label: "Libre Baskerville", googleFont: true },
  { name: "Cinzel", category: "serif", label: "Cinzel", googleFont: true },
  { name: "EB Garamond", category: "serif", label: "EB Garamond", googleFont: true },
  { name: "Bitter", category: "serif", label: "Bitter", googleFont: true },
  { name: "DM Serif Display", category: "serif", label: "DM Serif Display", googleFont: true },
  { name: "Bodoni Moda", category: "serif", label: "Bodoni Moda", googleFont: true },

  // --- Monospace & Code (7 fonts) ---
  { name: "JetBrains Mono", category: "mono", label: "JetBrains Mono", googleFont: true },
  { name: "Fira Code", category: "mono", label: "Fira Code", googleFont: true },
  { name: "Space Mono", category: "mono", label: "Space Mono", googleFont: true },
  { name: "IBM Plex Mono", category: "mono", label: "IBM Plex Mono", googleFont: true },
  { name: "Source Code Pro", category: "mono", label: "Source Code Pro", googleFont: true },
  { name: "Roboto Mono", category: "mono", label: "Roboto Mono", googleFont: true },
  { name: "Inconsolata", category: "mono", label: "Inconsolata", googleFont: true },

  // --- Display & Personality (6 fonts) ---
  { name: "Syne", category: "display", label: "Syne", googleFont: true },
  { name: "Oswald", category: "display", label: "Oswald", googleFont: true },
  { name: "Bebas Neue", category: "display", label: "Bebas Neue", googleFont: true },
  { name: "Righteous", category: "display", label: "Righteous", googleFont: true },
  { name: "Abril Fatface", category: "display", label: "Abril Fatface", googleFont: true },
  { name: "Anton", category: "display", label: "Anton", googleFont: true },
]

export const FONT_CATEGORIES = [
  { id: "all", label: "All (50+)" },
  { id: "sketch", label: "Sketch & Hand" },
  { id: "sans", label: "Clean Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Monospace" },
  { id: "display", label: "Display" },
  { id: "custom", label: "Custom Added" },
] as const

const CUSTOM_FONTS_STORAGE_KEY = "zenithsui_custom_fonts_v1"
const loadedFonts = new Set<string>(["Patrick Hand", "sans-serif", "serif", "monospace"])

/**
 * Dynamically injects Google Font link into document head if not already loaded.
 */
export function loadGoogleFont(fontName: string): void {
  if (typeof document === "undefined" || !fontName) return

  const cleanName = fontName.trim().replace(/^["']|["']$/g, "")
  if (
    !cleanName ||
    cleanName.startsWith("var(") ||
    cleanName === "hand" ||
    cleanName === "sans" ||
    cleanName === "serif" ||
    loadedFonts.has(cleanName)
  ) {
    return
  }

  const tagId = `gfont-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
  if (document.getElementById(tagId)) {
    loadedFonts.add(cleanName)
    return
  }

  try {
    const link = document.createElement("link")
    link.id = tagId
    link.rel = "stylesheet"
    // Encode space with + for Google Fonts URL format
    const formattedFamily = cleanName.replace(/\s+/g, "+")
    link.href = `https://fonts.googleapis.com/css2?family=${formattedFamily}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
    document.head.appendChild(link)
    loadedFonts.add(cleanName)
  } catch (err) {
    console.warn("Failed to load Google Font:", cleanName, err)
  }
}

/**
 * Retrieves list of user-added custom font names from localStorage.
 */
export function getStoredCustomFonts(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Adds a new custom font name to localStorage and triggers Google Font load.
 */
export function saveCustomFont(fontName: string): string[] {
  if (typeof window === "undefined") return []
  const clean = fontName.trim().replace(/^["']|["']$/g, "")
  if (!clean) return getStoredCustomFonts()

  const existing = getStoredCustomFonts()
  if (!existing.includes(clean)) {
    const updated = [clean, ...existing]
    try {
      localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    loadGoogleFont(clean)
    return updated
  }
  loadGoogleFont(clean)
  return existing
}

/**
 * Resolves a font name into a safe CSS font-family string.
 */
export function resolveFontFamily(fontName: string | undefined): string {
  if (!fontName) return "var(--sq-font)"
  if (fontName === "hand") return "var(--font-sketch)"
  if (fontName === "sans") return "var(--font-sans)"
  if (fontName === "serif") return "var(--font-serif)"
  if (fontName.startsWith("var(")) return fontName

  // For any named font, wrap in quotes and add fallback
  return `"${fontName}", var(--font-sketch), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}
