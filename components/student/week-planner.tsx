"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Week Planner
//
// Manual student-controlled 7-day study planner:
// - 7-day weekly schedule (Monday through Sunday)
// - Weekly study target hours (customizable by student)
// - Real calculated progress: planned vs completed study hours
// - Chapter completion goals due this week
// - Add, edit, complete, duplicate activities directly per day
// - Fast jump to full calendar day view
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import {
  useStudentStore,
  type CalendarActivity,
  type ActivityType,
  type ActivityPriority,
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
  Target,
  ArrowRight,
  X,
  Check,
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
const FULL_WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

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

function formatDisplayDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(copy.setDate(diff))
}

export function WeekPlanner({
  onOpenCalendarDay,
}: {
  onOpenCalendarDay?: (date: string) => void
}) {
  const activities = useStudentStore((s) => s.activities)
  const goals = useStudentStore((s) => s.goals)
  const subjects = useStudentStore((s) => s.subjects)
  const chapters = useStudentStore((s) => s.chapters)
  const weeklyTargetHours = useStudentStore((s) => s.weeklyTargetHours)
  const setWeeklyTargetHours = useStudentStore((s) => s.setWeeklyTargetHours)

  const addActivity = useStudentStore((s) => s.addActivity)
  const updateActivity = useStudentStore((s) => s.updateActivity)
  const toggleActivityComplete = useStudentStore((s) => s.toggleActivityComplete)
  const deleteActivity = useStudentStore((s) => s.deleteActivity)
  const duplicateActivity = useStudentStore((s) => s.duplicateActivity)

  // Anchor date for viewed week (default today)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() =>
    getMonday(new Date())
  )

  // Target editing state
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [tempTarget, setTempTarget] = useState(weeklyTargetHours.toString())

  // Activity modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<CalendarActivity | null>(null)
  const [modalPrefillDate, setModalPrefillDate] = useState<string>(formatDateStr(new Date()))

  // Compute 7 days for the active week (Monday -> Sunday)
  const weekDays = useMemo(() => {
    const days: { dateStr: string; dateObj: Date; dayName: string; fullDayName: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday)
      d.setDate(d.getDate() + i)
      days.push({
        dateStr: formatDateStr(d),
        dateObj: d,
        dayName: WEEKDAY_NAMES[i],
        fullDayName: FULL_WEEKDAY_NAMES[i],
      })
    }
    return days
  }, [currentWeekMonday])

  const todayStr = useMemo(() => formatDateStr(new Date()), [])

  // Week statistics
  const weekDateSet = useMemo(() => new Set(weekDays.map((d) => d.dateStr)), [weekDays])

  const weekActivities = useMemo(() => {
    return activities.filter((a) => weekDateSet.has(a.date))
  }, [activities, weekDateSet])

  const totalPlannedMinutes = useMemo(() => {
    return weekActivities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
  }, [weekActivities])

  const totalCompletedMinutes = useMemo(() => {
    return weekActivities
      .filter((a) => a.status === "completed")
      .reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
  }, [weekActivities])

  const plannedHours = (totalPlannedMinutes / 60).toFixed(1)
  const completedHours = (totalCompletedMinutes / 60).toFixed(1)
  const completedHoursNum = totalCompletedMinutes / 60

  const targetProgressPct = Math.min(
    100,
    Math.round((completedHoursNum / Math.max(1, weeklyTargetHours)) * 100)
  )

  const hoursRemaining = Math.max(0, weeklyTargetHours - completedHoursNum).toFixed(1)

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekMonday(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday)
    next.setDate(next.getDate() + 7)
    setCurrentWeekMonday(next)
  }

  const handleThisWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()))
  }

  const handleSaveTarget = () => {
    const num = parseFloat(tempTarget)
    if (!isNaN(num) && num > 0) {
      setWeeklyTargetHours(Math.round(num))
    }
    setIsEditingTarget(false)
  }

  const handleOpenAddModal = (dateStr: string) => {
    setEditingActivity(null)
    setModalPrefillDate(dateStr)
    setModalOpen(true)
  }

  const handleOpenEditModal = (activity: CalendarActivity) => {
    setEditingActivity(activity)
    setModalPrefillDate(activity.date)
    setModalOpen(true)
  }

  const weekDateRangeLabel = `${formatDisplayDate(weekDays[0].dateStr)} – ${formatDisplayDate(
    weekDays[6].dateStr
  )}, ${weekDays[6].dateObj.getFullYear()}`

  return (
    <div className="space-y-6">
      {/* ── Top Header & Navigation ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-1 border border-border/40 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <CalendarCheck size={22} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Weekly Study Planner
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-2 border border-border/50 text-foreground-secondary font-medium">
                7-Day Schedule
              </span>
            </div>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Plan and track your study hours, subjects, and milestones manually.
            </p>
          </div>
        </div>

        {/* Week controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleThisWeek}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-surface-2 hover:bg-surface-3 transition-colors text-foreground"
          >
            This Week
          </button>
          <div className="flex items-center rounded-lg border border-border/60 bg-surface-2 overflow-hidden">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-3 transition-colors"
              title="Previous Week"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="text-xs font-semibold px-3 text-foreground whitespace-nowrap">
              {weekDateRangeLabel}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-3 transition-colors"
              title="Next Week"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Weekly Target & Progress Card ──────────────────────────────── */}
      <div className="bg-surface-1 border border-border/40 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Target hours info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Target size={24} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Weekly Target
                </span>
                {!isEditingTarget ? (
                  <button
                    onClick={() => {
                      setTempTarget(weeklyTargetHours.toString())
                      setIsEditingTarget(true)
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={tempTarget}
                      onChange={(e) => setTempTarget(e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs bg-surface-2 border border-primary rounded text-foreground text-center"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTarget}
                      className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                    <button
                      onClick={() => setIsEditingTarget(false)}
                      className="p-1 text-foreground-tertiary hover:bg-surface-3 rounded"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-2xl font-extrabold text-foreground mt-0.5">
                {weeklyTargetHours}
                <span className="text-sm font-normal text-foreground-secondary ml-1">hours</span>
              </div>
            </div>
          </div>

          {/* Stats metrics */}
          <div className="grid grid-cols-3 gap-4 border-y lg:border-y-0 lg:border-x border-border/40 py-3 lg:py-0 lg:px-6">
            <div>
              <div className="text-[11px] font-medium text-foreground-tertiary">Planned</div>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {plannedHours}
                <span className="text-xs font-normal text-foreground-secondary ml-0.5">h</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-foreground-tertiary">Completed</div>
              <div className="text-lg font-bold text-emerald-500 mt-0.5">
                {completedHours}
                <span className="text-xs font-normal text-emerald-500/80 ml-0.5">h</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-foreground-tertiary">Remaining</div>
              <div className="text-lg font-bold text-amber-500 mt-0.5">
                {hoursRemaining}
                <span className="text-xs font-normal text-amber-500/80 ml-0.5">h</span>
              </div>
            </div>
          </div>

          {/* Visual Progress bar */}
          <div className="lg:w-72 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary font-medium">Goal Completion</span>
              <span className="font-bold text-foreground">{targetProgressPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-surface-2 rounded-full overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${targetProgressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-foreground-tertiary">
              {completedHoursNum >= weeklyTargetHours
                ? "🎉 Target reached! Outstanding consistency!"
                : `${hoursRemaining}h to reach your ${weeklyTargetHours}h target.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 7-Day Columns ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const isToday = day.dateStr === todayStr
          const dayActs = activities.filter((a) => a.date === day.dateStr)
          const dayGoals = goals.filter((g) => g.targetDate === day.dateStr && g.status !== "cancelled")

          const dayPlannedMins = dayActs.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
          const dayDoneMins = dayActs
            .filter((a) => a.status === "completed")
            .reduce((acc, a) => acc + (a.durationMinutes || 0), 0)

          const dayPlannedH = (dayPlannedMins / 60).toFixed(1)
          const dayDoneH = (dayDoneMins / 60).toFixed(1)

          return (
            <div
              key={day.dateStr}
              className={cn(
                "flex flex-col bg-surface-1 rounded-2xl border transition-all duration-200 overflow-hidden min-h-[480px]",
                isToday
                  ? "border-primary/60 shadow-md ring-1 ring-primary/20 bg-primary/[0.02]"
                  : "border-border/40 hover:border-border/80"
              )}
            >
              {/* Day Header */}
              <div
                className={cn(
                  "p-3.5 border-b flex items-center justify-between",
                  isToday
                    ? "bg-primary/10 border-primary/20"
                    : "bg-surface-2/60 border-border/40"
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {day.dayName}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-primary text-white uppercase">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-foreground-secondary mt-0.5">
                    {formatDisplayDate(day.dateStr)}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddModal(day.dateStr)}
                  className="w-7 h-7 rounded-lg bg-surface-1 border border-border/60 flex items-center justify-center text-foreground-secondary hover:text-primary hover:border-primary/50 transition-colors"
                  title="Add activity"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>

              {/* Day Study Time Summary */}
              <div className="px-3.5 py-2 bg-surface-2/30 border-b border-border/30 flex items-center justify-between text-[11px]">
                <span className="text-foreground-tertiary">
                  <span className="font-semibold text-foreground">{dayPlannedH}h</span> planned
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    dayDoneMins > 0 ? "text-emerald-500" : "text-foreground-tertiary"
                  )}
                >
                  {dayDoneH}h done
                </span>
              </div>

              {/* Chapter completion milestones due today */}
              {dayGoals.length > 0 && (
                <div className="p-2 border-b border-amber-500/20 bg-amber-500/5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1 px-1">
                    <CalendarCheck size={12} weight="bold" />
                    Goal Due
                  </div>
                  {dayGoals.map((g) => (
                    <div
                      key={g.id}
                      className={cn(
                        "text-[11px] p-1.5 rounded-lg border flex flex-col gap-0.5",
                        g.status === "completed"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-surface-1 border-amber-500/30 text-foreground"
                      )}
                    >
                      <div className="font-semibold line-clamp-1">{g.chapterName}</div>
                      <div className="text-[10px] text-foreground-secondary">{g.subjectName}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity Cards List */}
              <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[500px]">
                {dayActs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center px-2">
                    <Clock size={22} weight="thin" className="text-foreground-tertiary mb-1" />
                    <p className="text-[11px] text-foreground-tertiary">No activities planned</p>
                    <button
                      onClick={() => handleOpenAddModal(day.dateStr)}
                      className="mt-2 text-[11px] text-primary hover:underline font-medium"
                    >
                      + Plan Study
                    </button>
                  </div>
                ) : (
                  dayActs.map((act) => {
                    const isCompleted = act.status === "completed"
                    return (
                      <div
                        key={act.id}
                        className={cn(
                          "group p-2.5 rounded-xl border text-xs transition-all relative",
                          isCompleted
                            ? "bg-surface-2/40 border-border/30 opacity-70"
                            : "bg-surface-2/70 border-border/50 hover:border-border hover:shadow-sm"
                        )}
                      >
                        {/* Top: checkbox + title */}
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleActivityComplete(act.id)}
                            className="mt-0.5 text-foreground-tertiary hover:text-emerald-500 transition-colors shrink-0"
                            title={isCompleted ? "Mark pending" : "Mark completed"}
                          >
                            {isCompleted ? (
                              <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                            ) : (
                              <Circle size={16} weight="bold" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={cn(
                                "font-semibold text-foreground line-clamp-2 leading-tight",
                                isCompleted && "line-through text-foreground-secondary"
                              )}
                            >
                              {act.title}
                            </h4>

                            {act.subjectName && (
                              <p className="text-[11px] text-foreground-secondary truncate mt-0.5">
                                {act.subjectName}
                                {act.chapterName ? ` • ${act.chapterName}` : ""}
                              </p>
                            )}

                            {/* Tags: time, type, priority */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {act.startTime && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-foreground-secondary font-mono flex items-center gap-1">
                                  <Clock size={10} />
                                  {act.startTime}
                                  {act.endTime ? `-${act.endTime}` : ""}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-foreground-secondary font-medium">
                                {act.durationMinutes}m
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {act.type}
                              </span>
                              {act.priority === "High" && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-500 font-bold uppercase">
                                  High
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick action buttons on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 mt-2 pt-1 border-t border-border/30">
                          <button
                            onClick={() => handleOpenEditModal(act)}
                            className="p-1 rounded text-foreground-tertiary hover:text-foreground hover:bg-surface-3"
                            title="Edit"
                          >
                            <PencilSimple size={13} />
                          </button>
                          <button
                            onClick={() => {
                              // Duplicate to next day
                              const nextDay = new Date(day.dateObj)
                              nextDay.setDate(nextDay.getDate() + 1)
                              duplicateActivity(act.id, formatDateStr(nextDay))
                            }}
                            className="p-1 rounded text-foreground-tertiary hover:text-foreground hover:bg-surface-3"
                            title="Duplicate to tomorrow"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => deleteActivity(act.id)}
                            className="p-1 rounded text-foreground-tertiary hover:text-rose-500 hover:bg-surface-3"
                            title="Delete"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Footer: Open Day View */}
              {onOpenCalendarDay && (
                <div className="p-2 border-t border-border/30 bg-surface-2/40 text-center">
                  <button
                    onClick={() => onOpenCalendarDay(day.dateStr)}
                    className="w-full py-1 text-[11px] text-foreground-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 font-medium"
                  >
                    <span>Open in Day View</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add / Edit Activity Modal ──────────────────────────────────── */}
      {modalOpen && (
        <ActivityModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingActivity(null)
          }}
          prefillDate={modalPrefillDate}
          initialActivity={editingActivity}
          subjects={subjects}
          chapters={chapters}
          onSave={(data) => {
            if (editingActivity) {
              updateActivity(editingActivity.id, data)
            } else {
              addActivity(data)
            }
            setModalOpen(false)
            setEditingActivity(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add / Edit Activity Dialog Modal
// ---------------------------------------------------------------------------

function ActivityModal({
  isOpen,
  onClose,
  prefillDate,
  initialActivity,
  subjects,
  chapters,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  prefillDate: string
  initialActivity: CalendarActivity | null
  subjects: { id: string; name: string }[]
  chapters: { id: string; subjectId: string; name: string }[]
  onSave: (data: any) => void
}) {
  const [title, setTitle] = useState(initialActivity?.title || "")
  const [type, setType] = useState<ActivityType>(initialActivity?.type || "Study")
  const [subjectId, setSubjectId] = useState(initialActivity?.subjectId || "")
  const [chapterId, setChapterId] = useState(initialActivity?.chapterId || "")
  const [date, setDate] = useState(initialActivity?.date || prefillDate)
  const [startTime, setStartTime] = useState(initialActivity?.startTime || "16:00")
  const [endTime, setEndTime] = useState(initialActivity?.endTime || "17:00")
  const [durationMinutes, setDurationMinutes] = useState(
    initialActivity?.durationMinutes || 60
  )
  const [priority, setPriority] = useState<ActivityPriority>(
    initialActivity?.priority || "Medium"
  )
  const [notes, setNotes] = useState(initialActivity?.notes || "")

  const filteredChapters = useMemo(() => {
    if (!subjectId) return []
    return chapters.filter((c) => c.subjectId === subjectId)
  }, [chapters, subjectId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const sub = subjects.find((s) => s.id === subjectId)
    const chap = chapters.find((c) => c.id === chapterId)

    onSave({
      title: title.trim(),
      type,
      subjectId: subjectId || undefined,
      subjectName: sub?.name || undefined,
      chapterId: chapterId || undefined,
      chapterName: chap?.name || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      durationMinutes: Number(durationMinutes) || 60,
      priority,
      notes: notes.trim() || undefined,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-1 border border-border/60 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <h3 className="text-base font-bold text-foreground">
            {initialActivity ? "Edit Study Activity" : "Plan New Study Activity"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground-secondary block mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Practice Quadratic Equations PYQs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setChapterId("")
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">No Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Chapter
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={!subjectId}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">No Chapter</option>
                {filteredChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary block mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground-secondary block mb-1">
              Notes & Goals (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Complete questions 1 to 15, mark difficult derivations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border/60 text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border/60 text-foreground-secondary hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              {initialActivity ? "Save Changes" : "Create Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
