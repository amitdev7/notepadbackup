import type { QuestionData, QuestionAttemptData } from "./types"

type QuestionType = QuestionData["questionType"]
type Difficulty = QuestionData["difficulty"]
type AttemptResult = QuestionAttemptData["result"]

export interface CreateQuestionInput {
  studentId: string
  subjectId: string
  chapterId?: string
  topicId?: string
  questionText: string
  questionType?: QuestionType
  options?: unknown[]
  correctAnswer: string
  solutionExplanation: string
  marks?: number
  negativeMarks?: number
  difficulty?: Difficulty
  year?: number
  tags?: string[]
  isPyq?: boolean
  pyqSource?: string
}

export interface QuestionRecord extends QuestionData {
  createdAt: string
  updatedAt: string
}

export interface QuestionAttemptRecord extends QuestionAttemptData {
  createdAt: string
}

export interface ChapterAccuracy {
  totalAttempted: number
  correct: number
  accuracy: number
  averageTimeSeconds: number
}

export interface SubjectQuestionStats {
  total: number
  attempted: number
  correct: number
  wrong: number
  skipped: number
  accuracy: number
  pyqCount: number
}

const questionStore = new Map<string, QuestionRecord>()
const attemptStore = new Map<string, QuestionAttemptRecord>()

let questionCounter = 0
let attemptCounter = 0

function generateId(prefix: string): string {
  const ts = Date.now().toString(36)
  const counter = (++questionCounter).toString(36).padStart(4, "0")
  return `${prefix}_${ts}_${counter}`
}

function generateAttemptId(): string {
  const ts = Date.now().toString(36)
  const counter = (++attemptCounter).toString(36).padStart(4, "0")
  return `attempt_${ts}_${counter}`
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createQuestion(input: CreateQuestionInput): QuestionRecord {
  const id = generateId("q")
  const now = nowIso()
  const record: QuestionRecord = {
    id,
    studentId: input.studentId,
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    topicId: input.topicId,
    questionText: input.questionText,
    questionType: input.questionType ?? "single_choice",
    options: input.options ?? [],
    correctAnswer: input.correctAnswer,
    solutionExplanation: input.solutionExplanation,
    marks: input.marks ?? 4,
    negativeMarks: input.negativeMarks ?? 1,
    difficulty: input.difficulty ?? "medium",
    year: input.year,
    tags: input.tags ?? [],
    isPyq: input.isPyq ?? false,
    pyqSource: input.pyqSource,
    createdAt: now,
    updatedAt: now,
  }
  questionStore.set(id, record)
  return record
}

export function getQuestionById(id: string): QuestionRecord | null {
  return questionStore.get(id) ?? null
}

export function updateQuestion(
  id: string,
  updates: Partial<Omit<QuestionRecord, "id" | "studentId" | "createdAt">>
): QuestionRecord | null {
  const existing = questionStore.get(id)
  if (!existing) return null
  const updated: QuestionRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    studentId: existing.studentId,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  }
  questionStore.set(id, updated)
  return updated
}

export function deleteQuestion(id: string): boolean {
  return questionStore.delete(id)
}

export function getAllQuestions(): QuestionRecord[] {
  return Array.from(questionStore.values())
}

export function getQuestionsBySubject(subjectId: string): QuestionRecord[] {
  return getAllQuestions().filter((q) => q.subjectId === subjectId)
}

export function getQuestionsByChapter(chapterId: string): QuestionRecord[] {
  return getAllQuestions().filter((q) => q.chapterId === chapterId)
}

export function getQuestionsByTopic(topicId: string): QuestionRecord[] {
  return getAllQuestions().filter((q) => q.topicId === topicId)
}

export function getQuestionsByDifficulty(difficulty: Difficulty): QuestionRecord[] {
  return getAllQuestions().filter((q) => q.difficulty === difficulty)
}

export function getPyqQuestions(subjectId?: string): QuestionRecord[] {
  let questions = getAllQuestions().filter((q) => q.isPyq)
  if (subjectId) questions = questions.filter((q) => q.subjectId === subjectId)
  return questions
}

export function searchQuestions(query: string, subjectId?: string): QuestionRecord[] {
  const lower = query.toLowerCase().trim()
  if (!lower) return subjectId ? getQuestionsBySubject(subjectId) : getAllQuestions()

  const pool = subjectId ? getQuestionsBySubject(subjectId) : getAllQuestions()
  return pool.filter((q) => {
    if (q.questionText.toLowerCase().includes(lower)) return true
    if (q.correctAnswer.toLowerCase().includes(lower)) return true
    if (q.solutionExplanation.toLowerCase().includes(lower)) return true
    if (q.tags.some((t) => t.toLowerCase().includes(lower))) return true
    if (q.pyqSource?.toLowerCase().includes(lower)) return true
    return false
  })
}

export function filterQuestions(filters: {
  subjectId?: string
  chapterId?: string
  topicId?: string
  difficulty?: Difficulty
  isPyq?: boolean
  tags?: string[]
  year?: number
}): QuestionRecord[] {
  return getAllQuestions().filter((q) => {
    if (filters.subjectId && q.subjectId !== filters.subjectId) return false
    if (filters.chapterId && q.chapterId !== filters.chapterId) return false
    if (filters.topicId && q.topicId !== filters.topicId) return false
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false
    if (filters.isPyq !== undefined && q.isPyq !== filters.isPyq) return false
    if (filters.year !== undefined && q.year !== filters.year) return false
    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every((ft) =>
        q.tags.some((qt) => qt.toLowerCase() === ft.toLowerCase())
      )
      if (!hasAllTags) return false
    }
    return true
  })
}

export interface RecordAttemptInput {
  studentId: string
  questionId: string
  timeSpentSeconds: number
  result: AttemptResult
  studentAnswer?: string
  notes?: string
}

export function recordPracticeAttempt(input: RecordAttemptInput): QuestionAttemptRecord {
  const question = questionStore.get(input.questionId)
  let marksObtained = 0
  if (question) {
    if (input.result === "correct") {
      marksObtained = question.marks
    } else if (input.result === "wrong") {
      marksObtained = -question.negativeMarks
    }
  }

  const id = generateAttemptId()
  const now = nowIso()
  const record: QuestionAttemptRecord = {
    id,
    studentId: input.studentId,
    questionId: input.questionId,
    attemptDate: now,
    timeSpentSeconds: input.timeSpentSeconds,
    result: input.result,
    studentAnswer: input.studentAnswer,
    marksObtained,
    notes: input.notes,
    createdAt: now,
  }
  attemptStore.set(id, record)
  return record
}

export function getQuestionHistory(questionId: string): QuestionAttemptRecord[] {
  return Array.from(attemptStore.values())
    .filter((a) => a.questionId === questionId)
    .sort((a, b) => b.attemptDate.localeCompare(a.attemptDate))
}

export function getStudentAttempts(studentId: string): QuestionAttemptRecord[] {
  return Array.from(attemptStore.values())
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.attemptDate.localeCompare(a.attemptDate))
}

export function calculateChapterAccuracy(chapterId: string): ChapterAccuracy {
  const chapterQuestions = getQuestionsByChapter(chapterId)
  const questionIds = new Set(chapterQuestions.map((q) => q.id))

  const attempts = Array.from(attemptStore.values()).filter((a) =>
    questionIds.has(a.questionId)
  )

  const totalAttempted = attempts.filter((a) => a.result !== "skipped").length
  const correct = attempts.filter((a) => a.result === "correct").length
  const totalTime = attempts.reduce((s, a) => s + a.timeSpentSeconds, 0)

  return {
    totalAttempted,
    correct,
    accuracy: totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0,
    averageTimeSeconds:
      totalAttempted > 0 ? Math.round(totalTime / totalAttempted) : 0,
  }
}

export function calculateSubjectQuestionStats(subjectId: string): SubjectQuestionStats {
  const subjectQuestions = getQuestionsBySubject(subjectId)
  const questionIds = new Set(subjectQuestions.map((q) => q.id))

  const attempts = Array.from(attemptStore.values()).filter((a) =>
    questionIds.has(a.questionId)
  )

  const attemptedQIds = new Set(attempts.map((a) => a.questionId))

  let correct = 0
  let wrong = 0
  let skipped = 0
  for (const a of attempts) {
    if (a.result === "correct") correct++
    else if (a.result === "wrong") wrong++
    else if (a.result === "skipped") skipped++
  }

  const attempted = attempts.filter((a) => a.result !== "skipped").length

  return {
    total: subjectQuestions.length,
    attempted: attemptedQIds.size,
    correct,
    wrong,
    skipped,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    pyqCount: subjectQuestions.filter((q) => q.isPyq).length,
  }
}

export function getLatestAttemptResult(
  questionId: string
): QuestionAttemptRecord | null {
  const history = getQuestionHistory(questionId)
  return history.length > 0 ? history[0] : null
}

export function getUnattemptedQuestions(subjectId?: string): QuestionRecord[] {
  const attemptedIds = new Set(
    Array.from(attemptStore.values()).map((a) => a.questionId)
  )
  const pool = subjectId ? getQuestionsBySubject(subjectId) : getAllQuestions()
  return pool.filter((q) => !attemptedIds.has(q.id))
}

export function clearPracticeStore(): void {
  questionStore.clear()
  attemptStore.clear()
  questionCounter = 0
  attemptCounter = 0
}

export function resetPracticeStore(): void {
  clearPracticeStore()
}

export function setQuestions(questions: QuestionRecord[]): void {
  questionStore.clear()
  for (const q of questions) {
    questionStore.set(q.id, q)
  }
}

export function setAttempts(attempts: QuestionAttemptRecord[]): void {
  attemptStore.clear()
  for (const a of attempts) {
    attemptStore.set(a.id, a)
  }
}
