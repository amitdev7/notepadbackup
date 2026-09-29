"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Real Syllabus Management System
//
// User-controlled academic syllabus:
// - Student owns subjects & chapters structure (unlimited, custom)
// - Real chapter checkboxes: toggle completed status & record completion date
// - Real calculated progress (completed / total chapters)
// - Chapter completion goals ("Complete by") integration
// - Quick access to Notes & Materials per chapter
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import {
  useStudentStore,
  type StudentSubject,
  type StudentChapter,
  type SubjectPriority,
} from "@/lib/academic/student-store"
import {
  Plus,
  Books,
  CheckCircle,
  Circle,
  PencilSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  CalendarCheck,
  FolderSimple,
  Archive,
  MagnifyingGlass,
  Funnel,
  WarningCircle,
  CaretRight,
  ArrowLeft,
  X,
  Check,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function SyllabusManager({
  onNavigateToNotes,
}: {
  onNavigateToNotes?: (subjectId: string, chapterId: string) => void
}) {
  const subjects = useStudentStore((s) => s.subjects)
  const chapters = useStudentStore((s) => s.chapters)
  const goals = useStudentStore((s) => s.goals)

  const addSubject = useStudentStore((s) => s.addSubject)
  const updateSubject = useStudentStore((s) => s.updateSubject)
  const archiveSubject = useStudentStore((s) => s.archiveSubject)
  const deleteSubject = useStudentStore((s) => s.deleteSubject)
  const reorderSubjects = useStudentStore((s) => s.reorderSubjects)

  const addChapter = useStudentStore((s) => s.addChapter)
  const updateChapter = useStudentStore((s) => s.updateChapter)
  const toggleChapterComplete = useStudentStore((s) => s.toggleChapterComplete)
  const deleteChapter = useStudentStore((s) => s.deleteChapter)
  const reorderChapters = useStudentStore((s) => s.reorderChapters)
  const setChapterGoal = useStudentStore((s) => s.setChapterGoal)
  const updateChapterGoalDate = useStudentStore((s) => s.updateChapterGoalDate)
  const cancelChapterGoal = useStudentStore((s) => s.cancelChapterGoal)

  // Navigation: null = overview card list, string = specific subject selected
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"All" | "Incomplete" | "Completed" | "Overdue">("All")

  // Modals
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<StudentSubject | null>(null)
  const [addChapterModalOpen, setAddChapterModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<StudentChapter | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalTargetChapter, setGoalTargetChapter] = useState<StudentChapter | null>(null)

  // Active subjects (not archived)
  const activeSubjects = useMemo(() => {
    return subjects
      .filter((s) => !s.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [subjects])

  // Real Progress Calculations
  const stats = useMemo(() => {
    const totalSubjects = activeSubjects.length
    const activeSubIds = new Set(activeSubjects.map((s) => s.id))
    const relevantChapters = chapters.filter((c) => activeSubIds.has(c.subjectId))
    const totalChapters = relevantChapters.length
    const completedChapters = relevantChapters.filter((c) => c.status === "completed").length
    const remainingChapters = totalChapters - completedChapters
    const overallPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    const overdueGoalsCount = goals.filter((g) => g.status === "overdue").length

    return {
      totalSubjects,
      totalChapters,
      completedChapters,
      remainingChapters,
      overallPct,
      overdueGoalsCount,
    }
  }, [activeSubjects, chapters, goals])

  // Progress per subject helper
  const getSubjectStats = (subjectId: string) => {
    const subChapters = chapters.filter((c) => c.subjectId === subjectId)
    const total = subChapters.length
    const completed = subChapters.filter((c) => c.status === "completed").length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const nextIncomplete = subChapters.find((c) => c.status !== "completed")
    return { total, completed, remaining: total - completed, pct, nextIncomplete }
  }

  // Filtered Subject Cards for overview
  const filteredSubjects = useMemo(() => {
    let list = activeSubjects
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((s) => {
        const matchesName = s.name.toLowerCase().includes(q)
        const matchesChapter = chapters.some(
          (c) => c.subjectId === s.id && c.name.toLowerCase().includes(q)
        )
        return matchesName || matchesChapter
      })
    }
    return list
  }, [activeSubjects, searchQuery, chapters])

  // Active Subject Detail data
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId)
  const currentSubjectChapters = useMemo(() => {
    if (!selectedSubjectId) return []
    let list = chapters
      .filter((c) => c.subjectId === selectedSubjectId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }

    if (filterMode === "Incomplete") {
      list = list.filter((c) => c.status !== "completed")
    } else if (filterMode === "Completed") {
      list = list.filter((c) => c.status === "completed")
    } else if (filterMode === "Overdue") {
      const overdueChapIds = new Set(
        goals.filter((g) => g.status === "overdue").map((g) => g.chapterId)
      )
      list = list.filter((c) => overdueChapIds.has(c.id))
    }

    return list
  }, [chapters, selectedSubjectId, searchQuery, filterMode, goals])

  // Move subject reorder
  const handleMoveSubject = (id: string, dir: "up" | "down") => {
    const idx = activeSubjects.findIndex((s) => s.id === id)
    if (idx === -1) return
    const targetIdx = dir === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= activeSubjects.length) return

    const newOrder = [...activeSubjects]
    const temp = newOrder[idx]
    newOrder[idx] = newOrder[targetIdx]
    newOrder[targetIdx] = temp
    reorderSubjects(newOrder.map((s) => s.id))
  }

  // Move chapter reorder
  const handleMoveChapter = (chapterId: string, dir: "up" | "down") => {
    if (!selectedSubjectId) return
    const subChaps = chapters
      .filter((c) => c.subjectId === selectedSubjectId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = subChaps.findIndex((c) => c.id === chapterId)
    if (idx === -1) return
    const targetIdx = dir === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= subChaps.length) return

    const newOrder = [...subChaps]
    const temp = newOrder[idx]
    newOrder[idx] = newOrder[targetIdx]
    newOrder[targetIdx] = temp
    reorderChapters(selectedSubjectId, newOrder.map((c) => c.id))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-stone-900 dark:text-stone-100 font-sans">
      {/* ── View A: Subject Detail View ── */}
      {selectedSubjectId && currentSubject ? (
        <div className="space-y-5">
          {/* Back button & Subject Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedSubjectId(null)}
                className="flex items-center gap-1.5 text-xs font-mono text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-colors mb-1"
              >
                <ArrowLeft size={14} />
                <span>Back to All Subjects</span>
              </button>

              <div className="flex items-center gap-3">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  {currentSubject.name}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  {currentSubject.priority} priority
                </span>
              </div>
            </div>

            {/* Subject actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSubject(currentSubject)
                  setAddSubjectModalOpen(true)
                }}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Edit Subject
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingChapter(null)
                  setAddChapterModalOpen(true)
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-2xs"
              >
                <Plus size={14} weight="bold" />
                <span>Add Chapter</span>
              </button>
            </div>
          </div>

          {/* Subject Progress Bar Card */}
          {(() => {
            const sStats = getSubjectStats(currentSubject.id)
            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-stone-500">
                    Syllabus Completion
                  </span>
                  <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                    {sStats.completed} / {sStats.total} Chapters ({sStats.pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${sStats.pct}%` }}
                  />
                </div>
              </div>
            )
          })()}

          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs outline-none"
              />
            </div>

            <div className="flex p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 text-xs font-mono">
              {(["All", "Incomplete", "Completed", "Overdue"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-colors",
                    filterMode === mode
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-900"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Chapters List */}
          <div className="space-y-2">
            {currentSubjectChapters.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 space-y-2">
                <p className="text-sm font-medium">No chapters match your criteria.</p>
                <p className="text-xs text-stone-400">
                  Click <strong className="text-stone-700 dark:text-stone-300">Add Chapter</strong> to add topics to this syllabus.
                </p>
              </div>
            ) : (
              currentSubjectChapters.map((chap, idx) => {
                const isCompleted = chap.status === "completed"
                const chapGoal = goals.find((g) => g.chapterId === chap.id && g.status !== "cancelled")

                // Early/late badge calculation
                let goalBadge = null
                if (chapGoal) {
                  if (isCompleted && chapGoal.completedAt) {
                    const diff = Math.round(
                      (new Date(chapGoal.targetDate).getTime() - new Date(chapGoal.completedAt).getTime()) /
                        (1000 * 3600 * 24)
                    )
                    goalBadge = (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        {diff > 0
                          ? `✓ Completed ${diff}d early`
                          : diff === 0
                          ? "✓ Completed on target"
                          : `✓ Completed ${Math.abs(diff)}d late`}
                      </span>
                    )
                  } else if (chapGoal.status === "overdue") {
                    goalBadge = (
                      <span className="text-[11px] font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                        ⚠ Overdue (Target: {chapGoal.targetDate})
                      </span>
                    )
                  } else {
                    goalBadge = (
                      <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                        ◆ Target: {chapGoal.targetDate}
                      </span>
                    )
                  }
                }

                return (
                  <div
                    key={chap.id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      isCompleted
                        ? "bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800"
                        : "bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 shadow-2xs"
                    )}
                  >
                    {/* Left: Checkbox + Chapter Index + Name */}
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleChapterComplete(chap.id)}
                        className="mt-0.5 sm:mt-0 text-stone-400 hover:text-emerald-600 transition-colors"
                        title={isCompleted ? "Mark incomplete" : "Mark chapter complete"}
                      >
                        {isCompleted ? (
                          <CheckCircle size={22} weight="fill" className="text-emerald-600" />
                        ) : (
                          <Circle size={22} />
                        )}
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-400">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <h3
                            className={cn(
                              "text-sm font-semibold",
                              isCompleted
                                ? "text-stone-400 dark:text-stone-500 line-through"
                                : "text-stone-900 dark:text-stone-100"
                            )}
                          >
                            {chap.name}
                          </h3>
                          {goalBadge}
                        </div>
                        {chap.description && (
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {chap.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Set / Change Goal */}
                      <button
                        type="button"
                        onClick={() => {
                          setGoalTargetChapter(chap)
                          setGoalModalOpen(true)
                        }}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-mono text-stone-600 dark:text-stone-300 transition-colors"
                        title="Set target completion date"
                      >
                        {chapGoal ? "Change Goal" : "Set Goal"}
                      </button>

                      {/* Notes & Materials Link */}
                      {onNavigateToNotes && (
                        <button
                          type="button"
                          onClick={() => onNavigateToNotes(currentSubject.id, chap.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-mono transition-colors"
                          title="Open Notes & Materials for this chapter"
                        >
                          <FolderSimple size={13} />
                          <span>Notes</span>
                        </button>
                      )}

                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(chap.id, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(chap.id, "down")}
                        disabled={idx === currentSubjectChapters.length - 1}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* Edit Chapter */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingChapter(chap)
                          setAddChapterModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Edit chapter"
                      >
                        <PencilSimple size={14} />
                      </button>

                      {/* Delete Chapter */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete chapter "${chap.name}"?`)) {
                            deleteChapter(chap.id)
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Delete chapter"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* ── View B: Main Syllabus Overview (All Subjects) ── */
        <div className="space-y-6">
          {/* Header & Overall Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                Syllabus & Curriculum Manager
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Real progress calculated from your completed chapters.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingSubject(null)
                setAddSubjectModalOpen(true)
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-2xs self-start sm:self-auto"
            >
              <Plus size={14} weight="bold" />
              <span>Add Subject</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
              <span className="text-[11px] font-mono text-stone-500 block">Overall Completion</span>
              <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {stats.overallPct}%
              </div>
              <span className="text-[10px] text-stone-400">
                {stats.completedChapters} of {stats.totalChapters} chapters
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
              <span className="text-[11px] font-mono text-stone-500 block">Total Subjects</span>
              <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {stats.totalSubjects}
              </div>
              <span className="text-[10px] text-stone-400">Active curriculums</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
              <span className="text-[11px] font-mono text-stone-500 block">Remaining Chapters</span>
              <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {stats.remainingChapters}
              </div>
              <span className="text-[10px] text-stone-400">To be completed</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
              <span className="text-[11px] font-mono text-stone-500 block">Chapter Goals</span>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {goals.filter((g) => g.status !== "cancelled").length}
              </div>
              <span className="text-[10px] text-stone-400">
                {stats.overdueGoalsCount > 0 ? `${stats.overdueGoalsCount} overdue` : "All on schedule"}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search subjects or chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs outline-none"
            />
          </div>

          {/* Subject Cards Grid */}
          {filteredSubjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 space-y-2">
              <p className="text-base font-medium">Your syllabus is empty.</p>
              <p className="text-xs text-stone-400">
                Add your school or competitive examination subjects to start tracking chapters.
              </p>
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
              >
                + Add Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubjects.map((sub, idx) => {
                const sStats = getSubjectStats(sub.id)

                return (
                  <div
                    key={sub.id}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between space-y-4 hover:border-blue-400/70 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-50">
                            {sub.name}
                          </h3>
                          <span className="text-[11px] font-mono text-stone-400">
                            {sub.priority} priority • Target: {sub.targetPercentage || 80}%
                          </span>
                        </div>
                        <span className="text-base font-mono font-bold text-stone-900 dark:text-stone-100">
                          {sStats.pct}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1.5">
                        <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${sStats.pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-stone-500">
                          <span>{sStats.completed} / {sStats.total} chapters completed</span>
                          <span>{sStats.remaining} remaining</span>
                        </div>
                      </div>

                      {/* Next incomplete chapter info */}
                      {sStats.nextIncomplete && (
                        <div className="mt-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-xs">
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                            Next Incomplete
                          </span>
                          <span className="font-medium text-stone-800 dark:text-stone-200">
                            {sStats.nextIncomplete.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom action row */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveSubject(sub.id, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSubject(sub.id, "down")}
                          disabled={idx === filteredSubjects.length - 1}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete subject "${sub.name}" and all its chapters?`)) {
                              deleteSubject(sub.id)
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-red-600 rounded"
                          title="Delete subject"
                        >
                          <Trash size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-xs font-mono font-medium transition-colors"
                      >
                        <span>Open Syllabus</span>
                        <CaretRight size={13} weight="bold" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Add / Edit Subject ── */}
      {addSubjectModalOpen && (
        <SubjectModal
          editingSubject={editingSubject}
          onClose={() => {
            setAddSubjectModalOpen(false)
            setEditingSubject(null)
          }}
          onSave={(name, shortName, priority, targetPercentage) => {
            if (editingSubject) {
              updateSubject(editingSubject.id, { name, shortName, priority, targetPercentage })
            } else {
              addSubject(name, shortName, priority, targetPercentage)
            }
            setAddSubjectModalOpen(false)
            setEditingSubject(null)
          }}
        />
      )}

      {/* ── Modal: Add / Edit Chapter ── */}
      {addChapterModalOpen && selectedSubjectId && (
        <ChapterModal
          editingChapter={editingChapter}
          onClose={() => {
            setAddChapterModalOpen(false)
            setEditingChapter(null)
          }}
          onSave={(name, description, targetDate) => {
            if (editingChapter) {
              updateChapter(editingChapter.id, { name, description })
              if (targetDate) {
                setChapterGoal(selectedSubjectId, editingChapter.id, targetDate)
              }
            } else {
              addChapter(selectedSubjectId, name, description, targetDate)
            }
            setAddChapterModalOpen(false)
            setEditingChapter(null)
          }}
        />
      )}

      {/* ── Modal: Set Goal for Chapter ── */}
      {goalModalOpen && goalTargetChapter && selectedSubjectId && (
        <SetChapterGoalDirectModal
          chapterName={goalTargetChapter.name}
          initialDate={
            goals.find((g) => g.chapterId === goalTargetChapter.id)?.targetDate ||
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
          }
          onClose={() => {
            setGoalModalOpen(false)
            setGoalTargetChapter(null)
          }}
          onSave={(date, notes) => {
            setChapterGoal(selectedSubjectId, goalTargetChapter.id, date, notes)
            setGoalModalOpen(false)
            setGoalTargetChapter(null)
          }}
        />
      )}
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function SubjectModal({
  editingSubject,
  onClose,
  onSave,
}: {
  editingSubject: StudentSubject | null
  onClose: () => void
  onSave: (name: string, shortName: string, priority: SubjectPriority, targetPercentage: number) => void
}) {
  const [name, setName] = useState(editingSubject?.name || "")
  const [shortName, setShortName] = useState(editingSubject?.shortName || "")
  const [priority, setPriority] = useState<SubjectPriority>(editingSubject?.priority || "medium")
  const [targetPercentage, setTargetPercentage] = useState(editingSubject?.targetPercentage?.toString() || "85")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim(), shortName.trim(), priority, Number(targetPercentage) || 80)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
            {editingSubject ? "Edit Subject" : "Add Subject"}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mathematics, Organic Chemistry, Economics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Short Name
              </label>
              <input
                type="text"
                placeholder="e.g. Maths, Chem"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SubjectPriority)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Target Completion (%)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
            >
              Save Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ChapterModal({
  editingChapter,
  onClose,
  onSave,
}: {
  editingChapter: StudentChapter | null
  onClose: () => void
  onSave: (name: string, description?: string, targetDate?: string) => void
}) {
  const [name, setName] = useState(editingChapter?.name || "")
  const [description, setDescription] = useState(editingChapter?.description || "")
  const [targetDate, setTargetDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim(), description.trim() || undefined, targetDate || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
            {editingChapter ? "Edit Chapter" : "Add Chapter"}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Chapter Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quadratic Equations, Life Processes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Roots, Discriminant, Word Problems"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Target Completion Date (Optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
            >
              Save Chapter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SetChapterGoalDirectModal({
  chapterName,
  initialDate,
  onClose,
  onSave,
}: {
  chapterName: string
  initialDate: string
  onClose: () => void
  onSave: (date: string, notes?: string) => void
}) {
  const [date, setDate] = useState(initialDate)
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    onSave(date, notes.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 space-y-4 text-xs font-sans">
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span className="text-amber-500">◆</span>
            <span>Set Completion Goal</span>
          </h3>
          <p className="text-stone-600 dark:text-stone-400">
            Chapter: <strong className="text-stone-900 dark:text-stone-100">{chapterName}</strong>
          </p>
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Complete by date:
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Target note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Finish textbook exercises + exemplar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
              Cancel
            </button>
            <button type="submit" onClick={handleSubmit} className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium">
              Save Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
