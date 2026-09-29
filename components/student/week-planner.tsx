"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Manual Week Planner
//
// Shared state with Calendar: activities & chapter completion goals.
// Shows weekly target hours vs planned vs completed.
// Manual student-controlled scheduling (no AI, no automatic allocation).
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import {
  useStudentStore,
  type CalendarActivity,
  type ChapterCompletionGoal,
} from "@/lib/academic/student-store"
import {
  CaretLeft,
  CaretRight,
  Plus,
  CheckCircle,
  Circle,
  Clock,
  Trash,
  PencilSimple,
  Copy,
  CalendarCheck,
  Check,
  Target,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const FULL_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function WeekPlanner({
  onOpenCalendarDay,
}: {
  onOpenCalendarDay?: (dateStr: string) => void
}) {
  const activities = useStudentStore((s) => s.activities)
  const goals = useStudentStore((s) => s.goals)
  const subjects = useStudentStore((s) => s.subjects)
  const chapters = useStudentStore((s) => s.chapters)

  const weeklyTargetHours = useStudentStore((s) => s.weeklyTargetHours)
  const setWeeklyTargetHours = useStudentStore((s) => s.setWeeklyTargetHours)
  const addActivity = useStudentStore((s) => s.addActivity)
  const toggleActivityComplete = useStudentStore((s) => s.toggleActivityComplete)
  const deleteActivity = useStudentStore((s) => s.deleteActivity)
  const duplicateActivity = useStudentStore((s) => s.duplicateActivity)
  const setSelectedDate = useStudentStore((s) => s.setSelectedDate)
  const setCalendarView = useStudentStore((s) => s.setCalendarView)

  // Current Week pivot
  const [pivotDate, setPivotDate] = useState(() => new Date())
  const [editingTargetHours, setEditingTargetHours] = useState(false)
  const [targetDraft, setTargetDraft] = useState(weeklyTargetHours.toString())

  // Quick activity modal on specific day
  const [quickDayAdd, setQuickDayAdd] = useState<string | null>(null)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickSubjectId, setQuickSubjectId] = useState(subjects[0]?.id || "")
  const [quickChapterId, setQuickChapterId] = useState("")
  const [quickDuration, setQuickDuration] = useState("60")

  const todayStr = useMemo(() => formatDate(new Date()), [])

  // Calculate 7 days of the week starting Monday
  const weekDays = useMemo(() => {
    const cur = new Date(pivotDate)
    let dayOfWeek = cur.getDay() - 1
    if (dayOfWeek === -1) dayOfWeek = 6

    const monday = new Date(cur)
    monday.setDate(cur.getDate() - dayOfWeek)

    const list: Array<{ dateStr: string; dayShort: string; dayFull: string; dayNum: number }> = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      list.push({
        dateStr: formatDate(d),
        dayShort: WEEKDAYS[i],
        dayFull: FULL_WEEKDAYS[i],
        dayNum: d.getDate(),
      })
    }
    return list
  }, [pivotDate])

  const weekDateSet = useMemo(() => new Set(weekDays.map((w) => w.dateStr)), [weekDays])

  // Week statistics: planned vs completed hours
  const weekStats = useMemo(() => {
    const weekActivities = activities.filter((a) => weekDateSet.has(a.date))
    const plannedMins = weekActivities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
    const completedMins = weekActivities
      .filter((a) => a.status === "completed")
      .reduce((acc, a) => acc + (a.durationMinutes || 0), 0)

    const plannedHours = Math.round((plannedMins / 60) * 10) / 10
    const completedHours = Math.round((completedMins / 60) * 10) / 10

    return {
      plannedHours,
      completedHours,
      count: weekActivities.length,
    }
  }, [activities, weekDateSet])

  // Week range label (e.g. "Sep 28 – Oct 4, 2026")
  const weekLabel = useMemo(() => {
    if (weekDays.length < 7) return ""
    const startD = parseDate(weekDays[0].dateStr)
    const endD = parseDate(weekDays[6].dateStr)

    const startMonth = startD.toLocaleString("default", { month: "short" })
    const endMonth = endD.toLocaleString("default", { month: "short" })

    if (startMonth === endMonth) {
      return `${startMonth} ${startD.getDate()} – ${endD.getDate()}, ${endD.getFullYear()}`
    }
    return `${startMonth} ${startD.getDate()} – ${endMonth} ${endD.getDate()}, ${endD.getFullYear()}`
  }, [weekDays])

  const prevWeek = () => {
    const d = new Date(pivotDate)
    d.setDate(d.getDate() - 7)
    setPivotDate(d)
  }

  const nextWeek = () => {
    const d = new Date(pivotDate)
    d.setDate(d.getDate() + 7)
    setPivotDate(d)
  }

  const jumpToThisWeek = () => {
    setPivotDate(new Date())
  }

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickDayAdd || !quickTitle.trim()) return

    const sub = subjects.find((s) => s.id === quickSubjectId)
    const chap = chapters.find((c) => c.id === quickChapterId)

    addActivity({
      title: quickTitle.trim(),
      type: "Study",
      subjectId: sub?.id,
      subjectName: sub?.name,
      chapterId: chap?.id,
      chapterName: chap?.name,
      date: quickDayAdd,
      durationMinutes: Number(quickDuration) || 60,
      status: "pending",
      priority: "Medium",
    })

    setQuickTitle("")
    setQuickDayAdd(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-stone-900 dark:text-stone-100 font-sans">
      {/* ── Top Header & Weekly Allocation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Study Timetable & Week Planner
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Manual week planning: decide which days and subjects you want to study.
          </p>
        </div>

        {/* Navigation & Target Hours info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-mono">
            <Target size={14} className="text-blue-600" />
            <span className="text-stone-500">Target:</span>
            {editingTargetHours ? (
              <input
                type="number"
                min="1"
                max="100"
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                onBlur={() => {
                  setWeeklyTargetHours(Number(targetDraft) || 28)
                  setEditingTargetHours(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setWeeklyTargetHours(Number(targetDraft) || 28)
                    setEditingTargetHours(false)
                  }
                }}
                className="w-12 px-1 py-0.5 border-b border-blue-500 outline-none text-center bg-transparent"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTargetHours(true)}
                className="font-bold text-stone-900 dark:text-stone-100 hover:underline"
                title="Click to edit weekly target hours"
              >
                {weeklyTargetHours}h
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevWeek}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-700"
              title="Previous week"
            >
              <CaretLeft size={14} />
            </button>
            <button
              type="button"
              onClick={jumpToThisWeek}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono font-medium hover:bg-stone-100"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={nextWeek}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-700"
              title="Next week"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Card: Target vs Planned vs Completed ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <span className="text-[11px] font-mono text-stone-500 block">Weekly Range</span>
          <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
            {weekLabel}
          </div>
          <span className="text-[10px] text-stone-400 font-mono">7 days planned</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <span className="text-[11px] font-mono text-stone-500 block">Target Hours</span>
          <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
            {weeklyTargetHours}h
          </div>
          <span className="text-[10px] text-stone-400">Descriptive goal</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <span className="text-[11px] font-mono text-stone-500 block">Planned Hours</span>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {weekStats.plannedHours}h
          </div>
          <span className="text-[10px] text-stone-400 font-mono">{weekStats.count} activities</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <span className="text-[11px] font-mono text-stone-500 block">Completed Hours</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {weekStats.completedHours}h
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            {weekStats.plannedHours > 0
              ? `${Math.round((weekStats.completedHours / weekStats.plannedHours) * 100)}% of planned`
              : "0%"}
          </span>
        </div>
      </div>

      {/* ── 7-Day Week Columns Grid ── */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs overflow-x-auto">
        <div className="min-w-[820px] grid grid-cols-7 divide-x divide-stone-200/80 dark:divide-stone-800">
          {weekDays.map((col) => {
            const isToday = col.dateStr === todayStr
            const colActivities = activities.filter((a) => a.date === col.dateStr)
            const colGoals = goals.filter((g) => g.targetDate === col.dateStr && g.status !== "cancelled")
            const colPlannedMinutes = colActivities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)

            return (
              <div
                key={col.dateStr}
                className={cn(
                  "flex flex-col min-h-[500px] p-3 transition-colors",
                  isToday ? "bg-blue-50/20 dark:bg-blue-950/20" : "bg-white dark:bg-stone-900"
                )}
              >
                {/* Column Day Header */}
                <div className="text-center pb-3 border-b border-stone-200/70 dark:border-stone-800">
                  <span className="text-xs font-mono uppercase text-stone-500 block">
                    {col.dayShort}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center size-7 rounded-full text-sm font-mono mt-0.5 font-semibold",
                      isToday ? "bg-blue-600 text-white" : "text-stone-800 dark:text-stone-200"
                    )}
                  >
                    {col.dayNum}
                  </span>
                  <div className="text-[10px] font-mono text-stone-400 mt-1">
                    {Math.round((colPlannedMinutes / 60) * 10) / 10}h planned
                  </div>
                </div>

                {/* All-Day Chapter Goals row */}
                {colGoals.length > 0 && (
                  <div className="py-2 space-y-1.5 border-b border-stone-100 dark:border-stone-800">
                    {colGoals.map((g) => (
                      <div
                        key={g.id}
                        className={cn(
                          "p-2 rounded-xl border text-xs leading-snug",
                          g.status === "completed"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-900 dark:text-emerald-300"
                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-950 dark:text-amber-200"
                        )}
                      >
                        <div className="flex items-center gap-1 font-semibold text-[10px] uppercase">
                          <span>◆</span>
                          <span>Milestone</span>
                        </div>
                        <p className="font-semibold truncate text-[11px] mt-0.5">{g.chapterName}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scheduled Activities list */}
                <div className="flex-1 py-2 space-y-2 overflow-y-auto">
                  {colActivities.map((act) => (
                    <div
                      key={act.id}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between group",
                        act.status === "completed"
                          ? "bg-stone-50 dark:bg-stone-800/40 border-stone-200/60 text-stone-400"
                          : "bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs hover:border-blue-400"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1">
                          <span>{act.startTime || "Anytime"}</span>
                          <button
                            type="button"
                            onClick={() => toggleActivityComplete(act.id)}
                            className="text-stone-400 hover:text-emerald-600"
                            title="Toggle complete"
                          >
                            {act.status === "completed" ? (
                              <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                            ) : (
                              <Circle size={14} />
                            )}
                          </button>
                        </div>

                        <p
                          className={cn(
                            "font-medium leading-tight",
                            act.status === "completed" && "line-through text-stone-400"
                          )}
                        >
                          {act.title}
                        </p>

                        {act.subjectName && (
                          <p className="text-[10px] text-stone-400 mt-1 truncate">
                            {act.subjectName}
                          </p>
                        )}
                      </div>

                      {/* Hover action row */}
                      <div className="flex items-center justify-end gap-1 pt-1.5 mt-1 border-t border-stone-100 dark:border-stone-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => deleteActivity(act.id)}
                          className="p-1 text-stone-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {colActivities.length === 0 && colGoals.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center p-2 text-stone-300 dark:text-stone-700 text-[11px]">
                      No plan set
                    </div>
                  )}
                </div>

                {/* + Add what I will do button */}
                <button
                  type="button"
                  onClick={() => setQuickDayAdd(col.dateStr)}
                  className="mt-2 w-full py-1.5 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  <span>+ Plan this day</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick Add Modal for Day Planning ── */}
      {quickDayAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl p-5 space-y-4 text-xs font-sans">
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              Plan Study for {quickDayAdd}
            </h3>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                  What will you study? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics — Solve 15 Quadratic Eq problems"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                    Subject
                  </label>
                  <select
                    value={quickSubjectId}
                    onChange={(e) => {
                      setQuickSubjectId(e.target.value)
                      setQuickChapterId("")
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
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={quickDuration}
                    onChange={(e) => setQuickDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setQuickDayAdd(null)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

