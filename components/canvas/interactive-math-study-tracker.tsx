"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Component — 1:1 Math Study Tracker
//
// 100% authentic paper stationery study tracker matching the reference design:
// - Physical ivory stationery sheet with ragged deckle torn paper edges
// - Metallic brass/silver wire paperclip with drop shadow hanging over top-left
// - Tilted hand-drawn hollow orange stars (#FC883F) around clip and title
// - Bold, rounded lowercase handwritten title ("math study tracker")
// - Formal table header: CHAPTERS on left, vertical solid dividing ink line,
//   and the 4 study resource columns: NCERT, Ushank Sir, Shobhit Sir, NCERT Exemplar
// - Solid horizontal line under header; dashed dividing lines between chapter rows
// - 5 Class 10 Math syllabus chapters with hand-drawn math geometry sketches:
//   01 Statistics (Ch 13) — Sketched bar chart with vertical hatching
//   02 Surface Areas and Volumes (Ch 12) — 3D cylinder & cone
//   03 Some Applications of Trigonometry (Ch 9) — Right-angled triangles
//   04 Areas Related to Circles (Ch 11) — Circle with hatched sector
//   05 Circles (Ch 10) — Circle tangent & secant geometry
// - 4 Hand-drawn square checkboxes per row with tactile clicking & audio feedback
// - Live progress bar & completion counter ("X of Y completed")
// - Inline in-place editing for title, column headers, and chapter names
// - Quick action controls: Add Chapter, Clear All, Mark All Done, Delete Row
// - Immediate persistence to IndexedDB and real-time collaboration sync
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback, memo } from "react"
import type { ComponentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { audioFx } from "@/lib/canvas/audio-fx"
import {
  DEFAULT_TRACKER_COLUMNS,
  DEFAULT_TRACKER_CHAPTERS,
  MATH_TRACKER_DECKLE_CLIP_PATH,
  type StudyTrackerColumn,
  type StudyTrackerChapter,
} from "@/lib/library/defs-math-study-tracker"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash,
  Check,
  ArrowCounterClockwise,
  CheckFat,
  Sparkle,
} from "@phosphor-icons/react"

interface InteractiveMathStudyTrackerProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

export const InteractiveMathStudyTracker = memo(function InteractiveMathStudyTracker({
  node,
  selected,
}: InteractiveMathStudyTrackerProps) {
  const props = node.props || {}
  const accentKey = String(props.accentColor || "orange")
  const accentHex = accentKey === "pink"
    ? "#EC4899"
    : accentKey === "emerald"
    ? "#10B981"
    : accentKey === "sky"
    ? "#0284C7"
    : accentKey === "violet"
    ? "#8B5CF6"
    : accentKey === "black"
    ? "#1C1917"
    : "#FC883F"

  const title = String(props.title ?? "math study tracker")
  const showPaperclip = props.showPaperclip !== false
  const showStars = props.showStars !== false

  const columns: StudyTrackerColumn[] = Array.isArray(props.columns) && props.columns.length > 0
    ? (props.columns as StudyTrackerColumn[])
    : DEFAULT_TRACKER_COLUMNS

  const chapters: StudyTrackerChapter[] = Array.isArray(props.chapters) && props.chapters.length > 0
    ? (props.chapters as StudyTrackerChapter[])
    : DEFAULT_TRACKER_CHAPTERS

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(title)
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const [colTitleInput, setColTitleInput] = useState("")
  const [colSubInput, setColSubInput] = useState("")
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [chapterNumInput, setChapterNumInput] = useState("")
  const [chapterNameInput, setChapterNameInput] = useState("")

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitleInput(title)
  }, [title])

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

  // ── Keyboard Escape Listener ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingTitle(false)
        setEditingColId(null)
        setEditingChapterId(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // ── Checkbox Toggle ───────────────────────────────────────────────────────
  const handleToggleCheck = (chapterId: string, colId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playClick()
    const updated = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch
      const current = Boolean(ch.checks && ch.checks[colId])
      return {
        ...ch,
        checks: {
          ...(ch.checks || {}),
          [colId]: !current,
        },
      }
    })
    commitProps({ chapters: updated })
  }

  // ── Progress Stats ────────────────────────────────────────────────────────
  const totalBoxes = chapters.length * columns.length
  let checkedCount = 0
  for (const ch of chapters) {
    for (const col of columns) {
      if (ch.checks && ch.checks[col.id]) {
        checkedCount++
      }
    }
  }
  const percentDone = totalBoxes > 0 ? Math.round((checkedCount / totalBoxes) * 100) : 0
  const isAllDone = totalBoxes > 0 && checkedCount === totalBoxes

  // ── Chapter Management ────────────────────────────────────────────────────
  const handleAddChapter = (e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playReactionPop()
    const nextNum = String(chapters.length + 1).padStart(2, "0")
    const newChapter: StudyTrackerChapter = {
      id: `ch-${Date.now()}`,
      number: nextNum,
      name: `Chapter ${nextNum}`,
      iconKind: "geometry-3d",
      checks: {},
    }
    commitProps({ chapters: [...chapters, newChapter] })
  }

  const handleDeleteChapter = (chId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playToolSwitch()
    const updated = chapters.filter((ch) => ch.id !== chId)
    commitProps({ chapters: updated.length ? updated : DEFAULT_TRACKER_CHAPTERS })
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playToolSwitch()
    const updated = chapters.map((ch) => ({ ...ch, checks: {} }))
    commitProps({ chapters: updated })
  }

  const handleMarkAllDone = (e: React.MouseEvent) => {
    e.stopPropagation()
    audioFx.playShapeSnap()
    const fullChecks: Record<string, boolean> = {}
    for (const col of columns) {
      fullChecks[col.id] = true
    }
    const updated = chapters.map((ch) => ({ ...ch, checks: { ...fullChecks } }))
    commitProps({ chapters: updated })
  }

  // ── Column Editing ────────────────────────────────────────────────────────
  const handleStartEditCol = (col: StudyTrackerColumn, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingColId(col.id)
    setColTitleInput(col.title)
    setColSubInput(col.subtitle || "")
    setEditingChapterId(null)
    setEditingTitle(false)
  }

  const handleSaveCol = (colId: string) => {
    const updated = columns.map((col) =>
      col.id === colId
        ? {
            ...col,
            title: colTitleInput.trim() || col.title,
            subtitle: colSubInput.trim() || undefined,
          }
        : col
    )
    commitProps({ columns: updated })
    setEditingColId(null)
  }

  // ── Chapter Editing ───────────────────────────────────────────────────────
  const handleStartEditChapter = (ch: StudyTrackerChapter, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingChapterId(ch.id)
    setChapterNumInput(ch.number)
    setChapterNameInput(ch.name)
    setEditingColId(null)
    setEditingTitle(false)
  }

  const handleSaveChapter = (chId: string) => {
    const updated = chapters.map((ch) =>
      ch.id === chId
        ? {
            ...ch,
            number: chapterNumInput.trim() || ch.number,
            name: chapterNameInput.trim() || ch.name,
          }
        : ch
    )
    commitProps({ chapters: updated })
    setEditingChapterId(null)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full select-none font-sans",
        "transition-shadow duration-200"
      )}
      style={{
        filter: "drop-shadow(0 18px 40px rgba(40, 25, 10, 0.18)) drop-shadow(0 4px 14px rgba(40, 25, 10, 0.08))",
      }}
      onClick={() => {
        setEditingTitle(false)
        setEditingColId(null)
        setEditingChapterId(null)
      }}
    >
      {/* ── 1:1 Metallic Wire Paperclip (Canvas Drag Handle) ── */}
      {showPaperclip && (
        <div
          data-node-drag-handle="true"
          className="absolute -top-4 left-[11%] z-30 cursor-grab active:cursor-grabbing group/clip"
          style={{ width: "42px", height: "94px" }}
          title="Drag Math Study Tracker"
        >
          {/* Folded paper scrap underneath paperclip */}
          <div
            className="absolute top-4 left-0 w-8 h-8 rounded-sm bg-[#F2ECDF] border border-[#DDD3C1] shadow-2xs rotate-6 pointer-events-none"
            style={{
              clipPath: "polygon(0 0, 100% 8%, 92% 100%, 8% 92%)",
            }}
          />
          {/* SVG Metallic Wire Paperclip with subtle drop shadow */}
          <svg
            viewBox="0 0 38 88"
            className="w-full h-full overflow-visible filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.28)] pointer-events-none group-hover/clip:scale-105 transition-transform"
          >
            <defs>
              <linearGradient id="mathWireClip" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="35%" stopColor="#94A3B8" />
                <stop offset="70%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
            </defs>
            {/* Paperclip Loop Wire */}
            <path
              d="M 12 72 L 12 18 C 12 9 26 9 26 18 L 26 76 C 26 84 6 84 6 76 L 6 30 C 6 22 20 22 20 30 L 20 68"
              fill="none"
              stroke="url(#mathWireClip)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* ── Main Stationery Paper Sheet with Deckle Edge ── */}
      <div
        className="relative w-full h-full flex flex-col pt-6 pb-6 px-6 sm:px-7 bg-[#FAF7F2] text-stone-900 overflow-hidden"
        style={{
          clipPath: MATH_TRACKER_DECKLE_CLIP_PATH,
          fontFamily: "var(--font-caveat), var(--font-sketch), 'Caveat', 'Comic Sans MS', 'Chalkboard SE', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Subtle Paper Fiber Texture Overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(circle, #292524 1px, transparent 1px)",
            backgroundSize: "7px 7px",
          }}
        />

        {/* ── Top Header Row: Stars, Title & Drag Area ── */}
        <div
          data-node-drag-handle="true"
          className="relative flex items-center justify-center mt-1 mb-3 cursor-grab active:cursor-grabbing min-h-[46px]"
        >
          {/* Hand-Drawn Outline Stars Around Clip & Title */}
          {showStars && (
            <>
              {/* Star 1: Small star top left */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                className="absolute left-[3%] -top-1 -rotate-[16deg] cursor-pointer hover:scale-125 transition-transform"
                style={{ stroke: accentHex, fill: "none", strokeWidth: 1.8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  audioFx.playReactionPop()
                }}
              >
                <polygon points="12,2.5 15.2,8.8 22.2,9.4 17,14.2 18.6,21.2 12,17.5 5.4,21.2 7,14.2 1.8,9.4 8.8,8.8" />
              </svg>

              {/* Star 2: Medium star lower left */}
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                className="absolute left-[1%] top-5 rotate-[18deg] cursor-pointer hover:scale-125 transition-transform"
                style={{ stroke: accentHex, fill: "none", strokeWidth: 1.8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  audioFx.playReactionPop()
                }}
              >
                <polygon points="12,2.5 15.2,8.8 22.2,9.4 17,14.2 18.6,21.2 12,17.5 5.4,21.2 7,14.2 1.8,9.4 8.8,8.8" />
              </svg>

              {/* Star 3: Large star to the right of clip */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                className="absolute left-[20%] -top-0.5 -rotate-[8deg] cursor-pointer hover:scale-125 transition-transform"
                style={{ stroke: accentHex, fill: "none", strokeWidth: 1.8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  audioFx.playReactionPop()
                }}
              >
                <polygon points="12,2.5 15.2,8.8 22.2,9.4 17,14.2 18.6,21.2 12,17.5 5.4,21.2 7,14.2 1.8,9.4 8.8,8.8" />
              </svg>

              {/* Mini sparkle dots */}
              <span className="absolute left-[8%] top-1 text-[10px] pointer-events-none" style={{ color: accentHex }}>✦</span>
              <span className="absolute left-[26%] -top-1 text-[8px] pointer-events-none" style={{ color: accentHex }}>★</span>
            </>
          )}

          {/* 1:1 Title: "math study tracker" */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setEditingTitle(true)
              setEditingColId(null)
              setEditingChapterId(null)
            }}
            className="flex items-center justify-center text-center cursor-pointer group px-4 py-0.5 rounded-lg hover:bg-stone-200/40 transition-colors ml-14"
            title="Click to edit title"
          >
            {editingTitle ? (
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false)
                  commitProps({ title: titleInput.trim() || "math study tracker" })
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false)
                    commitProps({ title: titleInput.trim() || "math study tracker" })
                  } else if (e.key === "Escape") {
                    setEditingTitle(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-2xl font-black text-stone-900 bg-white/90 border border-stone-400 rounded px-2 py-0.5 outline-none shadow-xs text-center w-64"
              />
            ) : (
              <h1 className="text-[25px] sm:text-[27px] font-black tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                {title}
              </h1>
            )}
          </div>
        </div>

        {/* ── Study Table Container ── */}
        <div className="flex-1 flex flex-col w-full border-t border-stone-800/90 relative">
          {/* Table Header Row */}
          <div className="flex items-center w-full min-h-[46px] border-b border-stone-800/90 bg-transparent text-stone-900 text-xs sm:text-sm font-bold tracking-tight">
            {/* Left Header: CHAPTERS */}
            <div className="w-[52%] px-3 py-1 flex items-center justify-center uppercase tracking-wider text-stone-800 font-extrabold text-[13px]">
              CHAPTERS
            </div>

            {/* Vertical Solid Ink Dividing Line */}
            <div className="w-[1.5px] self-stretch bg-stone-800/90" />

            {/* Right Headers: 4 Study Columns */}
            <div className="flex-1 grid grid-cols-4 h-full">
              {columns.map((col) => {
                const isEditing = editingColId === col.id
                return (
                  <div
                    key={col.id}
                    onClick={(e) => handleStartEditCol(col, e)}
                    className="flex flex-col items-center justify-center text-center px-1 py-1 cursor-pointer hover:bg-stone-200/40 transition-colors group/col"
                    title="Click to edit column header"
                  >
                    {isEditing ? (
                      <div
                        className="flex flex-col gap-0.5 w-full items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={colTitleInput}
                          onChange={(e) => setColTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCol(col.id)
                            if (e.key === "Escape") setEditingColId(null)
                          }}
                          onBlur={() => handleSaveCol(col.id)}
                          className="w-full text-[10px] text-center font-bold bg-white border border-stone-400 rounded px-1 py-0.5 outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <span className="text-[11px] sm:text-[12px] font-bold text-stone-900 leading-tight">
                          {col.title}
                        </span>
                        {col.subtitle && (
                          <span className="text-[10px] sm:text-[11px] font-semibold text-stone-700 leading-tight">
                            {col.subtitle}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chapter Rows */}
          <div className="flex-1 flex flex-col justify-around">
            {chapters.map((ch, idx) => {
              const isEditingCh = editingChapterId === ch.id
              const isLast = idx === chapters.length - 1

              return (
                <div
                  key={ch.id}
                  className={cn(
                    "flex items-center w-full min-h-[64px] py-1.5 transition-colors group/row",
                    !isLast && "border-b border-dashed border-stone-400/80"
                  )}
                >
                  {/* Left Column: Math Icon + Chapter Title */}
                  <div className="w-[52%] flex items-center gap-2.5 px-2 relative">
                    {/* Delete Chapter button on hover */}
                    {selected && chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChapter(ch.id, e)}
                        className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-stone-200/60 cursor-pointer"
                        title="Delete chapter"
                      >
                        <Trash size={13} />
                      </button>
                    )}

                    {/* Circular Sketched Math Icon */}
                    <div className="shrink-0 w-[42px] h-[42px] rounded-full border border-stone-700/80 bg-white/40 flex items-center justify-center shadow-2xs">
                      {ch.iconKind === "bar-chart" || idx === 0 ? (
                        // Sketched Bar Chart for Statistics
                        <svg viewBox="0 0 32 32" className="w-7 h-7 stroke-stone-800 fill-none">
                          <line x1="6" y1="26" x2="26" y2="26" strokeWidth="1.5" />
                          <line x1="6" y1="26" x2="6" y2="8" strokeWidth="1.5" />
                          <rect x="8" y="16" width="3.5" height="10" strokeWidth="1.2" />
                          <rect x="13" y="11" width="3.5" height="15" strokeWidth="1.2" />
                          <rect x="18" y="7" width="3.5" height="19" strokeWidth="1.2" />
                          <rect x="23" y="13" width="3.5" height="13" strokeWidth="1.2" />
                          {/* Fine hatched texture */}
                          <line x1="9.5" y1="18" x2="9.5" y2="24" strokeWidth="0.8" />
                          <line x1="14.5" y1="13" x2="14.5" y2="24" strokeWidth="0.8" />
                          <line x1="19.5" y1="9" x2="19.5" y2="24" strokeWidth="0.8" />
                        </svg>
                      ) : ch.iconKind === "geometry-3d" || idx === 1 ? (
                        // Sketched 3D Cylinder & Cone for Surface Areas & Volumes
                        <svg viewBox="0 0 32 32" className="w-7 h-7 stroke-stone-800 fill-none">
                          {/* 3D Cylinder on left */}
                          <ellipse cx="10" cy="11" rx="5" ry="2.2" strokeWidth="1.2" />
                          <line x1="5" y1="11" x2="5" y2="22" strokeWidth="1.2" />
                          <line x1="15" y1="11" x2="15" y2="22" strokeWidth="1.2" />
                          <path d="M 5 22 C 5 24.5 15 24.5 15 22" strokeWidth="1.2" />
                          {/* 3D Cone on right */}
                          <line x1="22" y1="9" x2="16.5" y2="23" strokeWidth="1.2" />
                          <line x1="22" y1="9" x2="27.5" y2="23" strokeWidth="1.2" />
                          <path d="M 16.5 23 C 16.5 25.5 27.5 25.5 27.5 23" strokeWidth="1.2" />
                        </svg>
                      ) : ch.iconKind === "trigonometry" || idx === 2 ? (
                        // Sketched Right Triangles for Trigonometry
                        <svg viewBox="0 0 32 32" className="w-7 h-7 stroke-stone-800 fill-none">
                          <polygon points="6,24 6,14 15,24" strokeWidth="1.3" />
                          <rect x="6" y="21" width="3" height="3" strokeWidth="0.9" />
                          <polygon points="16,24 16,9 27,24" strokeWidth="1.3" />
                          <rect x="16" y="21" width="3" height="3" strokeWidth="0.9" />
                        </svg>
                      ) : ch.iconKind === "circle-sector" || idx === 3 ? (
                        // Sketched Circle with Shaded Sector for Areas Related to Circles
                        <svg viewBox="0 0 32 32" className="w-7 h-7 stroke-stone-800 fill-none">
                          <circle cx="16" cy="16" r="12" strokeWidth="1.3" />
                          <circle cx="16" cy="16" r="10" strokeWidth="0.8" />
                          <line x1="16" y1="16" x2="26" y2="13" strokeWidth="1.2" />
                          <line x1="16" y1="16" x2="20" y2="26" strokeWidth="1.2" />
                          {/* Diagonal hatch shading lines inside the pie slice */}
                          <line x1="18" y1="17" x2="21" y2="21" strokeWidth="0.9" />
                          <line x1="20" y1="16" x2="23" y2="20" strokeWidth="0.9" />
                          <line x1="22" y1="15" x2="25" y2="18" strokeWidth="0.9" />
                        </svg>
                      ) : (
                        // Sketched Circle with Tangent & Intersecting Lines
                        <svg viewBox="0 0 32 32" className="w-7 h-7 stroke-stone-800 fill-none">
                          <circle cx="16" cy="16" r="11" strokeWidth="1.3" />
                          <line x1="5" y1="27" x2="27" y2="5" strokeWidth="1.2" />
                          <line x1="6" y1="16" x2="26" y2="21" strokeWidth="1" />
                          <ellipse cx="12" cy="18" rx="4" ry="4" strokeWidth="0.9" />
                        </svg>
                      )}
                    </div>

                    {/* Chapter Title & Number (In-place edit) */}
                    <div
                      onClick={(e) => handleStartEditChapter(ch, e)}
                      className="flex-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-stone-200/40 transition-colors"
                      title="Click to edit chapter name"
                    >
                      {isEditingCh ? (
                        <div
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={chapterNumInput}
                            onChange={(e) => setChapterNumInput(e.target.value)}
                            className="w-8 text-xs font-bold bg-white border border-stone-400 rounded px-1 py-0.5 outline-none text-center"
                          />
                          <input
                            type="text"
                            autoFocus
                            value={chapterNameInput}
                            onChange={(e) => setChapterNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveChapter(ch.id)
                              if (e.key === "Escape") setEditingChapterId(null)
                            }}
                            onBlur={() => handleSaveChapter(ch.id)}
                            className="flex-1 text-xs font-bold bg-white border border-stone-400 rounded px-1 py-0.5 outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 text-stone-900 leading-snug">
                          <span className="font-extrabold text-[13px] sm:text-[14px]">
                            {ch.number}
                          </span>
                          <span className="font-bold text-[12px] sm:text-[13px]">
                            {ch.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Solid Ink Dividing Line */}
                  <div className="w-[1.5px] self-stretch bg-stone-800/90" />

                  {/* Right Column: 4 Square Hand-Drawn Checkboxes */}
                  <div className="flex-1 grid grid-cols-4 items-center justify-items-center h-full">
                    {columns.map((col) => {
                      const isChecked = Boolean(ch.checks && ch.checks[col.id])

                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={(e) => handleToggleCheck(ch.id, col.id, e)}
                          title={`${ch.name} — ${col.title}: ${isChecked ? "Completed" : "Mark as completed"}`}
                          className={cn(
                            "w-[32px] h-[32px] sm:w-[34px] sm:h-[34px] rounded-[4px] border-[2px] transition-all duration-150 flex items-center justify-center cursor-pointer select-none",
                            "hover:scale-105 active:scale-95 shadow-2xs",
                            isChecked
                              ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                              : "border-stone-800 bg-white/70 hover:border-stone-600 hover:bg-white"
                          )}
                        >
                          {isChecked && (
                            <svg
                              viewBox="0 0 24 24"
                              className="w-5 h-5 stroke-emerald-600 fill-none animate-in zoom-in-75 duration-150"
                            >
                              <path
                                d="M 4 12 L 9.5 18 L 20 6"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Bottom Section: Progress Bar & Quick Actions ── */}
        <div className="mt-3 pt-2 border-t border-stone-300/80 flex items-center justify-between gap-3 text-xs">
          {/* Progress Summary Pill */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 sm:w-32 bg-stone-200 rounded-full overflow-hidden border border-stone-300 shadow-inner">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentDone}%` }}
              />
            </div>
            <span className="font-bold text-stone-700 text-[11px] font-mono">
              {checkedCount}/{totalBoxes} ({percentDone}%)
            </span>
            {isAllDone && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                <Sparkle size={12} weight="fill" />
                Done!
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddChapter}
              className="h-6 px-2 rounded bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Add a new chapter row"
            >
              <Plus size={11} weight="bold" />
              <span>Add Chapter</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="h-6 px-1.5 rounded hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all checkboxes"
            >
              <ArrowCounterClockwise size={11} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleMarkAllDone}
              className="h-6 px-1.5 rounded hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Mark all completed"
            >
              <CheckFat size={11} />
              <span>Mark All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
