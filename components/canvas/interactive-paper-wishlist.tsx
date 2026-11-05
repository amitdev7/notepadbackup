"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Component — 1:1 Aesthetic Paper Wishlist
//
// Exact 1:1 replica of the stationery paper wishlist design:
// - Authentic ivory stationery paper sheet with photo-extracted torn deckle bottom edge
// - Metallic silver paperclip hanging over top-left margin
// - Flanked by chubby vibrant orange stars (#FC883F)
// - Bold, rounded lowercase display typography ("bank holiday wishlist")
// - 4 fine dashed divider lines across the paper sheet
// - Clean square checkboxes (34×34px) with fine pen outline
// - Live image pasting (Ctrl+V / Cmd+V) directly onto any sticker slot
// - Drag-and-drop & native file upload for custom stickers
// - Inline editable title & item notes with real-time canvas persistence
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
  Image as ImageIcon,
  Coffee,
  Heart,
  AirplaneTilt,
  Sun,
  Books,
  Cake,
} from "@phosphor-icons/react"

interface InteractivePaperWishlistProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

// 1:1 CSS Polygon Clip-Path traced directly from the photo's torn deckle paper bottom edge
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

const STICKER_PRESETS: { id: WishlistItemDef["icon"]; label: string; url: string; emoji: string }[] = [
  { id: "matcha", label: "Matcha Drinks", url: "/wishlist-stickers/matcha_transparent.png", emoji: "🍵" },
  { id: "girls", label: "Girls Day Out", url: "/wishlist-stickers/girls_transparent.png", emoji: "👯" },
  { id: "shopping", label: "Shopping Bags", url: "/wishlist-stickers/shopping_transparent.png", emoji: "🛍️" },
  { id: "coffee", label: "Iced Coffee", url: "", emoji: "☕" },
  { id: "sun", label: "Sunny Weather", url: "", emoji: "☀️" },
  { id: "travel", label: "Holiday Travel", url: "", emoji: "✈️" },
  { id: "books", label: "Books & Study", url: "", emoji: "📚" },
  { id: "cake", label: "Celebration", url: "", emoji: "🎂" },
  { id: "heart", label: "Favorites", url: "", emoji: "💖" },
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

  // Inline editing states
  const [editingTitle, setEditingTitle] = useState(false)
  const [t1, setT1] = useState(titleLine1)
  const [t2, setT2] = useState(titleLine2)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemText, setEditItemText] = useState("")
  const [editItemSubtext, setEditItemSubtext] = useState("")

  // Active sticker popover menu
  const [activeStickerRow, setActiveStickerRow] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const targetStickerItemRef = useRef<string | null>(null)

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

  // ── Image Pasting & Upload Handlers ───────────────────────────────────────
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
      setActiveStickerRow(null)
    },
    [items, commitProps]
  )

  // 1. Direct paste handler (Ctrl+V / Cmd+V)
  const handleSlotPaste = useCallback(
    (e: React.ClipboardEvent, itemId: string) => {
      const itemsList = e.clipboardData?.items
      if (!itemsList) return

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i]
        if (item.type.startsWith("image/")) {
          e.preventDefault()
          e.stopPropagation()
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            if (dataUrl) applyImageToItem(itemId, dataUrl)
          }
          reader.readAsDataURL(file)
          return
        }
      }
    },
    [applyImageToItem]
  )

  // 2. Clipboard API button paste
  const handlePasteFromClipboardBtn = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.read) {
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
    } catch {
      // Browser permission prompt or fallback: trigger file input
    }
    // Fallback: open native file picker
    targetStickerItemRef.current = itemId
    fileInputRef.current?.click()
  }

  // 3. Drag-and-drop handler
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

  // 4. File input change
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

  // ── Item Checkbox & Text Handlers ─────────────────────────────────────────
  const toggleItemDone = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playShapeSnap()
    const updated = items.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    )
    commitProps({ items: updated })
  }

  const handleSaveTitle = () => {
    setEditingTitle(false)
    commitProps({ titleLine1: t1.trim() || "bank holiday", titleLine2: t2.trim() || "wishlist" })
  }

  const handleStartEditItem = (item: WishlistItemDef, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingItemId(item.id)
    setEditItemText(item.text)
    setEditItemSubtext(item.subtext || "")
  }

  const handleSaveItemText = (itemId: string) => {
    const updated = items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            text: editItemText.trim() || "Wishlist item",
            subtext: editItemSubtext.trim() || undefined,
          }
        : it
    )
    setEditingItemId(null)
    commitProps({ items: updated })
  }

  const handleAddItem = (e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playReactionPop()
    const newItem: WishlistItemDef = {
      id: `item-${Date.now()}`,
      text: "New wishlist item",
      subtext: "Tap to edit notes",
      done: false,
      icon: "coffee",
    }
    commitProps({ items: [...items, newItem] })
  }

  const handleDeleteItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playToolSwitch()
    const updated = items.filter((it) => it.id !== itemId)
    commitProps({ items: updated.length ? updated : DEFAULT_WISHLIST_ITEMS })
  }

  const handleResetToDefaultSticker = (itemId: string, defaultPreset: WishlistItemDef["icon"]) => {
    const presetObj = STICKER_PRESETS.find((p) => p.id === defaultPreset)
    const updated = items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            icon: defaultPreset,
            customIconUrl: presetObj?.url || undefined,
          }
        : it
    )
    setActiveStickerRow(null)
    commitProps({ items: updated })
  }

  return (
    <div
      className={cn(
        "relative w-full h-full select-none font-sans",
        "transition-shadow duration-200"
      )}
      style={{
        filter: "drop-shadow(0 16px 36px rgba(70, 45, 20, 0.14)) drop-shadow(0 4px 12px rgba(70, 45, 20, 0.07))",
      }}
    >
      {/* Hidden File Input for Native Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── 1:1 Silver Metal Paperclip ── */}
      {showPaperclip && (
        <div
          className="absolute -top-4 left-[11%] z-30 pointer-events-none"
          style={{ width: "38px", height: "92px" }}
        >
          <img
            src="/wishlist-stickers/paperclip_transparent.png"
            alt="Paperclip"
            className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]"
            onError={(e) => {
              // Fallback SVG if image not yet loaded
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      )}

      {/* ── 1:1 Main Stationery Paper Sheet with Exact Torn Bottom Edge ── */}
      <div
        className="relative w-full h-full flex flex-col pt-7 pb-10 px-6 sm:px-7 bg-[#FAF7F2] text-stone-900 overflow-hidden"
        style={{
          borderTopLeftRadius: "3px",
          borderTopRightRadius: "3px",
          clipPath: TORN_BOTTOM_CLIP_PATH,
          fontFamily: "'Poppins', 'Century Gothic', -apple-system, sans-serif",
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

        {/* ── Header: Stars & 1:1 Title ── */}
        <div className="relative flex items-center justify-center mt-1 mb-4">
          {/* Left Star (tilted -14deg, chubby, #FC883F) */}
          {showStars && (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className="absolute left-6 top-1 -rotate-[14deg] transition-transform duration-200 hover:scale-125 hover:rotate-6 cursor-pointer drop-shadow-xs"
              style={{ fill: accentHex, color: accentHex }}
            >
              <polygon points="12,2.2 15.2,8.8 22.5,9.4 17,14.2 18.7,21.4 12,17.6 5.3,21.4 7,14.2 1.5,9.4 8.8,8.8" />
            </svg>
          )}

          {/* Title: 1:1 "bank holiday wishlist" in bold geometric rounded sans */}
          <div
            onClick={() => setEditingTitle(true)}
            className="flex flex-col items-center justify-center text-center cursor-pointer group px-5 py-0.5 rounded-lg hover:bg-stone-200/40 transition-colors"
            title="Click to edit title"
          >
            {editingTitle ? (
              <div
                className="flex flex-col gap-1.5 p-2.5 bg-white rounded-xl shadow-xl border border-stone-200 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={t1}
                  onChange={(e) => setT1(e.target.value)}
                  placeholder="bank holiday"
                  className="px-2 py-1 text-lg font-black text-center rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ color: accentHex }}
                  autoFocus
                />
                <input
                  type="text"
                  value={t2}
                  onChange={(e) => setT2(e.target.value)}
                  placeholder="wishlist"
                  className="px-2 py-1 text-lg font-black text-center rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ color: accentHex }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle()
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="mt-1 py-1 px-3 text-xs font-bold text-white rounded bg-orange-500 hover:bg-orange-600 shadow-xs"
                  style={{ backgroundColor: accentHex }}
                >
                  Save Title
                </button>
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

          {/* Right Star (tilted +14deg, chubby, #FC883F) */}
          {showStars && (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className="absolute right-6 top-1 rotate-[14deg] transition-transform duration-200 hover:scale-125 hover:-rotate-6 cursor-pointer drop-shadow-xs"
              style={{ fill: accentHex, color: accentHex }}
            >
              <polygon points="12,2.2 15.2,8.8 22.5,9.4 17,14.2 18.7,21.4 12,17.6 5.3,21.4 7,14.2 1.5,9.4 8.8,8.8" />
            </svg>
          )}
        </div>

        {/* ── Top Dashed Divider (Line 1) ── */}
        <div className="w-full border-b border-dashed border-[#292524]/60 my-1" />

        {/* ── Wishlist Rows ── */}
        <div className="flex-1 flex flex-col justify-around py-1">
          {items.map((item, idx) => (
            <div key={item.id} className="relative group/row flex flex-col">
              <div className="flex items-center justify-between gap-3.5 py-2 px-1 rounded-xl transition-colors hover:bg-stone-200/30">
                {/* 1. Left Graphic / Sticker Slot (with Live Image Pasting, Drop & Upload) */}
                <div
                  tabIndex={0}
                  onPaste={(e) => handleSlotPaste(e, item.id)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "copy"
                  }}
                  onDrop={(e) => handleDropImage(e, item.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveStickerRow(activeStickerRow === item.id ? null : item.id)
                  }}
                  className={cn(
                    "relative shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center rounded-xl",
                    "cursor-pointer outline-none transition-all duration-150",
                    "hover:ring-2 hover:ring-orange-400/50 hover:scale-[1.03] active:scale-95",
                    activeStickerRow === item.id && "ring-2 ring-orange-500 shadow-md"
                  )}
                  title="Click to paste (Ctrl+V) or change image"
                >
                  {/* Sticker Graphic */}
                  {renderStickerImage(item, idx)}

                  {/* Hover Quick Overlay: Paste Shortcut Hint */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover/row:opacity-100 rounded-xl flex items-center justify-center gap-1 transition-opacity text-white text-[10px] font-semibold">
                    <Clipboard size={13} weight="bold" />
                    <span>Paste</span>
                  </div>

                  {/* ── Sticker Customizer Popover ── */}
                  {activeStickerRow === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-16 z-50 p-3 bg-white rounded-2xl shadow-2xl border border-stone-200 w-56 animate-in fade-in zoom-in-95 duration-150 text-stone-900"
                    >
                      <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Sticker Image
                      </div>

                      {/* Paste & Upload Action Buttons */}
                      <div className="flex flex-col gap-1.5 mb-2.5">
                        <button
                          type="button"
                          onClick={(e) => handlePasteFromClipboardBtn(item.id, e)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200 transition-colors"
                        >
                          <Clipboard size={14} weight="bold" />
                          <span>Paste copied image (Ctrl+V)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            targetStickerItemRef.current = item.id
                            fileInputRef.current?.click()
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
                        >
                          <UploadSimple size={14} weight="bold" />
                          <span>Upload image file…</span>
                        </button>
                      </div>

                      {/* Presets Grid */}
                      <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                        Original Presets
                      </div>
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        {STICKER_PRESETS.slice(0, 3).map((stk) => (
                          <button
                            key={stk.id}
                            type="button"
                            onClick={() => handleResetToDefaultSticker(item.id, stk.id)}
                            className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200"
                            title={stk.label}
                          >
                            <span className="text-base">{stk.emoji}</span>
                            <span className="text-[9px] truncate max-w-full font-medium text-stone-600">
                              {stk.id}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Reset to Default */}
                      <button
                        type="button"
                        onClick={() => {
                          const defItem = DEFAULT_WISHLIST_ITEMS[idx] || DEFAULT_WISHLIST_ITEMS[0]
                          handleResetToDefaultSticker(item.id, defItem.icon)
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 border-t border-stone-100 mt-1"
                      >
                        <ArrowCounterClockwise size={12} />
                        <span>Reset to original photo cutout</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Middle Text (1:1 typography with inline editing) */}
                <div
                  onClick={(e) => handleStartEditItem(item, e)}
                  className="flex-1 flex flex-col justify-center cursor-pointer min-w-0 pr-1 group/txt"
                  title="Click to edit details"
                >
                  {editingItemId === item.id ? (
                    <div
                      className="flex flex-col gap-1.5 p-2 bg-white rounded-xl shadow-lg border border-stone-200 z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editItemText}
                        onChange={(e) => setEditItemText(e.target.value)}
                        placeholder="Item title"
                        className="px-2 py-1 text-xs font-bold rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editItemSubtext}
                        onChange={(e) => setEditItemSubtext(e.target.value)}
                        placeholder="Subtext / notes"
                        className="px-2 py-1 text-[11px] rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveItemText(item.id)
                        }}
                      />
                      <div className="flex justify-end gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-0.5 text-xs text-stone-500 hover:text-stone-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveItemText(item.id)}
                          className="px-3 py-0.5 text-xs font-bold text-white rounded bg-orange-500 hover:bg-orange-600"
                          style={{ backgroundColor: accentHex }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "text-[14px] sm:text-[15px] font-[400] text-[#1C1917] leading-[1.25] tracking-normal transition-all",
                          item.done && "line-through text-stone-400 opacity-60"
                        )}
                      >
                        {item.text}
                      </span>
                      {item.subtext && (
                        <span
                          className={cn(
                            "text-[14px] sm:text-[15px] font-[400] text-[#1C1917] leading-[1.25] tracking-normal transition-all",
                            item.done && "line-through text-stone-400 opacity-50"
                          )}
                        >
                          {item.subtext}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 3. 1:1 Large Square Checkbox (34×34px with fine pen stroke) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Delete row button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    title="Delete item"
                  >
                    <Trash size={14} />
                  </button>

                  {/* 1:1 Square Checkbox */}
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
          ))}
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
    </div>
  )
})

// ── Sticker Renderer (Custom Image, Photo Cutout, or SVG Preset) ─────────────
function renderStickerImage(item: WishlistItemDef, idx: number) {
  // 1. If user pasted or uploaded a custom image:
  if (item.customIconUrl) {
    return (
      <img
        src={item.customIconUrl}
        alt={item.text}
        className="w-full h-full object-contain filter drop-shadow-sm rounded-md"
      />
    )
  }

  // 2. Default photo cutouts matching the uploaded photo 1:1:
  if (item.icon === "matcha" || idx === 0) {
    return (
      <img
        src="/wishlist-stickers/matcha_transparent.png"
        alt="Matcha drinks"
        className="w-full h-full object-contain filter drop-shadow-sm"
        onError={(e) => {
          // Fallback to cute rendered SVG if static file not available
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }

  if (item.icon === "girls" || idx === 1) {
    return (
      <img
        src="/wishlist-stickers/girls_transparent.png"
        alt="Day out with the girls"
        className="w-full h-full object-contain filter drop-shadow-sm"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }

  if (item.icon === "shopping" || idx === 2) {
    return (
      <img
        src="/wishlist-stickers/shopping_transparent.png"
        alt="Shopping bags"
        className="w-full h-full object-contain filter drop-shadow-sm"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }

  if (item.icon === "coffee") {
    return <Coffee size={32} className="text-amber-800 filter drop-shadow-xs" weight="fill" />
  }

  if (item.icon === "sun") {
    return <Sun size={32} className="text-amber-500 filter drop-shadow-xs" weight="fill" />
  }

  if (item.icon === "travel") {
    return <AirplaneTilt size={32} className="text-sky-500 filter drop-shadow-xs" weight="fill" />
  }

  if (item.icon === "books") {
    return <Books size={32} className="text-indigo-600 filter drop-shadow-xs" weight="fill" />
  }

  if (item.icon === "cake") {
    return <Cake size={32} className="text-pink-500 filter drop-shadow-xs" weight="fill" />
  }

  return <Heart size={32} className="text-rose-500 filter drop-shadow-xs" weight="fill" />
}
