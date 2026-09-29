"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub — Central Academic Workspace
//
// Manual student-controlled scheduling, week planner, syllabus manager,
// notes & materials library, revision system, practice bank, tests,
// analytics, classroom, and parent transparency mode.
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
  ArrowsClockwise,
  GraduationCap,
  ChartLineUp,
  Chalkboard,
  ShieldCheck,
  Copy,
  DownloadSimple,
  Eye,
  Sparkle,
  FileText,
  UserCheck,
  UsersFour,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export default function StudentHubPage() {
  const [activeTab, setActiveTab] = useState<StudentTabId>("overview")

  // Global Student Store State
  const allSubjects = useStudentStore((s) => s.subjects)
  const subjects = useMemo(() => allSubjects.filter((s) => !s.archived), [allSubjects])
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

  // Exam Countdown (Term Finals target: 14 days out)
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

  // -------------------------------------------------------------------------
  // Revision State (Spaced Repetition & Leitner Decks)
  // -------------------------------------------------------------------------
  const [activeDeckCardIndex, setActiveDeckCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const sampleFlashcards = useMemo(
    () => [
      {
        id: "fc-1",
        front: "What is the Quadratic Formula for roots of ax² + bx + c = 0?",
        back: "x = (-b ± √(b² - 4ac)) / (2a)",
        subject: "Mathematics",
        box: 1,
      },
      {
        id: "fc-2",
        front: "State Newton's Second Law in terms of momentum.",
        back: "The rate of change of momentum of a body is directly proportional to the applied force: F = dp/dt = ma",
        subject: "Physics",
        box: 2,
      },
      {
        id: "fc-3",
        front: "What determines whether a chemical reaction is spontaneous at constant T and P?",
        back: "Gibbs Free Energy change (ΔG = ΔH - TΔS). Spontaneous when ΔG < 0.",
        subject: "Chemistry",
        box: 3,
      },
      {
        id: "fc-4",
        front: "Define Snell's Law of Refraction.",
        back: "n₁ sin(θ₁) = n₂ sin(θ₂), where n is refractive index and θ is angle relative to the normal.",
        subject: "Physics",
        box: 4,
      },
    ],
    []
  )

  const currentFlashcard = sampleFlashcards[activeDeckCardIndex % sampleFlashcards.length]

  const handleRateFlashcard = () => {
    setShowAnswer(false)
    setActiveDeckCardIndex((prev) => (prev + 1) % sampleFlashcards.length)
  }

  // -------------------------------------------------------------------------
  // Practice Bank State
  // -------------------------------------------------------------------------
  const [practiceSubjectFilter, setPracticeSubjectFilter] = useState<string>("All")
  const [practiceDifficultyFilter, setPracticeDifficultyFilter] = useState<string>("All")
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null)
  const [revealedSolution, setRevealedSolution] = useState(false)
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0)

  const sampleQuestions = useMemo(
    () => [
      {
        id: "q-1",
        subject: "Mathematics",
        chapter: "Quadratic Equations",
        difficulty: "Medium",
        isPyq: true,
        year: 2024,
        question: "If the roots of equation x² - kx + 16 = 0 are equal and positive, then the value of k is:",
        options: ["-8", "4", "8", "16"],
        correctOption: 2,
        solution: "For equal roots, discriminant D = b² - 4ac = 0. Here k² - 4(1)(16) = 0 => k² = 64 => k = ±8. Since roots are positive, the sum of roots k must be > 0. Therefore k = 8.",
      },
      {
        id: "q-2",
        subject: "Physics",
        chapter: "Electrostatics",
        difficulty: "Hard",
        isPyq: true,
        year: 2025,
        question: "Two point charges +q and -2q are placed at a distance d apart. The electric potential is zero at a point on the line joining them at a distance from +q equal to:",
        options: ["d / 3", "d / 2", "2d / 3", "3d / 4"],
        correctOption: 0,
        solution: "Let point P be at distance x from +q. Potential V = kq/x - k(2q)/(d - x) = 0 => kq/x = 2kq/(d - x) => d - x = 2x => 3x = d => x = d/3.",
      },
      {
        id: "q-3",
        subject: "Chemistry",
        chapter: "Chemical Thermodynamics",
        difficulty: "Easy",
        isPyq: false,
        year: 2026,
        question: "For an adiabatic process in an ideal gas, which quantity remains strictly zero?",
        options: ["Work done (W)", "Internal energy change (ΔU)", "Heat exchanged (q)", "Temperature change (ΔT)"],
        correctOption: 2,
        solution: "By definition, an adiabatic system is thermally insulated from its surroundings, meaning heat exchange q = 0.",
      },
    ],
    []
  )

  const filteredQuestions = useMemo(() => {
    return sampleQuestions.filter((q) => {
      if (practiceSubjectFilter !== "All" && q.subject !== practiceSubjectFilter) return false
      if (practiceDifficultyFilter !== "All" && q.difficulty !== practiceDifficultyFilter) return false
      return true
    })
  }, [sampleQuestions, practiceSubjectFilter, practiceDifficultyFilter])

  const currentQuestion = filteredQuestions[practiceQuestionIndex % (filteredQuestions.length || 1)]

  // -------------------------------------------------------------------------
  // Classroom & Parent Mode State
  // -------------------------------------------------------------------------
  const [classroomCode, setClassroomCode] = useState("")
  const [classroomJoinedMessage, setClassroomJoinedMessage] = useState("")
  const [copiedInvite, setCopiedInvite] = useState(false)

  const handleJoinClassroom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!classroomCode.trim()) return
    setClassroomJoinedMessage(`Enrolled successfully in section [${classroomCode.toUpperCase().trim()}]`)
    setClassroomCode("")
    setTimeout(() => setClassroomJoinedMessage(""), 4000)
  }

  const handleCopyGuardianLink = () => {
    navigator.clipboard?.writeText?.("https://zenithsui.app/guardian/link/tkn-78a9c2")
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2500)
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
              STUDENT HUB
            </span>
            <span className="hidden sm:inline font-mono text-xs text-stone-500">
              • Academic Term 2026
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-stone-600 dark:text-stone-400">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Active Curriculum</span>
          </div>
          <span className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 px-2.5 py-1 font-mono text-xs text-stone-800 dark:text-stone-200">
            Self-Paced Prep
          </span>
        </div>
      </header>

      {/* ── Student Navigation Tabs (All 11 Tabs) ── */}
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
                  <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-white">
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
                    Today&apos;s Plan
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
                    <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      Today&apos;s Activities
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
                    <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
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
                      No upcoming goals set. Open Syllabus to set &quot;Complete by&quot; dates for chapters.
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
                  <h3 className="font-sans text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
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

        {/* ── Tab 2: PLANNER (Week Planner) ── */}
        {activeTab === "planner" && (
          <WeekPlanner
            onOpenCalendarDay={(d: string) => {
              setSelectedDate(d)
              setCalendarView("day")
              setActiveTab("calendar")
            }}
          />
        )}

        {/* ── Tab 3: CALENDAR ── */}
        {activeTab === "calendar" && <CalendarView />}

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

        {/* ── Tab 6: REVISION (Spaced Repetition & Flashcards) ── */}
        {activeTab === "revision" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Spaced Repetition & Revision Decks
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Leitner 5-Box Active Recall Schedule
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/?template=revisionBoard"
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-mono font-medium hover:border-stone-400 transition-colors"
                >
                  Insert Revision Board to Canvas
                </Link>
                <span className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-mono text-stone-50 dark:bg-stone-100 dark:text-stone-900">
                  4 Cards In Today&apos;s Review
                </span>
              </div>
            </div>

            {/* 5-Box Leitner Visualizer */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { box: "Box 1", interval: "Daily", cards: 14, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
                { box: "Box 2", interval: "3 Days", cards: 22, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
                { box: "Box 3", interval: "Weekly", cards: 38, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
                { box: "Box 4", interval: "2 Weeks", cards: 45, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
                { box: "Box 5", interval: "Mastered", cards: 96, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
              ].map((b) => (
                <div
                  key={b.box}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs flex flex-col justify-between min-h-[120px]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100 block">
                        {b.box}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500">
                        {b.interval}
                      </span>
                    </div>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", b.color)}>
                      {b.box === "Box 5" ? "Mastered" : "In Review"}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">
                    {b.cards} <span className="text-xs font-normal text-stone-500 font-sans">cards</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Flashcard Reviewer */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {currentFlashcard.subject}
                  </span>
                  <span className="font-mono text-xs text-stone-500">
                    Card {(activeDeckCardIndex % sampleFlashcards.length) + 1} of {sampleFlashcards.length}
                  </span>
                </div>
                <span className="font-mono text-xs text-stone-400">
                  Current Level: Box {currentFlashcard.box}
                </span>
              </div>

              {/* Card Surface */}
              <div
                onClick={() => setShowAnswer((s) => !s)}
                className="cursor-pointer min-h-[220px] rounded-xl border border-stone-200 dark:border-stone-750 bg-[#FBFAF5] dark:bg-stone-850 p-6 flex flex-col justify-between hover:border-stone-400 transition-all select-none"
              >
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block mb-2">
                    {showAnswer ? "Answer / Solution" : "Question Prompt (Click to reveal answer)"}
                  </span>
                  <p className="font-sans text-base sm:text-lg font-medium text-stone-900 dark:text-stone-100 leading-relaxed">
                    {showAnswer ? currentFlashcard.back : currentFlashcard.front}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs font-mono text-stone-500">
                  <span>{showAnswer ? "Click card again to show question" : "Tap anywhere on card to flip"}</span>
                  <Eye size={15} />
                </div>
              </div>

              {/* Rating Controls */}
              {showAnswer ? (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-stone-500 block text-center">
                    Rate how easily you recalled this card:
                  </span>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleRateFlashcard}
                      className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-center text-xs font-mono font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <div className="font-bold">Again</div>
                      <div className="text-[10px] text-red-600/80 mt-0.5">Box 1 (Daily)</div>
                    </button>
                    <button
                      type="button"
                      onClick={handleRateFlashcard}
                      className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center text-xs font-mono font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <div className="font-bold">Hard</div>
                      <div className="text-[10px] text-amber-600/80 mt-0.5">Box 2 (3 Days)</div>
                    </button>
                    <button
                      type="button"
                      onClick={handleRateFlashcard}
                      className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-center text-xs font-mono font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-bold">Good</div>
                      <div className="text-[10px] text-blue-600/80 mt-0.5">Box 3 (Weekly)</div>
                    </button>
                    <button
                      type="button"
                      onClick={handleRateFlashcard}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center text-xs font-mono font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <div className="font-bold">Easy</div>
                      <div className="text-[10px] text-emerald-600/80 mt-0.5">Box 4 (2 Weeks)</div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className="flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-6 py-2.5 text-xs font-mono font-semibold shadow-xs hover:bg-stone-800 transition-colors"
                  >
                    <Eye size={15} />
                    <span>Reveal Answer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 7: PRACTICE (Interactive Question Bank) ── */}
        {activeTab === "practice" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Question Bank & Practice Mode
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Targeted question solving with step-by-step solutions
                </p>
              </div>

              {/* Subject Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["All", "Mathematics", "Physics", "Chemistry"].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setPracticeSubjectFilter(sub)
                      setPracticeQuestionIndex(0)
                      setSelectedPracticeOption(null)
                      setRevealedSolution(false)
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-mono transition-colors",
                      practiceSubjectFilter === sub
                        ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold"
                        : "border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:border-stone-400"
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Practice Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-stone-500">Total Solved</span>
                <div className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                  128 Questions
                </div>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-stone-500">Average Accuracy</span>
                <div className="font-mono text-xl font-bold text-emerald-600 mt-1">
                  84.2%
                </div>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase text-stone-500">PYQs Mastered</span>
                <div className="font-mono text-xl font-bold text-blue-600 mt-1">
                  42 of 60
                </div>
              </div>
            </div>

            {/* Interactive Question Card */}
            {currentQuestion ? (
              <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 font-mono text-xs font-semibold">
                      {currentQuestion.subject}
                    </span>
                    <span className="font-mono text-xs text-stone-500">
                      ◆ {currentQuestion.chapter}
                    </span>
                    {currentQuestion.isPyq && (
                      <span className="rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                        PYQ {currentQuestion.year}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                    <span className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5">
                      Diff: {currentQuestion.difficulty}
                    </span>
                    <span>+4 / -1</span>
                  </div>
                </div>

                <div>
                  <p className="font-sans text-base font-medium text-stone-900 dark:text-stone-100 leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>

                {/* Option Radio Buttons */}
                <div className="space-y-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedPracticeOption === idx
                    const isCorrect = idx === currentQuestion.correctOption
                    let optionClasses = "border-stone-200 dark:border-stone-750 bg-stone-50/50 dark:bg-stone-850 hover:border-stone-400"

                    if (revealedSolution) {
                      if (isCorrect) {
                        optionClasses = "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                      } else if (isSelected && !isCorrect) {
                        optionClasses = "border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200"
                      }
                    } else if (isSelected) {
                      optionClasses = "border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 font-semibold"
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPracticeOption(idx)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-colors text-xs font-mono",
                          optionClasses
                        )}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Solution Reveal Box */}
                {revealedSolution && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-xs space-y-1.5">
                    <span className="font-mono font-bold text-blue-900 dark:text-blue-200 block uppercase tracking-wider text-[10px]">
                      Solution & Analysis
                    </span>
                    <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                      {currentQuestion.solution}
                    </p>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setRevealedSolution((r) => !r)}
                    className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 px-3 py-1.5 text-xs font-mono font-medium hover:border-stone-400 transition-colors"
                  >
                    {revealedSolution ? "Hide Solution" : "Reveal Solution"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPracticeQuestionIndex((i) => i + 1)
                      setSelectedPracticeOption(null)
                      setRevealedSolution(false)
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-1.5 text-xs font-mono font-semibold hover:bg-stone-800 transition-colors"
                  >
                    <span>Next Question</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-stone-400">
                No questions found matching your filter.
              </div>
            )}
          </div>
        )}

        {/* ── Tab 8: TESTS (Tests & Exams) ── */}
        {activeTab === "tests" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Tests & Exam Simulation
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Timed full-length mock tests and chapter diagnostic evaluations
                </p>
              </div>
              <Link
                href="/?template=examDashboard"
                className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-mono font-medium hover:border-stone-400 transition-colors"
              >
                Insert Exam Dashboard to Canvas
              </Link>
            </div>

            {/* Countdown Banner */}
            <div className="rounded-2xl border border-stone-900 bg-stone-900 p-6 text-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                  Next Official Examination
                </span>
                <h3 className="font-sans text-lg font-bold tracking-tight mt-1">
                  Term 1 Finals Examination
                </h3>
                <p className="text-xs text-stone-300 font-mono mt-0.5">
                  Mathematics • Physics • Chemistry Comprehensive
                </p>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m {String(countdown.seconds).padStart(2, "0")}s
              </div>
            </div>

            {/* Test Series Cards */}
            <div className="space-y-3">
              {[
                {
                  id: "t-1",
                  title: "All-India Mock Examination #4",
                  subject: "Complete Syllabus",
                  questions: 75,
                  duration: "180 min",
                  marks: 300,
                  status: "Ready to Start",
                  tag: "Full Mock",
                },
                {
                  id: "t-2",
                  title: "Calculus & Quadratic Equations Diagnostic",
                  subject: "Mathematics",
                  questions: 30,
                  duration: "60 min",
                  marks: 120,
                  status: "Completed (108/120)",
                  tag: "Chapter Test",
                },
                {
                  id: "t-3",
                  title: "Electrostatics & Magnetism Drill",
                  subject: "Physics",
                  questions: 25,
                  duration: "45 min",
                  marks: 100,
                  status: "Upcoming",
                  tag: "Unit Drill",
                },
              ].map((test) => (
                <div
                  key={test.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-stone-600 dark:text-stone-300">
                        {test.tag}
                      </span>
                      <span className="font-mono text-xs text-blue-600 font-medium">
                        {test.subject}
                      </span>
                    </div>
                    <h4 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      {test.title}
                    </h4>
                    <div className="flex items-center gap-3 font-mono text-xs text-stone-500">
                      <span>{test.questions} Questions</span>
                      <span>•</span>
                      <span>{test.duration}</span>
                      <span>•</span>
                      <span>Max {test.marks} Marks</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-stone-500">
                      {test.status}
                    </span>
                    <button
                      type="button"
                      className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-xs font-mono font-semibold hover:bg-stone-800 transition-colors"
                    >
                      {test.status.includes("Completed") ? "Review Test" : "Enter Exam"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Simulation Palette Preview */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 block">
                Standard CBT Examination Palette
              </span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-emerald-500" /> 18 Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-amber-500" /> 4 Marked for Review
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-red-500" /> 6 Not Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-stone-300 dark:bg-stone-700" /> 2 Not Visited
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 9: ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
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

            {/* Subject-Wise Progress Breakdown */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
              <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Syllabus Completion by Subject
              </h3>
              <div className="space-y-3.5">
                {subjects.map((sub) => {
                  const subChapters = chapters.filter((c) => c.subjectId === sub.id)
                  const subDone = subChapters.filter((c) => c.status === "completed").length
                  const pct = subChapters.length > 0 ? Math.round((subDone / subChapters.length) * 100) : 0

                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{sub.name}</span>
                        <span className="text-stone-500">
                          {subDone}/{subChapters.length} Chapters ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 10: CLASSROOM ── */}
        {activeTab === "classroom" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Classroom & Batch Sync
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Connect with teachers, assignments, and class announcements
                </p>
              </div>
            </div>

            {/* Join Code Input Form */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  Join a Classroom
                </h3>
                <p className="text-xs font-mono text-stone-500">
                  Enter your teacher&apos;s 6-character Crockford Base32 join code
                </p>
              </div>

              <form onSubmit={handleJoinClassroom} className="flex flex-col sm:flex-row items-stretch gap-3">
                <input
                  type="text"
                  placeholder="e.g. 7K9M2P"
                  value={classroomCode}
                  onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 px-4 py-2.5 font-mono text-sm tracking-wider uppercase focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-5 py-2.5 text-xs font-mono font-semibold hover:bg-stone-800 transition-colors"
                >
                  Join Section
                </button>
              </form>

              {classroomJoinedMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-mono text-emerald-800 dark:text-emerald-200">
                  ✓ {classroomJoinedMessage}
                </div>
              )}
            </div>

            {/* Enrolled Classes List */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Enrolled Classrooms
              </span>

              {[
                {
                  id: "cls-1",
                  name: "Grade 12 — Advanced Physics (Section A)",
                  instructor: "Dr. Arvind Sharma",
                  academicYear: "2026–2027",
                  room: "Lab 3B",
                  members: 34,
                },
                {
                  id: "cls-2",
                  name: "Honors Mathematics & Calculus",
                  instructor: "Prof. Sunita Menon",
                  academicYear: "2026–2027",
                  room: "Hall 12",
                  members: 28,
                },
              ].map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 font-mono text-[10px] text-stone-600 dark:text-stone-400">
                      {cls.academicYear} • Room {cls.room}
                    </span>
                    <h4 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      {cls.name}
                    </h4>
                    <p className="font-mono text-xs text-stone-500">
                      Instructor: {cls.instructor} • {cls.members} classmates
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 px-4 py-2 text-xs font-mono font-medium hover:border-stone-400 transition-colors"
                  >
                    View Materials & Feed
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 11: PARENT MODE ── */}
        {activeTab === "parent-mode" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Guardian & Parent Transparency
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Read-only verifiable progress sharing for parents and guardians
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyGuardianLink}
                className="flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-3.5 py-1.5 text-xs font-mono font-semibold hover:bg-stone-800 transition-colors"
              >
                {copiedInvite ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedInvite ? "Link Copied!" : "Copy Guardian Link"}</span>
              </button>
            </div>

            {/* Transparency Card */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  Active Guardian Connection
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850">
                  <span className="font-mono text-[10px] uppercase text-stone-400">Guardian Email</span>
                  <div className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1">
                    parent.guardian@example.com
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850">
                  <span className="font-mono text-[10px] uppercase text-stone-400">Access Scope</span>
                  <div className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1">
                    Read-Only (Progress & Goals)
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850">
                  <span className="font-mono text-[10px] uppercase text-stone-400">Privacy Mode</span>
                  <div className="font-mono text-xs font-semibold text-emerald-600 mt-1">
                    End-to-End Local First
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Summary Report for Guardian */}
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
              <h3 className="font-sans text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Guardian Weekly Report Summary
              </h3>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 py-2">
                  <span className="text-stone-600 dark:text-stone-400">Study Consistency (7-Day Streak)</span>
                  <span className="font-semibold text-emerald-600">Active Daily</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 py-2">
                  <span className="text-stone-600 dark:text-stone-400">Syllabus Completion</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{overallSyllabusPct}% ({completedChaptersCount}/{totalChaptersCount} Chapters)</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 py-2">
                  <span className="text-stone-600 dark:text-stone-400">Active Milestones</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{upcomingGoals.length} Chapter Goals Pending</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-stone-600 dark:text-stone-400">Practice Question Accuracy</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">84.2%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
