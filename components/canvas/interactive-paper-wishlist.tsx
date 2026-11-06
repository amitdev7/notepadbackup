"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Component — 1:1 Aesthetic Paper Wishlist
//
// 100% 1:1 stationery paper wishlist matching the reference design:
// - Physical ivory stationery sheet with photo-extracted torn deckle bottom edge
// - Metallic silver paperclip with drop shadow hanging over top-left margin
// - Tilted vibrant orange stars (#FC883F) flanking display typography
// - Bold, rounded lowercase title ("bank holiday wishlist")
// - 4 fine dashed divider lines across the sheet
// - Clean square checkboxes (34×34px) with fine pen outline & tactile check
// - Real photo sticker cutouts (Matcha, Girls Day Out, Shopping Bags, Coffee)
// - LIVE IMAGE COPY-PASTE (Ctrl+V / Cmd+V) directly onto any sticker slot
// - Async Clipboard API button + Drag-and-drop + Native file picker
// - Elevated floating popover rendered OUTSIDE clip-path (zero clipping)
// - Soft backdrop preventing dual-modal / click-through collisions
// - Smooth inline text editing in place (zero clunky floating popups)
// - Native canvas drag handles (data-node-drag-handle="true")
// - Immediate persistence to IndexedDB and real-time collaboration sync
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, memo } from "react"
import type { ComponentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { audioFx } from "@/lib/canvas/audio-fx"
import {
  DEFAULT_WISHLIST_ITEMS,
  ACCENT_COLORS,
  type WishlistItemDef,
} from "@/lib/library/defs-paper-wishlist"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash,
  Check,
  Clipboard,
  UploadSimple,
  ArrowCounterClockwise,
  X,
  Camera,
  Sparkle,
  Image as ImageIcon,
  Sun,
  Heart,
  AirplaneTilt,
  Books,
  Cake,
} from "@phosphor-icons/react"

interface InteractivePaperWishlistProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

// 1:1 CSS Polygon Clip-Path traced directly from the real paper in the photo
const TORN_BOTTOM_CLIP_PATH = `polygon(
  0% 0%, 100% 0%,
  100% calc(100% - 25.0px), 97.52% calc(100% - 27.0px), 95.36% calc(100% - 26.0px),
  93.19% calc(100% - 26.0px), 91.02% calc(100% - 30.0px), 88.85% calc(100% - 27.0px),
  86.69% calc(100% - 27.0px), 84.52% calc(100% - 25.0px), 82.35% calc(100% - 28.0px),
  80.19% calc(100% - 29.0px), 78.02% calc(100% - 26.0px), 75.85% calc(100% - 23.0px),
  73.68% calc(100% - 21.0px), 71.52% calc(100% - 17.0px), 69.35% calc(100% - 18.0px),
  67.18% calc(100% - 22.0px), 65.02% calc(100% - 23.0px), 62.85% calc(100% - 16.0px),
  60.68% calc(100% - 19.0px), 58.51% calc(100% - 14.0px), 56.35% calc(100% - 7.0px),
  54.18% calc(100% - 4.0px), 52.01% calc(100% - 0.0px), 49.85% calc(100% - 1.0px),
  47.68% calc(100% - 1.0px), 45.51% calc(100% - 9.0px), 43.34% calc(100% - 13.0px),
  41.18% calc(100% - 22.0px), 39.01% calc(100% - 25.0px), 36.84% calc(100% - 25.0px),
  34.67% calc(100% - 26.0px), 32.51% calc(100% - 28.0px), 30.34% calc(100% - 28.0px),
  28.17% calc(100% - 26.0px), 26.01% calc(100% - 34.0px), 23.84% calc(100% - 40.0px),
  21.67% calc(100% - 40.0px), 19.5% calc(100% - 40.0px), 17.34% calc(100% - 37.0px),
  15.17% calc(100% - 32.0px), 13.0% calc(100% - 30.0px), 10.84% calc(100% - 25.0px),
  8.67% calc(100% - 17.0px), 6.5% calc(100% - 11.0px), 4.33% calc(100% - 5.0px),
  2.17% calc(100% - 1.0px), 0.0% calc(100% - 4.0px)
)`

const ORIGINAL_PRESETS: { id: WishlistItemDef["icon"]; label: string; url?: string; emoji: string }[] = [
  { id: "matcha", label: "Matcha Drinks", url: "/wishlist-stickers/matcha_transparent.png", emoji: "🍵" },
  { id: "girls", label: "Girls Day Out", url: "/wishlist-stickers/girls_transparent.png", emoji: "👯" },
  { id: "shopping", label: "Shopping Bags", url: "/wishlist-stickers/shopping_transparent.png", emoji: "🛍️" },
  { id: "coffee", label: "Iced Latte", url: "/wishlist-stickers/coffee_transparent.png", emoji: "☕" },
]

const CUTE_STICKERS: { id: WishlistItemDef["icon"]; label: string; emoji: string }[] = [
  { id: "sun", label: "Sunny Day", emoji: "☀️" },
  { id: "heart", label: "Favorites", emoji: "💖" },
  { id: "travel", label: "Getaway", emoji: "✈️" },
  { id: "books", label: "Reading", emoji: "📚" },
  { id: "cake", label: "Celebration", emoji: "🎂" },
]

export const InteractivePaperWishlist = memo(function InteractivePaperWishlist({
  node,
  selected,
  zoom,
}: InteractivePaperWishlistProps) {
  const props = node.props || {}
  const accentKey = String(props.accentColor || "orange")
  const accentHex = ACCENT_COLORS[accentKey] || "#FC883F"

  const titleLine1 = String(props.titleLine1 ?? "bank holiday")
  const titleLine2 = String(props.titleLine2 ?? "wishlist")
  const showPaperclip = props.showPaperclip !== false
  const showStars = props.showStars !== false

  const items: WishlistItemDef[] = Array.isArray(props.items) && props.items.length > 0
    ? (props.items as WishlistItemDef[])
    : DEFAULT_WISHLIST_ITEMS

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [t1, setT1] = useState(titleLine1)
  const [t2, setT2] = useState(titleLine2)

  // Inline item text editing (mutually exclusive with sticker popup)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Sticker popover menu state
  const [activeStickerRow, setActiveStickerRow] = useState<string | null>(null)
  const [pasteNotice, setPasteNotice] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const targetStickerItemRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setT1(titleLine1)
    setT2(titleLine2)
  }, [titleLine1, titleLine2])

  const commitProps = useCallback(
    (newProps: Partial<Record<string, unknown>>) => {
      useSquig.getState().updateNodes({
        [node.id]: {
          props: {
            ...node.props,
            ...newProps,
          },
        },
      })
    },
    [node.id, node.props]
  )

  // ── Image Application ─────────────────────────────────────────────────────
  const applyImageToItem = useCallback(
    (itemId: string, dataUrl: string) => {
      audioFx.playReactionPop()
      const updated = items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              customIconUrl: dataUrl,
              icon: "custom" as const,
            }
          : it
      )
      commitProps({ items: updated })
      setPasteNotice("Image applied! ✨")
      setTimeout(() => {
        setPasteNotice(null)
        setActiveStickerRow(null)
      }, 600)
    },
    [items, commitProps]
  )

  // ── Bulletproof Global Keyboard Paste Listener (Ctrl+V / Cmd+V) ──────────
  useEffect(() => {
    if (!activeStickerRow) return

    const handleGlobalPaste = (e: ClipboardEvent) => {
      // 1. Process clipboard items
      const clipItems = e.clipboardData?.items
      if (clipItems && clipItems.length > 0) {
        for (let i = 0; i < clipItems.length; i++) {
          const item = clipItems[i]
          if (item.type.startsWith("image/")) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            const file = item.getAsFile()
            if (!file) continue
            const reader = new FileReader()
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string
              if (dataUrl) applyImageToItem(activeStickerRow, dataUrl)
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }

      // 2. Process clipboard files
      const files = e.clipboardData?.files
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (file.type.startsWith("image/")) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            const reader = new FileReader()
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string
              if (dataUrl) applyImageToItem(activeStickerRow, dataUrl)
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }

      // 3. Process clipboard text (image URL or data URL)
      const text = e.clipboardData?.getData("text")?.trim()
      if (text) {
        if (
          text.startsWith("data:image/") ||
          /^https?:\/\/.*\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(text)
        ) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          applyImageToItem(activeStickerRow, text)
          return
        }
      }
    }

    // Capture phase intercepts before canvas listener
    window.addEventListener("paste", handleGlobalPaste, true)
    return () => window.removeEventListener("paste", handleGlobalPaste, true)
  }, [activeStickerRow, applyImageToItem])

  // ── Keyboard Escape Closes Modals ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveStickerRow(null)
        setEditingItemId(null)
        setEditingTitle(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // ── Clipboard API Button Handler ──────────────────────────────────────────
  const handlePasteFromClipboardBtn = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
        const clipItems = await navigator.clipboard.read()
        for (const clipItem of clipItems) {
          const imageType = clipItem.types.find((t) => t.startsWith("image/"))
          if (imageType) {
            const blob = await clipItem.getType(imageType)
            const reader = new FileReader()
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string
              if (dataUrl) applyImageToItem(itemId, dataUrl)
            }
            reader.readAsDataURL(blob)
            return
          }
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = (await navigator.clipboard.readText()).trim()
        if (
          text.startsWith("data:image/") ||
          /^https?:\/\/.*\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(text)
        ) {
          applyImageToItem(itemId, text)
          return
        }
      }
    } catch {
      // Permission denied or prompt: fallback cleanly to native file picker
    }

    targetStickerItemRef.current = itemId
    fileInputRef.current?.click()
  }

  // ── Drag & Drop Image Handler ─────────────────────────────────────────────
  const handleDropImage = useCallback(
    (e: React.DragEvent, itemId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          if (dataUrl) applyImageToItem(itemId, dataUrl)
        }
        reader.readAsDataURL(file)
      }
    },
    [applyImageToItem]
  )

  // ── Native File Input Upload ──────────────────────────────────────────────
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetId = targetStickerItemRef.current
    if (file && targetId && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        if (dataUrl) applyImageToItem(targetId, dataUrl)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  // ── Item Interactions ─────────────────────────────────────────────────────
  const toggleItemDone = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playShapeSnap()
    const updated = items.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    )
    commitProps({ items: updated })
  }

  const handleUpdateItemField = (itemId: string, field: "text" | "subtext", val: string) => {
    const updated = items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            [field]: val,
          }
        : it
    )
    commitProps({ items: updated })
  }

  const handleAddItem = (e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playReactionPop()
    const newItem: WishlistItemDef = {
      id: `item-${Date.now()}`,
      text: "Iced latte & bakery",
      subtext: "morning coffee run",
      done: false,
      icon: "coffee",
      customIconUrl: "/wishlist-stickers/coffee_transparent.png",
    }
    commitProps({ items: [...items, newItem] })
  }

  const handleDeleteItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playToolSwitch()
    const updated = items.filter((it) => it.id !== itemId)
    commitProps({ items: updated.length ? updated : DEFAULT_WISHLIST_ITEMS })
  }

  const handleSelectPreset = (itemId: string, preset: WishlistItemDef["icon"]) => {
    audioFx.playReactionPop()
    const p = ORIGINAL_PRESETS.find((x) => x.id === preset)
    const updated = items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            icon: preset,
            customIconUrl: p?.url,
          }
        : it
    )
    setActiveStickerRow(null)
    commitProps({ items: updated })
  }

  // Active item reference for sticker customization
  const activeItem = items.find((it) => it.id === activeStickerRow)
  const activeItemIndex = items.findIndex((it) => it.id === activeStickerRow)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full select-none font-sans",
        "transition-shadow duration-200"
      )}
      style={{
        filter: "drop-shadow(0 16px 36px rgba(70, 45, 20, 0.14)) drop-shadow(0 4px 12px rgba(70, 45, 20, 0.07))",
      }}
      onClick={() => {
        // Clicking canvas sheet closes sticker menu and active editors
        setActiveStickerRow(null)
        setEditingItemId(null)
      }}
    >
      {/* Hidden Native File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── 1:1 Silver Metal Paperclip (Canvas Drag Handle) ── */}
      {showPaperclip && (
        <div
          data-node-drag-handle="true"
          className="absolute -top-4 left-[11%] z-30 cursor-grab active:cursor-grabbing"
          style={{ width: "38px", height: "92px" }}
          title="Drag paper wishlist"
        >
          <img
            src="/wishlist-stickers/paperclip_transparent.png"
            alt="Paperclip"
            className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)] pointer-events-none"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      )}

      {/* ── 1:1 Main Stationery Paper Sheet ── */}
      <div
        className="relative w-full h-full flex flex-col pt-7 pb-10 px-6 sm:px-7 bg-[#FAF7F2] text-stone-900"
        style={{
          borderTopLeftRadius: "3px",
          borderTopRightRadius: "3px",
          clipPath: TORN_BOTTOM_CLIP_PATH,
          fontFamily: "'Poppins', 'Century Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Subtle Paper Fiber Texture */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(circle, #292524 1px, transparent 1px)",
            backgroundSize: "7px 7px",
          }}
        />

        {/* ── Header: Stars & 1:1 Title (Canvas Drag Area) ── */}
        <div
          data-node-drag-handle="true"
          className="relative flex items-center justify-center mt-1 mb-4 cursor-grab active:cursor-grabbing"
        >
          {/* Left Star (tilted -14deg, #FC883F) */}
          {showStars && (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className="absolute left-6 top-1 -rotate-[14deg] transition-transform duration-200 hover:scale-125 cursor-pointer drop-shadow-xs"
              style={{ fill: accentHex, color: accentHex }}
              onClick={(e) => {
                e.stopPropagation()
                audioFx.playReactionPop()
              }}
            >
              <polygon points="12,2.2 15.2,8.8 22.5,9.4 17,14.2 18.7,21.4 12,17.6 5.3,21.4 7,14.2 1.5,9.4 8.8,8.8" />
            </svg>
          )}

          {/* Title: 1:1 "bank holiday wishlist" in bold geometric rounded sans */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setActiveStickerRow(null)
              setEditingItemId(null)
              setEditingTitle(true)
            }}
            className="flex flex-col items-center justify-center text-center cursor-pointer group px-4 py-0.5 rounded-lg hover:bg-stone-200/40 transition-colors"
            title="Click to edit title"
          >
            {editingTitle ? (
              <div
                className="flex flex-col items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={t1}
                  onChange={(e) => setT1(e.target.value)}
                  onBlur={() => {
                    setEditingTitle(false)
                    commitProps({ titleLine1: t1.trim() || "bank holiday" })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingTitle(false)
                      commitProps({ titleLine1: t1.trim() || "bank holiday", titleLine2: t2.trim() || "wishlist" })
                    } else if (e.key === "Escape") {
                      setEditingTitle(false)
                    }
                  }}
                  className="text-[28px] sm:text-[32px] font-[800] leading-[1.05] tracking-[-0.025em] lowercase text-center bg-transparent border-b border-dashed border-orange-400 focus:outline-none w-56"
                  style={{ color: accentHex }}
                  autoFocus
                />
                <input
                  type="text"
                  value={t2}
                  onChange={(e) => setT2(e.target.value)}
                  onBlur={() => {
                    setEditingTitle(false)
                    commitProps({ titleLine2: t2.trim() || "wishlist" })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingTitle(false)
                      commitProps({ titleLine1: t1.trim() || "bank holiday", titleLine2: t2.trim() || "wishlist" })
                    } else if (e.key === "Escape") {
                      setEditingTitle(false)
                    }
                  }}
                  className="text-[28px] sm:text-[32px] font-[800] leading-[1.05] tracking-[-0.025em] lowercase text-center bg-transparent border-b border-dashed border-orange-400 focus:outline-none w-56 mt-0.5"
                  style={{ color: accentHex }}
                />
              </div>
            ) : (
              <>
                <h1
                  className="text-[28px] sm:text-[32px] font-[800] leading-[1.05] tracking-[-0.025em] lowercase transition-transform duration-150 group-hover:scale-[1.02]"
                  style={{ color: accentHex }}
                >
                  {titleLine1}
                </h1>
                <h2
                  className="text-[28px] sm:text-[32px] font-[800] leading-[1.05] tracking-[-0.025em] lowercase mt-0.5 transition-transform duration-150 group-hover:scale-[1.02]"
                  style={{ color: accentHex }}
                >
                  {titleLine2}
                </h2>
              </>
            )}
          </div>

          {/* Right Star (tilted +14deg, #FC883F) */}
          {showStars && (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className="absolute right-6 top-1 rotate-[14deg] transition-transform duration-200 hover:scale-125 cursor-pointer drop-shadow-xs"
              style={{ fill: accentHex, color: accentHex }}
              onClick={(e) => {
                e.stopPropagation()
                audioFx.playReactionPop()
              }}
            >
              <polygon points="12,2.2 15.2,8.8 22.5,9.4 17,14.2 18.7,21.4 12,17.6 5.3,21.4 7,14.2 1.5,9.4 8.8,8.8" />
            </svg>
          )}
        </div>

        {/* ── Top Dashed Divider (Line 1) ── */}
        <div className="w-full border-b border-dashed border-[#292524]/60 my-1" />

        {/* ── Wishlist Rows ── */}
        <div className="flex-1 flex flex-col justify-around py-1">
          {items.map((item, idx) => {
            const isEditingThisItem = editingItemId === item.id
            const isActiveSticker = activeStickerRow === item.id

            return (
              <div key={item.id} className="relative group/row flex flex-col">
                <div className="flex items-center justify-between gap-3.5 py-2 px-1 rounded-xl transition-colors hover:bg-stone-200/30">
                  {/* 1. Left Graphic / Sticker Slot */}
                  <div className="relative shrink-0">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "copy"
                      }}
                      onDrop={(e) => handleDropImage(e, item.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingItemId(null)
                        setEditingTitle(false)
                        setActiveStickerRow(isActiveSticker ? null : item.id)
                      }}
                      className={cn(
                        "relative w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center rounded-xl",
                        "cursor-pointer outline-none transition-all duration-150",
                        "hover:ring-2 hover:ring-orange-400/50 hover:scale-[1.03] active:scale-95",
                        isActiveSticker
                          ? "ring-2 ring-orange-500 shadow-md bg-white/80"
                          : "hover:bg-white/40"
                      )}
                      title="Click to paste (Ctrl+V) or customize sticker"
                    >
                      {/* Sticker Graphic */}
                      {renderStickerImage(item, idx)}

                      {/* Hover Overlay Badge */}
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover/row:opacity-100 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-opacity text-white text-[10px] font-semibold">
                        <Camera size={14} weight="bold" />
                        <span>Change</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Middle Text (Direct In-Place Editing Without Overlays) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveStickerRow(null)
                      setEditingItemId(item.id)
                    }}
                    className="flex-1 flex flex-col justify-center cursor-text min-w-0 pr-1"
                    title="Click to edit details"
                  >
                    {isEditingThisItem ? (
                      <div
                        className="flex flex-col gap-1 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Title input */}
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleUpdateItemField(item.id, "text", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setEditingItemId(null)
                            }
                          }}
                          placeholder="Item title…"
                          autoFocus
                          className="w-full bg-white/90 ring-1 ring-orange-400 rounded px-1.5 py-0.5 text-[14px] sm:text-[15px] font-[500] text-[#1C1917] leading-[1.25] focus:outline-none shadow-2xs"
                        />
                        {/* Subtext input */}
                        <input
                          type="text"
                          value={item.subtext || ""}
                          placeholder="Details / notes (optional)…"
                          onChange={(e) => handleUpdateItemField(item.id, "subtext", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setEditingItemId(null)
                            }
                          }}
                          className="w-full bg-white/90 ring-1 ring-orange-400 rounded px-1.5 py-0.5 text-[13px] sm:text-[14px] font-[400] text-[#1C1917] leading-[1.25] focus:outline-none shadow-2xs"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col py-0.5 px-1 rounded hover:bg-stone-200/40 transition-colors">
                        <span
                          className={cn(
                            "text-[14.5px] sm:text-[15.5px] font-[400] text-[#1C1917] leading-[1.25] tracking-normal",
                            item.done && "line-through text-stone-400 opacity-60"
                          )}
                        >
                          {item.text}
                        </span>
                        {item.subtext && (
                          <span
                            className={cn(
                              "text-[13.5px] sm:text-[14.5px] font-[400] text-[#1C1917] leading-[1.25] tracking-normal mt-0.5",
                              item.done && "line-through text-stone-400 opacity-50"
                            )}
                          >
                            {item.subtext}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. 1:1 Large Square Checkbox */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      title="Delete item"
                    >
                      <Trash size={14} />
                    </button>

                    {/* 1:1 Square Checkbox (34×34px with fine pen stroke) */}
                    <button
                      type="button"
                      onClick={(e) => toggleItemDone(item.id, e)}
                      aria-label={`Check ${item.text}`}
                      className={cn(
                        "size-[34px] sm:size-[36px] rounded-[2px] border-[1.4px] border-[#292524]/80 bg-white/40 hover:bg-white flex items-center justify-center cursor-pointer",
                        "transition-all duration-150 active:scale-90 shadow-2xs",
                        item.done && "border-orange-500 bg-orange-50/40"
                      )}
                      style={item.done ? { borderColor: accentHex } : undefined}
                    >
                      {item.done && (
                        <Check
                          size={22}
                          weight="bold"
                          className="animate-in zoom-in-50 duration-150"
                          style={{ color: accentHex }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dashed divider between rows */}
                <div className="w-full border-b border-dashed border-[#292524]/60 my-0.5" />
              </div>
            )
          })}
        </div>

        {/* ── Bottom Action: + Add Item Button ── */}
        {items.length < 6 && (
          <div className="mt-1 flex justify-center">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-200/50 hover:bg-stone-200/90 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Plus size={13} weight="bold" />
              <span>Add wishlist item</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Elevated Sticker Customization Modal (Rendered OUTSIDE clipPath to PREVENT clipping) ── */}
      {activeStickerRow && activeItem && (
        <>
          {/* Backdrop overlay to prevent click-through and dismiss cleanly */}
          <div
            className="absolute inset-0 z-40 bg-black/15 backdrop-blur-[1px] rounded-xl transition-opacity animate-in fade-in duration-100"
            onClick={(e) => {
              e.stopPropagation()
              setActiveStickerRow(null)
            }}
          />

          {/* Elevated Floating Popover Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 left-3 sm:left-4 right-3 sm:right-4 top-1/2 -translate-y-1/2 max-h-[92%] overflow-y-auto p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 8px 24px rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-orange-100 text-orange-600">
                  <Sparkle size={14} weight="fill" />
                </span>
                <span className="text-[12px] font-extrabold text-stone-700 uppercase tracking-wider">
                  Customize Sticker
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveStickerRow(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                title="Close"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Notification Toast */}
            {pasteNotice && (
              <div className="mb-2 py-1.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg text-center animate-in fade-in duration-150">
                {pasteNotice}
              </div>
            )}

            {/* Sticker Preview & Current Slot Info */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-stone-50 border border-stone-100 mb-3">
              <div className="w-12 h-12 rounded-lg bg-white shadow-2xs border border-stone-200 flex items-center justify-center p-1 shrink-0">
                {renderStickerImage(activeItem, activeItemIndex)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-stone-800 truncate">
                  {activeItem.text}
                </span>
                <span className="text-[11px] text-stone-400">
                  {activeItem.customIconUrl ? "Custom pasted image" : "Stationery sticker"}
                </span>
              </div>
            </div>

            {/* Primary Action 1: Paste Copied Image (Ctrl+V) */}
            <button
              type="button"
              onClick={(e) => handlePasteFromClipboardBtn(activeItem.id, e)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FC883F] hover:bg-[#F37525] active:bg-[#D96014] text-white text-xs font-bold transition-all shadow-xs cursor-pointer mb-2 active:scale-98"
            >
              <Clipboard size={16} weight="bold" />
              <span>Paste copied image (Ctrl+V)</span>
            </button>

            {/* Primary Action 2: Upload File */}
            <button
              type="button"
              onClick={() => {
                targetStickerItemRef.current = activeItem.id
                fileInputRef.current?.click()
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 text-xs font-semibold transition-all cursor-pointer mb-2.5 active:scale-98"
            >
              <UploadSimple size={15} weight="bold" />
              <span>Upload image from device…</span>
            </button>

            {/* Drag & Drop Hint */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "copy"
              }}
              onDrop={(e) => handleDropImage(e, activeItem.id)}
              className="border border-dashed border-stone-300 rounded-xl py-2 px-2 text-center text-[10px] text-stone-500 mb-3 bg-stone-50/60"
            >
              Or copy any image and press <kbd className="font-mono font-bold text-stone-800 bg-white px-1.5 py-0.5 rounded border border-stone-200 shadow-2xs">Ctrl+V</kbd>
            </div>

            {/* Original Photo Presets */}
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
              Original Photo Cutouts
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {ORIGINAL_PRESETS.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handleSelectPreset(activeItem.id, stk.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer border",
                    activeItem.icon === stk.id
                      ? "bg-orange-50 border-orange-300 text-orange-700 shadow-xs"
                      : "border-stone-100 hover:bg-stone-100 text-stone-700"
                  )}
                  title={stk.label}
                >
                  <span className="text-xl">{stk.emoji}</span>
                  <span className="text-[8px] font-bold truncate max-w-full mt-0.5">
                    {stk.id}
                  </span>
                </button>
              ))}
            </div>

            {/* Cute Vinyl Stickers */}
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
              Cute Vinyl Stickers
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-2.5">
              {CUTE_STICKERS.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handleSelectPreset(activeItem.id, stk.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer border",
                    activeItem.icon === stk.id
                      ? "bg-orange-50 border-orange-300 text-orange-700 shadow-xs"
                      : "border-stone-100 hover:bg-stone-100 text-stone-700"
                  )}
                  title={stk.label}
                >
                  <span className="text-lg">{stk.emoji}</span>
                  <span className="text-[8px] font-bold truncate max-w-full mt-0.5">
                    {stk.id}
                  </span>
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                const defPreset = DEFAULT_WISHLIST_ITEMS[activeItemIndex]?.icon || "matcha"
                handleSelectPreset(activeItem.id, defPreset)
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-stone-500 hover:text-stone-800 border-t border-stone-100 cursor-pointer transition-colors"
            >
              <ArrowCounterClockwise size={13} />
              <span>Reset to default photo sticker</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
})

// ── Sticker Graphic Renderer ──────────────────────────────────────────────────
function renderStickerImage(item: WishlistItemDef, idx: number) {
  // 1. Custom Pasted or Uploaded Image
  if (item.customIconUrl) {
    return (
      <img
        src={item.customIconUrl}
        alt={item.text}
        className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.18)] rounded-md"
      />
    )
  }

  // 2. Default Cutouts matching photo 1:1
  if (item.icon === "matcha" || idx === 0) {
    return (
      <img
        src="/wishlist-stickers/matcha_transparent.png"
        alt="Matcha drinks"
        className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.16)]"
      />
    )
  }

  if (item.icon === "girls" || idx === 1) {
    return (
      <img
        src="/wishlist-stickers/girls_transparent.png"
        alt="Day out with the girls"
        className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.16)]"
      />
    )
  }

  if (item.icon === "shopping" || idx === 2) {
    return (
      <img
        src="/wishlist-stickers/shopping_transparent.png"
        alt="Shopping bags"
        className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.16)]"
      />
    )
  }

  if (item.icon === "coffee" || idx === 3) {
    return (
      <img
        src="/wishlist-stickers/coffee_transparent.png"
        alt="Iced coffee"
        className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.16)]"
      />
    )
  }

  // 3. Cute Physical Die-Cut Stationery Vinyl Stickers
  if (item.icon === "sun") {
    return (
      <div className="size-11 sm:size-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 p-2 flex items-center justify-center text-white shadow-[0_3px_8px_rgba(251,146,60,0.45)] border-2 border-white ring-1 ring-orange-200">
        <Sun size={24} weight="fill" className="text-white drop-shadow-xs" />
      </div>
    )
  }

  if (item.icon === "heart") {
    return (
      <div className="size-11 sm:size-12 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 p-2 flex items-center justify-center text-white shadow-[0_3px_8px_rgba(244,63,94,0.45)] border-2 border-white ring-1 ring-pink-200">
        <Heart size={24} weight="fill" className="text-white drop-shadow-xs" />
      </div>
    )
  }

  if (item.icon === "travel") {
    return (
      <div className="size-11 sm:size-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 p-2 flex items-center justify-center text-white shadow-[0_3px_8px_rgba(14,165,233,0.45)] border-2 border-white ring-1 ring-sky-200">
        <AirplaneTilt size={24} weight="fill" className="text-white drop-shadow-xs" />
      </div>
    )
  }

  if (item.icon === "books") {
    return (
      <div className="size-11 sm:size-12 rounded-full bg-gradient-to-tr from-indigo-400 to-violet-500 p-2 flex items-center justify-center text-white shadow-[0_3px_8px_rgba(99,102,241,0.45)] border-2 border-white ring-1 ring-indigo-200">
        <Books size={24} weight="fill" className="text-white drop-shadow-xs" />
      </div>
    )
  }

  if (item.icon === "cake") {
    return (
      <div className="size-11 sm:size-12 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 p-2 flex items-center justify-center text-white shadow-[0_3px_8px_rgba(244,63,94,0.45)] border-2 border-white ring-1 ring-pink-200">
        <Cake size={24} weight="fill" className="text-white drop-shadow-xs" />
      </div>
    )
  }

  return (
    <img
      src="/wishlist-stickers/matcha_transparent.png"
      alt="Wishlist item"
      className="w-full h-full object-contain filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.16)]"
    />
  )
}
