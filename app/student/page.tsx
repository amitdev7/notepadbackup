"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Central Academic Workspace
//
// Manual student-controlled scheduling, week planner, syllabus manager,
// and subject-chapter notes & materials library.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  StudentNav,
  type StudentTabId,
} from "@/components/chrome/student-nav"
import {
  FocusTimer,
  type TimerPreset,
  type FocusSessionResult,
} from "@/components/student/focus-timer"
import { CalendarView } from "@/components/student/calendar-view"
import { SyllabusManager } from "@/components/student/syllabus-manager"
import { NotesMaterialsHub } from "@/components/student/notes-materials-hub"
import { WeekPlanner } from "@/components/student/week-planner"
import { useStudentStore } from "@/lib/academic/student-store"
import { computeExamCountdown, type CountdownState } from "@/lib/academic/tests"
import {
  Flame,
  Books,
  Cards,
  Clock,
  ArrowRight,
  Plus,
  Check,
  CalendarCheck,
  Target,
  ArrowLeft,
  CheckCircle,
  Play,
  TrendUp,
  FolderSimple,
  Circle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export default function StudentHubPage() {
  const [activeTab, setActiveTab] = useState<StudentTabId>("overview")

  // Global Student Store State
  const subjects = useStudentStore((s) => s.subjects.filter((s) => !s.archived))
  const chapters = useStudentStore((s) => s.chapters)
  const goals = useStudentStore((s) => s.goals)
  const activities = useStudentStore((s) => s.activities)
  const selectedDate = useStudentStore((s) => s.selectedDate)
  const setSelectedDate = useStudentStore((s) => s.setSelectedDate)
  const setCalendarView = useStudentStore((s) => s.setCalendarView)
  const toggleActivityComplete = useStudentStore((s) => s.toggleActivityComplete)
  const toggleChapterComplete = useStudentStore((s) => s.toggleChapterComplete)

  // Focus Timer state
  const [activeStudyTopic, setActiveStudyTopic] = useState("Mathematics: Quadratic Equations")
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>("45/10")

  // Exam Countdown
  const [examTargetTimestamp] = useState(() => {
    return Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 3600 * 1000 + 42 * 60 * 1000
  })

  const [countdown, setCountdown] = useState<CountdownState>(() =>
    computeExamCountdown(examTargetTimestamp)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(computeExamCountdown(examTargetTimestamp))
    }, 1000)
    return () => clearInterval(timer)
  }, [examTargetTimestamp])

  const todayStr = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }, [])

  // Real overall syllabus stats
  const totalChaptersCount = chapters.length
  const completedChaptersCount = chapters.filter((c) => c.status === "completed").length
  const overallSyllabusPct =
    totalChaptersCount > 0 ? Math.round((completedChaptersCount / totalChaptersCount) * 100) : 0

  // Today's activities & goals
  const todayActivities = activities.filter((a) => a.date === todayStr)
  const todayGoals = goals.filter((g) => g.targetDate === todayStr && g.status !== "cancelled")

  // Upcoming Goals for Overview widget
  const upcomingGoals = useMemo(() => {
    const today = new Date(todayStr).getTime()
    return goals
      .filter((g) => g.status !== "cancelled" && g.status !== "completed")
      .map((g) => {
        const target = new Date(g.targetDate).getTime()
        const diffDays = Math.ceil((target - today) / (1000 * 3600 * 24))
        return { ...g, daysLeft: diffDays }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4)
  }, [goals, todayStr])

  const handleStartRecommendedSession = () => {
    setActiveStudyTopic("Mathematics: Quadratic Equations")
    setSelectedPreset("45/10")
    const el = document.getElementById("focus-engine-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleSessionFinish = (result: FocusSessionResult) => {
    if (result.mode === "work") {
      const firstUnfinished = todayActivities.find((t) => t.status === "pending")
      if (firstUnfinished) {
        toggleActivityComplete(firstUnfinished.id)
      }
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FBFAF5] dark:bg-[#121214] text-stone-900 dark:text-stone-100 font-sans">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-stone-200/80 dark:border-stone-800 bg-[#FBFAF5]/95 dark:bg-[#121214]/95 px-4 sm:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 px-2.5 py-1 text-xs font-mono font-medium text-stone-700 dark:text-stone-300 shadow-2xs hover:border-stone-300 transition-colors"
            title="Return to Drawing Canvas"
          >
            <ArrowLeft size={14} />
            <span>Canvas</span>
          </Link>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />

          <div className="flex items-center gap-2">
            <span className="font-sans text-base font-bold tracking-tight text-blue-600">
              zenithsui
            </span>
            <span className="rounded bg-stone-900 dark:bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-50 dark:text-stone-900">
              Student Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-stone-600 dark:text-stone-400">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Academic Term 2026–27</span>
          </div>
          <span className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 px-2.5 py-1 font-mono text-xs text-stone-800 dark:text-stone-200">
            Self-Paced Prep
          </span>
        </div>
      </header>

      {/* ── Student Navigation Tabs ── */}
      <StudentNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Main Workspace Content ── */}
      <main className="flex-1 px-4 py-6 sm:px-8">
        {/* ── Tab 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Top Priority / Focus Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-stone-900 bg-stone-900 p-6 text-stone-50 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-stone-800 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase text-stone-300">
                      Active Target Focus
                    </span>
                    <span className="font-mono text-xs text-blue-400">
                      Self-Directed
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {activeStudyTopic}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Quadratic Formula derivation, nature of roots, and real-world application word problems. Target completion scheduled on your calendar.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-stone-300">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-stone-400" />
                      Session target: 45 min
                    </span>
                    <span>•</span>
                    <span>{todayActivities.length} activities scheduled today</span>
                    <span>•</span>
                    <span>{upcomingGoals.length} chapter milestones active</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={handleStartRecommendedSession}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-mono font-semibold text-stone-900 shadow-sm hover:bg-stone-100 active:scale-95 transition-all"
                  >
                    <Play size={14} weight="fill" />
                    <span>Focus Timer</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Study Streak
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    <Flame size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">7</span>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Days Active</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-stone-500">
                  Consistency: On track
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Real Syllabus Progress
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Books size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {overallSyllabusPct}%
                  </span>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    {completedChaptersCount}/{totalChaptersCount} Chapters
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${overallSyllabusPct}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Today's Plan
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <CalendarCheck size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {todayActivities.filter((a) => a.status === "completed").length} / {todayActivities.length}
                  </span>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Done</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-stone-500">
                  {todayGoals.length > 0 ? `${todayGoals.length} Chapter Goal Due` : "No goal due today"}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Next Exam Countdown
                  </span>
                  <span className="rounded border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold">
                    Term Finals
                  </span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Term Preparation</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">On Track</span>
                </div>
              </div>
            </div>

            {/* Split Grid: Today's Schedule & Upcoming Chapter Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Today's Schedule */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                      Today's Activities
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">Date: {todayStr}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayStr)
                      setActiveTab("calendar")
                    }}
                    className="text-xs font-mono text-blue-600 hover:underline"
                  >
                    Open Calendar →
                  </button>
                </div>

                {todayGoals.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-semibold block">
                      ◆ Goals Due Today
                    </span>
                    {todayGoals.map((g) => (
                      <div
                        key={g.id}
                        className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-amber-950 dark:text-amber-200">
                          ◆ {g.chapterName} ({g.subjectName})
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleChapterComplete(g.chapterId)}
                          className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline text-[11px]"
                        >
                          Mark Complete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {todayActivities.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center italic">
                      No activities planned for today. Add activities in Calendar or Planner.
                    </p>
                  ) : (
                    todayActivities.map((act) => (
                      <div
                        key={act.id}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between text-xs",
                          act.status === "completed"
                            ? "bg-stone-50 dark:bg-stone-800/40 text-stone-400 border-stone-200/50"
                            : "bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleActivityComplete(act.id)}
                            className="text-stone-400 hover:text-emerald-600"
                          >
                            {act.status === "completed" ? (
                              <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>
                          <span className={cn("font-medium", act.status === "completed" && "line-through")}>
                            {act.title}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-stone-500">
                          {act.startTime || "Anytime"} ({act.durationMinutes}m)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Upcoming Chapter Goals */}
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                      Upcoming Chapter Goals
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">Academic target deadlines</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("syllabus")}
                    className="text-xs font-mono text-blue-600 hover:underline"
                  >
                    Manage Syllabus →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {upcomingGoals.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center italic">
                      No upcoming goals set. Open Syllabus to set "Complete by" dates for chapters.
                    </p>
                  ) : (
                    upcomingGoals.map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                            {g.subjectName}
                          </span>
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                            ◆ {g.chapterName}
                          </span>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <span
                            className={cn(
                              "font-bold",
                              g.daysLeft < 0
                                ? "text-red-600"
                                : g.daysLeft <= 2
                                ? "text-amber-600"
                                : "text-blue-600"
                            )}
                          >
                            {g.daysLeft < 0
                              ? `${Math.abs(g.daysLeft)}d overdue`
                              : g.daysLeft === 0
                              ? "Due today"
                              : `${g.daysLeft} days left`}
                          </span>
                          <span className="block text-[10px] text-stone-400">{g.targetDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Focus Engine Section */}
            <div id="focus-engine-section" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                    Focus Timer & Deep Study Engine
                  </h3>
                  <p className="text-xs font-mono text-stone-500">
                    Deep work sessions with Pomodoro and flow tracking
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs">
                <FocusTimer
                  activeTopic={activeStudyTopic}
                  initialPreset={selectedPreset}
                  onSessionFinish={handleSessionFinish}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: CALENDAR ── */}
        {activeTab === "calendar" && <CalendarView />}

        {/* ── Tab 3: PLANNER (Week Planner) ── */}
        {activeTab === "planner" && (
          <WeekPlanner
            onOpenCalendarDay={(d: string) => {
              setSelectedDate(d)
              setCalendarView("day")
              setActiveTab("calendar")
            }}
          />
        )}

        {/* ── Tab 4: SYLLABUS (Real Syllabus Manager) ── */}
        {activeTab === "syllabus" && (
          <SyllabusManager
            onNavigateToNotes={(subId, chapId) => {
              useStudentStore.getState().setNotesSelection(subId, chapId)
              setActiveTab("notes")
            }}
          />
        )}

        {/* ── Tab 5: NOTES (Notes & Study Materials Hub) ── */}
        {activeTab === "notes" && <NotesMaterialsHub />}

        {/* ── Tab 6: REVISION ── */}
        {activeTab === "revision" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                  Spaced Repetition & Revision Decks
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Leitner 5-Box Spaced Schedule
                </p>
              </div>
              <span className="rounded-lg bg-stone-900 px-3 py-1 text-xs font-mono text-stone-50 dark:bg-stone-100 dark:text-stone-900">
                42 Cards In Queue
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { box: "Box 1", interval: "Daily", cards: 24 },
                { box: "Box 2", interval: "3 Days", cards: 18 },
                { box: "Box 3", interval: "Weekly", cards: 35 },
                { box: "Box 4", interval: "2 Weeks", cards: 52 },
                { box: "Box 5", interval: "Mastered", cards: 110 },
              ].map((b) => (
                <div
                  key={b.box}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs flex flex-col justify-between min-h-[120px]"
                >
                  <div>
                    <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100 block">
                      {b.box}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {b.interval}
                    </span>
                  </div>
                  <div className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100 mt-2">
                    {b.cards}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 7: ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                  Academic Progress & Study Analytics
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Comprehensive performance & completion analytics
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500">Total Study Time</span>
                <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  28.5 hrs
                </div>
                <span className="font-mono text-xs text-emerald-600 font-semibold">+14% vs last week</span>
              </div>
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500">Active Curriculums</span>
                <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {subjects.length} Subjects
                </div>
                <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                  {completedChaptersCount} of {totalChaptersCount} chapters done
                </span>
              </div>
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500">Milestone Accuracy</span>
                <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  92.4%
                </div>
                <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                  Goals met on or before deadline
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
