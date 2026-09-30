export type CurriculumStatus =
  | "not_started"
  | "learning"
  | "practicing"
  | "revising"
  | "completed"
  | "mastered"

export type ConfidenceScore = 1 | 2 | 3 | 4 | 5

export type TaskType =
  | "first_learn"
  | "practice"
  | "revision"
  | "mock_test"
  | "homework"
  | "assignment"
  | "custom"

export type TaskPriority = "low" | "medium" | "high" | "critical"

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "missed"
  | "rescheduled"
  | "skipped"

export type SkipReason =
  | "too_tired"
  | "not_relevant"
  | "already_know"
  | "time_conflict"
  | "rescheduled"
  | "other"

export type FlashcardRating = 1 | 2 | 3 | 4

export const FLASHCARD_RATING_LABELS: Record<FlashcardRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
}

export type MistakeCategory =
  | "concept_error"
  | "formula_error"
  | "calculation_error"
  | "careless_mistake"
  | "interpretation_error"
  | "time_management"

export type ExamType =
  | "class_test"
  | "unit_test"
  | "periodic"
  | "half_yearly"
  | "pre_board"
  | "board"
  | "final"
  | "custom"

export type TestMode = "timed" | "untimed" | "practice" | "exam"

export type PaletteState =
  | "NOT_VISITED"
  | "NOT_ANSWERED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED_FOR_REVIEW"

export type SpeedAccuracyQuadrant =
  | "MASTERED"
  | "HIGH_EFFORT"
  | "RUSHED_GUESS"
  | "BOTTLENECK"
  | "UNATTEMPTED"

export type ErrorCategory =
  | "CONCEPTUAL"
  | "CALCULATION"
  | "READING_COMPREHENSION"
  | "TIME_PRESSURE"
  | "GUESSWORK"
  | "NONE"

export type FocusTimerMode = "pomodoro" | "stopwatch" | "countdown"

export type ClassroomRole = "teacher" | "co_teacher" | "student" | "observer"

export type GuardianLinkStatus = "active" | "revoked" | "suspended"

export interface GuardianPermissions {
  allow_study_progress: boolean
  allow_exams: boolean
  allow_assignments: boolean
  allow_marks: boolean
}

export interface BlockedInterval {
  startMinute: number
  endMinute: number
  label: string
  source: "timetable" | "calendar" | "blocked"
}

export interface FreeSlot {
  startMinute: number
  endMinute: number
  durationMinutes: number
}

export interface DayCapacity {
  date: string
  freeSlots: FreeSlot[]
  totalFreeMinutes: number
  allocatedMinutes: number
  remainingMinutes: number
}

export interface RecommendationScoredResult {
  taskId: string
  subjectId: string
  subjectName: string
  topicId?: string
  topicName?: string
  taskType: TaskType
  durationMinutes: number
  score: number
  reasons: string[]
}

export interface StudentProfileData {
  id: string
  gradeLevel?: string
  institutionName?: string
  defaultTimezone: string
  status: "active" | "archived"
  wakeTimeMinute?: number
  sleepTimeMinute?: number
  schoolStartMinute?: number
  schoolEndMinute?: number
}

export interface AcademicSubjectData {
  id: string
  studentId: string
  academicYearId: string
  code: string
  name: string
  colorHex: string
  baselinePriority: number
  targetWeeklyMinutes: number
  minSessionMinutes: number
  maxSessionMinutes: number
  isActive: boolean
}

export interface CurriculumTopicData {
  id: string
  chapterId: string
  topicNumber: number
  name: string
  status: CurriculumStatus
  confidenceScore: ConfidenceScore
  masteryScore: number
  isWeak: boolean
  lastStudiedAt?: string
  nextReviewDue?: string
  reviewStage: number
}

export interface FlashcardData {
  id: string
  deckId: string
  frontText: string
  backText: string
  hint?: string
  tags: string[]
  intervalDays: number
  easeFactor: number
  repetitions: number
  dueDate: string
  lastReviewedAt?: string
}

export interface StudyTaskData {
  id: string
  studentId: string
  subjectId: string
  topicId?: string
  taskType: TaskType
  scheduledDate: string
  scheduledStartTime?: string
  scheduledEndTime?: string
  durationMinutes: number
  priority: TaskPriority
  numericPriority: number
  status: TaskStatus
  completedAt?: string
  actualDurationMinutes?: number
  skipReason?: SkipReason
  rescheduleCount: number
}

export interface QuestionData {
  id: string
  studentId: string
  subjectId: string
  chapterId?: string
  topicId?: string
  questionText: string
  questionType: "single_choice" | "multiple_choice" | "numerical" | "assertion_reason" | "matrix_match" | "subjective"
  options: unknown[]
  correctAnswer: string
  solutionExplanation: string
  marks: number
  negativeMarks: number
  difficulty: "easy" | "medium" | "hard" | "very_hard"
  year?: number
  tags: string[]
  isPyq: boolean
  pyqSource?: string
}

export interface QuestionAttemptData {
  id: string
  studentId: string
  questionId: string
  attemptDate: string
  timeSpentSeconds: number
  result: "correct" | "wrong" | "skipped"
  studentAnswer?: string
  marksObtained: number
  notes?: string
}

export interface ExamCountdownEntry {
  examId: string
  title: string
  subjectName?: string
  daysRemaining: number
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "EXPIRED"
}

export const VALID_CURRICULUM_TRANSITIONS: Record<CurriculumStatus, CurriculumStatus[]> = {
  not_started: ["learning"],
  learning: ["practicing", "revising"],
  practicing: ["revising", "completed"],
  revising: ["practicing", "completed"],
  completed: ["mastered", "revising", "practicing"],
  mastered: ["revising", "practicing"],
}

export function isValidCurriculumTransition(from: CurriculumStatus, to: CurriculumStatus): boolean {
  return VALID_CURRICULUM_TRANSITIONS[from]?.includes(to) ?? false
}

export const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  very_hard: 4,
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}
