"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Notes & Study Materials System
//
// Replaces "Classroom & Faculty Notes" with a student-owned academic material system.
// Organization: Subject → Chapter → Notes & Materials
// Supported types: text notes, PDFs, images, documents, links, and Zenithsui canvases.
// ---------------------------------------------------------------------------

import { useState, useMemo, useRef } from "react"
import {
  useStudentStore,
  type StudyMaterial,
  type MaterialType,
} from "@/lib/academic/student-store"
import {
  FolderSimple,
  FileText,
  FilePdf,
  Image,
  File,
  LinkSimple,
  PencilRuler,
  Plus,
  Star,
  PushPin,
  MagnifyingGlass,
  ArrowRight,
  DownloadSimple,
  Trash,
  DotsThreeVertical,
  PencilSimple,
  Check,
  X,
  Eye,
  ArrowLeft,
  ArrowSquareOut,
  FolderOpen,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function NotesMaterialsHub({
  initialSubjectId,
  initialChapterId,
}: {
  initialSubjectId?: string
  initialChapterId?: string | null
}) {
  const subjects = useStudentStore((s) => s.subjects.filter((s) => !s.archived))
  const chapters = useStudentStore((s) => s.chapters)
  const materials = useStudentStore((s) => s.materials)

  const addMaterial = useStudentStore((s) => s.addMaterial)
  const updateMaterial = useStudentStore((s) => s.updateMaterial)
  const deleteMaterial = useStudentStore((s) => s.deleteMaterial)
  const toggleFavoriteMaterial = useStudentStore((s) => s.toggleFavoriteMaterial)
  const togglePinMaterial = useStudentStore((s) => s.togglePinMaterial)
  const moveMaterial = useStudentStore((s) => s.moveMaterial)
  const recordMaterialOpened = useStudentStore((s) => s.recordMaterialOpened)

  // Navigation state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || ""
  )
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    initialChapterId || null
  )

  // Sub-tabs: "chapter" (normal) | "favorites" | "recent" | "unorganized"
  const [viewTab, setViewTab] = useState<"chapter" | "favorites" | "recent" | "unorganized">("chapter")
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [noteEditorOpen, setNoteEditorOpen] = useState(false)
  const [activeNoteForEdit, setActiveNoteForEdit] = useState<StudyMaterial | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedMaterialForMove, setSelectedMaterialForMove] = useState<StudyMaterial | null>(null)

  // Current Subject and Chapters
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId)
  const subjectChapters = useMemo(() => {
    return chapters.filter((c) => c.subjectId === selectedSubjectId)
  }, [chapters, selectedSubjectId])

  // Active chapter
  const currentChapter = useMemo(() => {
    if (!selectedChapterId) return subjectChapters[0] || null
    return subjectChapters.find((c) => c.id === selectedChapterId) || subjectChapters[0] || null
  }, [subjectChapters, selectedChapterId])

  // Filtered materials
  const displayedMaterials = useMemo(() => {
    let list: StudyMaterial[] = []

    if (viewTab === "favorites") {
      list = materials.filter((m) => m.favorite)
    } else if (viewTab === "recent") {
      list = [...materials].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    } else if (viewTab === "unorganized") {
      list = materials.filter((m) => !m.chapterId)
    } else {
      // Normal chapter view
      if (currentChapter) {
        list = materials.filter((m) => m.chapterId === currentChapter.id)
      } else {
        list = materials.filter((m) => m.subjectId === selectedSubjectId)
      }
    }

    if (typeFilter !== "All") {
      list = list.filter((m) => m.type === typeFilter.toLowerCase())
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.chapterName?.toLowerCase().includes(q)
      )
    }

    // Sort: pinned first, then newest
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [materials, viewTab, currentChapter, selectedSubjectId, typeFilter, searchQuery])

  // Type counts for current chapter
  const chapterSummary = useMemo(() => {
    if (!currentChapter) return { notes: 0, pdfs: 0, images: 0, links: 0, canvases: 0, total: 0 }
    const chapMats = materials.filter((m) => m.chapterId === currentChapter.id)
    return {
      notes: chapMats.filter((m) => m.type === "note").length,
      pdfs: chapMats.filter((m) => m.type === "pdf").length,
      images: chapMats.filter((m) => m.type === "image").length,
      links: chapMats.filter((m) => m.type === "link").length,
      canvases: chapMats.filter((m) => m.type === "canvas").length,
      total: chapMats.length,
    }
  }, [materials, currentChapter])

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-stone-900 dark:text-stone-100 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              Notes & Study Materials
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-mono px-2.5 py-0.5 font-medium">
              Academic Library
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Organize all notes, PDFs, diagrams, and canvases by Subject and Chapter.
          </p>
        </div>

        {/* View toggles & Add Action */}
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewTab("chapter")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                viewTab === "chapter"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                  : "text-stone-500 hover:text-stone-900"
              )}
            >
              Chapters
            </button>
            <button
              type="button"
              onClick={() => setViewTab("favorites")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                viewTab === "favorites"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                  : "text-stone-500 hover:text-stone-900"
              )}
            >
              ★ Favorites
            </button>
            <button
              type="button"
              onClick={() => setViewTab("recent")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                viewTab === "recent"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                  : "text-stone-500 hover:text-stone-900"
              )}
            >
              Recent
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-2xs transition-colors"
          >
            <Plus size={14} weight="bold" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar navigation + Content Area ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Subject & Chapter Navigator (Only in "chapter" view) */}
        {viewTab === "chapter" && (
          <aside className="space-y-4">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block px-1">
                Subject
              </label>
              <div className="space-y-1">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(s.id)
                      const firstChap = chapters.find((c) => c.subjectId === s.id)
                      setSelectedChapterId(firstChap?.id || null)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between",
                      selectedSubjectId === s.id
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs font-semibold"
                        : "bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    )}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">
                      {chapters.filter((c) => c.subjectId === s.id).length} ch
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chapters Selector for Selected Subject */}
            <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block px-1">
                Chapters
              </label>

              {subjectChapters.length === 0 ? (
                <p className="text-xs text-stone-400 p-2 italic">
                  No chapters yet. Add chapters in Syllabus.
                </p>
              ) : (
                <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  {subjectChapters.map((c, i) => {
                    const isSelected = currentChapter?.id === c.id
                    const matCount = materials.filter((m) => m.chapterId === c.id).length

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedChapterId(c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-semibold"
                            : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                        )}
                      >
                        <span className="truncate pr-2">
                          <strong className="font-mono text-[10px] opacity-60 mr-1.5">
                            {String(i + 1).padStart(2, "0")}
                          </strong>
                          {c.name}
                        </span>
                        {matCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500">
                            {matCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Right / Main Column: Materials List */}
        <div className={cn(viewTab === "chapter" ? "md:col-span-3" : "md:col-span-4", "space-y-4")}>
          {/* Header Card for Chapter */}
          {viewTab === "chapter" && currentChapter && currentSubject && (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-stone-500">
                    <span>{currentSubject.name}</span>
                    <span>→</span>
                    <span>Chapter</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    {currentChapter.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNoteForEdit({
                        id: "",
                        subjectId: currentSubject.id,
                        subjectName: currentSubject.name,
                        chapterId: currentChapter.id,
                        chapterName: currentChapter.name,
                        type: "note",
                        title: "",
                        content: "",
                        favorite: false,
                        pinned: false,
                        createdAt: "",
                        updatedAt: "",
                      })
                      setNoteEditorOpen(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-xs font-medium transition-colors"
                  >
                    <FileText size={14} />
                    <span>Create Note</span>
                  </button>
                </div>
              </div>

              {/* Factual Material Summary pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] font-mono text-stone-500">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {chapterSummary.total} Total Materials:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                  {chapterSummary.notes} Notes
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                  {chapterSummary.pdfs} PDFs
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                  {chapterSummary.images} Images
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                  {chapterSummary.canvases} Canvases
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
                  {chapterSummary.links} Links
                </span>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search notes, PDFs, diagrams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
              {["All", "Note", "PDF", "Image", "Canvas", "Link"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg border transition-colors",
                    typeFilter === t
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold border-transparent"
                      : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Grid / List */}
          {displayedMaterials.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-500 space-y-3">
              <FolderOpen size={36} className="mx-auto text-stone-300 dark:text-stone-700" />
              <div>
                <p className="text-sm font-medium">Nothing saved for this chapter yet.</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Upload textbook PDFs, lecture notes, formula sheets, or study canvases.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Plus size={14} weight="bold" />
                <span>Add Material</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {displayedMaterials.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  onOpen={() => {
                    recordMaterialOpened(mat.id)
                    if (mat.type === "note") {
                      setActiveNoteForEdit(mat)
                      setNoteEditorOpen(true)
                    } else if (mat.type === "canvas") {
                      window.location.href = "/"
                    } else if (mat.externalUrl) {
                      window.open(mat.externalUrl, "_blank", "noopener,noreferrer")
                    } else {
                      setPreviewMaterial(mat)
                    }
                  }}
                  onToggleFavorite={() => toggleFavoriteMaterial(mat.id)}
                  onTogglePin={() => togglePinMaterial(mat.id)}
                  onMove={() => {
                    setSelectedMaterialForMove(mat)
                    setMoveModalOpen(true)
                  }}
                  onDelete={() => {
                    if (window.confirm(`Delete material "${mat.title}"?`)) {
                      deleteMaterial(mat.id)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Add Material Dialog ── */}
      {addModalOpen && (
        <AddMaterialModal
          defaultSubjectId={selectedSubjectId}
          defaultChapterId={selectedChapterId || undefined}
          subjects={subjects}
          chapters={chapters}
          onClose={() => setAddModalOpen(false)}
          onAddNote={() => {
            setAddModalOpen(false)
            setActiveNoteForEdit({
              id: "",
              subjectId: selectedSubjectId,
              subjectName: currentSubject?.name || "",
              chapterId: selectedChapterId || "",
              chapterName: currentChapter?.name || "",
              type: "note",
              title: "",
              content: "",
              favorite: false,
              pinned: false,
              createdAt: "",
              updatedAt: "",
            })
            setNoteEditorOpen(true)
          }}
          onSaveMaterial={(data) => {
            addMaterial(data)
            setAddModalOpen(false)
          }}
        />
      )}

      {/* ── Modal: Note Editor (In-app text note with autosave) ── */}
      {noteEditorOpen && activeNoteForEdit && (
        <NoteEditorModal
          note={activeNoteForEdit}
          onClose={() => {
            setNoteEditorOpen(false)
            setActiveNoteForEdit(null)
          }}
          onSave={(title, content) => {
            if (activeNoteForEdit.id) {
              updateMaterial(activeNoteForEdit.id, { title, content })
            } else {
              addMaterial({
                ...activeNoteForEdit,
                title,
                content,
              })
            }
          }}
        />
      )}

      {/* ── Modal: Preview Material (PDF/Image) ── */}
      {previewMaterial && (
        <MaterialPreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {/* ── Modal: Move Material to another Subject / Chapter ── */}
      {moveModalOpen && selectedMaterialForMove && (
        <MoveMaterialModal
          material={selectedMaterialForMove}
          subjects={subjects}
          chapters={chapters}
          onClose={() => {
            setMoveModalOpen(false)
            setSelectedMaterialForMove(null)
          }}
          onConfirm={(newSubjectId, newChapterId) => {
            moveMaterial(selectedMaterialForMove.id, newSubjectId, newChapterId)
            setMoveModalOpen(false)
            setSelectedMaterialForMove(null)
          }}
        />
      )}
    </div>
  )
}

// ── Card Component for a Study Material ───────────────────────────────────────

function MaterialCard({
  material,
  onOpen,
  onToggleFavorite,
  onTogglePin,
  onMove,
  onDelete,
}: {
  material: StudyMaterial
  onOpen: () => void
  onToggleFavorite: () => void
  onTogglePin: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const getTypeIcon = () => {
    switch (material.type) {
      case "note":
        return <FileText size={18} className="text-blue-600" />
      case "pdf":
        return <FilePdf size={18} className="text-red-600" />
      case "image":
        return <Image size={18} className="text-emerald-600" />
      case "canvas":
        return <PencilRuler size={18} className="text-purple-600" />
      case "link":
        return <LinkSimple size={18} className="text-amber-600" />
      default:
        return <File size={18} className="text-stone-600" />
    }
  }

  return (
    <div
      onClick={onOpen}
      className={cn(
        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group",
        "bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 shadow-2xs hover:border-blue-400 hover:shadow-xs",
        material.pinned && "ring-1 ring-blue-500/40 bg-blue-50/10 dark:bg-blue-950/10"
      )}
    >
      <div>
        {/* Top meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {getTypeIcon()}
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
              {material.type}
            </span>
            {material.fileSize && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-[10px] font-mono text-stone-400">{material.fileSize}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {material.pinned && (
              <span title="Pinned to top">
                <PushPin size={13} weight="fill" className="text-blue-600" />
              </span>
            )}
            <button
              type="button"
              onClick={onToggleFavorite}
              className="p-1 rounded text-stone-300 hover:text-amber-500"
              title="Favorite"
            >
              <Star
                size={14}
                weight={material.favorite ? "fill" : "regular"}
                className={material.favorite ? "text-amber-500" : ""}
              />
            </button>

            {/* Menu trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <DotsThreeVertical size={16} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-6 z-20 w-36 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-lg py-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onTogglePin()
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                  >
                    {material.pinned ? "Unpin" : "Pin to top"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onMove()
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                  >
                    Move to chapter…
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 mt-2 line-clamp-2">
          {material.title}
        </h3>

        {material.description && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
            {material.description}
          </p>
        )}
      </div>

      {/* Bottom meta row */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] font-mono text-stone-400">
        <span className="truncate max-w-[160px]">
          {material.chapterName || material.subjectName}
        </span>
        <span className="text-blue-600 group-hover:underline flex items-center gap-1 font-medium">
          <span>Open</span>
          <ArrowRight size={11} />
        </span>
      </div>
    </div>
  )
}

// ── Modal: Add Material ───────────────────────────────────────────────────────

function AddMaterialModal({
  defaultSubjectId,
  defaultChapterId,
  subjects,
  chapters,
  onClose,
  onAddNote,
  onSaveMaterial,
}: {
  defaultSubjectId: string
  defaultChapterId?: string
  subjects: Array<{ id: string; name: string }>
  chapters: Array<{ id: string; subjectId: string; name: string }>
  onClose: () => void
  onAddNote: () => void
  onSaveMaterial: (data: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt" | "favorite" | "pinned">) => void
}) {
  const [selectedType, setSelectedType] = useState<MaterialType>("pdf")
  const [subjectId, setSubjectId] = useState(defaultSubjectId || subjects[0]?.id || "")
  const [chapterId, setChapterId] = useState(defaultChapterId || "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableChapters = chapters.filter((c) => c.subjectId === subjectId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const sub = subjects.find((s) => s.id === subjectId)
    const chap = chapters.find((c) => c.id === chapterId)

    onSaveMaterial({
      subjectId,
      subjectName: sub?.name || "Subject",
      chapterId,
      chapterName: chap?.name || "Chapter",
      type: selectedType,
      title: title.trim(),
      description: description.trim() || undefined,
      externalUrl: externalUrl.trim() || undefined,
      fileSize: selectedType === "pdf" ? "3.2 MB" : selectedType === "image" ? "1.5 MB" : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
            Add Study Material
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Material Type Chooser */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1.5">
              What would you like to add?
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(
                [
                  { type: "note", label: "Note", icon: FileText },
                  { type: "pdf", label: "PDF", icon: FilePdf },
                  { type: "image", label: "Image", icon: Image },
                  { type: "document", label: "Doc", icon: File },
                  { type: "link", label: "Link", icon: LinkSimple },
                  { type: "canvas", label: "Canvas", icon: PencilRuler },
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (type === "note") {
                      onAddNote()
                    } else {
                      setSelectedType(type as MaterialType)
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all",
                    selectedType === type
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                      : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
                  )}
                >
                  <Icon size={18} />
                  <span className="text-[11px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Chapter Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  const fChap = chapters.find((c) => c.subjectId === e.target.value)
                  setChapterId(fChap?.id || "")
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Chapter
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="">-- No Chapter --</option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. NCERT Chapter Notes, Formula Summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          {/* Conditional field for Link */}
          {selectedType === "link" && (
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                URL / Web Address *
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          )}

          {/* Conditional upload for PDF / Image / Document */}
          {(selectedType === "pdf" || selectedType === "image" || selectedType === "document") && (
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Choose File or Drag & Drop
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && !title) {
                    setTitle(f.name.replace(/\.[^/.]+$/, ""))
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief summary or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
            >
              Add Material
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: In-App Note Editor with Autosave ───────────────────────────────────

function NoteEditorModal({
  note,
  onClose,
  onSave,
}: {
  note: StudyMaterial
  onClose: () => void
  onSave: (title: string, content: string) => void
}) {
  const [title, setTitle] = useState(note.title || "Untitled Note")
  const [content, setContent] = useState(note.content || "")
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving...">("Saved")

  const handleContentChange = (newVal: string) => {
    setContent(newVal)
    setSaveStatus("Saving...")
    // Debounced autosave
    onSave(title, newVal)
    setTimeout(() => setSaveStatus("Saved"), 400)
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setSaveStatus("Saving...")
    onSave(newTitle, content)
    setTimeout(() => setSaveStatus("Saved"), 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-3xl h-[650px] max-h-[90vh] rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note Title"
              className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 bg-transparent outline-none border-b border-transparent hover:border-stone-300 focus:border-blue-500 px-1 py-0.5"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-stone-400">{saveStatus}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 p-6 flex flex-col">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Type your notes, formulas, theorems, and summaries here..."
            className="flex-1 w-full p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 text-stone-800 dark:text-stone-200 font-mono text-xs leading-relaxed outline-none resize-none focus:border-blue-500"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>{note.chapterName ? `${note.subjectName} • ${note.chapterName}` : "General Note"}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs dark:bg-stone-100 dark:text-stone-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Material Preview ───────────────────────────────────────────────────

function MaterialPreviewModal({
  material,
  onClose,
}: {
  material: StudyMaterial
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              {material.title}
            </h3>
            <span className="text-xs font-mono text-stone-400">
              {material.subjectName} • {material.chapterName}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        <div className="p-8 text-center rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3">
          {material.type === "image" ? (
            <Image size={48} className="mx-auto text-emerald-600" />
          ) : (
            <FilePdf size={48} className="mx-auto text-red-600" />
          )}
          <div>
            <p className="text-sm font-semibold">{material.title}</p>
            <p className="text-xs text-stone-500 mt-1">{material.description || "Study document preview"}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              alert(`Downloading ${material.title}`)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
          >
            <DownloadSimple size={14} />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Move Material to another Chapter ───────────────────────────────────

function MoveMaterialModal({
  material,
  subjects,
  chapters,
  onClose,
  onConfirm,
}: {
  material: StudyMaterial
  subjects: Array<{ id: string; name: string }>
  chapters: Array<{ id: string; subjectId: string; name: string }>
  onClose: () => void
  onConfirm: (subId: string, chapId: string) => void
}) {
  const [subId, setSubId] = useState(material.subjectId)
  const [chapId, setChapId] = useState(material.chapterId)

  const availableChapters = chapters.filter((c) => c.subjectId === subId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl p-5 space-y-4 text-xs font-sans">
        <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
          Move Material
        </h3>
        <p className="text-stone-500">
          Move <strong>{material.title}</strong> to a different chapter:
        </p>

        <div>
          <label className="block font-medium mb-1">Subject</label>
          <select
            value={subId}
            onChange={(e) => {
              setSubId(e.target.value)
              const first = chapters.find((c) => c.subjectId === e.target.value)
              setChapId(first?.id || "")
            }}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Chapter</label>
          <select
            value={chapId}
            onChange={(e) => setChapId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
          >
            {availableChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl border">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(subId, chapId)}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}
