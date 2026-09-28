/**
 * Master 48-Color Palette for Zenithsui
 * 
 * Beautifully curated, hand-selected 48 colors organized into 6 chromatic rows of 8 colors:
 * Row 1: Grayscale & Carbon Inks
 * Row 2: Earth Tones, Woods & Ochres
 * Row 3: Crimson, Reds & Corals
 * Row 4: Oranges, Ambers & Golden Yellows
 * Row 5: Greens, Olives & Teals
 * Row 6: Cyans, Blues, Indigos & Purples
 */

export interface ColorSwatch {
  hex: string
  name: string
  category: string
}

export const PALETTE_48: ColorSwatch[] = [
  // Row 1: Grayscale & Inks (8)
  { hex: "#000000", name: "Ink Black", category: "Grayscale" },
  { hex: "#1e293b", name: "Dark Slate", category: "Grayscale" },
  { hex: "#334155", name: "Charcoal", category: "Grayscale" },
  { hex: "#64748b", name: "Graphite", category: "Grayscale" },
  { hex: "#94a3b8", name: "Silver", category: "Grayscale" },
  { hex: "#cbd5e1", name: "Cool Grey", category: "Grayscale" },
  { hex: "#f1f5f9", name: "Paper Light", category: "Grayscale" },
  { hex: "#ffffff", name: "Pure White", category: "Grayscale" },

  // Row 2: Earth & Warm Woods (8)
  { hex: "#3e2723", name: "Espresso", category: "Earth" },
  { hex: "#5d4037", name: "Sepia", category: "Earth" },
  { hex: "#795548", name: "Saddle Brown", category: "Earth" },
  { hex: "#8d6e63", name: "Cocoa", category: "Earth" },
  { hex: "#b45309", name: "Caramel", category: "Earth" },
  { hex: "#d97706", name: "Warm Amber", category: "Earth" },
  { hex: "#eab308", name: "Raw Sienna", category: "Earth" },
  { hex: "#fef08a", name: "Parchment", category: "Earth" },

  // Row 3: Crimson, Reds & Corals (8)
  { hex: "#881337", name: "Wine Red", category: "Red" },
  { hex: "#991b1b", name: "Crimson", category: "Red" },
  { hex: "#b91c1c", name: "Brick Red", category: "Red" },
  { hex: "#dc2626", name: "True Red", category: "Red" },
  { hex: "#ef4444", name: "Bright Coral", category: "Red" },
  { hex: "#f87171", name: "Pastel Red", category: "Red" },
  { hex: "#fb7185", name: "Rose", category: "Red" },
  { hex: "#fda4af", name: "Blush", category: "Red" },

  // Row 4: Oranges, Ambers & Yellows (8)
  { hex: "#7c2d12", name: "Burnt Sienna", category: "Orange" },
  { hex: "#9a3412", name: "Rust", category: "Orange" },
  { hex: "#c2410c", name: "Terracotta", category: "Orange" },
  { hex: "#ea580c", name: "Flame Orange", category: "Orange" },
  { hex: "#f97316", name: "Tangerine", category: "Orange" },
  { hex: "#fb923c", name: "Peach", category: "Orange" },
  { hex: "#f59e0b", name: "Goldenrod", category: "Yellow" },
  { hex: "#facc15", name: "Canary Yellow", category: "Yellow" },

  // Row 5: Greens & Teals (8)
  { hex: "#14532d", name: "Hunter Green", category: "Green" },
  { hex: "#166534", name: "Forest Green", category: "Green" },
  { hex: "#15803d", name: "Leaf Green", category: "Green" },
  { hex: "#16a34a", name: "Grass Green", category: "Green" },
  { hex: "#22c55e", name: "Bright Green", category: "Green" },
  { hex: "#4ade80", name: "Mint", category: "Green" },
  { hex: "#047857", name: "Pine Teal", category: "Green" },
  { hex: "#0d9488", name: "Teal Green", category: "Green" },

  // Row 6: Cyans, Blues, Violets & Purples (8)
  { hex: "#0891b2", name: "Cerulean", category: "Blue" },
  { hex: "#0284c7", name: "Sky Blue", category: "Blue" },
  { hex: "#1d4ed8", name: "Cobalt Blue", category: "Blue" },
  { hex: "#2563eb", name: "Royal Blue", category: "Blue" },
  { hex: "#4f46e5", name: "Indigo", category: "Violet" },
  { hex: "#7c3aed", name: "Deep Violet", category: "Violet" },
  { hex: "#9333ea", name: "Purple", category: "Violet" },
  { hex: "#c026d3", name: "Magenta", category: "Violet" },
]
