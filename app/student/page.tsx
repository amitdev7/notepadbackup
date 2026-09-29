"use client"

import { useState, useEffect, useMemo } from "react"
import {
  StudentNav,
  type StudentTabId,
} from "@/components/chrome/student-nav"
import {
  FocusTimer,
  type TimerPreset,
  type FocusSessionResult,
} from "@/components/student/focus-timer"
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
  Exam,
  ChartLineUp,
  ChalkboardTeacher,
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
  Play,
  Lock,
  Funnel,
  TrendUp,
  DownloadSimple,
} from "@phosphor-icons/react"

interface DailyTask {
  id: string
  title: string
  subject: string
  durationMinutes: number
  priority: "High" | "Medium" | "Low"
  completed: boolean
  scheduledTime: string
}

const INITIAL_TASKS: DailyTask[] = [
  {
    id: "task-1",
    title: "Solve 20 Integration by Parts MCQs",
    subject: "Mathematics",
    durationMinutes: 45,
    priority: "High",
    completed: false,
    scheduledTime: "10:00 AM",
  },
  {
    id: "task-2",
    title: "Review Electrostatics Formula Sheet",
    subject: "Physics",
    durationMinutes: 30,
    priority: "High",
    completed: false,
    scheduledTime: "11:30 AM",
  },
  {
    id: "task-3",
    title: "Organic Chemistry Reaction Mechanism flashcards",
    subject: "Chemistry",
    durationMinutes: 25,
    priority: "Medium",
    completed: true,
    scheduledTime: "02:00 PM",
  },
  {
    id: "task-4",
    title: "Coordinate Geometry Revision Drill",
    subject: "Mathematics",
    durationMinutes: 40,
    priority: "Low",
    completed: false,
    scheduledTime: "04:30 PM",
  },
]

const SYLLABUS_MODULES = [
  {
    subject: "Mathematics",
    topics: 42,
    completed: 31,
    pct: 74,
    nextMilestone: "Definite Integrals & Area Under Curves",
  },
  {
    subject: "Physics",
    topics: 38,
    completed: 24,
    pct: 63,
    nextMilestone: "Electromagnetic Induction & Alternating Current",
  },
  {
    subject: "Chemistry",
    topics: 44,
    completed: 29,
    pct: 66,
    nextMilestone: "Aldehydes, Ketones and Carboxylic Acids",
  },
]

export default function StudentHubPage() {
  const [activeTab, setActiveTab] = useState<StudentTabId>("overview")
  const [tasks, setTasks] = useState<DailyTask[]>(INITIAL_TASKS)
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskSubject, setNewTaskSubject] = useState("Mathematics")
  const [newTaskDuration, setNewTaskDuration] = useState("30")
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium")
  const [showTaskForm, setShowTaskForm] = useState(false)

  const [activeStudyTopic, setActiveStudyTopic] = useState("Calculus: Integration by Parts")
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>("45/10")

  const examTargetTimestamp = useMemo(() => {
    return Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 3600 * 1000 + 42 * 60 * 1000
  }, [])

  const [countdown, setCountdown] = useState<CountdownState>(() =>
    computeExamCountdown(examTargetTimestamp)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(computeExamCountdown(examTargetTimestamp))
    }, 1000)
    return () => clearInterval(timer)
  }, [examTargetTimestamp])

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const newTask: DailyTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      durationMinutes: Number(newTaskDuration) || 30,
      priority: newTaskPriority,
      completed: false,
      scheduledTime: "Flexible",
    }

    setTasks((prev) => [newTask, ...prev])
    setNewTaskTitle("")
    setShowTaskForm(false)
  }

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "pending") return !t.completed
    if (taskFilter === "completed") return t.completed
    return true
  })

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const taskProgressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleStartRecommendedSession = () => {
    setActiveStudyTopic("Calculus: Integration by Parts")
    setSelectedPreset("45/10")
    setActiveTab("overview")
    const el = document.getElementById("focus-engine-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleSessionFinish = (result: FocusSessionResult) => {
    if (result.mode === "work") {
      setTasks((prev) => {
        const firstUnfinished = prev.find((t) => !t.completed)
        if (firstUnfinished) {
          return prev.map((t) =>
            t.id === firstUnfinished.id ? { ...t, completed: true } : t
          )
        }
        return prev
      })
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FBFAF5] text-stone-900 font-sans">
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-stone-200 bg-[#FBFAF5]/90 px-4 sm:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-mono font-medium text-stone-700 shadow-2xs hover:border-stone-300 hover:bg-stone-50 transition-colors"
            title="Return to Drawing Canvas"
          >
            <ArrowLeft size={14} />
            <span>Canvas</span>
          </a>

          <div className="h-4 w-px bg-stone-300" />

          <div className="flex items-center gap-2">
            <span className="font-sans text-base font-bold tracking-tight text-stone-900">
              zenithsui
            </span>
            <span className="rounded bg-stone-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-50">
              Student Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-stone-600">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-stone-900" />
            <span>Academic Term 2026</span>
          </div>
          <span className="rounded-md border border-stone-200 bg-white px-2.5 py-1 font-mono text-xs text-stone-800">
            Standard Prep
          </span>
        </div>
      </header>

      <StudentNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 px-4 py-6 sm:px-8">
        {activeTab === "overview" && (
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-stone-900 bg-stone-900 p-6 text-stone-50 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-stone-800 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase text-stone-300">
                      Recommendation Engine
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      High Priority Focus
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                    What should I study now?
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Organic Chemistry: Carbonyl Compounds Reaction Mechanisms & Synthesis Paths. Diagnostic error rate was 42% on last review block. Exam scheduled in 14 days.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-stone-300">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-stone-400" />
                      Session target: 45 min
                    </span>
                    <span>•</span>
                    <span>Exam weightage: 14%</span>
                    <span>•</span>
                    <span>Last reviewed: 4 days ago</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={handleStartRecommendedSession}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-mono font-semibold text-stone-900 shadow-sm hover:bg-stone-100 active:scale-95 transition-all"
                  >
                    <Play size={14} weight="fill" />
                    <span>Start Session</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Daily Streak
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                    <Flame size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900">7</span>
                  <span className="text-xs font-medium text-stone-600">Days Consecutive</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-stone-500">
                  Consistency: 94% on target
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Syllabus Progress
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                    <Books size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900">68%</span>
                  <span className="text-xs font-medium text-stone-600">Completed</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-stone-900" style={{ width: "68%" }} />
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Cards Due Today
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                    <Cards size={16} weight="fill" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-stone-900">42</span>
                  <span className="text-xs font-medium text-stone-600">Review Queue</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-stone-500">
                  Spaced Repetition Box 1-3
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                    Next Exam Countdown
                  </span>
                  <span className="rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-stone-800">
                    {countdown.tier}
                  </span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-stone-900 tabular-nums">
                  {countdown.days}d {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-stone-500">
                  <span>Term Finals</span>
                  <span className="tabular-nums">{String(countdown.seconds).padStart(2, "0")}s</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div id="focus-engine-section" className="lg:col-span-5">
                <FocusTimer
                  initialPreset={selectedPreset}
                  activeTopic={activeStudyTopic}
                  onSessionFinish={handleSessionFinish}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-stone-900">
                      Daily Study Tasks
                    </h3>
                    <p className="text-xs font-mono text-stone-500">
                      {completedCount} of {totalCount} completed ({taskProgressPct}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-stone-200 bg-[#FBFAF5] p-0.5 font-mono text-xs">
                      {(["all", "pending", "completed"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setTaskFilter(filter)}
                          className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                            taskFilter === filter
                              ? "bg-stone-900 font-medium text-stone-50"
                              : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTaskForm((prev) => !prev)}
                      className="flex items-center gap-1 rounded-lg border border-stone-300 bg-[#FBFAF5] px-2.5 py-1 text-xs font-mono text-stone-800 hover:border-stone-900 hover:bg-stone-100 transition-colors"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Task</span>
                    </button>
                  </div>
                </div>

                {showTaskForm && (
                  <form
                    onSubmit={handleAddTask}
                    className="mt-3 rounded-xl border border-stone-200 bg-[#FBFAF5] p-3 space-y-3"
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Study task description..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-stone-900"
                        autoFocus
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <select
                        value={newTaskSubject}
                        onChange={(e) => setNewTaskSubject(e.target.value)}
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="General">General</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-stone-500">Mins:</span>
                        <input
                          type="number"
                          min="5"
                          max="180"
                          step="5"
                          value={newTaskDuration}
                          onChange={(e) => setNewTaskDuration(e.target.value)}
                          className="w-14 rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-800"
                        />
                      </div>

                      <select
                        value={newTaskPriority}
                        onChange={(e) =>
                          setNewTaskPriority(e.target.value as "High" | "Medium" | "Low")
                        }
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800"
                      >
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                      </select>

                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          className="rounded px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50 hover:bg-stone-800"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="mt-4 flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
                  {filteredTasks.length === 0 ? (
                    <div className="py-12 text-center font-mono text-xs text-stone-400">
                      No tasks found in this view.
                    </div>
                  ) : (
                    filteredTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => toggleTask(t.id)}
                        className={`group flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                          t.completed
                            ? "border-stone-200 bg-stone-50/70 opacity-60"
                            : "border-stone-200 bg-[#FBFAF5] hover:border-stone-300 hover:bg-stone-100/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTask(t.id)
                            }}
                            className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              t.completed
                                ? "border-stone-900 bg-stone-900 text-stone-50"
                                : "border-stone-300 bg-white hover:border-stone-600"
                            }`}
                          >
                            {t.completed && <Check size={12} weight="bold" />}
                          </button>

                          <div>
                            <span
                              className={`text-xs font-medium ${
                                t.completed
                                  ? "line-through text-stone-400"
                                  : "text-stone-900"
                              }`}
                            >
                              {t.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-stone-500">
                              <span>{t.subject}</span>
                              <span>•</span>
                              <span>{t.durationMinutes}m</span>
                              <span>•</span>
                              <span>{t.scheduledTime}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium border ${
                            t.priority === "High"
                              ? "border-stone-900 bg-stone-900 text-stone-50"
                              : t.priority === "Medium"
                              ? "border-stone-300 bg-stone-100 text-stone-700"
                              : "border-stone-200 bg-white text-stone-500"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "planner" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Study Timetable & Planner
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Weekly Allocation: 28 Target Hours
                </p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-mono text-stone-800 hover:border-stone-900"
              >
                <CalendarCheck size={14} />
                <span>Sync Calendar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                <div
                  key={day}
                  className={`rounded-xl border p-3 flex flex-col justify-between min-h-[160px] ${
                    idx === 1
                      ? "border-stone-900 bg-white shadow-2xs"
                      : "border-stone-200 bg-[#FBFAF5]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900">{day}</span>
                    {idx === 1 && (
                      <span className="rounded bg-stone-900 px-1.5 py-0.2 text-[9px] font-mono text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 my-2">
                    <div className="rounded border border-stone-200 bg-white p-1.5 text-[10px] font-mono text-stone-700">
                      Calculus Drill (2h)
                    </div>
                    <div className="rounded border border-stone-200 bg-white p-1.5 text-[10px] font-mono text-stone-700">
                      Physics Problem Set (1.5h)
                    </div>
                  </div>
                  <div className="pt-2 border-t border-stone-100 font-mono text-[10px] text-stone-400">
                    Target: 3.5 hrs
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "syllabus" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Curriculum & Syllabus Breakdown
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Comprehensive topic coverage tracking
                </p>
              </div>
              <span className="rounded-lg bg-stone-900 px-3 py-1 text-xs font-mono text-stone-50">
                Overall: 68% Mastered
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SYLLABUS_MODULES.map((mod) => (
                <div
                  key={mod.subject}
                  className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base font-semibold text-stone-900">
                        {mod.subject}
                      </span>
                      <span className="font-mono text-sm font-bold text-stone-900">
                        {mod.pct}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full bg-stone-900"
                        style={{ width: `${mod.pct}%` }}
                      />
                    </div>

                    <div className="mt-4 space-y-2 text-xs font-mono text-stone-600">
                      <div className="flex justify-between">
                        <span>Topics Mastered:</span>
                        <span className="font-semibold text-stone-900">
                          {mod.completed} / {mod.topics}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-stone-100 text-[11px]">
                        <span className="text-stone-400 uppercase tracking-wider block text-[9px]">
                          Next Topic
                        </span>
                        <span className="font-sans font-medium text-stone-800">
                          {mod.nextMilestone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudyTopic(`${mod.subject}: ${mod.nextMilestone}`)
                      setActiveTab("overview")
                    }}
                    className="mt-5 w-full rounded-lg border border-stone-300 bg-[#FBFAF5] py-2 text-center text-xs font-mono text-stone-800 hover:border-stone-900 hover:bg-stone-100 transition-colors"
                  >
                    Open Topic Session
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "revision" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Spaced Repetition & Revision Decks
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Leitner 5-Box Spaced Schedule
                </p>
              </div>
              <span className="rounded-lg bg-stone-900 px-3 py-1 text-xs font-mono text-stone-50">
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
              ].map((b, i) => (
                <div
                  key={b.box}
                  className={`rounded-xl border p-4 text-center ${
                    i === 0
                      ? "border-stone-900 bg-white shadow-2xs"
                      : "border-stone-200 bg-[#FBFAF5]"
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-stone-800">{b.box}</span>
                  <div className="my-2 font-mono text-2xl font-bold text-stone-900">
                    {b.cards}
                  </div>
                  <span className="font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                    {b.interval}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Flashcard Review Block
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Active deck: Chemical Bonding, Thermodynamics & Rotational Dynamics.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudyTopic("Flashcard Deck: Box 1 Review")
                    setSelectedPreset("25/5")
                    setActiveTab("overview")
                  }}
                  className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-mono font-semibold text-stone-50 hover:bg-stone-800 transition-colors"
                >
                  Start Flashcard Review (25m)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "practice" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Practice Problem Drills
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Standard test bank questions & numerical sets
                </p>
              </div>
              <span className="font-mono text-xs text-stone-600">
                Solved: 1,420 Questions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Definite Integrals Drill", count: 25, diff: "Hard", accuracy: "72%" },
                { title: "Wave Optics Standard MCQs", count: 30, diff: "Medium", accuracy: "81%" },
                { title: "Coordination Compounds", count: 20, diff: "Easy", accuracy: "94%" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <span className="rounded border border-stone-200 bg-stone-100 px-2 py-0.5 font-mono text-[10px] text-stone-700">
                      {item.diff}
                    </span>
                    <h4 className="font-serif text-sm font-semibold text-stone-900 mt-2">
                      {item.title}
                    </h4>
                    <div className="mt-2 font-mono text-xs text-stone-500">
                      {item.count} Questions • Past Accuracy: {item.accuracy}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudyTopic(`Practice: ${item.title}`)
                      setSelectedPreset("30/5")
                      setActiveTab("overview")
                    }}
                    className="mt-4 rounded-lg border border-stone-300 bg-[#FBFAF5] py-1.5 text-center text-xs font-mono text-stone-800 hover:border-stone-900"
                  >
                    Solve Set
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "tests" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Mock Examinations & Assessments
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Timed test environments with percentile benchmarking
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 shadow-2xs">
              {[
                { name: "Full Length Mock Exam 04", duration: "180 min", score: "248/300", rank: "96.4th %ile", status: "Completed" },
                { name: "Sectional: Physics Mechanics", duration: "60 min", score: "82/100", rank: "91.2th %ile", status: "Completed" },
                { name: "Full Length Mock Exam 05", duration: "180 min", score: "—", rank: "Upcoming", status: "Ready" },
              ].map((test) => (
                <div key={test.name} className="flex items-center justify-between p-4">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">{test.name}</h4>
                    <span className="font-mono text-xs text-stone-500">
                      Duration: {test.duration} • Status: {test.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono text-xs">
                      <div className="font-bold text-stone-900">{test.score}</div>
                      <div className="text-stone-500">{test.rank}</div>
                    </div>
                    {test.status === "Ready" && (
                      <button
                        type="button"
                        className="rounded-lg bg-stone-900 px-3 py-1.5 font-mono text-xs font-medium text-stone-50 hover:bg-stone-800"
                      >
                        Start Test
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Performance & Focus Analytics
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Focus Efficiency Score & Retention metrics
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
                  Weekly Study Hours
                </span>
                <div className="my-2 font-mono text-3xl font-bold text-stone-900">
                  31.4 hrs
                </div>
                <span className="font-mono text-xs text-stone-600">+4.2 hrs over last week</span>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
                  Average FES
                </span>
                <div className="my-2 font-mono text-3xl font-bold text-stone-900">
                  88%
                </div>
                <span className="font-mono text-xs text-stone-600">Optimal deep work zone</span>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
                  Overall Accuracy
                </span>
                <div className="my-2 font-mono text-3xl font-bold text-stone-900">
                  78.2%
                </div>
                <span className="font-mono text-xs text-stone-600">Calculated over 850 questions</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "classroom" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Classroom & Faculty Notes
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Curated study materials & lecture handouts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Advanced Calculus Lecture 14 Notes", instructor: "Prof. H. Vance", date: "Yesterday" },
                { title: "Wave Theory & Superposition Summary", instructor: "Dr. K. Raman", date: "3 days ago" },
                { title: "Coordination Isomerism Handout", instructor: "Dr. S. Mehta", date: "Last week" },
                { title: "Previous 10 Years Question Solutions", instructor: "Academic Panel", date: "2 weeks ago" },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-stone-900">{c.title}</h4>
                    <span className="font-mono text-[11px] text-stone-500">
                      {c.instructor} • {c.date}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded border border-stone-300 px-2 py-1 font-mono text-xs text-stone-800 hover:border-stone-900"
                  >
                    <DownloadSimple size={14} />
                    <span>PDF</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "parent-mode" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">
                  Parent & Guardian Portal
                </h2>
                <p className="text-xs font-mono text-stone-500">
                  Verified study logs and milestone reports
                </p>
              </div>
              <span className="rounded border border-stone-300 bg-white px-2.5 py-1 font-mono text-xs text-stone-700 flex items-center gap-1">
                <Lock size={12} />
                PIN Verified
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Weekly Engagement Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-stone-100 bg-[#FBFAF5] p-3">
                  <span className="font-mono text-xs text-stone-500">Total Study Time</span>
                  <div className="font-mono text-xl font-bold text-stone-900 mt-1">28.5 hrs</div>
                </div>
                <div className="rounded-lg border border-stone-100 bg-[#FBFAF5] p-3">
                  <span className="font-mono text-xs text-stone-500">Attendance</span>
                  <div className="font-mono text-xl font-bold text-stone-900 mt-1">100%</div>
                </div>
                <div className="rounded-lg border border-stone-100 bg-[#FBFAF5] p-3">
                  <span className="font-mono text-xs text-stone-500">Discipline Score</span>
                  <div className="font-mono text-xl font-bold text-stone-900 mt-1">92 / 100</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
