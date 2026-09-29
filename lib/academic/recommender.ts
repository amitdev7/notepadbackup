import type {
  RecommendationScoredResult,
  DayCapacity,
  FreeSlot,
  StudyTaskData,
  CurriculumTopicData,
  AcademicSubjectData,
  TaskPriority,
} from "./types"

interface CandidateTask {
  id: string
  subjectId: string
  subjectName: string
  topicId?: string
  topicName?: string
  taskType: StudyTaskData["taskType"]
  durationMinutes: number
  priority: TaskPriority
  numericPriority: number
  scheduledDate: string
  status: StudyTaskData["status"]
}

interface TopicContext {
  confidenceScore: number
  isWeak: boolean
  nextReviewDue?: string
  reviewStage: number
  masteryScore: number
}

interface ExamProximity {
  subjectId: string
  daysUntilExam: number
}

function daysDiffFromStrings(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z")
  const db = new Date(b + "T00:00:00Z")
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function computeStateScore(
  task: CandidateTask,
  currentDateIso: string,
  _currentMinute: number
): number {
  if (task.status === "completed") return 0
  if (task.status === "missed") return 0.9
  if (task.status === "rescheduled") return 0.6

  const daysDiff = daysDiffFromStrings(task.scheduledDate, currentDateIso)
  if (daysDiff > 0) return 0.8
  if (daysDiff === 0) return 0.7
  return 0.5
}

export function computeExamScore(
  nearestExamDays: number | undefined
): number {
  if (nearestExamDays === undefined || nearestExamDays < 0) return 0
  if (nearestExamDays <= 1) return 1.0
  if (nearestExamDays <= 3) return 0.95
  if (nearestExamDays <= 7) return 0.85
  if (nearestExamDays <= 14) return 0.7
  if (nearestExamDays <= 30) return 0.5
  return 0.2
}

export function computeRevisionScore(
  topic: TopicContext | undefined,
  currentDateIso: string
): number {
  if (!topic) return 0
  if (!topic.nextReviewDue) return 0.3

  const overdueDays = daysDiffFromStrings(topic.nextReviewDue, currentDateIso)
  if (overdueDays > 7) return 1.0
  if (overdueDays > 3) return 0.85
  if (overdueDays > 0) return 0.7
  if (overdueDays === 0) return 0.6
  return 0.2
}

export function computeWeakScore(
  topic: TopicContext | undefined
): number {
  if (!topic) return 0.3
  if (topic.isWeak) return 1.0

  const confPenalty = (5 - topic.confidenceScore) / 4
  const masteryPenalty = 1 - topic.masteryScore
  return clamp01(confPenalty * 0.6 + masteryPenalty * 0.4)
}

export function computePriorityScore(
  subjectPriority: number,
  taskNumericPriority: number
): number {
  const subjectNorm = clamp01((subjectPriority - 1) / 4)
  const taskNorm = clamp01((taskNumericPriority - 1) / 3)
  return subjectNorm * 0.5 + taskNorm * 0.5
}

export function computeFitScore(
  taskDuration: number,
  freeDurationMinutes: number
): number {
  if (freeDurationMinutes <= 0) return 0
  if (taskDuration <= 0) return 0
  if (taskDuration <= freeDurationMinutes) return 1.0

  const ratio = freeDurationMinutes / taskDuration
  return clamp01(ratio)
}

export function scoreCandidate(
  task: CandidateTask,
  topicContext: TopicContext | undefined,
  examProximity: ExamProximity | undefined,
  subjectPriority: number,
  currentDateIso: string,
  currentMinute: number,
  freeDurationMinutes: number
): { score: number; reasons: string[] } {
  const sState = computeStateScore(task, currentDateIso, currentMinute)
  const sExam = computeExamScore(examProximity?.daysUntilExam)
  const sRev = computeRevisionScore(topicContext, currentDateIso)
  const sWeak = computeWeakScore(topicContext)
  const sPrio = computePriorityScore(subjectPriority, task.numericPriority)
  const sFit = computeFitScore(task.durationMinutes, freeDurationMinutes)

  const score =
    25.0 * sState +
    25.0 * sExam +
    20.0 * sRev +
    15.0 * sWeak +
    10.0 * sPrio +
    5.0 * sFit

  const reasons: string[] = []
  if (sExam >= 0.7) {
    const days = examProximity?.daysUntilExam ?? 0
    reasons.push(`Exam in ${days} day${days === 1 ? "" : "s"}`)
  }
  if (sRev >= 0.6) reasons.push("Revision due")
  if (sWeak >= 0.7) reasons.push("Weak topic")
  if (sState >= 0.8) reasons.push("Overdue task")
  if (sPrio >= 0.6) reasons.push("High priority")
  if (sFit >= 0.9) reasons.push("Fits available time")

  if (reasons.length === 0) reasons.push("General study")

  return { score: Math.round(score * 100) / 100, reasons }
}

export function recommendStudyNow(
  candidates: CandidateTask[],
  topicsMap: Map<string, TopicContext>,
  examsMap: Map<string, ExamProximity>,
  subjectsMap: Map<string, { priority: number }>,
  currentDateIso: string,
  currentMinute: number,
  freeDurationMinutes: number,
  maxResults: number = 3
): RecommendationScoredResult[] {
  const eligible = candidates.filter(
    (c) => c.status !== "completed" && c.status !== "skipped"
  )

  const scored = eligible.map((task) => {
    const topicCtx = task.topicId ? topicsMap.get(task.topicId) : undefined
    const examCtx = examsMap.get(task.subjectId)
    const subjectPrio = subjectsMap.get(task.subjectId)?.priority ?? 3

    const { score, reasons } = scoreCandidate(
      task,
      topicCtx,
      examCtx,
      subjectPrio,
      currentDateIso,
      currentMinute,
      freeDurationMinutes
    )

    return {
      taskId: task.id,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      topicId: task.topicId,
      topicName: task.topicName,
      taskType: task.taskType,
      durationMinutes: task.durationMinutes,
      score,
      reasons,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxResults)
}

export function rescheduleMoveToDate(
  task: StudyTaskData,
  targetDate: string
): StudyTaskData {
  return {
    ...task,
    scheduledDate: targetDate,
    status: "rescheduled",
    rescheduleCount: task.rescheduleCount + 1,
  }
}

export function rescheduleMoveToTomorrow(
  task: StudyTaskData,
  currentDateIso: string
): StudyTaskData {
  const tomorrow = new Date(currentDateIso + "T00:00:00Z")
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return rescheduleMoveToDate(task, tomorrow.toISOString().slice(0, 10))
}

export function rescheduleMoveToWeekend(
  task: StudyTaskData,
  currentDateIso: string
): StudyTaskData {
  const d = new Date(currentDateIso + "T00:00:00Z")
  const dayOfWeek = d.getUTCDay()
  const daysUntilSaturday = dayOfWeek <= 6 ? (6 - dayOfWeek) % 7 || 7 : 1
  d.setUTCDate(d.getUTCDate() + daysUntilSaturday)
  return rescheduleMoveToDate(task, d.toISOString().slice(0, 10))
}

export function redistributeTasksAcrossDays(
  tasks: StudyTaskData[],
  daysCapacity: DayCapacity[]
): StudyTaskData[] {
  const sortedTasks = [...tasks].sort(
    (a, b) => b.numericPriority - a.numericPriority
  )

  const capacities = daysCapacity.map((d) => ({
    ...d,
    remaining: d.remainingMinutes,
  }))

  const result: StudyTaskData[] = []

  for (const task of sortedTasks) {
    let placed = false
    for (const day of capacities) {
      if (day.remaining >= task.durationMinutes) {
        result.push({
          ...task,
          scheduledDate: day.date,
          status: "rescheduled" as const,
          rescheduleCount: task.rescheduleCount + 1,
        })
        day.remaining -= task.durationMinutes
        placed = true
        break
      }
    }
    if (!placed) {
      result.push({
        ...task,
        status: "skipped" as const,
        skipReason: "time_conflict" as const,
      })
    }
  }

  return result
}

export function skipTaskWithDecay(
  task: StudyTaskData,
  reason: StudyTaskData["skipReason"]
): StudyTaskData {
  return {
    ...task,
    status: "skipped",
    skipReason: reason,
  }
}

export interface CatchUpResult {
  isCatchUpActive: boolean
  processedTasks: StudyTaskData[]
  droppedCount: number
  compressedCount: number
  totalOverdueMinutes: number
}

export function evaluateCatchUpMode(
  overdueTasks: StudyTaskData[],
  topicsMap: Map<string, CurriculumTopicData>,
  subjectsMap: Map<string, AcademicSubjectData>,
  nearestExamsMap: Map<string, number>,
  upcomingDays: DayCapacity[]
): CatchUpResult {
  const totalOverdueMinutes = overdueTasks.reduce(
    (s, t) => s + t.durationMinutes,
    0
  )

  const missedCount = overdueTasks.filter((t) => t.status === "missed").length

  const isCatchUpActive = totalOverdueMinutes >= 90 || missedCount >= 3

  if (!isCatchUpActive) {
    return {
      isCatchUpActive: false,
      processedTasks: overdueTasks,
      droppedCount: 0,
      compressedCount: 0,
      totalOverdueMinutes,
    }
  }

  const totalAvailableMinutes = upcomingDays.reduce(
    (s, d) => s + d.remainingMinutes,
    0
  )

  const processed: StudyTaskData[] = []
  let droppedCount = 0
  let compressedCount = 0

  for (const task of overdueTasks) {
    const topic = task.topicId ? topicsMap.get(task.topicId) : undefined
    const examDays = nearestExamsMap.get(task.subjectId)

    const isHighMastery =
      topic &&
      (topic.status === "mastered" || topic.status === "completed") &&
      topic.confidenceScore >= 4

    if (isHighMastery && examDays !== undefined && examDays > 21) {
      droppedCount++
      continue
    }

    let adjustedDuration = task.durationMinutes
    if (totalOverdueMinutes > totalAvailableMinutes) {
      adjustedDuration = Math.max(15, Math.round(task.durationMinutes * 0.7))
      compressedCount++
    }

    processed.push({
      ...task,
      durationMinutes: adjustedDuration,
      status: "pending",
    })
  }

  return {
    isCatchUpActive: true,
    processedTasks: processed,
    droppedCount,
    compressedCount,
    totalOverdueMinutes,
  }
}
