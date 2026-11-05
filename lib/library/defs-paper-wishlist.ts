// ---------------------------------------------------------------------------
// Zenithsui Library Definition — Aesthetic Paper Wishlist
//
// An authentic stationery paper wishlist / checklist inspired by physical
// paper craft: cream torn-edge paper, metal paperclip, bright orange stars,
// bold display typography, dashed divider lines, illustrated item graphics,
// and interactive checkboxes.
// ---------------------------------------------------------------------------

import type { ComponentDef, Props } from "./registry"
import type { Prim } from "@/lib/sketch/kit"
import { rect, line, text, poly, ellipse, pill } from "@/lib/sketch/kit"

export interface WishlistItemDef {
  id: string
  text: string
  subtext?: string
  done: boolean
  icon: "matcha" | "girls" | "shopping" | "coffee" | "travel" | "sun" | "books" | "cake" | "heart" | "custom"
  customIconUrl?: string
}

export const DEFAULT_WISHLIST_ITEMS: WishlistItemDef[] = [
  {
    id: "item-1",
    text: "Matcha & good",
    subtext: "weather",
    done: false,
    icon: "matcha",
  },
  {
    id: "item-2",
    text: "Day out with the girls",
    subtext: "(at the Afro Hair & Beauty Live!)",
    done: false,
    icon: "girls",
  },
  {
    id: "item-3",
    text: "Discover new",
    subtext: "haircare essentials",
    done: false,
    icon: "shopping",
  },
]

// 5-point star vertex generator
function starPts(cx: number, cy: number, rOuter: number, rInner: number, rotDeg = 0): [number, number][] {
  const pts: [number, number][] = []
  const rotRad = (rotDeg * Math.PI) / 180
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2 + rotRad
    const r = i % 2 === 0 ? rOuter : rInner
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return pts
}

// Torn bottom edge polygon generator
function tornPaperPoly(w: number, h: number): [number, number][] {
  const pts: [number, number][] = [
    [0, 4],
    [w, 4],
    [w, h - 22],
  ]
  const steps = 24
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * w
    const tear = Math.sin(i * 1.6) * 4.5 + Math.cos(i * 2.8) * 3 + (i % 2 === 0 ? 2 : -2)
    pts.push([x, h - 20 + tear])
  }
  pts.push([0, h - 22])
  return pts
}

export const ACCENT_COLORS: Record<string, string> = {
  orange: "#FF5A1F",
  pink: "#EC4899",
  emerald: "#10B981",
  sky: "#0284C7",
  violet: "#8B5CF6",
  black: "#18181B",
}

export const paperWishlistDef: ComponentDef = {
  kind: "paper-wishlist",
  name: "Paper Wishlist",
  category: "blocks",
  group: "Cards",
  keywords: [
    "wishlist",
    "checklist",
    "paper",
    "stationery",
    "todo",
    "bank holiday",
    "aesthetic",
    "bucket list",
    "tasks",
    "notes",
    "lifestyle",
    "holiday",
    "shopping",
    "matcha",
  ],
  size: { w: 340, h: 480 },
  interactive: true,
  defaults: {
    titleLine1: "bank holiday",
    titleLine2: "wishlist",
    accentColor: "orange",
    showPaperclip: true,
    showStars: true,
    items: DEFAULT_WISHLIST_ITEMS,
  },
  controls: [
    { key: "titleLine1", label: "Title Line 1", type: "text" },
    { key: "titleLine2", label: "Title Line 2", type: "text" },
    {
      key: "accentColor",
      label: "Accent Color",
      type: "select",
      options: ["orange", "pink", "emerald", "sky", "violet", "black"],
      quick: true,
    },
    { key: "showPaperclip", label: "Paperclip", type: "toggle", quick: true },
    { key: "showStars", label: "Stars", type: "toggle", quick: true },
  ],
  render(p: Props, w: number, h: number): Prim[] {
    const prims: Prim[] = []
    const pad = 20
    const accent = ACCENT_COLORS[String(p.accentColor || "orange")] || "#FF5A1F"
    const title1 = String(p.titleLine1 ?? "bank holiday")
    const title2 = String(p.titleLine2 ?? "wishlist")
    const showClip = p.showPaperclip !== false
    const showStars = p.showStars !== false

    const items: WishlistItemDef[] = Array.isArray(p.items) && p.items.length > 0
      ? (p.items as WishlistItemDef[])
      : DEFAULT_WISHLIST_ITEMS

    // 1. Torn stationery sheet background
    const paperPts = tornPaperPoly(w, h)
    prims.push(
      poly(paperPts, true, {
        fill: "solid",
        customFill: "#FCFAF6",
        customStroke: "#E6DFD5",
        strokeWidth: 1.2,
      })
    )

    // 2. Paperclip on top-left
    if (showClip) {
      // Soft shadow
      prims.push(
        line(28, 4, 42, 4, {
          customStroke: "rgba(0,0,0,0.12)",
          strokeWidth: 3,
        })
      )
      // Metallic loop segments
      prims.push(
        line(28, 38, 28, -4, { customStroke: "#64748B", strokeWidth: 2 }),
        line(28, -4, 42, -4, { customStroke: "#64748B", strokeWidth: 2 }),
        line(42, -4, 42, 46, { customStroke: "#64748B", strokeWidth: 2 }),
        line(42, 46, 32, 46, { customStroke: "#64748B", strokeWidth: 2 }),
        line(32, 46, 32, 12, { customStroke: "#64748B", strokeWidth: 2 }),
        line(32, 12, 38, 12, { customStroke: "#64748B", strokeWidth: 2 }),
        line(38, 12, 38, 38, { customStroke: "#64748B", strokeWidth: 2 })
      )
    }

    // 3. Orange stars flanking the title
    if (showStars) {
      prims.push(
        poly(starPts(pad + 18, 50, 10, 4.2, -14), true, {
          fill: "solid",
          customFill: accent,
          customStroke: accent,
        }),
        poly(starPts(w - pad - 18, 48, 10, 4.2, 14), true, {
          fill: "solid",
          customFill: accent,
          customStroke: accent,
        })
      )
    }

    // 4. Title Header (bold, vibrant orange, lowercase)
    prims.push(
      text(w / 2, 54, title1, 23, {
        align: "center",
        bold: true,
        customColor: accent,
      }),
      text(w / 2, 80, title2, 23, {
        align: "center",
        bold: true,
        customColor: accent,
      })
    )

    // 5. Divider Line 0 (above first item)
    const listTopY = 100
    prims.push(
      line(pad, listTopY, w - pad, listTopY, {
        dashed: true,
        customStroke: "#52525B",
        strokeWidth: 1.2,
      })
    )

    // 6. Items List
    const listBottomY = h - 38
    const count = Math.max(1, items.length)
    const rowH = (listBottomY - listTopY) / count

    items.forEach((item, i) => {
      const rowY = listTopY + i * rowH
      const rowCenter = rowY + rowH / 2
      const iconX = pad + 8

      // Left Graphic
      if (item.icon === "matcha") {
        // Pink cup
        prims.push(
          poly(
            [
              [iconX + 2, rowCenter + 18],
              [iconX + 6, rowCenter - 14],
              [iconX + 22, rowCenter - 14],
              [iconX + 18, rowCenter + 18],
            ],
            true,
            { fill: "solid", customFill: "#F472B6", customStroke: "#DB2777" }
          ),
          rect(iconX + 6, rowCenter - 14, 16, 7, {
            fill: "solid",
            customFill: "#65A30D",
            customStroke: "#4D7C0F",
          })
        )
        // Green iced tea cup
        prims.push(
          poly(
            [
              [iconX + 24, rowCenter + 14],
              [iconX + 27, rowCenter - 18],
              [iconX + 41, rowCenter - 18],
              [iconX + 37, rowCenter + 14],
            ],
            true,
            { fill: "solid", customFill: "#84CC16", customStroke: "#4D7C0F" }
          ),
          ellipse(iconX + 24, rowCenter - 26, 17, 9, { customStroke: "#A1A1AA" }),
          line(iconX + 32, rowCenter - 30, iconX + 32, rowCenter - 18, {
            customStroke: "#10B981",
            strokeWidth: 2,
          })
        )
      } else if (item.icon === "girls") {
        // Two stylish friends with afro hair puffs
        prims.push(
          ellipse(iconX + 6, rowCenter - 16, 20, 20, {
            fill: "solid",
            customFill: "#18181B",
            customStroke: "#18181B",
          }),
          ellipse(iconX + 24, rowCenter - 12, 18, 18, {
            fill: "solid",
            customFill: "#18181B",
            customStroke: "#18181B",
          }),
          pill(iconX + 4, rowCenter + 4, 18, 14, {
            fill: "solid",
            customFill: "#3F3F46",
            customStroke: "#18181B",
          }),
          pill(iconX + 20, rowCenter + 6, 22, 14, {
            fill: "solid",
            customFill: "#F4F4F5",
            customStroke: "#71717A",
          }),
          rect(iconX + 16, rowCenter - 2, 8, 12, {
            r: 1,
            fill: "solid",
            customFill: "#38BDF8",
            customStroke: "#0284C7",
          })
        )
      } else if (item.icon === "shopping") {
        // Orange bag
        prims.push(
          rect(iconX + 2, rowCenter - 14, 22, 32, {
            r: 2,
            fill: "solid",
            customFill: "#FF6600",
            customStroke: "#EA580C",
          }),
          ellipse(iconX + 7, rowCenter - 20, 12, 11, {
            customStroke: "#EA580C",
            strokeWidth: 1.5,
          })
        )
        // Black bag
        prims.push(
          rect(iconX + 22, rowCenter - 6, 18, 24, {
            r: 2,
            fill: "solid",
            customFill: "#18181B",
            customStroke: "#09090B",
          }),
          ellipse(iconX + 25, rowCenter - 12, 12, 10, {
            customStroke: "#71717A",
            strokeWidth: 1.5,
          })
        )
      } else {
        // Generic coffee/lifestyle
        prims.push(
          ellipse(iconX + 8, rowCenter - 8, 26, 26, {
            fill: "solid",
            customFill: "#FED7AA",
            customStroke: "#F97316",
          }),
          poly(starPts(iconX + 21, rowCenter + 5, 8, 3.5), true, {
            fill: "solid",
            customFill: accent,
            customStroke: accent,
          })
        )
      }

      // Middle Text
      const textX = pad + 64
      prims.push(
        text(textX, rowCenter - 4, item.text, 13.5, {
          bold: true,
          customColor: item.done ? "#71717A" : "#18181B",
          underline: item.done,
        })
      )
      if (item.subtext) {
        prims.push(
          text(textX, rowCenter + 13, item.subtext, 11, {
            customColor: item.done ? "#A1A1AA" : "#3F3F46",
          })
        )
      }

      // Right Checkbox
      const boxSize = 25
      const boxX = w - pad - 32
      const boxY = rowCenter - boxSize / 2
      prims.push(
        rect(boxX, boxY, boxSize, boxSize, {
          r: 2,
          strokeWidth: 1.3,
          customStroke: "#52525B",
        })
      )

      if (item.done) {
        prims.push(
          poly(
            [
              [boxX + 5, boxY + 13],
              [boxX + 10, boxY + 19],
              [boxX + 21, boxY + 7],
            ],
            false,
            { strokeWidth: 2.6, customStroke: accent }
          )
        )
      }

      // Divider below item
      prims.push(
        line(pad, rowY + rowH, w - pad, rowY + rowH, {
          dashed: true,
          customStroke: "#52525B",
          strokeWidth: 1.2,
        })
      )
    })

    return prims
  },
}
