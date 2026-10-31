// ---------------------------------------------------------------------------
// Zenithsui Smart Hover Notes — Reference Design Theme Registry
//
// 1:1 Implementation of physical floating card designs matching reference images:
// 1. yellow-slate  : Cyber Yellow Bezel + Matte Obsidian Slate (Image 1)
// 2. ice-ceramic   : Translucent Ice Sky Glass Rim + Frosted Ceramic White (Image 2)
// 3. royal-slate   : Royal Cobalt Blue Bezel + Matte Obsidian Slate (Image 3)
// 4. cyan-slate    : Electric Neon Cyan Bezel + Matte Obsidian Slate (Image 4)
// 5. acrylic-glass : Specular Transparent Acrylic Glass Tile + Floating White Card (Image 5)
// ---------------------------------------------------------------------------

export interface HoverThemeMeta {
  id: string
  label: string
  shortLabel: string
  emoji: string
  description: string
  previewColor: string
  bezelColor: string
  surfaceColor: string
  textColor: string
}

export const HOVER_THEMES: HoverThemeMeta[] = [
  {
    id: "yellow-slate",
    label: "Yellow Slate (Image 1)",
    shortLabel: "Yellow Slate",
    emoji: "🟡",
    description: "Matte obsidian black slate framed in a bold sunny yellow bezel",
    previewColor: "#FACC15",
    bezelColor: "#FACC15",
    surfaceColor: "#18191E",
    textColor: "#FFFFFF",
  },
  {
    id: "ice-ceramic",
    label: "Ice Ceramic Glass (Image 2)",
    shortLabel: "Ice Ceramic",
    emoji: "❄️",
    description: "Frosted milky ceramic white card encased in an ice-blue translucent glass rim",
    previewColor: "#7DD3FC",
    bezelColor: "#7DD3FC",
    surfaceColor: "#FFFFFF",
    textColor: "#0F172A",
  },
  {
    id: "royal-slate",
    label: "Royal Cobalt Slate (Image 3)",
    shortLabel: "Royal Slate",
    emoji: "🔵",
    description: "Matte obsidian black slate framed in an electric royal blue bezel",
    previewColor: "#2563EB",
    bezelColor: "#2563EB",
    surfaceColor: "#18191E",
    textColor: "#FFFFFF",
  },
  {
    id: "cyan-slate",
    label: "Neon Cyan Slate (Image 4)",
    shortLabel: "Cyan Slate",
    emoji: "🩵",
    description: "Matte obsidian black slate framed in a vibrant electric cyan bezel",
    previewColor: "#00B4D8",
    bezelColor: "#00B4D8",
    surfaceColor: "#18191E",
    textColor: "#FFFFFF",
  },
  {
    id: "acrylic-glass",
    label: "Acrylic Glass Specular (Image 5)",
    shortLabel: "Acrylic Glass",
    emoji: "✨",
    description: "Transparent acrylic glass chassis with specular reflection & floating white card",
    previewColor: "#EAB308",
    bezelColor: "#EAB308",
    surfaceColor: "#FFFFFF",
    textColor: "#0F172A",
  },
]
