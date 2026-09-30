"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Calendar & Scheduling System
//
// Manual student-controlled scheduling system:
// - Month, Week, Day calendar views
// - Study activities (time-based) & Chapter completion goals (deadline-based)
// - Shared state via useStudentStore
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import {
  useStudentStore,
  type CalendarActivity,
  type ChapterCompletionGoal,
  type ActivityType,
  type ActivityPriority,
} from "@/lib/academic/student-store"
import {
  CaretLeft,
  CaretRight,
  Plus,
  CheckCircle,
  Circle,
  Flag,
  CalendarCheck,
  Clock,
  Trash,
  PencilSimple,
  Copy,
  ArrowRight,
  WarningCircle,
  Check,
  X,
  Funnel,
  Sparkle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const ACTIVITY_TYPES: ActivityType[] = [
  "Study",
  "Revision",
  "Practice",
  "Homework",
  "Assignment",
  "Exam",
  "Mock Test",
  "Reading",
  "Personal",
  "Other",
]

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const FULL_WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDateStr(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function CalendarView() {
  const selectedDate = useStudentStore((s) => s.selectedDate)
  const setSelectedDate = useStudentStore((s) => s.setSelectedDate)
  const calendarView = useStudentStore((s) => s.calendarView)
  const setCalendarView = useStudentStore((s) => s.setCalendarView)

  const activities = useStudentStore((s) => s.activities)
  const goals = useStudentStore((s) => s.goals)
  const subjects = useStudentStore((s) => s.subjects)
  const chapters = useStudentStore((s) => s.chapters)

  const addActivity = useStudentStore((s) => s.addActivity)
  const updateActivity = useStudentStore((s) => s.updateActivity)
  const toggleActivityComplete = useStudentStore((s) => s.toggleActivityComplete)
  const deleteActivity = useStudentStore((s) => s.deleteActivity)
  const duplicateActivity = useStudentStore((s) => s.duplicateActivity)
  const setChapterGoal = useStudentStore((s) => s.setChapterGoal)
  const updateChapterGoalDate = useStudentStore((s) => s.updateChapterGoalDate)
  const cancelChapterGoal = useStudentStore((s) => s.cancelChapterGoal)
  const toggleChapterComplete = useStudentStore((s) => s.toggleChapterComplete)

  // Sub-view: calendar vs goals list
  const [activeSubTab, setActiveSubTab] = useState<"calendar" | "goals">("calendar")
  const [typeFilter, setTypeFilter] = useState<string>("All")

  // Modals state
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<CalendarActivity | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [changeGoalModalOpen, setChangeGoalModalOpen] = useState(false)
  const [selectedGoalForChange, setSelectedGoalForChange] = useState<ChapterCompletionGoal | null>(null)

  // Current calendar pivot date
  const [pivotDate, setPivotDate] = useState(() => parseDateStr(selectedDate))

  const todayStr = useMemo(() => formatDateStr(new Date()), [])

  // Month navigation
  const prevPeriod = () => {
    if (calendarView === "month") {
      setPivotDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() - 1, 1))
    } else if (calendarView === "week") {
      const d = new Date(pivotDate)
      d.setDate(d.getDate() - 7)
      setPivotDate(d)
    } else {
      const d = new Date(pivotDate)
      d.setDate(d.getDate() - 1)
      setPivotDate(d)
      setSelectedDate(formatDateStr(d))
    }
  }

  const nextPeriod = () => {
    if (calendarView === "month") {
      setPivotDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() + 1, 1))
    } else if (calendarView === "week") {
      const d = new Date(pivotDate)
      d.setDate(d.getDate() + 7)
      setPivotDate(d)
    } else {
      const d = new Date(pivotDate)
      d.setDate(d.getDate() + 1)
      setPivotDate(d)
      setSelectedDate(formatDateStr(d))
    }
  }

  const jumpToToday = () => {
    const now = new Date()
    setPivotDate(now)
    setSelectedDate(formatDateStr(now))
  }

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (typeFilter === "All") return activities
    if (typeFilter === "Chapter Goals") return []
    return activities.filter((a) => a.type === typeFilter)
  }, [activities, typeFilter])

  // Month Grid Calculation (Monday as first day of week)
  const monthDays = useMemo(() => {
    const year = pivotDate.getFullYear()
    const month = pivotDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i)
      days.push({ dateStr: formatDateStr(d), dayNum: prevMonthLastDay - i, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      days.push({ dateStr: formatDateStr(d), dayNum: i, isCurrentMonth: true })
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ dateStr: formatDateStr(d), dayNum: i, isCurrentMonth: false })
    }

    return days
  }, [pivotDate])

  // Week Days Calculation
  const weekDays = useMemo(() => {
    const cur = new Date(pivotDate)
    let dayOfWeek = cur.getDay() - 1
    if (dayOfWeek === -1) dayOfWeek = 6

    const monday = new Date(cur)
    monday.setDate(cur.getDate() - dayOfWeek)

    const list: Array<{ dateStr: string; dayName: string; dayNum: number }> = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      list.push({
        dateStr: formatDateStr(d),
        dayName: WEEKDAY_NAMES[i],
        dayNum: d.getDate(),
      })
    }
    return list
  }, [pivotDate])

  // Day view summary data
  const selectedDateActivities = useMemo(() => {
    return filteredActivities.filter((a) => a.date === selectedDate)
  }, [filteredActivities, selectedDate])

  const selectedDateGoals = useMemo(() => {
    if (typeFilter !== "All" && typeFilter !== "Chapter Goals") return []
    return goals.filter((g) => g.targetDate === selectedDate && g.status !== "cancelled")
  }, [goals, selectedDate, typeFilter])

  const plannedMinutes = selectedDateActivities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
  const completedMinutes = selectedDateActivities
    .filter((a) => a.status === "completed")
    .reduce((acc, a) => acc + (a.durationMinutes || 0), 0)

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-stone-900 dark:text-stone-100 font-sans">
      {/* ── Top Header & Mode Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              Study Calendar & Schedule
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-mono px-2.5 py-0.5 font-medium">
              Student Controlled
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Manual scheduling of your daily study activities & chapter milestones.
          </p>
        </div>

        {/* View toggles & Add Action */}
        <div className="flex items-center gap-2">
          {/* Calendar vs Chapter Goals list toggle */}
          <div className="flex p-0.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 border border-stone-300/50 dark:border-stone-700/50 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveSubTab("calendar")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors",
                activeSubTab === "calendar"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              )}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("goals")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",
                activeSubTab === "goals"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              )}
            >
              <span>My Goals</span>
              {goals.filter((g) => g.status === "overdue").length > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Add Dropdown */}
          <button
            type="button"
            onClick={() => {
              setEditingActivity(null)
              setActivityModalOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-medium shadow-2xs transition-colors"
          >
            <Plus size={14} weight="bold" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* ── Sub-view: My Chapter Goals ── */}
      {activeSubTab === "goals" && (
        <ChapterGoalsManagementView
          goals={goals}
          onSetNewGoal={() => setGoalModalOpen(true)}
          onChangeDate={(goal) => {
            setSelectedGoalForChange(goal)
            setChangeGoalModalOpen(true)
          }}
          onCancelGoal={(id) => cancelChapterGoal(id)}
          onToggleComplete={(chapterId) => toggleChapterComplete(chapterId)}
        />
      )}

      {/* ── Sub-view: Main Calendar ── */}
      {activeSubTab === "calendar" && (
        <div className="space-y-4">
          {/* Controls Bar: Navigation & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            {/* Prev / Today / Next */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevPeriod}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                title="Previous"
              >
                <CaretLeft size={16} />
              </button>
              <button
                type="button"
                onClick={jumpToToday}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-mono font-medium hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextPeriod}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                title="Next"
              >
                <CaretRight size={16} />
              </button>

              <span className="font-sans text-base font-bold text-stone-900 dark:text-stone-100 ml-2">
                {pivotDate.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* View Mode (Month / Week / Day) & Filter */}
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 text-xs font-mono">
                {(["month", "week", "day"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCalendarView(v)}
                    className={cn(
                      "px-3 py-1 rounded-lg capitalize transition-colors",
                      calendarView === v
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs font-mono border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 rounded-xl px-2.5 py-1.5 text-stone-700 dark:text-stone-300 outline-none cursor-pointer"
                >
                  <option value="All">All Items</option>
                  <option value="Chapter Goals">◆ Chapter Goals</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── View 1: Month View ── */}
          {calendarView === "month" && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs overflow-hidden">
              {/* Day header */}
              <div className="grid grid-cols-7 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 text-center py-2 text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400">
                {WEEKDAY_NAMES.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* 35/42 Grid Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 dark:divide-stone-800">
                {monthDays.map((cell) => {
                  const isToday = cell.dateStr === todayStr
                  const isSelected = cell.dateStr === selectedDate

                  const cellActivities = filteredActivities.filter((a) => a.date === cell.dateStr)
                  const cellGoals = goals.filter((g) => g.targetDate === cell.dateStr && g.status !== "cancelled")

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => {
                        setSelectedDate(cell.dateStr)
                        setPivotDate(parseDateStr(cell.dateStr))
                      }}
                      className={cn(
                        "min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer group select-none",
                        cell.isCurrentMonth
                          ? "bg-white dark:bg-stone-900"
                          : "bg-stone-50/40 dark:bg-stone-950/40 text-stone-400 dark:text-stone-600",
                        isSelected && "ring-2 ring-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 z-10"
                      )}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-mono font-medium size-6 flex items-center justify-center rounded-full transition-colors",
                            isToday
                              ? "bg-blue-600 text-white font-bold"
                              : isSelected
                              ? "text-blue-600 font-bold"
                              : "text-stone-700 dark:text-stone-300"
                          )}
                        >
                          {cell.dayNum}
                        </span>

                        {/* Quick indicator counts */}
                        <div className="flex items-center gap-1 text-[10px] font-mono text-stone-400">
                          {cellGoals.length > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold" title="Chapter Goal">
                              ◆ {cellGoals.length}
                            </span>
                          )}
                          {cellActivities.length > 0 && (
                            <span>{cellActivities.length}</span>
                          )}
                        </div>
                      </div>

                      {/* Items in Day Cell */}
                      <div className="space-y-1 my-1 overflow-hidden">
                        {/* Chapter Goals */}
                        {cellGoals.slice(0, 2).map((g) => (
                          <div
                            key={g.id}
                            className={cn(
                              "truncate text-[10px] font-medium px-1.5 py-0.5 rounded border leading-tight flex items-center gap-1",
                              g.status === "completed"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                : g.status === "overdue"
                                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                            )}
                            title={`Finish Chapter: ${g.chapterName}`}
                          >
                            <span className="text-[9px]">◆</span>
                            <span className="truncate">{g.chapterName}</span>
                          </div>
                        ))}

                        {/* Regular Activities */}
                        {cellActivities.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              "truncate text-[10px] px-1.5 py-0.5 rounded border border-stone-200/80 dark:border-stone-800 leading-tight flex items-center gap-1",
                              a.status === "completed"
                                ? "bg-stone-100 dark:bg-stone-800/50 text-stone-400 line-through"
                                : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                            )}
                            title={`${a.title} (${a.startTime || "Anytime"})`}
                          >
                            <span className="text-[8px] text-stone-400">○</span>
                            <span className="truncate">{a.title}</span>
                          </div>
                        ))}

                        {cellActivities.length + cellGoals.length > 4 && (
                          <p className="text-[9px] text-stone-400 pl-1 font-mono">
                            +{cellActivities.length + cellGoals.length - 4} more
                          </p>
                        )}
                      </div>

                      {/* Bottom line hint on hover */}
                      <div className="h-0.5 w-full bg-transparent group-hover:bg-blue-400/40 rounded-full transition-colors" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── View 2: Week View ── */}
          {calendarView === "week" && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs overflow-x-auto">
              <div className="min-w-[760px] grid grid-cols-7 divide-x divide-stone-200/80 dark:divide-stone-800">
                {weekDays.map((col) => {
                  const isToday = col.dateStr === todayStr
                  const isSelected = col.dateStr === selectedDate
                  const colActivities = filteredActivities.filter((a) => a.date === col.dateStr)
                  const colGoals = goals.filter((g) => g.targetDate === col.dateStr && g.status !== "cancelled")

                  return (
                    <div
                      key={col.dateStr}
                      onClick={() => {
                        setSelectedDate(col.dateStr)
                      }}
                      className={cn(
                        "flex flex-col min-h-[460px] p-3 transition-colors cursor-pointer",
                        isSelected ? "bg-blue-50/15 dark:bg-blue-950/15" : "bg-white dark:bg-stone-900"
                      )}
                    >
                      {/* Column Header */}
                      <div className="text-center pb-3 border-b border-stone-200/70 dark:border-stone-800">
                        <span className="text-xs font-mono uppercase text-stone-500 dark:text-stone-400 block">
                          {col.dayName}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center justify-center size-7 rounded-full text-sm font-mono mt-1 font-semibold",
                            isToday
                              ? "bg-blue-600 text-white"
                              : isSelected
                              ? "text-blue-600 font-bold"
                              : "text-stone-800 dark:text-stone-200"
                          )}
                        >
                          {col.dayNum}
                        </span>
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
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                              )}
                            >
                              <div className="flex items-center gap-1 font-semibold text-[11px]">
                                <span>◆</span>
                                <span>Complete Chapter</span>
                              </div>
                              <p className="font-medium truncate mt-0.5">{g.chapterName}</p>
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate">
                                {g.subjectName}
                              </span>
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
                              "p-2.5 rounded-xl border transition-all text-xs",
                              act.status === "completed"
                                ? "bg-stone-50 dark:bg-stone-800/40 border-stone-200/60 text-stone-400"
                                : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs hover:border-blue-300"
                            )}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1">
                              <span>{act.startTime || "Flexible"}</span>
                              <span className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-700">
                                {act.type}
                              </span>
                            </div>
                            <p className={cn("font-medium leading-tight", act.status === "completed" && "line-through")}>
                              {act.title}
                            </p>
                            {act.chapterName && (
                              <p className="text-[10px] text-stone-500 mt-1 truncate">
                                {act.subjectName} • {act.chapterName}
                              </p>
                            )}
                          </div>
                        ))}

                        {colActivities.length === 0 && colGoals.length === 0 && (
                          <div className="h-full flex items-center justify-center text-center p-3 text-stone-300 dark:text-stone-700 text-xs">
                            No activities
                          </div>
                        )}
                      </div>

                      {/* Quick add for this day */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDate(col.dateStr)
                          setEditingActivity(null)
                          setActivityModalOpen(true)
                        }}
                        className="mt-2 w-full py-1.5 rounded-lg border border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-400 text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── View 3: Day View (or Day detail card) ── */}
          <DayDetailCard
            selectedDate={selectedDate}
            activities={selectedDateActivities}
            goals={selectedDateGoals}
            plannedMinutes={plannedMinutes}
            completedMinutes={completedMinutes}
            onToggleComplete={toggleActivityComplete}
            onEditActivity={(act) => {
              setEditingActivity(act)
              setActivityModalOpen(true)
            }}
            onDuplicateActivity={(id) => duplicateActivity(id, selectedDate)}
            onDeleteActivity={deleteActivity}
            onAddActivity={() => {
              setEditingActivity(null)
              setActivityModalOpen(true)
            }}
            onSetChapterGoal={() => setGoalModalOpen(true)}
            onChangeGoalDate={(g) => {
              setSelectedGoalForChange(g)
              setChangeGoalModalOpen(true)
            }}
            onCancelGoal={cancelChapterGoal}
            onToggleChapterComplete={toggleChapterComplete}
          />
        </div>
      )}

      {/* ── Modal: Add / Edit Activity ── */}
      {activityModalOpen && (
        <ActivityFormModal
          initialDate={selectedDate}
          editingActivity={editingActivity}
          subjects={subjects}
          chapters={chapters}
          onClose={() => {
            setActivityModalOpen(false)
            setEditingActivity(null)
          }}
          onSave={(data) => {
            if (editingActivity) {
              updateActivity(editingActivity.id, data)
            } else {
              addActivity(data)
            }
            setActivityModalOpen(false)
            setEditingActivity(null)
          }}
        />
      )}

      {/* ── Modal: Set Chapter Goal from Calendar ── */}
      {goalModalOpen && (
        <ChapterGoalModal
          initialDate={selectedDate}
          subjects={subjects}
          chapters={chapters}
          onClose={() => setGoalModalOpen(false)}
          onSave={(subId, chapId, targetDate, notes) => {
            setChapterGoal(subId, chapId, targetDate, notes)
            setGoalModalOpen(false)
          }}
        />
      )}

      {/* ── Modal: Change Goal Date ── */}
      {changeGoalModalOpen && selectedGoalForChange && (
        <ChangeGoalDateModal
          goal={selectedGoalForChange}
          onClose={() => {
            setChangeGoalModalOpen(false)
            setSelectedGoalForChange(null)
          }}
          onConfirm={(newDate) => {
            updateChapterGoalDate(selectedGoalForChange.id, newDate)
            setChangeGoalModalOpen(false)
            setSelectedGoalForChange(null)
          }}
        />
      )}
    </div>
  )
}

// ── Day Details Component ─────────────────────────────────────────────────────

interface DayDetailCardProps {
  selectedDate: string
  activities: CalendarActivity[]
  goals: ChapterCompletionGoal[]
  plannedMinutes: number
  completedMinutes: number
  onToggleComplete: (id: string) => void
  onEditActivity: (act: CalendarActivity) => void
  onDuplicateActivity: (id: string) => void
  onDeleteActivity: (id: string) => void
  onAddActivity: () => void
  onSetChapterGoal: () => void
  onChangeGoalDate: (g: ChapterCompletionGoal) => void
  onCancelGoal: (id: string) => void
  onToggleChapterComplete: (chapterId: string) => void
}

function DayDetailCard({
  selectedDate,
  activities,
  goals,
  plannedMinutes,
  completedMinutes,
  onToggleComplete,
  onEditActivity,
  onDuplicateActivity,
  onDeleteActivity,
  onAddActivity,
  onSetChapterGoal,
  onChangeGoalDate,
  onCancelGoal,
  onToggleChapterComplete,
}: DayDetailCardProps) {
  const d = parseDateStr(selectedDate)
  const fullDateStr = d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs p-5 space-y-5">
      {/* Header & Day Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 dark:border-stone-800 pb-4">
        <div>
          <h2 className="font-sans text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {fullDateStr}
          </h2>
          <div className="flex items-center gap-3 text-xs font-mono text-stone-500 dark:text-stone-400 mt-1">
            <span>Activities: <strong className="text-stone-900 dark:text-stone-100">{activities.length}</strong></span>
            <span>•</span>
            <span>Planned: <strong className="text-stone-900 dark:text-stone-100">{Math.round(plannedMinutes / 60 * 10) / 10}h</strong></span>
            <span>•</span>
            <span>Done: <strong className="text-emerald-600 dark:text-emerald-400">{Math.round(completedMinutes / 60 * 10) / 10}h</strong></span>
            {goals.length > 0 && (
              <>
                <span>•</span>
                <span>Chapter Goals: <strong className="text-amber-600 dark:text-amber-400">{goals.length}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSetChapterGoal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <span>◆ Set Chapter Goal</span>
          </button>
          <button
            type="button"
            onClick={onAddActivity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            <Plus size={13} weight="bold" />
            <span>Add what I will do</span>
          </button>
        </div>
      </div>

      {/* Chapter Goals Section */}
      {goals.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-mono">
            <span>◆ Chapter Completion Goals for Today</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map((g) => (
              <div
                key={g.id}
                className={cn(
                  "p-4 rounded-xl border flex flex-col justify-between space-y-3",
                  g.status === "completed"
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                    : g.status === "overdue"
                    ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                      {g.subjectName}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold",
                        g.status === "completed"
                          ? "bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                          : g.status === "overdue"
                          ? "bg-red-200/60 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                          : "bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                      )}
                    >
                      {g.status === "completed"
                        ? "Completed"
                        : g.status === "overdue"
                        ? "Overdue"
                        : "Target: Today"}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100 mt-1">
                    {g.chapterName}
                  </h4>
                  {g.notes && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 italic">
                      &quot;{g.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Actions on goal */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-amber-800/50 text-xs">
                  <button
                    type="button"
                    onClick={() => onToggleChapterComplete(g.chapterId)}
                    className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <CheckCircle size={14} />
                    <span>{g.status === "completed" ? "Mark incomplete" : "Mark chapter complete"}</span>
                  </button>

                  <div className="flex items-center gap-2 text-stone-500">
                    <button
                      type="button"
                      onClick={() => onChangeGoalDate(g)}
                      className="hover:text-stone-900 dark:hover:text-stone-100"
                    >
                      Change date
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => onCancelGoal(g.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Cancel goal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 font-mono">
            Scheduled Study Activities
          </h3>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 space-y-2">
            <p className="text-sm">No activities scheduled for this day.</p>
            <p className="text-xs text-stone-400">
              Click <strong className="text-stone-700 dark:text-stone-300">Add what I will do</strong> to choose a subject & chapter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  act.status === "completed"
                    ? "bg-stone-50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800"
                    : "bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-700 shadow-2xs"
                )}
              >
                {/* Left: Checkbox & Info */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(act.id)}
                    className="mt-0.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {act.status === "completed" ? (
                      <CheckCircle size={20} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={cn(
                          "font-semibold text-sm",
                          act.status === "completed"
                            ? "text-stone-400 dark:text-stone-500 line-through"
                            : "text-stone-900 dark:text-stone-100"
                        )}
                      >
                        {act.title}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700">
                        {act.type}
                      </span>
                      {act.priority === "High" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                          High
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      {act.subjectName && (
                        <span className="font-medium text-stone-700 dark:text-stone-300">
                          {act.subjectName}
                          {act.chapterName ? ` → ${act.chapterName}` : ""}
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {act.startTime ? `${act.startTime}–${act.endTime || "?"}` : "All Day"} ({act.durationMinutes}m)
                      </span>
                    </div>

                    {act.notes && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                        {act.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onEditActivity(act)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Edit activity"
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateActivity(act.id)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Duplicate activity"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteActivity(act.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Delete activity"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chapter Goals Management Sub-view ─────────────────────────────────────────

function ChapterGoalsManagementView({
  goals,
  onSetNewGoal,
  onChangeDate,
  onCancelGoal,
  onToggleComplete,
}: {
  goals: ChapterCompletionGoal[]
  onSetNewGoal: () => void
  onChangeDate: (goal: ChapterCompletionGoal) => void
  onCancelGoal: (id: string) => void
  onToggleComplete: (chapterId: string) => void
}) {
  const activeGoals = goals.filter((g) => g.status !== "cancelled")
  const upcoming = activeGoals.filter((g) => g.status === "upcoming" || g.status === "due_today")
  const overdue = activeGoals.filter((g) => g.status === "overdue")
  const completed = activeGoals.filter((g) => g.status === "completed")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
            My Chapter Completion Goals
          </h2>
          <p className="text-xs text-stone-500">
            Academic completion targets set by you for each chapter.
          </p>
        </div>
        <button
          type="button"
          onClick={onSetNewGoal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
        >
          <Plus size={13} weight="bold" />
          <span>Set Chapter Goal</span>
        </button>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-xs font-mono">
            <WarningCircle size={16} weight="fill" />
            <span>Overdue Chapter Goals ({overdue.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdue.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onChangeDate={() => onChangeDate(g)}
                onCancelGoal={() => onCancelGoal(g.id)}
                onToggleComplete={() => onToggleComplete(g.chapterId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
          Upcoming Goals ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
            No upcoming goals set. Click <strong className="text-stone-700 dark:text-stone-300">Set Chapter Goal</strong> to plan a completion date.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onChangeDate={() => onChangeDate(g)}
                onCancelGoal={() => onCancelGoal(g.id)}
                onToggleComplete={() => onToggleComplete(g.chapterId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Section */}
      {completed.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
            Completed Chapters ({completed.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onChangeDate={() => onChangeDate(g)}
                onCancelGoal={() => onCancelGoal(g.id)}
                onToggleComplete={() => onToggleComplete(g.chapterId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  onChangeDate,
  onCancelGoal,
  onToggleComplete,
}: {
  goal: ChapterCompletionGoal
  onChangeDate: () => void
  onCancelGoal: () => void
  onToggleComplete: () => void
}) {
  const isDone = goal.status === "completed"

  // Days difference calculation
  const targetD = parseDateStr(goal.targetDate)
  let diffDaysText = ""
  if (isDone && goal.completedAt) {
    const compD = parseDateStr(goal.completedAt)
    const diff = Math.round((targetD.getTime() - compD.getTime()) / (1000 * 3600 * 24))
    if (diff > 0) {
      diffDaysText = `Completed early by ${diff} day${diff > 1 ? "s" : ""}`
    } else if (diff === 0) {
      diffDaysText = "Completed on target date"
    } else {
      diffDaysText = `Completed ${Math.abs(diff)} day${Math.abs(diff) > 1 ? "s" : ""} late`
    }
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-colors",
        isDone
          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
          : goal.status === "overdue"
          ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          : "bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-700 shadow-2xs"
      )}
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-1">
          <span>{goal.subjectName}</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              isDone
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
                : goal.status === "overdue"
                ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
            )}
          >
            {isDone ? "✓ Completed" : goal.status === "overdue" ? "⚠ Overdue" : "In Progress"}
          </span>
        </div>

        <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
          {goal.chapterName}
        </h4>

        <div className="mt-1 text-xs text-stone-600 dark:text-stone-400 font-mono">
          <span>Target: {goal.targetDate}</span>
          {diffDaysText && (
            <p className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] mt-0.5">
              {diffDaysText}
            </p>
          )}
        </div>

        {goal.notes && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 italic">
            &quot;{goal.notes}&quot;
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
        <button
          type="button"
          onClick={onToggleComplete}
          className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <CheckCircle size={14} />
          <span>{isDone ? "Mark incomplete" : "Mark chapter complete"}</span>
        </button>

        <div className="flex items-center gap-2 text-stone-500">
          <button type="button" onClick={onChangeDate} className="hover:text-stone-900 dark:hover:text-stone-100">
            Change date
          </button>
          <span>•</span>
          <button type="button" onClick={onCancelGoal} className="text-red-600 dark:text-red-400 hover:underline">
            Cancel goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Activity Form ──────────────────────────────────────────────────────

function ActivityFormModal({
  initialDate,
  editingActivity,
  subjects,
  chapters,
  onClose,
  onSave,
}: {
  initialDate: string
  editingActivity: CalendarActivity | null
  subjects: Array<{ id: string; name: string }>
  chapters: Array<{ id: string; subjectId: string; name: string }>
  onClose: () => void
  onSave: (data: Omit<CalendarActivity, "id" | "createdAt" | "updatedAt">) => void
}) {
  const [title, setTitle] = useState(editingActivity?.title || "")
  const [type, setType] = useState<ActivityType>(editingActivity?.type || "Study")
  const [subjectId, setSubjectId] = useState(editingActivity?.subjectId || subjects[0]?.id || "")
  const [chapterId, setChapterId] = useState(editingActivity?.chapterId || "")
  const [date, setDate] = useState(editingActivity?.date || initialDate)
  const [startTime, setStartTime] = useState(editingActivity?.startTime || "16:00")
  const [endTime, setEndTime] = useState(editingActivity?.endTime || "17:00")
  const [duration, setDuration] = useState(editingActivity?.durationMinutes?.toString() || "60")
  const [priority, setPriority] = useState<ActivityPriority>(editingActivity?.priority || "Medium")
  const [notes, setNotes] = useState(editingActivity?.notes || "")

  const availableChapters = chapters.filter((c) => c.subjectId === subjectId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const sub = subjects.find((s) => s.id === subjectId)
    const chap = chapters.find((c) => c.id === chapterId)

    onSave({
      title: title.trim(),
      type,
      subjectId: sub?.id,
      subjectName: sub?.name,
      chapterId: chap?.id,
      chapterName: chap?.name,
      date,
      startTime,
      endTime,
      durationMinutes: Number(duration) || 60,
      status: editingActivity?.status || "pending",
      priority,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {editingActivity ? "Edit Study Activity" : "Add What I Will Do"}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Title */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Practice Quadratic Equations Exercise 4.2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-blue-500"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
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
                  setChapterId("")
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
                Chapter (Optional)
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

          {/* Date, Start Time, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on roots by factorisation method"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-2xs"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Set Chapter Completion Goal ────────────────────────────────────────

function ChapterGoalModal({
  initialDate,
  subjects,
  chapters,
  onClose,
  onSave,
}: {
  initialDate: string
  subjects: Array<{ id: string; name: string }>
  chapters: Array<{ id: string; subjectId: string; name: string }>
  onClose: () => void
  onSave: (subId: string, chapId: string, targetDate: string, notes?: string) => void
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "")
  const [chapterId, setChapterId] = useState("")
  const [targetDate, setTargetDate] = useState(initialDate)
  const [notes, setNotes] = useState("")

  const availableChapters = chapters.filter((c) => c.subjectId === subjectId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectId || !chapterId) return
    onSave(subjectId, chapterId, targetDate, notes.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span className="text-amber-500">◆</span>
            <span>Set Chapter Completion Goal</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <p className="text-stone-500 dark:text-stone-400">
            Set an academic milestone date: <em>&quot;I will complete this chapter on or before this day.&quot;</em>
          </p>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setChapterId("")
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
              Chapter *
            </label>
            <select
              required
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="">-- Select Chapter --</option>
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Complete by Date *
            </label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Optional Target Note
            </label>
            <input
              type="text"
              placeholder="e.g. Finish NCERT exercises + Exemplar questions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!chapterId}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium shadow-2xs"
            >
              Save Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Change Goal Date Confirmation ──────────────────────────────────────

function ChangeGoalDateModal({
  goal,
  onClose,
  onConfirm,
}: {
  goal: ChapterCompletionGoal
  onClose: () => void
  onConfirm: (newDate: string) => void
}) {
  const [newDate, setNewDate] = useState(goal.targetDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 space-y-4 text-xs font-sans">
          <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Change Chapter Completion Date?
          </h3>
          <p className="text-stone-600 dark:text-stone-400">
            Chapter: <strong className="text-stone-900 dark:text-stone-100">{goal.chapterName}</strong>
          </p>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-stone-400 line-through">{goal.targetDate}</span>
            <ArrowRight size={14} />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(newDate)}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Change Date
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

