"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Component — Aesthetic Paper Wishlist
//
// Direct interactive canvas implementation of the stationery paper wishlist:
// - Physical paper sheet styling with torn deckle bottom edge & silver paperclip
// - Vibrant orange display typography flanked by stars
// - Inline editable Title & Item text (click to edit details)
// - Interactive checkboxes with tactile sound & check animations
// - Dynamic item addition & removal (+ Add item)
// - Illustrated visual stickers (Matcha, Afro Friends, Shopping Bags, etc.)
// - Full canvas persistence & real-time collaboration sync
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
  PencilSimple,
  Sparkle,
  Coffee,
  Heart,
  AirplaneTilt,
  Sun,
  Books,
  MusicNote,
  Cake,
  ShoppingBag,
} from "@phosphor-icons/react"

interface InteractivePaperWishlistProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

const STICKER_PRESETS: { id: WishlistItemDef["icon"]; label: string; emoji: string }[] = [
  { id: "matcha", label: "Matcha Drinks", emoji: "🍵" },
  { id: "girls", label: "Girls Day Out", emoji: "👯" },
  { id: "shopping", label: "Shopping Bags", emoji: "🛍️" },
  { id: "coffee", label: "Iced Coffee", emoji: "☕" },
  { id: "sun", label: "Sunny Weather", emoji: "☀️" },
  { id: "travel", label: "Holiday Travel", emoji: "✈️" },
  { id: "books", label: "Books & Study", emoji: "📚" },
  { id: "cake", label: "Celebration", emoji: "🎂" },
  { id: "heart", label: "Favorites", emoji: "💖" },
]

export const InteractivePaperWishlist = memo(function InteractivePaperWishlist({
  node,
  selected,
  zoom,
}: InteractivePaperWishlistProps) {
  const props = node.props || {}
  const accentKey = String(props.accentColor || "orange")
  const accentHex = ACCENT_COLORS[accentKey] || "#FF5A1F"

  const titleLine1 = String(props.titleLine1 ?? "bank holiday")
  const titleLine2 = String(props.titleLine2 ?? "wishlist")
  const showPaperclip = props.showPaperclip !== false
  const showStars = props.showStars !== false

  const items: WishlistItemDef[] = Array.isArray(props.items) && props.items.length > 0
    ? (props.items as WishlistItemDef[])
    : DEFAULT_WISHLIST_ITEMS

  // Editing state for title & items
  const [editingTitle, setEditingTitle] = useState(false)
  const [t1, setT1] = useState(titleLine1)
  const [t2, setT2] = useState(titleLine2)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemText, setEditItemText] = useState("")
  const [editItemSubtext, setEditItemSubtext] = useState("")

  const [stickerPickerRow, setStickerPickerRow] = useState<string | null>(null)

  // Sync title when props change externally
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
      subtext: "Tap to edit details",
      done: false,
      icon: "sun",
    }
    commitProps({ items: [...items, newItem] })
  }

  const handleDeleteItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playToolSwitch()
    const updated = items.filter((it) => it.id !== itemId)
    commitProps({ items: updated.length ? updated : DEFAULT_WISHLIST_ITEMS })
  }

  const handleChangeSticker = (itemId: string, sticker: WishlistItemDef["icon"]) => {
    const updated = items.map((it) => (it.id === itemId ? { ...it, icon: sticker } : it))
    setStickerPickerRow(null)
    commitProps({ items: updated })
  }

  return (
    <div
      className={cn(
        "relative w-full h-full select-none font-sans",
        "transition-shadow duration-200"
      )}
      style={{
        filter: "drop-shadow(0 14px 28px rgba(90, 60, 30, 0.12)) drop-shadow(0 4px 10px rgba(90, 60, 30, 0.08))",
      }}
    >
      {/* ── Realistic Silver Metal Paperclip ── */}
      {showPaperclip && (
        <div className="absolute -top-3 left-6 z-30 pointer-events-none drop-shadow-sm">
          <svg width="24" height="60" viewBox="0 0 24 60" fill="none" className="overflow-visible">
            {/* Soft Shadow behind clip */}
            <path
              d="M 5 12 L 5 44 C 5 51 17 51 17 44 L 17 6 C 17 1 7 1 7 6 L 7 36 C 7 40 14 40 14 36 L 14 16"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="2.8"
              strokeLinecap="round"
              transform="translate(1.5, 2)"
            />
            {/* Main Silver Metallic Wire */}
            <path
              d="M 5 12 L 5 44 C 5 51 17 51 17 44 L 17 6 C 17 1 7 1 7 6 L 7 36 C 7 40 14 40 14 36 L 14 16"
              stroke="#94A3B8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Metallic Inner Highlight */}
            <path
              d="M 5 12 L 5 44 C 5 51 17 51 17 44 L 17 6 C 17 1 7 1 7 6 L 7 36 C 7 40 14 40 14 36 L 14 16"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* ── Main Stationery Paper Body with Torn Bottom Edge ── */}
      <div
        className="relative w-full h-full flex flex-col pt-6 pb-9 px-6 bg-[#FCFAF6] text-stone-900 overflow-hidden"
        style={{
          borderTopLeftRadius: "6px",
          borderTopRightRadius: "6px",
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), 96% calc(100% - 14px), 91% calc(100% - 21px), 86% calc(100% - 16px), 81% calc(100% - 20px), 76% calc(100% - 15px), 71% calc(100% - 22px), 66% calc(100% - 16px), 61% calc(100% - 19px), 56% calc(100% - 14px), 51% calc(100% - 21px), 46% calc(100% - 15px), 41% calc(100% - 19px), 36% calc(100% - 15px), 31% calc(100% - 22px), 26% calc(100% - 16px), 21% calc(100% - 20px), 16% calc(100% - 15px), 11% calc(100% - 21px), 6% calc(100% - 16px), 0 calc(100% - 19px))",
        }}
      >
        {/* Subtle Paper Fiber Grain Texture */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(circle, #292524 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        />

        {/* ── Header: Stars & Title ── */}
        <div className="relative flex items-center justify-center mb-3">
          {/* Left Star */}
          {showStars && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute left-2 top-0.5 -rotate-12 transition-transform duration-200 hover:scale-125 hover:rotate-6 cursor-pointer"
              style={{ fill: accentHex, color: accentHex }}
            >
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
            </svg>
          )}

          {/* Title Text (Click to edit) */}
          <div
            onClick={() => setEditingTitle(true)}
            className="flex flex-col items-center justify-center text-center cursor-pointer group px-4 py-1 rounded-lg hover:bg-stone-100/50 transition-colors"
            title="Click to edit title"
          >
            {editingTitle ? (
              <div
                className="flex flex-col gap-1.5 p-2 bg-white rounded-xl shadow-lg border border-stone-200 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={t1}
                  onChange={(e) => setT1(e.target.value)}
                  placeholder="bank holiday"
                  className="px-2.5 py-1 text-base font-extrabold text-center rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: accentHex }}
                  autoFocus
                />
                <input
                  type="text"
                  value={t2}
                  onChange={(e) => setT2(e.target.value)}
                  placeholder="wishlist"
                  className="px-2.5 py-1 text-base font-extrabold text-center rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ color: accentHex }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle()
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="mt-1 py-1 px-3 text-xs font-bold text-white rounded bg-orange-600 hover:bg-orange-500 shadow-sm transition-all"
                  style={{ backgroundColor: accentHex }}
                >
                  Save Title
                </button>
              </div>
            ) : (
              <>
                <h1
                  className="text-2xl sm:text-[26px] font-black leading-none tracking-tight lowercase transition-transform duration-150 group-hover:scale-[1.02]"
                  style={{ color: accentHex }}
                >
                  {titleLine1}
                </h1>
                <h2
                  className="text-2xl sm:text-[26px] font-black leading-tight tracking-tight lowercase mt-0.5 transition-transform duration-150 group-hover:scale-[1.02]"
                  style={{ color: accentHex }}
                >
                  {titleLine2}
                </h2>
              </>
            )}
          </div>

          {/* Right Star */}
          {showStars && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute right-2 top-0.5 rotate-12 transition-transform duration-200 hover:scale-125 hover:-rotate-6 cursor-pointer"
              style={{ fill: accentHex, color: accentHex }}
            >
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
            </svg>
          )}
        </div>

        {/* ── Top Dashed Divider ── */}
        <div className="w-full border-b border-dashed border-stone-800/40 my-1" />

        {/* ── Wishlist Rows ── */}
        <div className="flex-1 flex flex-col justify-around py-1">
          {items.map((item, idx) => (
            <div key={item.id} className="relative group/row flex flex-col">
              <div className="flex items-center justify-between gap-3 py-2 px-1 rounded-xl transition-colors hover:bg-stone-100/40">
                {/* 1. Left Graphic Sticker */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setStickerPickerRow(stickerPickerRow === item.id ? null : item.id)
                  }}
                  className="relative shrink-0 w-14 h-14 flex items-center justify-center cursor-pointer rounded-xl hover:scale-105 active:scale-95 transition-transform"
                  title="Click to change sticker icon"
                >
                  {renderSticker(item.icon, accentHex)}

                  {/* Sticker Picker Popover */}
                  {stickerPickerRow === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-14 z-40 p-2 bg-white rounded-2xl shadow-xl border border-stone-200 grid grid-cols-3 gap-1.5 w-44 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {STICKER_PRESETS.map((stk) => (
                        <button
                          key={stk.id}
                          type="button"
                          onClick={() => handleChangeSticker(item.id, stk.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl text-lg hover:bg-stone-100 transition-colors",
                            item.icon === stk.id && "bg-orange-50 border border-orange-300"
                          )}
                          title={stk.label}
                        >
                          <span>{stk.emoji}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Middle Text (Click to edit) */}
                <div
                  onClick={(e) => handleStartEditItem(item, e)}
                  className="flex-1 flex flex-col justify-center cursor-pointer min-w-0 pr-1 group/txt"
                  title="Click to edit text"
                >
                  {editingItemId === item.id ? (
                    <div
                      className="flex flex-col gap-1 p-1 bg-white rounded-lg shadow-md border border-stone-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editItemText}
                        onChange={(e) => setEditItemText(e.target.value)}
                        placeholder="Item text"
                        className="px-2 py-0.5 text-xs font-bold rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editItemSubtext}
                        onChange={(e) => setEditItemSubtext(e.target.value)}
                        placeholder="Subtext / notes"
                        className="px-2 py-0.5 text-[11px] rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveItemText(item.id)
                        }}
                      />
                      <div className="flex justify-end gap-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-0.5 text-[10px] text-stone-500 hover:text-stone-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveItemText(item.id)}
                          className="px-2.5 py-0.5 text-[10px] font-bold text-white rounded bg-orange-600 hover:bg-orange-500"
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
                          "text-[13px] sm:text-sm font-bold text-stone-900 leading-tight transition-all",
                          item.done && "line-through text-stone-400 opacity-60"
                        )}
                      >
                        {item.text}
                      </span>
                      {item.subtext && (
                        <span
                          className={cn(
                            "text-[11px] sm:text-xs text-stone-600 leading-snug mt-0.5 transition-all",
                            item.done && "line-through text-stone-400 opacity-50"
                          )}
                        >
                          {item.subtext}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 3. Right Checkbox & Row Delete Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Delete row button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="opacity-0 group-hover/row:opacity-100 p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    title="Delete item"
                  >
                    <Trash size={13} />
                  </button>

                  {/* Tactile Square Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleItemDone(item.id, e)}
                    aria-label={`Check ${item.text}`}
                    className={cn(
                      "size-7 sm:size-8 rounded-sm border-2 border-stone-800/80 bg-white/70 hover:bg-white flex items-center justify-center cursor-pointer shadow-xs",
                      "transition-all duration-150 active:scale-90",
                      item.done && "border-orange-600 bg-orange-50/50"
                    )}
                    style={item.done ? { borderColor: accentHex } : undefined}
                  >
                    {item.done && (
                      <Check
                        size={20}
                        weight="bold"
                        className="animate-in zoom-in-50 duration-150"
                        style={{ color: accentHex }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Dashed divider between rows */}
              <div className="w-full border-b border-dashed border-stone-800/40 my-0.5" />
            </div>
          ))}
        </div>

        {/* ── Bottom Action: + Add Item Button ── */}
        {items.length < 6 && (
          <div className="mt-1 flex justify-center">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-200/50 hover:bg-stone-200/90 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Plus size={12} weight="bold" />
              <span>Add wishlist item</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

// ── Sticker Renderer ──────────────────────────────────────────────────────────
function renderSticker(icon: WishlistItemDef["icon"], accentHex: string) {
  if (icon === "matcha") {
    return (
      <div className="relative flex items-center justify-center">
        {/* Pink Cup */}
        <div className="relative w-6 h-10 bg-gradient-to-b from-[#F472B6] to-[#DB2777] rounded-b-md shadow-xs flex flex-col justify-between overflow-hidden -rotate-6">
          <div className="w-full h-3 bg-[#65A30D]" />
          <div className="w-full h-3 bg-white/40" />
        </div>
        {/* Clear Green Cup */}
        <div className="relative w-6 h-11 bg-gradient-to-b from-[#A3E635] to-[#65A30D] rounded-b-md shadow-xs border border-white/60 ml-[-4px] rotate-3 overflow-hidden">
          <div className="absolute top-1 left-1.5 size-1.5 bg-white/60 rounded-xs" />
          <div className="absolute top-3 right-1.5 size-1.5 bg-white/60 rounded-xs" />
          {/* Straw */}
          <div className="absolute -top-3 right-2 w-1 h-5 bg-[#059669] -rotate-12" />
        </div>
      </div>
    )
  }

  if (icon === "girls") {
    return (
      <div className="relative flex items-center justify-center scale-90">
        {/* Girl 1 with Afro Puffs */}
        <div className="relative flex flex-col items-center">
          <div className="size-6 rounded-full bg-stone-900 shadow-xs" />
          <div className="w-6 h-4 bg-stone-800 rounded-t-lg -mt-1" />
        </div>
        {/* Girl 2 with Afro Puffs */}
        <div className="relative flex flex-col items-center ml-[-4px]">
          <div className="size-5 rounded-full bg-stone-900 shadow-xs" />
          <div className="w-6 h-4 bg-stone-100 rounded-t-lg border border-stone-300 -mt-1" />
        </div>
        {/* Phone */}
        <div className="absolute bottom-1 w-2.5 h-3.5 bg-sky-400 rounded-2xs border border-sky-600 shadow-xs" />
      </div>
    )
  }

  if (icon === "shopping") {
    return (
      <div className="relative flex items-end justify-center scale-95">
        {/* Orange Bag */}
        <div className="relative w-6 h-9 bg-[#FF6600] rounded-xs shadow-xs flex items-center justify-center">
          <div className="absolute -top-2.5 w-3.5 h-3 rounded-t-full border border-[#EA580C] border-b-0" />
        </div>
        {/* Black Bag */}
        <div className="relative w-5 h-7 bg-stone-900 rounded-xs shadow-xs ml-[-3px] flex items-center justify-center">
          <div className="absolute -top-2 w-3 h-2.5 rounded-t-full border border-stone-400 border-b-0" />
        </div>
      </div>
    )
  }

  if (icon === "coffee") {
    return <Coffee size={28} className="text-amber-800" weight="fill" />
  }

  if (icon === "sun") {
    return <Sun size={28} className="text-amber-500 animate-spin" style={{ animationDuration: "12s" }} weight="fill" />
  }

  if (icon === "travel") {
    return <AirplaneTilt size={28} className="text-sky-500" weight="fill" />
  }

  if (icon === "books") {
    return <Books size={28} className="text-indigo-600" weight="fill" />
  }

  if (icon === "cake") {
    return <Cake size={28} className="text-pink-500" weight="fill" />
  }

  return <Heart size={28} className="text-rose-500" weight="fill" />
}
