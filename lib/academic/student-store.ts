"use client"

// ---------------------------------------------------------------------------
// Zenithsui Student Hub Unified Store
//
// Manual student-controlled scheduling, syllabus management, and study materials.
// Decoupled from canvas document history.
// Local-first persistence via localStorage with offline resilience.
// ---------------------------------------------------------------------------

import { create } from "zustand"

export type ActivityType =
  | "Study"
  | "Revision"
  | "Practice"
  | "Homework"
  | "Assignment"
  | "Exam"
  | "Mock Test"
  | "Reading"
  | "Personal"
  | "Other"

export type ActivityPriority = "High" | "Medium" | "Low"

export interface CalendarActivity {
  id: string
  title: string
  type: ActivityType
  subjectId?: string
  subjectName?: string
  chapterId?: string
  chapterName?: string
  topicId?: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm (24h)
  endTime?: string // HH:mm (24h)
  durationMinutes: number
  status: "pending" | "completed"
  priority: ActivityPriority
  notes?: string
  location?: string
  isAllDay?: boolean
  recurrence?: "none" | "daily" | "weekly"
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type GoalStatus = "upcoming" | "due_today" | "completed" | "overdue" | "cancelled"

export interface ChapterCompletionGoal {
  id: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterName: string
  targetDate: string // YYYY-MM-DD
  status: GoalStatus
  notes?: string
  completedAt?: string | null // YYYY-MM-DD
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
}

export type SubjectPriority = "high" | "medium" | "low"

export interface StudentSubject {
  id: string
  name: string
  shortName?: string
  priority: SubjectPriority
  targetPercentage?: number
  sortOrder: number
  archived: boolean
  createdAt: string
}

export type ChapterStatus = "not_started" | "in_progress" | "completed"

export interface StudentChapter {
  id: string
  subjectId: string
  name: string
  description?: string
  sortOrder: number
  status: ChapterStatus
  completedAt?: string | null // YYYY-MM-DD
  createdAt: string
}

export type MaterialType = "note" | "pdf" | "image" | "document" | "link" | "canvas"

export interface StudyMaterial {
  id: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterName: string
  type: MaterialType
  title: string
  description?: string
  content?: string // Text body for notes
  storagePath?: string
  externalUrl?: string
  fileSize?: string
  mimeType?: string
  favorite: boolean
  pinned: boolean
  canvasId?: string
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string
}

// ── Initial Seed Data ─────────────────────────────────────────────────────────

const INITIAL_SUBJECTS: StudentSubject[] = [
  {
    id: "sub-math",
    name: "Mathematics",
    shortName: "Maths",
    priority: "high",
    targetPercentage: 85,
    sortOrder: 1,
    archived: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "sub-sci",
    name: "Science",
    shortName: "Sci",
    priority: "high",
    targetPercentage: 90,
    sortOrder: 2,
    archived: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "sub-eng",
    name: "English Literature",
    shortName: "Eng",
    priority: "medium",
    targetPercentage: 80,
    sortOrder: 3,
    archived: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "sub-sst",
    name: "Social Science",
    shortName: "SST",
    priority: "medium",
    targetPercentage: 75,
    sortOrder: 4,
    archived: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
]

const INITIAL_CHAPTERS: StudentChapter[] = [
  // Mathematics
  { id: "chap-m1", subjectId: "sub-math", name: "Real Numbers", sortOrder: 1, status: "completed", completedAt: "2026-09-15", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-m2", subjectId: "sub-math", name: "Polynomials", sortOrder: 2, status: "completed", completedAt: "2026-09-22", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-m3", subjectId: "sub-math", name: "Pair of Linear Equations", sortOrder: 3, status: "completed", completedAt: "2026-09-28", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-m4", subjectId: "sub-math", name: "Quadratic Equations", sortOrder: 4, status: "in_progress", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-m5", subjectId: "sub-math", name: "Arithmetic Progressions", sortOrder: 5, status: "not_started", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-m6", subjectId: "sub-math", name: "Triangles & Coordinate Geometry", sortOrder: 6, status: "not_started", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },

  // Science
  { id: "chap-s1", subjectId: "sub-sci", name: "Chemical Reactions & Equations", sortOrder: 1, status: "completed", completedAt: "2026-09-12", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-s2", subjectId: "sub-sci", name: "Acids, Bases and Salts", sortOrder: 2, status: "completed", completedAt: "2026-09-20", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-s3", subjectId: "sub-sci", name: "Life Processes", sortOrder: 3, status: "in_progress", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-s4", subjectId: "sub-sci", name: "Control and Coordination", sortOrder: 4, status: "not_started", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-s5", subjectId: "sub-sci", name: "Light: Reflection & Refraction", sortOrder: 5, status: "not_started", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },

  // English
  { id: "chap-e1", subjectId: "sub-eng", name: "A Letter to God", sortOrder: 1, status: "completed", completedAt: "2026-09-05", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-e2", subjectId: "sub-eng", name: "Nelson Mandela: Long Walk to Freedom", sortOrder: 2, status: "completed", completedAt: "2026-09-18", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-e3", subjectId: "sub-eng", name: "The Ball Poem & Two Stories About Flying", sortOrder: 3, status: "in_progress", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },

  // SST
  { id: "chap-ss1", subjectId: "sub-sst", name: "Resources and Development", sortOrder: 1, status: "completed", completedAt: "2026-09-10", createdAt: "2026-09-01T00:00:00.000Z" },
  { id: "chap-ss2", subjectId: "sub-sst", name: "Power Sharing", sortOrder: 2, status: "in_progress", completedAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
]

function getFormattedDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

let _academicIdCounter = 0
function generateAcademicId(prefix: string): string {
  _academicIdCounter = (_academicIdCounter + 1) % 1000000
  return `${prefix}-${Date.now()}-${_academicIdCounter}-${Math.random().toString(36).slice(2, 7)}`
}

const INITIAL_GOALS: ChapterCompletionGoal[] = [
  {
    id: "goal-1",
    subjectId: "sub-math",
    subjectName: "Mathematics",
    chapterId: "chap-m4",
    chapterName: "Quadratic Equations",
    targetDate: getFormattedDate(6), // e.g. 5-6 days ahead
    status: "upcoming",
    notes: "Finish NCERT exercises + 15 PYQs",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "goal-2",
    subjectId: "sub-sci",
    subjectName: "Science",
    chapterId: "chap-s3",
    chapterName: "Life Processes",
    targetDate: getFormattedDate(9),
    status: "upcoming",
    notes: "Review all diagrams (Heart, Kidney, Photosynthesis)",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
]

const INITIAL_ACTIVITIES: CalendarActivity[] = [
  {
    id: "act-1",
    title: "Practice Quadratic Equations Exercise 4.2",
    type: "Practice",
    subjectId: "sub-math",
    subjectName: "Mathematics",
    chapterId: "chap-m4",
    chapterName: "Quadratic Equations",
    date: getFormattedDate(0), // Today
    startTime: "16:00",
    endTime: "17:00",
    durationMinutes: 60,
    status: "pending",
    priority: "High",
    notes: "Roots of equation by factorisation",
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
  },
  {
    id: "act-2",
    title: "Life Processes NCERT Theory Revision",
    type: "Revision",
    subjectId: "sub-sci",
    subjectName: "Science",
    chapterId: "chap-s3",
    chapterName: "Life Processes",
    date: getFormattedDate(0), // Today
    startTime: "18:00",
    endTime: "19:00",
    durationMinutes: 60,
    status: "completed",
    priority: "Medium",
    notes: "Nutrition in human beings & digestion diagram",
    completedAt: getFormattedDate(0),
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
  },
  {
    id: "act-3",
    title: "English Poetry Analysis: The Ball Poem",
    type: "Study",
    subjectId: "sub-eng",
    subjectName: "English Literature",
    chapterId: "chap-e3",
    chapterName: "The Ball Poem",
    date: getFormattedDate(1), // Tomorrow
    startTime: "20:00",
    endTime: "20:45",
    durationMinutes: 45,
    status: "pending",
    priority: "Medium",
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
  },
]

const INITIAL_MATERIALS: StudyMaterial[] = [
  {
    id: "mat-1",
    subjectId: "sub-math",
    subjectName: "Mathematics",
    chapterId: "chap-m4",
    chapterName: "Quadratic Equations",
    type: "note",
    title: "Quadratic Formula & Nature of Roots Notes",
    description: "Derivation of ax² + bx + c = 0, discriminant conditions D > 0, D = 0, D < 0",
    content: `# Quadratic Equations Summary\n\nStandard Form: ax² + bx + c = 0 (a ≠ 0)\n\nQuadratic Formula:\nx = (-b ± √(b² - 4ac)) / (2a)\n\nDiscriminant (D = b² - 4ac):\n- D > 0 : Two distinct real roots\n- D = 0 : Two equal real roots\n- D < 0 : No real roots\n\nKey Formulas to remember for word problems:\n1. Speed = Distance / Time\n2. Work done = Total work / Days`,
    favorite: true,
    pinned: true,
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-09-25T10:00:00.000Z",
  },
  {
    id: "mat-2",
    subjectId: "sub-math",
    subjectName: "Mathematics",
    chapterId: "chap-m4",
    chapterName: "Quadratic Equations",
    type: "pdf",
    title: "NCERT Chapter 4 — Quadratic Equations.pdf",
    description: "Official NCERT chapter textbook scan with full exemplar problems",
    fileSize: "3.4 MB",
    mimeType: "application/pdf",
    favorite: false,
    pinned: false,
    createdAt: "2026-09-26T14:30:00.000Z",
    updatedAt: "2026-09-26T14:30:00.000Z",
  },
  {
    id: "mat-3",
    subjectId: "sub-sci",
    subjectName: "Science",
    chapterId: "chap-s3",
    chapterName: "Life Processes",
    type: "image",
    title: "Human Digestive System Schematic.png",
    description: "High resolution labeled diagram including liver, pancreas, duodenum, stomach",
    fileSize: "1.8 MB",
    mimeType: "image/png",
    favorite: true,
    pinned: true,
    createdAt: "2026-09-27T09:15:00.000Z",
    updatedAt: "2026-09-27T09:15:00.000Z",
  },
  {
    id: "mat-4",
    subjectId: "sub-sci",
    subjectName: "Science",
    chapterId: "chap-s3",
    chapterName: "Life Processes",
    type: "canvas",
    title: "Respiration & Circulation Mind Map",
    description: "Zenithsui infinite canvas diagram of aerobic vs anaerobic respiration pathways",
    favorite: false,
    pinned: false,
    createdAt: "2026-09-28T16:00:00.000Z",
    updatedAt: "2026-09-28T16:00:00.000Z",
  },
]

// ── Store Interface ───────────────────────────────────────────────────────────

interface StudentState {
  // Navigation & Date
  selectedDate: string // YYYY-MM-DD
  calendarView: "month" | "week" | "day"
  notesSelectedSubjectId: string
  notesSelectedChapterId: string | null

  // Syllabus
  subjects: StudentSubject[]
  chapters: StudentChapter[]

  // Goals
  goals: ChapterCompletionGoal[]

  // Activities
  activities: CalendarActivity[]

  // Study Materials
  materials: StudyMaterial[]

  // Target hours
  weeklyTargetHours: number

  // Actions: Date & Navigation
  setSelectedDate: (date: string) => void
  setCalendarView: (view: "month" | "week" | "day") => void
  setNotesSelection: (subjectId: string, chapterId?: string | null) => void
  setWeeklyTargetHours: (hours: number) => void

  // Actions: Syllabus (Subjects)
  addSubject: (name: string, shortName?: string, priority?: SubjectPriority, targetPercentage?: number) => string
  updateSubject: (id: string, updates: Partial<StudentSubject>) => void
  archiveSubject: (id: string) => void
  deleteSubject: (id: string) => void
  reorderSubjects: (subjectIds: string[]) => void

  // Actions: Syllabus (Chapters)
  addChapter: (subjectId: string, name: string, description?: string, targetDate?: string) => string
  updateChapter: (id: string, updates: Partial<StudentChapter>) => void
  toggleChapterComplete: (id: string, isComplete?: boolean) => void
  reorderChapters: (subjectId: string, chapterIds: string[]) => void
  deleteChapter: (id: string) => void

  // Actions: Chapter Goals
  setChapterGoal: (subjectId: string, chapterId: string, targetDate: string, notes?: string) => void
  updateChapterGoalDate: (goalId: string, newDate: string) => void
  cancelChapterGoal: (goalId: string) => void

  // Actions: Activities
  addActivity: (activity: Omit<CalendarActivity, "id" | "createdAt" | "updatedAt">) => string
  updateActivity: (id: string, updates: Partial<CalendarActivity>) => void
  toggleActivityComplete: (id: string) => void
  deleteActivity: (id: string) => void
  duplicateActivity: (id: string, targetDate: string) => void
  moveActivity: (id: string, newDate: string, newStartTime?: string, newEndTime?: string) => void

  // Actions: Study Materials
  addMaterial: (material: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt" | "favorite" | "pinned">) => string
  updateMaterial: (id: string, updates: Partial<StudyMaterial>) => void
  deleteMaterial: (id: string) => void
  toggleFavoriteMaterial: (id: string) => void
  togglePinMaterial: (id: string) => void
  moveMaterial: (id: string, newSubjectId: string, newChapterId: string) => void
  recordMaterialOpened: (id: string) => void
}

const STORAGE_KEY = "zenithsui:student:v1"

function loadInitialState() {
  if (typeof window === "undefined") {
    return {
      subjects: INITIAL_SUBJECTS,
      chapters: INITIAL_CHAPTERS,
      goals: INITIAL_GOALS,
      activities: INITIAL_ACTIVITIES,
      materials: INITIAL_MATERIALS,
      weeklyTargetHours: 28,
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        subjects: parsed.subjects ?? INITIAL_SUBJECTS,
        chapters: parsed.chapters ?? INITIAL_CHAPTERS,
        goals: parsed.goals ?? INITIAL_GOALS,
        activities: parsed.activities ?? INITIAL_ACTIVITIES,
        materials: parsed.materials ?? INITIAL_MATERIALS,
        weeklyTargetHours: parsed.weeklyTargetHours ?? 28,
      }
    }
  } catch (err) {
    console.error("Failed to load student state from localStorage", err)
  }

  return {
    subjects: INITIAL_SUBJECTS,
    chapters: INITIAL_CHAPTERS,
    goals: INITIAL_GOALS,
    activities: INITIAL_ACTIVITIES,
    materials: INITIAL_MATERIALS,
    weeklyTargetHours: 28,
  }
}

function persistState(state: Partial<StudentState>) {
  if (typeof window === "undefined") return
  try {
    const data = {
      subjects: state.subjects,
      chapters: state.chapters,
      goals: state.goals,
      activities: state.activities,
      materials: state.materials,
      weeklyTargetHours: state.weeklyTargetHours,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error("Failed to persist student state to localStorage", err)
  }
}

export const useStudentStore = create<StudentState>((set, get) => {
  const initial = loadInitialState()

  return {
    selectedDate: getFormattedDate(0),
    calendarView: "month",
    notesSelectedSubjectId: "sub-math",
    notesSelectedChapterId: "chap-m4",

    subjects: initial.subjects,
    chapters: initial.chapters,
    goals: initial.goals,
    activities: initial.activities,
    materials: initial.materials,
    weeklyTargetHours: initial.weeklyTargetHours,

    setSelectedDate: (selectedDate) => set({ selectedDate }),
    setCalendarView: (calendarView) => set({ calendarView }),
    setNotesSelection: (subjectId, chapterId = null) =>
      set({ notesSelectedSubjectId: subjectId, notesSelectedChapterId: chapterId }),
    setWeeklyTargetHours: (weeklyTargetHours) => {
      set({ weeklyTargetHours })
      persistState(get())
    },

    // ── Subjects ──────────────────────────────────────────────────────────────
    addSubject: (name, shortName, priority = "medium", targetPercentage = 80) => {
      const id = generateAcademicId("sub")
      const newSub: StudentSubject = {
        id,
        name: name.trim(),
        shortName: shortName?.trim() || name.slice(0, 4),
        priority,
        targetPercentage,
        sortOrder: get().subjects.length + 1,
        archived: false,
        createdAt: new Date().toISOString(),
      }
      set((state) => ({ subjects: [...state.subjects, newSub] }))
      persistState(get())
      return id
    },

    updateSubject: (id, updates) => {
      set((state) => ({
        subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }))
      persistState(get())
    },

    archiveSubject: (id) => {
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, archived: !s.archived } : s
        ),
      }))
      persistState(get())
    },

    deleteSubject: (id) => {
      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== id),
        chapters: state.chapters.filter((c) => c.subjectId !== id),
        goals: state.goals.filter((g) => g.subjectId !== id),
        activities: state.activities.filter((a) => a.subjectId !== id),
        materials: state.materials.filter((m) => m.subjectId !== id),
      }))
      persistState(get())
    },

    reorderSubjects: (subjectIds) => {
      set((state) => {
        const map = new Map(state.subjects.map((s) => [s.id, s]))
        const reordered: StudentSubject[] = []
        subjectIds.forEach((id, index) => {
          const s = map.get(id)
          if (s) reordered.push({ ...s, sortOrder: index + 1 })
        })
        return { subjects: reordered }
      })
      persistState(get())
    },

    // ── Chapters ──────────────────────────────────────────────────────────────
    addChapter: (subjectId, name, description, targetDate) => {
      const id = generateAcademicId("chap")
      const newChap: StudentChapter = {
        id,
        subjectId,
        name: name.trim(),
        description: description?.trim(),
        sortOrder: get().chapters.filter((c) => c.subjectId === subjectId).length + 1,
        status: "not_started",
        completedAt: null,
        createdAt: new Date().toISOString(),
      }

      set((state) => ({ chapters: [...state.chapters, newChap] }))

      if (targetDate) {
        const sub = get().subjects.find((s) => s.id === subjectId)
        get().setChapterGoal(subjectId, id, targetDate)
      }

      persistState(get())
      return id
    },

    updateChapter: (id, updates) => {
      set((state) => ({
        chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }))
      persistState(get())
    },

    toggleChapterComplete: (id, forceComplete) => {
      const today = getFormattedDate(0)
      set((state) => {
        const targetChapter = state.chapters.find((c) => c.id === id)
        if (!targetChapter) return state

        const shouldComplete =
          forceComplete !== undefined ? forceComplete : targetChapter.status !== "completed"

        const nextStatus: ChapterStatus = shouldComplete ? "completed" : "in_progress"
        const nextCompletedAt = shouldComplete ? today : null

        // Update corresponding goals if any
        const updatedGoals = state.goals.map((g) => {
          if (g.chapterId === id) {
            if (shouldComplete) {
              return { ...g, status: "completed" as GoalStatus, completedAt: today, updatedAt: new Date().toISOString() }
            } else {
              // Recompute status based on target date
              const isPast = g.targetDate < today
              const isToday = g.targetDate === today
              const status: GoalStatus = isPast ? "overdue" : isToday ? "due_today" : "upcoming"
              return { ...g, status, completedAt: null, updatedAt: new Date().toISOString() }
            }
          }
          return g
        })

        return {
          chapters: state.chapters.map((c) =>
            c.id === id ? { ...c, status: nextStatus, completedAt: nextCompletedAt } : c
          ),
          goals: updatedGoals,
        }
      })
      persistState(get())
    },

    reorderChapters: (subjectId, chapterIds) => {
      set((state) => {
        const relevant = state.chapters.filter((c) => c.subjectId === subjectId)
        const others = state.chapters.filter((c) => c.subjectId !== subjectId)
        const map = new Map(relevant.map((c) => [c.id, c]))
        const reordered: StudentChapter[] = []
        chapterIds.forEach((id, index) => {
          const c = map.get(id)
          if (c) reordered.push({ ...c, sortOrder: index + 1 })
        })
        return { chapters: [...others, ...reordered] }
      })
      persistState(get())
    },

    deleteChapter: (id) => {
      set((state) => ({
        chapters: state.chapters.filter((c) => c.id !== id),
        goals: state.goals.filter((g) => g.chapterId !== id),
        activities: state.activities.map((a) =>
          a.chapterId === id ? { ...a, chapterId: undefined, chapterName: undefined } : a
        ),
        materials: state.materials.map((m) =>
          m.chapterId === id ? { ...m, chapterId: "", chapterName: "" } : m
        ),
      }))
      persistState(get())
    },

    // ── Chapter Completion Goals ──────────────────────────────────────────────
    setChapterGoal: (subjectId, chapterId, targetDate, notes) => {
      const today = getFormattedDate(0)
      const sub = get().subjects.find((s) => s.id === subjectId)
      const chap = get().chapters.find((c) => c.id === chapterId)
      if (!chap) return

      const isCompleted = chap.status === "completed"
      const isPast = targetDate < today
      const isToday = targetDate === today
      const status: GoalStatus = isCompleted
        ? "completed"
        : isPast
        ? "overdue"
        : isToday
        ? "due_today"
        : "upcoming"

      // Check if goal for chapter already exists
      const existing = get().goals.find((g) => g.chapterId === chapterId && g.status !== "cancelled")

      if (existing) {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === existing.id
              ? {
                  ...g,
                  targetDate,
                  notes: notes !== undefined ? notes : g.notes,
                  status,
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
        }))
      } else {
        const newGoal: ChapterCompletionGoal = {
          id: generateAcademicId("goal"),
          subjectId,
          subjectName: sub?.name || "Subject",
          chapterId,
          chapterName: chap.name,
          targetDate,
          status,
          notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ goals: [...state.goals, newGoal] }))
      }
      persistState(get())
    },

    updateChapterGoalDate: (goalId, newDate) => {
      const today = getFormattedDate(0)
      set((state) => ({
        goals: state.goals.map((g) => {
          if (g.id !== goalId) return g
          const isCompleted = g.status === "completed"
          const isPast = newDate < today
          const isToday = newDate === today
          const status: GoalStatus = isCompleted
            ? "completed"
            : isPast
            ? "overdue"
            : isToday
            ? "due_today"
            : "upcoming"

          return {
            ...g,
            targetDate: newDate,
            status,
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
      persistState(get())
    },

    cancelChapterGoal: (goalId) => {
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId
            ? { ...g, status: "cancelled" as GoalStatus, cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : g
        ),
      }))
      persistState(get())
    },

    // ── Activities ────────────────────────────────────────────────────────────
    addActivity: (input) => {
      const id = (input as any).id || generateAcademicId("act")
      const newAct: CalendarActivity = {
        ...input,
        id,
        status: input.status || "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((state) => ({ activities: [...state.activities, newAct] }))
      persistState(get())
      return id
    },

    updateActivity: (id, updates) => {
      set((state) => ({
        activities: state.activities.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        ),
      }))
      persistState(get())
    },

    toggleActivityComplete: (id) => {
      const today = getFormattedDate(0)
      set((state) => ({
        activities: state.activities.map((a) => {
          if (a.id !== id) return a
          const nextStatus = a.status === "completed" ? "pending" : "completed"
          return {
            ...a,
            status: nextStatus,
            completedAt: nextStatus === "completed" ? today : null,
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
      persistState(get())
    },

    deleteActivity: (id) => {
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== id),
      }))
      persistState(get())
    },

    duplicateActivity: (id, targetDate) => {
      const act = get().activities.find((a) => a.id === id)
      if (!act) return
      const newId = generateAcademicId("act")
      const copy: CalendarActivity = {
        ...act,
        id: newId,
        date: targetDate,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((state) => ({ activities: [...state.activities, copy] }))
      persistState(get())
    },

    moveActivity: (id, newDate, newStartTime, newEndTime) => {
      set((state) => ({
        activities: state.activities.map((a) => {
          if (a.id !== id) return a
          return {
            ...a,
            date: newDate,
            startTime: newStartTime !== undefined ? newStartTime : a.startTime,
            endTime: newEndTime !== undefined ? newEndTime : a.endTime,
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
      persistState(get())
    },

    // ── Study Materials ───────────────────────────────────────────────────────
    addMaterial: (input) => {
      const id = generateAcademicId("mat")
      const newMat: StudyMaterial = {
        ...input,
        id,
        favorite: false,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((state) => ({ materials: [...state.materials, newMat] }))
      persistState(get())
      return id
    },

    updateMaterial: (id, updates) => {
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
        ),
      }))
      persistState(get())
    },

    deleteMaterial: (id) => {
      set((state) => ({
        materials: state.materials.filter((m) => m.id !== id),
      }))
      persistState(get())
    },

    toggleFavoriteMaterial: (id) => {
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, favorite: !m.favorite, updatedAt: new Date().toISOString() } : m
        ),
      }))
      persistState(get())
    },

    togglePinMaterial: (id) => {
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, pinned: !m.pinned, updatedAt: new Date().toISOString() } : m
        ),
      }))
      persistState(get())
    },

    moveMaterial: (id, newSubjectId, newChapterId) => {
      const sub = get().subjects.find((s) => s.id === newSubjectId)
      const chap = get().chapters.find((c) => c.id === newChapterId)
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id
            ? {
                ...m,
                subjectId: newSubjectId,
                subjectName: sub?.name || "Subject",
                chapterId: newChapterId,
                chapterName: chap?.name || "Chapter",
                updatedAt: new Date().toISOString(),
              }
            : m
        ),
      }))
      persistState(get())
    },

    recordMaterialOpened: (id) => {
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, lastOpenedAt: new Date().toISOString() } : m
        ),
      }))
      persistState(get())
    },
  }
})
