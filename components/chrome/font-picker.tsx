"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Font Picker & Typography Manager
//
// Features:
// - 50+ Curated fonts for wireframing, sketching, UI, serif, and code
// - Instant live previews of each font rendered directly in its typeface
// - "Add Any Font" custom loader with Google Fonts integration
// - Real-time search filter and category pills
// - Supports both whole-page default font and selection-specific text fonts
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from "react"
import { Popover } from "@base-ui/react/popover"
import {
  TextT as TextIcon,
  MagnifyingGlass as SearchIcon,
  Plus as PlusIcon,
  Check as CheckIcon,
  CaretDown as CaretDownIcon,
  ArrowsClockwise as ResetIcon,
  Sparkle as SparkleIcon,
} from "@phosphor-icons/react"
import {
  CURATED_FONTS,
  FONT_CATEGORIES,
  loadGoogleFont,
  getStoredCustomFonts,
  saveCustomFont,
  resolveFontFamily,
  type FontDefinition,
} from "@/lib/fonts"
import { cn } from "@/lib/utils"

interface FontPickerProps {
  value: string
  onChange: (font: string) => void
  label?: string
  className?: string
  compact?: boolean
}

export function FontPicker({
  value,
  onChange,
  label = "Font",
  className,
  compact = false,
}: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [customFontInput, setCustomFontInput] = useState("")
  const [customFonts, setCustomFonts] = useState<string[]>([])

  useEffect(() => {
    setCustomFonts(getStoredCustomFonts())
  }, [open])

  // Ensure active font is loaded
  useEffect(() => {
    if (value) {
      loadGoogleFont(value)
    }
  }, [value])

  // Combine curated fonts with custom user fonts
  const allFonts = useMemo<FontDefinition[]>(() => {
    const list = [...CURATED_FONTS]
    for (const cf of customFonts) {
      if (!list.some((f) => f.name.toLowerCase() === cf.toLowerCase())) {
        list.unshift({
          name: cf,
          category: "custom",
          label: cf,
          googleFont: true,
        })
      }
    }
    return list
  }, [customFonts])

  // Filter fonts
  const filteredFonts = useMemo(() => {
    return allFonts.filter((f) => {
      const matchesCat =
        activeCategory === "all" ||
        (activeCategory === "custom" && f.category === "custom") ||
        f.category === activeCategory
      const matchesSearch =
        !search.trim() ||
        f.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        f.category.toLowerCase().includes(search.toLowerCase().trim())
      return matchesCat && matchesSearch
    })
  }, [allFonts, activeCategory, search])

  const handleSelectFont = (fontName: string) => {
    loadGoogleFont(fontName)
    onChange(fontName)
    setOpen(false)
  }

  const handleAddCustomFont = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = customFontInput.trim()
    if (!trimmed) return
    const updated = saveCustomFont(trimmed)
    setCustomFonts(updated)
    setCustomFontInput("")
    handleSelectFont(trimmed)
  }

  // Display name for trigger
  const displayLabel = useMemo(() => {
    if (!value || value === "hand") return "Patrick Hand"
    if (value === "sans") return "Geist Sans"
    if (value === "serif") return "Source Serif"
    return value
  }, [value])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        title={`Choose font (${displayLabel})`}
        aria-label={label}
        className={cn(
          "flex h-7 w-full items-center justify-between gap-1.5 rounded-chrome-sm border border-input bg-background/80 px-2 text-xs font-normal text-foreground transition-colors hover:bg-muted/80 focus-visible:border-[var(--sq-ink)] focus-visible:ring-1 focus-visible:ring-[var(--sq-ink)]",
          open && "border-[var(--sq-ink)] ring-1 ring-[var(--sq-ink)]",
          className
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <TextIcon size={14} className="shrink-0 text-muted-foreground" />
          <span
            className="truncate font-medium text-foreground text-[12px]"
            style={{ fontFamily: resolveFontFamily(value) }}
          >
            {displayLabel}
          </span>
        </div>
        <CaretDownIcon size={12} className="shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50 outline-none">
          <Popover.Popup
            data-zenithsui-chrome
            className="flex w-[310px] flex-col rounded-chrome-md border border-border bg-popover p-2 shadow-popup ring-1 ring-foreground/10 outline-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-1.5 px-0.5">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Fonts ({allFonts.length}+ Available)
              </span>
              <button
                type="button"
                onClick={() => handleSelectFont("Patrick Hand")}
                className="flex items-center gap-1 rounded-chrome-xs text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Reset to default sketch font"
              >
                <ResetIcon size={11} />
                <span>Default</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-1.5">
              <SearchIcon size={13} className="absolute left-2 top-2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search font by name..."
                className="h-7 w-full rounded-chrome-xs border border-input bg-background/60 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="mb-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {FONT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "shrink-0 rounded-chrome-xs px-2 py-0.5 text-[10px] font-medium transition-colors",
                    activeCategory === cat.id
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] font-semibold shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* "Add Any Font" Quick Input */}
            <form onSubmit={handleAddCustomFont} className="mb-2 flex items-center gap-1 border-b border-border/50 pb-2">
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => setCustomFontInput(e.target.value)}
                placeholder="Add any Google/System font..."
                className="h-6 flex-1 rounded-chrome-xs border border-input bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!customFontInput.trim()}
                className="flex h-6 items-center gap-1 rounded-chrome-xs bg-[var(--sq-ink)] px-2 text-[10px] font-medium text-[var(--sq-paper)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                title="Add any font from Google Fonts or system"
              >
                <PlusIcon size={11} weight="bold" />
                <span>Add</span>
              </button>
            </form>

            {/* Font Scroll Area */}
            <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto pr-1">
              {filteredFonts.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No font matched "{search}".
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => handleAddCustomFont()}
                      className="text-[var(--sq-ink)] underline hover:opacity-80"
                    >
                      Add "{search}" as custom font
                    </button>
                  </div>
                </div>
              ) : (
                filteredFonts.map((f) => {
                  const isSelected =
                    value.toLowerCase() === f.name.toLowerCase() ||
                    (f.name === "Patrick Hand" && value === "hand")
                  const fontFam = resolveFontFamily(f.name)

                  return (
                    <button
                      key={f.name}
                      type="button"
                      onMouseEnter={() => {
                        if (f.googleFont) loadGoogleFont(f.name)
                      }}
                      onClick={() => handleSelectFont(f.name)}
                      className={cn(
                        "group flex items-center justify-between rounded-chrome-xs px-2 py-1.5 text-left transition-colors hover:bg-muted/70",
                        isSelected && "bg-muted font-semibold text-foreground ring-1 ring-border/80"
                      )}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium">{f.name}</span>
                          <span className="rounded-[3px] bg-muted-foreground/15 px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                            {f.category}
                          </span>
                        </div>
                        <span
                          className="truncate text-[13px] text-muted-foreground group-hover:text-foreground mt-0.5"
                          style={{ fontFamily: fontFam }}
                        >
                          The quick brown fox jumps 123
                        </span>
                      </div>
                      {isSelected && <CheckIcon size={14} weight="bold" className="shrink-0 text-[var(--sq-ink)]" />}
                    </button>
                  )
                })
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
