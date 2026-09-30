import {
  ACADEMIC_STORES,
  ACADEMIC_MUTATIONS_STORE,
  openAcademicDb,
  listAcademicItems,
  clearAcademicMemoryStores,
  clearAcademicMutations,
} from "../storage/academic-db"
import { createClient } from "../supabase/client"

export interface StudentProfileExport {
  id: string
  studentId: string
  gradeLevel?: string
  institutionName?: string
  timezone?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface AcademicYearExport {
  id: string
  studentId: string
  name: string
  startDate: string
  endDate: string
  gradeLevel?: string
  status: "planning" | "active" | "archived"
  isCurrent?: boolean
  isArchived?: boolean
  archivedAt?: string | null
  createdAt?: string
  updatedAt?: string
  subjects?: SubjectExport[]
}

export interface SubjectExport {
  id: string
  studentId?: string
  academicYearId?: string
  code: string
  name: string
  colorHex?: string
  baselinePriority?: number
  targetWeeklyMinutes?: number
  isActive?: boolean
  units?: UnitExport[]
}

export interface UnitExport {
  id: string
  subjectId: string
  name: string
  order?: number
  chapters?: ChapterExport[]
}

export interface ChapterExport {
  id: string
  unitId: string
  name: string
  order?: number
  status?: string
  confidenceScore?: number
  topics?: TopicExport[]
}

export interface TopicExport {
  id: string
  chapterId?: string
  subjectId?: string
  name: string
  status?: string
  masteryPercentage?: number
  confidenceScore?: number
  estimatedHours?: number
  lastStudiedAt?: string | null
  completedAt?: string | null
}

export interface SyllabusProgressExport {
  id?: string
  topicId: string
  subjectId?: string
  studentId?: string
  status: string
  masteryPercentage: number
  lastStudiedAt?: string | null
  completedAt?: string | null
  updatedAt?: string
}

export interface StudyTaskExport {
  id: string
  studentId?: string
  title: string
  description?: string
  subject?: string
  subjectId?: string
  date: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  status: string
  priority?: string
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FlashcardDeckExport {
  id: string
  studentId?: string
  subjectId?: string
  title: string
  description?: string
  cardCount?: number
  createdAt?: string
  cards?: FlashcardExport[]
}

export interface FlashcardExport {
  id: string
  deckId?: string
  studentId?: string
  subjectId?: string
  topicId?: string
  front: string
  back: string
  status?: string
  interval?: number
  easeFactor?: number
  repetitionCount?: number
  nextReviewAt?: string | null
  lastReviewedAt?: string | null
  createdAt?: string
}

export interface QuestionAttemptExport {
  id: string
  studentId?: string
  questionId?: string
  testId?: string
  subjectId?: string
  topicId?: string
  selectedAnswer?: unknown
  isCorrect: boolean
  timeSpentSeconds: number
  attemptedAt?: string
}

export interface MistakeExport {
  id: string
  mistakeId?: string
  studentId?: string
  subjectId?: string
  subjectCode?: string
  topicId?: string
  questionId?: string
  title?: string
  category: string
  status?: string
  studentAnswer?: string
  correctSolution?: string
  studentReflection?: string
  correctiveAction?: string
  isResolved?: boolean
  reviewCount?: number
  nextReviewAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface MarkExport {
  id: string
  studentId?: string
  subjectId?: string
  subjectCode?: string
  subjectName?: string
  assessmentTitle?: string
  assessmentType?: string
  scheduledDate?: string
  scoredMarks: number
  maxMarks: number
  percentage?: number
  grade?: string | null
  percentile?: number | null
  feedback?: string | null
  recordedAt?: string
}

export interface FocusSessionExport {
  id: string
  studentId?: string
  subjectId?: string
  subjectCode?: string
  startTime: string
  endTime?: string
  durationSeconds: number
  mode?: string
  activeTool?: string
  focusScore?: number | null
  completed?: boolean
  createdAt?: string
}

export interface StudentDataBundle {
  exportMetadata: {
    bundleVersion: string
    exportedAt: string
    studentId: string
    application: string
  }
  studentProfile: StudentProfileExport
  academicYears: AcademicYearExport[]
  syllabusProgress: SyllabusProgressExport[]
  studyTasks: StudyTaskExport[]
  flashcards: {
    decks: FlashcardDeckExport[]
    cards: FlashcardExport[]
  }
  questionAttempts: QuestionAttemptExport[]
  mistakes: MistakeExport[]
  marks: MarkExport[]
  focusSessionLogs: FocusSessionExport[]
}

export interface AcademicYearArchiveSnapshot {
  yearId: string
  studentId: string
  name: string
  startDate: string
  endDate: string
  gradeLevel: string
  archivedAt: string
  snapshotData: {
    subjects: SubjectExport[]
    syllabusProgress: SyllabusProgressExport[]
    marks: MarkExport[]
    tasks: StudyTaskExport[]
  }
}

export interface NewYearDetails {
  name: string
  startDate: string
  endDate: string
  gradeLevel: string
  cloneSubjects: boolean
}

const memoryProfiles = new Map<string, StudentProfileExport>()
const memoryAcademicYears = new Map<string, AcademicYearExport>()
const memorySubjects = new Map<string, SubjectExport>()
const memoryUnits = new Map<string, UnitExport>()
const memoryChapters = new Map<string, ChapterExport>()
const memoryTopics = new Map<string, TopicExport>()
const memorySyllabusProgress = new Map<string, SyllabusProgressExport>()
const memoryStudyTasks = new Map<string, StudyTaskExport>()
const memoryFlashcardDecks = new Map<string, FlashcardDeckExport>()
const memoryFlashcards = new Map<string, FlashcardExport>()
const memoryQuestionAttempts = new Map<string, QuestionAttemptExport>()
const memoryMistakes = new Map<string, MistakeExport>()
const memoryMarks = new Map<string, MarkExport>()
const memoryFocusSessions = new Map<string, FocusSessionExport>()
const memoryArchiveSnapshots = new Map<string, AcademicYearArchiveSnapshot>()

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return ""
  }
  const str = String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(",")
}

export function registerStudentProfile(profile: StudentProfileExport): void {
  memoryProfiles.set(profile.studentId, { ...profile })
}

export function registerAcademicYear(year: AcademicYearExport): void {
  memoryAcademicYears.set(year.id, { ...year })
  if (year.subjects) {
    for (const subj of year.subjects) {
      registerSubject(subj)
    }
  }
}

export function registerSubject(subject: SubjectExport): void {
  memorySubjects.set(subject.id, { ...subject })
  if (subject.units) {
    for (const unit of subject.units) {
      memoryUnits.set(unit.id, { ...unit })
      if (unit.chapters) {
        for (const chap of unit.chapters) {
          memoryChapters.set(chap.id, { ...chap })
          if (chap.topics) {
            for (const top of chap.topics) {
              memoryTopics.set(top.id, { ...top, chapterId: chap.id, subjectId: subject.id })
            }
          }
        }
      }
    }
  }
}

export function registerStudyTask(task: StudyTaskExport): void {
  memoryStudyTasks.set(task.id, { ...task })
}

export function registerMistake(mistake: MistakeExport): void {
  const id = mistake.mistakeId || mistake.id
  memoryMistakes.set(id, { ...mistake, id, mistakeId: id })
}

export function registerMark(mark: MarkExport): void {
  memoryMarks.set(mark.id, { ...mark })
}

export function registerFocusSession(session: FocusSessionExport): void {
  memoryFocusSessions.set(session.id, { ...session })
}

export function registerFlashcard(card: FlashcardExport): void {
  memoryFlashcards.set(card.id, { ...card })
}

export function registerQuestionAttempt(attempt: QuestionAttemptExport): void {
  memoryQuestionAttempts.set(attempt.id, { ...attempt })
}

export function getAcademicYearArchiveSnapshot(
  yearId: string
): AcademicYearArchiveSnapshot | null {
  return memoryArchiveSnapshots.get(yearId) || null
}

export async function exportStudentDataAsJson(studentId: string): Promise<string> {
  const client = createClient()
  let profile: StudentProfileExport | null = memoryProfiles.get(studentId) || null

  try {
    const { data, error } = await client
      .from("student_profiles")
      .select("*")
      .eq("id", studentId)
      .maybeSingle()

    if (!error && data) {
      const rec = data as Record<string, unknown>
      profile = {
        id: String(rec.id || studentId),
        studentId: String(rec.id || studentId),
        gradeLevel: typeof rec.grade_level === "string" ? rec.grade_level : undefined,
        institutionName: typeof rec.institution_name === "string" ? rec.institution_name : undefined,
        timezone: typeof rec.default_timezone === "string" ? rec.default_timezone : "UTC",
        status: typeof rec.status === "string" ? rec.status : "active",
        createdAt: typeof rec.created_at === "string" ? rec.created_at : undefined,
        updatedAt: typeof rec.updated_at === "string" ? rec.updated_at : undefined,
      }
    }
  } catch {}

  if (!profile) {
    profile = {
      id: studentId,
      studentId,
      gradeLevel: "Grade 11",
      institutionName: "",
      timezone: "UTC",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const yearsMap = new Map<string, AcademicYearExport>()
  for (const [id, yr] of memoryAcademicYears.entries()) {
    if (yr.studentId === studentId) {
      yearsMap.set(id, { ...yr })
    }
  }

  try {
    const { data: dbYears, error } = await client
      .from("student_academic_years")
      .select("*")
      .eq("student_id", studentId)

    if (!error && Array.isArray(dbYears)) {
      for (const row of dbYears) {
        const r = row as Record<string, unknown>
        const yId = String(r.id)
        const existing = yearsMap.get(yId) || {
          id: yId,
          studentId,
          name: String(r.name || "Academic Year"),
          startDate: String(r.start_date || ""),
          endDate: String(r.end_date || ""),
          status: (r.status as "planning" | "active" | "archived") || "active",
        }
        existing.gradeLevel = typeof r.grade_level === "string" ? r.grade_level : existing.gradeLevel
        existing.status = (r.status as "planning" | "active" | "archived") || existing.status
        existing.isArchived = r.status === "archived"
        existing.archivedAt = typeof r.archived_at === "string" ? r.archived_at : null
        existing.createdAt = typeof r.created_at === "string" ? r.created_at : existing.createdAt
        existing.updatedAt = typeof r.updated_at === "string" ? r.updated_at : existing.updatedAt
        yearsMap.set(yId, existing)
      }
    }
  } catch {}

  const subjectsList: SubjectExport[] = []
  for (const subj of memorySubjects.values()) {
    if (!subj.studentId || subj.studentId === studentId) {
      subjectsList.push({ ...subj })
    }
  }

  try {
    const { data: dbSubjects, error } = await client
      .from("academic_subjects")
      .select("*")
      .eq("student_id", studentId)

    if (!error && Array.isArray(dbSubjects)) {
      for (const row of dbSubjects) {
        const r = row as Record<string, unknown>
        const sId = String(r.id)
        const match = subjectsList.find((s) => s.id === sId)
        if (!match) {
          subjectsList.push({
            id: sId,
            studentId,
            academicYearId: typeof r.academic_year_id === "string" ? r.academic_year_id : undefined,
            code: String(r.code || ""),
            name: String(r.name || ""),
            colorHex: typeof r.color_hex === "string" ? r.color_hex : "#2563eb",
            baselinePriority: typeof r.baseline_priority === "number" ? r.baseline_priority : 3,
            targetWeeklyMinutes: typeof r.target_weekly_minutes === "number" ? r.target_weekly_minutes : 300,
            isActive: typeof r.is_active === "boolean" ? r.is_active : true,
          })
        }
      }
    }
  } catch {}

  const yearsArray: AcademicYearExport[] = Array.from(yearsMap.values())
  for (const yr of yearsArray) {
    yr.subjects = subjectsList.filter((s) => s.academicYearId === yr.id)
  }

  const syllabusProgressList: SyllabusProgressExport[] = []
  for (const sp of memorySyllabusProgress.values()) {
    if (!sp.studentId || sp.studentId === studentId) {
      syllabusProgressList.push({ ...sp })
    }
  }

  try {
    const localSyllabus = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.SYLLABUS)
    for (const item of localSyllabus) {
      if (item && (!item.studentId || item.studentId === studentId)) {
        const topId = String(item.topicId || item.id || "")
        if (topId && !syllabusProgressList.some((p) => p.topicId === topId)) {
          syllabusProgressList.push({
            id: String(item.id || topId),
            topicId: topId,
            subjectId: typeof item.subjectId === "string" ? item.subjectId : undefined,
            studentId,
            status: typeof item.status === "string" ? item.status : "not_started",
            masteryPercentage: typeof item.masteryPercentage === "number" ? item.masteryPercentage : 0,
            lastStudiedAt: typeof item.lastStudiedAt === "string" ? item.lastStudiedAt : null,
            completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
            updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
          })
        }
      }
    }
  } catch {}

  const tasksList: StudyTaskExport[] = []
  for (const task of memoryStudyTasks.values()) {
    if (!task.studentId || task.studentId === studentId) {
      tasksList.push({ ...task })
    }
  }

  try {
    const localTasks = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.TASKS)
    for (const it of localTasks) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !tasksList.some((t) => t.id === id)) {
          tasksList.push({
            id,
            studentId,
            title: String(it.title || ""),
            description: typeof it.description === "string" ? it.description : undefined,
            subject: typeof it.subject === "string" ? it.subject : undefined,
            date: String(it.date || ""),
            startTime: typeof it.startTime === "string" ? it.startTime : undefined,
            endTime: typeof it.endTime === "string" ? it.endTime : undefined,
            durationMinutes: typeof it.durationMinutes === "number" ? it.durationMinutes : undefined,
            status: String(it.status || "pending"),
            priority: typeof it.priority === "string" ? it.priority : undefined,
            completedAt: typeof it.completedAt === "string" ? it.completedAt : null,
            createdAt: typeof it.createdAt === "string" ? it.createdAt : undefined,
            updatedAt: typeof it.updatedAt === "string" ? it.updatedAt : undefined,
          })
        }
      }
    }
  } catch {}

  const decksList: FlashcardDeckExport[] = []
  for (const d of memoryFlashcardDecks.values()) {
    if (!d.studentId || d.studentId === studentId) {
      decksList.push({ ...d })
    }
  }

  const cardsList: FlashcardExport[] = []
  for (const c of memoryFlashcards.values()) {
    if (!c.studentId || c.studentId === studentId) {
      cardsList.push({ ...c })
    }
  }

  try {
    const localCards = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.FLASHCARDS)
    for (const it of localCards) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !cardsList.some((c) => c.id === id)) {
          cardsList.push({
            id,
            deckId: typeof it.deckId === "string" ? it.deckId : undefined,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            topicId: typeof it.topicId === "string" ? it.topicId : undefined,
            front: String(it.front || ""),
            back: String(it.back || ""),
            status: typeof it.status === "string" ? it.status : undefined,
            interval: typeof it.interval === "number" ? it.interval : undefined,
            easeFactor: typeof it.easeFactor === "number" ? it.easeFactor : undefined,
            repetitionCount: typeof it.repetitionCount === "number" ? it.repetitionCount : undefined,
            nextReviewAt: typeof it.nextReviewAt === "string" ? it.nextReviewAt : null,
            lastReviewedAt: typeof it.lastReviewedAt === "string" ? it.lastReviewedAt : null,
            createdAt: typeof it.createdAt === "string" ? it.createdAt : undefined,
          })
        }
      }
    }
  } catch {}

  const attemptsList: QuestionAttemptExport[] = []
  for (const qa of memoryQuestionAttempts.values()) {
    if (!qa.studentId || qa.studentId === studentId) {
      attemptsList.push({ ...qa })
    }
  }

  try {
    const localAttempts = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.QUESTION_ATTEMPTS)
    for (const it of localAttempts) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !attemptsList.some((a) => a.id === id)) {
          attemptsList.push({
            id,
            studentId,
            questionId: typeof it.questionId === "string" ? it.questionId : undefined,
            testId: typeof it.testId === "string" ? it.testId : undefined,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            topicId: typeof it.topicId === "string" ? it.topicId : undefined,
            selectedAnswer: it.selectedAnswer,
            isCorrect: Boolean(it.isCorrect),
            timeSpentSeconds: typeof it.timeSpentSeconds === "number" ? it.timeSpentSeconds : 0,
            attemptedAt: typeof it.attemptedAt === "string" ? it.attemptedAt : undefined,
          })
        }
      }
    }
  } catch {}

  const mistakesList: MistakeExport[] = []
  for (const m of memoryMistakes.values()) {
    if (!m.studentId || m.studentId === studentId) {
      mistakesList.push({ ...m })
    }
  }

  try {
    const localMistakes = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.MISTAKES)
    for (const it of localMistakes) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || it.mistakeId || "")
        if (id && !mistakesList.some((m) => m.id === id)) {
          mistakesList.push({
            id,
            mistakeId: id,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            subjectCode: typeof it.subjectCode === "string" ? it.subjectCode : undefined,
            topicId: typeof it.topicId === "string" ? it.topicId : undefined,
            questionId: typeof it.questionId === "string" ? it.questionId : undefined,
            title: typeof it.title === "string" ? it.title : undefined,
            category: String(it.category || "concept_error"),
            status: typeof it.status === "string" ? it.status : "unresolved",
            studentAnswer: typeof it.studentAnswer === "string" ? it.studentAnswer : typeof it.userAttempt === "string" ? it.userAttempt : undefined,
            correctSolution: typeof it.correctSolution === "string" ? it.correctSolution : undefined,
            studentReflection: typeof it.studentReflection === "string" ? it.studentReflection : typeof it.reflectionNotes === "string" ? it.reflectionNotes : undefined,
            correctiveAction: typeof it.correctiveAction === "string" ? it.correctiveAction : undefined,
            isResolved: it.status === "mastered" || Boolean(it.isResolved),
            reviewCount: typeof it.reviewCount === "number" ? it.reviewCount : 0,
            nextReviewAt: typeof it.nextReviewAt === "string" ? it.nextReviewAt : null,
            createdAt: typeof it.createdAt === "string" || typeof it.createdAt === "number" ? String(it.createdAt) : undefined,
            updatedAt: typeof it.updatedAt === "string" || typeof it.updatedAt === "number" ? String(it.updatedAt) : undefined,
          })
        }
      }
    }
  } catch {}

  const marksList: MarkExport[] = []
  for (const mk of memoryMarks.values()) {
    if (!mk.studentId || mk.studentId === studentId) {
      marksList.push({ ...mk })
    }
  }

  try {
    const localMarks = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.MARKS)
    for (const it of localMarks) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !marksList.some((m) => m.id === id)) {
          const scored = typeof it.score === "number" ? it.score : typeof it.scoredMarks === "number" ? it.scoredMarks : 0
          const max = typeof it.max === "number" ? it.max : typeof it.maxMarks === "number" ? it.maxMarks : 100
          marksList.push({
            id,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            subjectCode: typeof it.subjectCode === "string" ? it.subjectCode : undefined,
            subjectName: typeof it.subject === "string" ? it.subject : typeof it.subjectName === "string" ? it.subjectName : undefined,
            assessmentTitle: typeof it.title === "string" ? it.title : typeof it.assessmentTitle === "string" ? it.assessmentTitle : undefined,
            assessmentType: typeof it.assessmentType === "string" ? it.assessmentType : "quiz",
            scheduledDate: typeof it.date === "string" ? it.date : typeof it.scheduledDate === "string" ? it.scheduledDate : undefined,
            scoredMarks: scored,
            maxMarks: max,
            percentage: typeof it.percentage === "number" ? it.percentage : max > 0 ? (scored / max) * 100 : 0,
            grade: typeof it.grade === "string" ? it.grade : null,
            percentile: typeof it.percentile === "number" ? it.percentile : null,
            feedback: typeof it.feedback === "string" ? it.feedback : null,
            recordedAt: typeof it.recordedAt === "string" ? it.recordedAt : typeof it.createdAt === "string" ? it.createdAt : undefined,
          })
        }
      }
    }
  } catch {}

  const focusList: FocusSessionExport[] = []
  for (const fs of memoryFocusSessions.values()) {
    if (!fs.studentId || fs.studentId === studentId) {
      focusList.push({ ...fs })
    }
  }

  try {
    const localFocus = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.FOCUS_SESSIONS)
    for (const it of localFocus) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !focusList.some((f) => f.id === id)) {
          focusList.push({
            id,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            subjectCode: typeof it.subjectCode === "string" ? it.subjectCode : undefined,
            startTime: String(it.startTime || new Date().toISOString()),
            endTime: typeof it.endTime === "string" ? it.endTime : undefined,
            durationSeconds: typeof it.durationSeconds === "number" ? it.durationSeconds : 0,
            mode: typeof it.mode === "string" ? it.mode : undefined,
            activeTool: typeof it.activeTool === "string" ? it.activeTool : "canvas",
            focusScore: typeof it.focusScore === "number" ? it.focusScore : null,
            completed: typeof it.completed === "boolean" ? it.completed : true,
            createdAt: typeof it.createdAt === "string" ? it.createdAt : undefined,
          })
        }
      }
    }
  } catch {}

  const bundle: StudentDataBundle = {
    exportMetadata: {
      bundleVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      studentId,
      application: "Zenithsui Academic OS",
    },
    studentProfile: profile,
    academicYears: yearsArray,
    syllabusProgress: syllabusProgressList,
    studyTasks: tasksList,
    flashcards: {
      decks: decksList,
      cards: cardsList,
    },
    questionAttempts: attemptsList,
    mistakes: mistakesList,
    marks: marksList,
    focusSessionLogs: focusList,
  }

  return JSON.stringify(bundle, null, 2)
}

export async function exportSyllabusAsCsv(subjectId: string): Promise<string> {
  const headers = [
    "topic_id",
    "subject_id",
    "subject_code",
    "subject_name",
    "unit_name",
    "chapter_name",
    "title",
    "status",
    "mastery_percentage",
    "confidence_score",
    "estimated_hours",
    "last_studied_at",
    "completed_at",
  ]

  const rows: string[] = [headers.join(",")]

  let subject = memorySubjects.get(subjectId) || null
  if (!subject) {
    for (const yr of memoryAcademicYears.values()) {
      if (yr.subjects) {
        const found = yr.subjects.find((s) => s.id === subjectId)
        if (found) {
          subject = found
          break
        }
      }
    }
  }

  if (!subject) {
    try {
      const client = createClient()
      const { data, error } = await client
        .from("academic_subjects")
        .select("*")
        .eq("id", subjectId)
        .maybeSingle()

      if (!error && data) {
        const r = data as Record<string, unknown>
        subject = {
          id: subjectId,
          code: String(r.code || ""),
          name: String(r.name || ""),
        }
      }
    } catch {}
  }

  const subjectCode = subject ? subject.code : ""
  const subjectName = subject ? subject.name : ""

  const matchedTopics: TopicExport[] = []
  for (const top of memoryTopics.values()) {
    if (top.subjectId === subjectId) {
      matchedTopics.push(top)
    }
  }

  if (subject && subject.units) {
    for (const unit of subject.units) {
      for (const chap of unit.chapters || []) {
        for (const top of chap.topics || []) {
          rows.push(
            toCsvRow([
              top.id,
              subjectId,
              subjectCode,
              subjectName,
              unit.name,
              chap.name,
              top.name,
              top.status || "not_started",
              top.masteryPercentage ?? 0,
              top.confidenceScore ?? 1,
              top.estimatedHours ?? 1,
              top.lastStudiedAt || "",
              top.completedAt || "",
            ])
          )
        }
      }
    }
  } else if (matchedTopics.length > 0) {
    for (const top of matchedTopics) {
      rows.push(
        toCsvRow([
          top.id,
          subjectId,
          subjectCode,
          subjectName,
          "",
          "",
          top.name,
          top.status || "not_started",
          top.masteryPercentage ?? 0,
          top.confidenceScore ?? 1,
          top.estimatedHours ?? 1,
          top.lastStudiedAt || "",
          top.completedAt || "",
        ])
      )
    }
  } else {
    try {
      const localSyllabus = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.SYLLABUS)
      for (const it of localSyllabus) {
        if (it && (it.subjectId === subjectId || it.subject === subjectId || it.subjectCode === subjectCode)) {
          rows.push(
            toCsvRow([
              String(it.id || it.topicId || ""),
              subjectId,
              subjectCode,
              subjectName,
              String(it.unitName || ""),
              String(it.chapterName || ""),
              String(it.title || it.name || ""),
              String(it.status || "not_started"),
              Number(it.masteryPercentage ?? 0),
              Number(it.confidenceScore ?? 1),
              Number(it.estimatedHours ?? 1),
              String(it.lastStudiedAt || ""),
              String(it.completedAt || ""),
            ])
          )
        }
      }
    } catch {}
  }

  return rows.join("\n")
}

export async function exportMistakesAsCsv(studentId: string): Promise<string> {
  const headers = [
    "mistake_id",
    "student_id",
    "subject_id",
    "subject_code",
    "topic_id",
    "question_id",
    "title",
    "category",
    "status",
    "student_answer",
    "correct_solution",
    "student_reflection",
    "corrective_action",
    "is_resolved",
    "review_count",
    "created_at",
  ]

  const rows: string[] = [headers.join(",")]
  const mistakesMap = new Map<string, MistakeExport>()

  for (const m of memoryMistakes.values()) {
    if (!m.studentId || m.studentId === studentId) {
      const id = m.mistakeId || m.id
      mistakesMap.set(id, { ...m, id, mistakeId: id })
    }
  }

  try {
    const localMistakes = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.MISTAKES)
    for (const it of localMistakes) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || it.mistakeId || "")
        if (id && !mistakesMap.has(id)) {
          mistakesMap.set(id, {
            id,
            mistakeId: id,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            subjectCode: typeof it.subjectCode === "string" ? it.subjectCode : undefined,
            topicId: typeof it.topicId === "string" ? it.topicId : undefined,
            questionId: typeof it.questionId === "string" ? it.questionId : undefined,
            title: typeof it.title === "string" ? it.title : undefined,
            category: String(it.category || "concept_error"),
            status: typeof it.status === "string" ? it.status : "unresolved",
            studentAnswer: typeof it.studentAnswer === "string" ? it.studentAnswer : typeof it.userAttempt === "string" ? it.userAttempt : undefined,
            correctSolution: typeof it.correctSolution === "string" ? it.correctSolution : undefined,
            studentReflection: typeof it.studentReflection === "string" ? it.studentReflection : typeof it.reflectionNotes === "string" ? it.reflectionNotes : undefined,
            correctiveAction: typeof it.correctiveAction === "string" ? it.correctiveAction : undefined,
            isResolved: it.status === "mastered" || Boolean(it.isResolved),
            reviewCount: typeof it.reviewCount === "number" ? it.reviewCount : 0,
            nextReviewAt: typeof it.nextReviewAt === "string" ? it.nextReviewAt : null,
            createdAt: typeof it.createdAt === "string" || typeof it.createdAt === "number" ? String(it.createdAt) : undefined,
            updatedAt: typeof it.updatedAt === "string" || typeof it.updatedAt === "number" ? String(it.updatedAt) : undefined,
          })
        }
      }
    }
  } catch {}

  try {
    const client = createClient()
    const { data, error } = await client
      .from("student_mistakes")
      .select("*")
      .eq("student_id", studentId)

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const r = row as Record<string, unknown>
        const id = String(r.id)
        if (!mistakesMap.has(id)) {
          mistakesMap.set(id, {
            id,
            mistakeId: id,
            studentId,
            subjectId: typeof r.subject_id === "string" ? r.subject_id : undefined,
            subjectCode: typeof r.subject_code === "string" ? r.subject_code : undefined,
            topicId: typeof r.topic_id === "string" ? r.topic_id : undefined,
            questionId: typeof r.question_id === "string" ? r.question_id : undefined,
            category: String(r.error_category || r.category || "concept_error"),
            status: String(r.status || "unresolved"),
            studentAnswer: typeof r.student_answer === "string" ? r.student_answer : undefined,
            correctSolution: typeof r.correct_solution === "string" ? r.correct_solution : undefined,
            studentReflection: typeof r.student_reflection === "string" ? r.student_reflection : undefined,
            correctiveAction: typeof r.corrective_action === "string" ? r.corrective_action : undefined,
            isResolved: Boolean(r.is_resolved),
            reviewCount: typeof r.review_count === "number" ? r.review_count : 0,
            createdAt: typeof r.created_at === "string" ? r.created_at : undefined,
          })
        }
      }
    }
  } catch {}

  for (const m of mistakesMap.values()) {
    rows.push(
      toCsvRow([
        m.mistakeId || m.id,
        studentId,
        m.subjectId || "",
        m.subjectCode || "",
        m.topicId || "",
        m.questionId || "",
        m.title || "",
        m.category,
        m.status || "unresolved",
        m.studentAnswer || "",
        m.correctSolution || "",
        m.studentReflection || "",
        m.correctiveAction || "",
        m.isResolved ? "true" : "false",
        m.reviewCount ?? 0,
        m.createdAt || "",
      ])
    )
  }

  return rows.join("\n")
}

export async function exportMarksAsCsv(studentId: string): Promise<string> {
  const headers = [
    "mark_id",
    "student_id",
    "subject_id",
    "subject_code",
    "subject_name",
    "assessment_title",
    "assessment_type",
    "scheduled_date",
    "scored_marks",
    "max_marks",
    "percentage",
    "grade",
    "percentile",
    "feedback",
    "recorded_at",
  ]

  const rows: string[] = [headers.join(",")]
  const marksMap = new Map<string, MarkExport>()

  for (const mk of memoryMarks.values()) {
    if (!mk.studentId || mk.studentId === studentId) {
      marksMap.set(mk.id, { ...mk })
    }
  }

  try {
    const localMarks = await listAcademicItems<Record<string, unknown>>(ACADEMIC_STORES.MARKS)
    for (const it of localMarks) {
      if (it && (!it.studentId || it.studentId === studentId)) {
        const id = String(it.id || "")
        if (id && !marksMap.has(id)) {
          const scored = typeof it.score === "number" ? it.score : typeof it.scoredMarks === "number" ? it.scoredMarks : 0
          const max = typeof it.max === "number" ? it.max : typeof it.maxMarks === "number" ? it.maxMarks : 100
          marksMap.set(id, {
            id,
            studentId,
            subjectId: typeof it.subjectId === "string" ? it.subjectId : undefined,
            subjectCode: typeof it.subjectCode === "string" ? it.subjectCode : undefined,
            subjectName: typeof it.subject === "string" ? it.subject : typeof it.subjectName === "string" ? it.subjectName : undefined,
            assessmentTitle: typeof it.title === "string" ? it.title : typeof it.assessmentTitle === "string" ? it.assessmentTitle : undefined,
            assessmentType: typeof it.assessmentType === "string" ? it.assessmentType : "quiz",
            scheduledDate: typeof it.date === "string" ? it.date : typeof it.scheduledDate === "string" ? it.scheduledDate : undefined,
            scoredMarks: scored,
            maxMarks: max,
            percentage: typeof it.percentage === "number" ? it.percentage : max > 0 ? (scored / max) * 100 : 0,
            grade: typeof it.grade === "string" ? it.grade : null,
            percentile: typeof it.percentile === "number" ? it.percentile : null,
            feedback: typeof it.feedback === "string" ? it.feedback : null,
            recordedAt: typeof it.recordedAt === "string" ? it.recordedAt : typeof it.createdAt === "string" ? it.createdAt : undefined,
          })
        }
      }
    }
  } catch {}

  try {
    const client = createClient()
    const { data, error } = await client
      .from("student_marks")
      .select("*")
      .eq("student_id", studentId)

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const r = row as Record<string, unknown>
        const id = String(r.id)
        if (!marksMap.has(id)) {
          const scored = typeof r.scored_marks === "number" ? r.scored_marks : 0
          const max = typeof r.max_marks === "number" ? r.max_marks : 100
          marksMap.set(id, {
            id,
            studentId,
            subjectId: typeof r.subject_id === "string" ? r.subject_id : undefined,
            subjectCode: typeof r.subject_code === "string" ? r.subject_code : undefined,
            subjectName: typeof r.subject_name === "string" ? r.subject_name : undefined,
            assessmentTitle: typeof r.assessment_title === "string" ? r.assessment_title : undefined,
            assessmentType: typeof r.assessment_type === "string" ? r.assessment_type : "quiz",
            scheduledDate: typeof r.scheduled_date === "string" ? r.scheduled_date : undefined,
            scoredMarks: scored,
            maxMarks: max,
            percentage: typeof r.percentage === "number" ? r.percentage : max > 0 ? (scored / max) * 100 : 0,
            grade: typeof r.grade === "string" ? r.grade : null,
            percentile: typeof r.percentile === "number" ? r.percentile : null,
            feedback: typeof r.feedback === "string" ? r.feedback : null,
            recordedAt: typeof r.recorded_at === "string" ? r.recorded_at : undefined,
          })
        }
      }
    }
  } catch {}

  for (const m of marksMap.values()) {
    rows.push(
      toCsvRow([
        m.id,
        studentId,
        m.subjectId || "",
        m.subjectCode || "",
        m.subjectName || "",
        m.assessmentTitle || "",
        m.assessmentType || "quiz",
        m.scheduledDate || "",
        m.scoredMarks,
        m.maxMarks,
        m.percentage !== undefined ? m.percentage.toFixed(2) : "",
        m.grade || "",
        m.percentile !== undefined && m.percentile !== null ? m.percentile.toFixed(2) : "",
        m.feedback || "",
        m.recordedAt || "",
      ])
    )
  }

  return rows.join("\n")
}

export async function archiveAcademicYear(
  studentId: string,
  currentYearId: string,
  newYearDetails: NewYearDetails
): Promise<{ archivedYearId: string; newYearId: string }> {
  const nowIso = new Date().toISOString()
  let currentYear = memoryAcademicYears.get(currentYearId) || null

  if (!currentYear) {
    try {
      const client = createClient()
      const { data, error } = await client
        .from("student_academic_years")
        .select("*")
        .eq("id", currentYearId)
        .maybeSingle()

      if (!error && data) {
        const r = data as Record<string, unknown>
        currentYear = {
          id: currentYearId,
          studentId: String(r.student_id || studentId),
          name: String(r.name || "Previous Year"),
          startDate: String(r.start_date || ""),
          endDate: String(r.end_date || ""),
          gradeLevel: typeof r.grade_level === "string" ? r.grade_level : undefined,
          status: "active",
          isCurrent: true,
          isArchived: false,
          createdAt: typeof r.created_at === "string" ? r.created_at : nowIso,
          updatedAt: nowIso,
        }
      }
    } catch {}
  }

  if (!currentYear) {
    currentYear = {
      id: currentYearId,
      studentId,
      name: "Archived Academic Year",
      startDate: nowIso.slice(0, 10),
      endDate: nowIso.slice(0, 10),
      status: "active",
      isCurrent: true,
      isArchived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
  }

  currentYear.status = "archived"
  currentYear.isCurrent = false
  currentYear.isArchived = true
  currentYear.archivedAt = nowIso
  currentYear.updatedAt = nowIso
  memoryAcademicYears.set(currentYearId, currentYear)

  const activeSubjects: SubjectExport[] = []
  for (const s of memorySubjects.values()) {
    if (s.academicYearId === currentYearId) {
      activeSubjects.push(s)
    }
  }

  const archiveSnapshot: AcademicYearArchiveSnapshot = {
    yearId: currentYearId,
    studentId,
    name: currentYear.name,
    startDate: currentYear.startDate,
    endDate: currentYear.endDate,
    gradeLevel: currentYear.gradeLevel || "",
    archivedAt: nowIso,
    snapshotData: {
      subjects: activeSubjects.map((s) => ({ ...s })),
      syllabusProgress: Array.from(memorySyllabusProgress.values()).filter((sp) => sp.studentId === studentId),
      marks: Array.from(memoryMarks.values()).filter((mk) => mk.studentId === studentId),
      tasks: Array.from(memoryStudyTasks.values()).filter((t) => t.studentId === studentId),
    },
  }
  memoryArchiveSnapshots.set(currentYearId, archiveSnapshot)

  try {
    const client = createClient()
    await client
      .from("student_academic_years")
      .update({
        status: "archived",
        archived_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", currentYearId)
  } catch {}

  const newYearId = generateUuid()
  const newYear: AcademicYearExport = {
    id: newYearId,
    studentId,
    name: newYearDetails.name,
    startDate: newYearDetails.startDate,
    endDate: newYearDetails.endDate,
    gradeLevel: newYearDetails.gradeLevel,
    status: "active",
    isCurrent: true,
    isArchived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    subjects: [],
  }

  if (newYearDetails.cloneSubjects) {
    for (const oldSubj of activeSubjects) {
      const clonedSubjectId = generateUuid()
      const clonedSubject: SubjectExport = {
        id: clonedSubjectId,
        studentId,
        academicYearId: newYearId,
        code: oldSubj.code,
        name: oldSubj.name,
        colorHex: oldSubj.colorHex || "#2563eb",
        baselinePriority: oldSubj.baselinePriority || 3,
        targetWeeklyMinutes: oldSubj.targetWeeklyMinutes || 300,
        isActive: true,
        units: (oldSubj.units || []).map((u) => {
          const clonedUnitId = generateUuid()
          return {
            id: clonedUnitId,
            subjectId: clonedSubjectId,
            name: u.name,
            order: u.order,
            chapters: (u.chapters || []).map((c) => {
              const clonedChapId = generateUuid()
              return {
                id: clonedChapId,
                unitId: clonedUnitId,
                name: c.name,
                order: c.order,
                status: "not_started",
                confidenceScore: 1,
                topics: (c.topics || []).map((t) => ({
                  id: generateUuid(),
                  chapterId: clonedChapId,
                  subjectId: clonedSubjectId,
                  name: t.name,
                  status: "not_started",
                  masteryPercentage: 0,
                  confidenceScore: 1,
                  estimatedHours: t.estimatedHours || 1,
                  lastStudiedAt: null,
                  completedAt: null,
                })),
              }
            }),
          }
        }),
      }
      memorySubjects.set(clonedSubjectId, clonedSubject)
      newYear.subjects?.push(clonedSubject)

      try {
        const client = createClient()
        await client.from("academic_subjects").insert({
          id: clonedSubjectId,
          student_id: studentId,
          academic_year_id: newYearId,
          code: clonedSubject.code,
          name: clonedSubject.name,
          color_hex: clonedSubject.colorHex,
          baseline_priority: clonedSubject.baselinePriority,
          target_weekly_minutes: clonedSubject.targetWeeklyMinutes,
          is_active: true,
        })
      } catch {}
    }
  }

  memoryAcademicYears.set(newYearId, newYear)

  try {
    const client = createClient()
    await client.from("student_academic_years").insert({
      id: newYearId,
      student_id: studentId,
      name: newYear.name,
      start_date: newYear.startDate,
      end_date: newYear.endDate,
      grade_level: newYear.gradeLevel || "Grade 11",
      status: "active",
      created_at: nowIso,
      updated_at: nowIso,
    })
  } catch {}

  return {
    archivedYearId: currentYearId,
    newYearId,
  }
}

export async function clearStudentLocalCache(studentId?: string): Promise<void> {
  clearAcademicMemoryStores()

  if (studentId) {
    memoryProfiles.delete(studentId)

    for (const [id, yr] of memoryAcademicYears.entries()) {
      if (yr.studentId === studentId) {
        memoryAcademicYears.delete(id)
      }
    }
    for (const [id, s] of memorySubjects.entries()) {
      if (s.studentId === studentId) {
        memorySubjects.delete(id)
      }
    }
    for (const [id, sp] of memorySyllabusProgress.entries()) {
      if (sp.studentId === studentId) {
        memorySyllabusProgress.delete(id)
      }
    }
    for (const [id, t] of memoryStudyTasks.entries()) {
      if (t.studentId === studentId) {
        memoryStudyTasks.delete(id)
      }
    }
    for (const [id, c] of memoryFlashcards.entries()) {
      if (c.studentId === studentId) {
        memoryFlashcards.delete(id)
      }
    }
    for (const [id, qa] of memoryQuestionAttempts.entries()) {
      if (qa.studentId === studentId) {
        memoryQuestionAttempts.delete(id)
      }
    }
    for (const [id, m] of memoryMistakes.entries()) {
      if (m.studentId === studentId) {
        memoryMistakes.delete(id)
      }
    }
    for (const [id, mk] of memoryMarks.entries()) {
      if (mk.studentId === studentId) {
        memoryMarks.delete(id)
      }
    }
    for (const [id, fs] of memoryFocusSessions.entries()) {
      if (fs.studentId === studentId) {
        memoryFocusSessions.delete(id)
      }
    }
    for (const [id, snap] of memoryArchiveSnapshots.entries()) {
      if (snap.studentId === studentId) {
        memoryArchiveSnapshots.delete(id)
      }
    }
  } else {
    memoryProfiles.clear()
    memoryAcademicYears.clear()
    memorySubjects.clear()
    memoryUnits.clear()
    memoryChapters.clear()
    memoryTopics.clear()
    memorySyllabusProgress.clear()
    memoryStudyTasks.clear()
    memoryFlashcardDecks.clear()
    memoryFlashcards.clear()
    memoryQuestionAttempts.clear()
    memoryMistakes.clear()
    memoryMarks.clear()
    memoryFocusSessions.clear()
    memoryArchiveSnapshots.clear()
  }

  try {
    await clearAcademicMutations()
  } catch {}

  try {
    const db = await openAcademicDb()
    const storeNames = Object.values(ACADEMIC_STORES)

    for (const storeName of storeNames) {
      if (db.objectStoreNames.contains(storeName)) {
        if (!studentId) {
          await new Promise<void>((resolve) => {
            const tx = db.transaction(storeName, "readwrite")
            const store = tx.objectStore(storeName)
            store.clear()
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
            tx.onabort = () => resolve()
          })
        } else {
          await new Promise<void>((resolve) => {
            const tx = db.transaction(storeName, "readwrite")
            const store = tx.objectStore(storeName)
            const req = store.getAll()
            req.onsuccess = () => {
              const items = (req.result as Array<Record<string, unknown>>) || []
              for (const it of items) {
                if (
                  it &&
                  (it.studentId === studentId ||
                    it.student_id === studentId ||
                    it.userId === studentId ||
                    it.user_id === studentId)
                ) {
                  const key = it.id || it.key
                  if (typeof key === "string" || typeof key === "number") {
                    store.delete(key)
                  }
                }
              }
              resolve()
            }
            req.onerror = () => resolve()
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
            tx.onabort = () => resolve()
          })
        }
      }
    }

    if (db.objectStoreNames.contains(ACADEMIC_MUTATIONS_STORE)) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(ACADEMIC_MUTATIONS_STORE, "readwrite")
        const store = tx.objectStore(ACADEMIC_MUTATIONS_STORE)
        store.clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      })
    }
  } catch {}

  if (typeof window !== "undefined") {
    if (studentId && window.indexedDB && typeof window.indexedDB.deleteDatabase === "function") {
      try {
        window.indexedDB.deleteDatabase(`zenithsui_edu_${studentId}`)
      } catch {}
    }

    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear()
      }
      if (typeof localStorage !== "undefined") {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k) {
            if (
              !studentId ||
              k.includes(studentId) ||
              k.startsWith("zenithsui:academic") ||
              k.startsWith("zenithsui_academic") ||
              k.startsWith("academic_")
            ) {
              keysToRemove.push(k)
            }
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k)
        }
      }
    } catch {}

    try {
      if ("caches" in window) {
        const cacheKeys = await window.caches.keys()
        for (const key of cacheKeys) {
          if (!studentId || key.includes(studentId) || key.includes("academic")) {
            await window.caches.delete(key)
          }
        }
      }
    } catch {}

    try {
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel("zenithsui_auth_isolation")
        ch.postMessage({
          type: "LOGOUT_PURGE",
          studentId: studentId || "all",
          timestamp: Date.now(),
        })
        ch.close()
      }
    } catch {}
  }
}
