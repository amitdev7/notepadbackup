import {
  computeStateScore,
  computeExamScore,
  computeRevisionScore,
  computeWeakScore,
  computePriorityScore,
  computeFitScore,
  recommendStudyNow,
  rescheduleMoveToTomorrow,
  rescheduleMoveToWeekend,
  redistributeTasksAcrossDays,
  evaluateCatchUpMode,
} from "../lib/academic/recommender.ts"

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`FAIL: ${label}`)
  }
}

function assertRange(actual: number, min: number, max: number, label: string) {
  assert(actual >= min && actual <= max, `${label} (got ${actual}, expected [${min}, ${max}])`)
}

console.log("=== Recommender Engine Tests ===\n")

console.log("--- computeExamScore ---")
assert(computeExamScore(undefined) === 0, "no exam = 0")
assert(computeExamScore(-1) === 0, "negative days = 0")
assert(computeExamScore(0) === 1.0, "exam today = 1.0")
assert(computeExamScore(1) === 1.0, "exam tomorrow = 1.0")
assert(computeExamScore(3) === 0.95, "exam in 3 days = 0.95")
assert(computeExamScore(7) === 0.85, "exam in 7 days = 0.85")
assert(computeExamScore(14) === 0.7, "exam in 14 days = 0.7")
assert(computeExamScore(30) === 0.5, "exam in 30 days = 0.5")
assert(computeExamScore(60) === 0.2, "exam in 60 days = 0.2")

console.log("\n--- computeWeakScore ---")
assert(computeWeakScore(undefined) === 0.3, "no topic = 0.3")
assert(computeWeakScore({ confidenceScore: 1, isWeak: true, masteryScore: 0, nextReviewDue: undefined, reviewStage: 0 }) === 1.0, "weak topic = 1.0")
const notWeak = computeWeakScore({ confidenceScore: 5, isWeak: false, masteryScore: 1.0, nextReviewDue: undefined, reviewStage: 5 })
assertRange(notWeak, 0, 0.1, "strong topic near 0")

console.log("\n--- computePriorityScore ---")
assert(computePriorityScore(5, 4) === 1.0, "max priorities = 1.0")
assertRange(computePriorityScore(1, 1), 0, 0.1, "min priorities near 0")

console.log("\n--- computeFitScore ---")
assert(computeFitScore(30, 45) === 1.0, "task fits = 1.0")
assert(computeFitScore(45, 0) === 0, "no free time = 0")
assert(computeFitScore(0, 30) === 0, "zero duration = 0")
assertRange(computeFitScore(60, 30), 0.4, 0.6, "partial fit")

console.log("\n--- computeRevisionScore ---")
assert(computeRevisionScore(undefined, "2026-01-01") === 0, "no topic = 0")
assert(computeRevisionScore({ confidenceScore: 3, isWeak: false, masteryScore: 0.5, nextReviewDue: undefined, reviewStage: 0 }, "2026-01-01") === 0.3, "no review due = 0.3")
const overdue10 = computeRevisionScore(
  { confidenceScore: 3, isWeak: false, masteryScore: 0.5, nextReviewDue: "2025-12-20", reviewStage: 2 },
  "2026-01-01"
)
assert(overdue10 === 1.0, "10+ days overdue = 1.0")

console.log("\n--- recommendStudyNow ---")

const candidates = [
  {
    id: "t1", subjectId: "s1", subjectName: "Math", taskType: "revision" as const,
    durationMinutes: 30, priority: "high" as const, numericPriority: 3,
    scheduledDate: "2026-01-01", status: "pending" as const,
  },
  {
    id: "t2", subjectId: "s2", subjectName: "Science", taskType: "first_learn" as const,
    durationMinutes: 45, priority: "medium" as const, numericPriority: 2,
    scheduledDate: "2026-01-02", status: "pending" as const,
  },
  {
    id: "t3", subjectId: "s1", subjectName: "Math", taskType: "practice" as const,
    durationMinutes: 60, priority: "low" as const, numericPriority: 1,
    scheduledDate: "2026-01-03", status: "completed" as const,
  },
]

const topicsMap = new Map([
  ["topic1", { confidenceScore: 2, isWeak: true, nextReviewDue: "2025-12-28", reviewStage: 1, masteryScore: 0.3 }],
])
const examsMap = new Map([
  ["s1", { subjectId: "s1", daysUntilExam: 5 }],
])
const subjectsMap = new Map([
  ["s1", { priority: 5 }],
  ["s2", { priority: 3 }],
])

const results = recommendStudyNow(candidates, topicsMap, examsMap, subjectsMap, "2026-01-01", 960, 45, 3)

assert(results.length === 2, "2 non-completed candidates returned")
assert(results[0].taskId === "t1", "t1 ranked first (revision due + exam close + weak + high priority)")
assert(results[0].score > results[1].score, "t1 score > t2 score")
assert(results[0].reasons.length > 0, "reasons provided")

console.log("\n--- rescheduleMoveToTomorrow ---")

const task = {
  id: "t1", studentId: "stu1", subjectId: "s1", taskType: "first_learn" as const,
  scheduledDate: "2026-01-05", durationMinutes: 30, priority: "high" as const,
  numericPriority: 3, status: "pending" as const, rescheduleCount: 0,
}
const moved = rescheduleMoveToTomorrow(task, "2026-01-05")
assert(moved.scheduledDate === "2026-01-06", "moved to Jan 6")
assert(moved.status === "rescheduled", "status = rescheduled")
assert(moved.rescheduleCount === 1, "reschedule count incremented")

console.log("\n--- rescheduleMoveToWeekend ---")

const movedWknd = rescheduleMoveToWeekend(task, "2026-01-05")
assert(movedWknd.status === "rescheduled", "status = rescheduled")
const wkndDate = new Date(movedWknd.scheduledDate + "T00:00:00Z")
assert(wkndDate.getUTCDay() === 6 || wkndDate.getUTCDay() === 0, "moved to Saturday or Sunday")

console.log("\n--- redistributeTasksAcrossDays ---")

const tasks = [
  { ...task, id: "a", durationMinutes: 30, numericPriority: 3 },
  { ...task, id: "b", durationMinutes: 45, numericPriority: 2 },
  { ...task, id: "c", durationMinutes: 60, numericPriority: 1 },
]

const daysCapacity = [
  { date: "2026-01-06", freeSlots: [], totalFreeMinutes: 60, allocatedMinutes: 0, remainingMinutes: 60 },
  { date: "2026-01-07", freeSlots: [], totalFreeMinutes: 90, allocatedMinutes: 0, remainingMinutes: 90 },
]

const redistributed = redistributeTasksAcrossDays(tasks, daysCapacity)
assert(redistributed.length === 3, "all 3 tasks processed")
const placed = redistributed.filter((t) => t.status === "rescheduled")
const skipped = redistributed.filter((t) => t.status === "skipped")
assert(placed.length + skipped.length === 3, "each task either placed or skipped")

console.log("\n--- evaluateCatchUpMode ---")

const overdueTasksCU = Array.from({ length: 4 }, (_, i) => ({
  ...task,
  id: `cu_${i}`,
  status: "missed" as const,
  durationMinutes: 30,
}))

const topicsMapCU = new Map<string, any>()
const subjectsMapCU = new Map<string, any>()
const nearestExamsCU = new Map<string, number>()
const upcomingDaysCU = [
  { date: "2026-01-06", freeSlots: [], totalFreeMinutes: 60, allocatedMinutes: 0, remainingMinutes: 60 },
]

const cuResult = evaluateCatchUpMode(overdueTasksCU, topicsMapCU, subjectsMapCU, nearestExamsCU, upcomingDaysCU)
assert(cuResult.isCatchUpActive === true, "catch-up active with 4 missed tasks")
assert(cuResult.totalOverdueMinutes === 120, "total overdue = 120 min")

const lowOverdue = [{ ...task, id: "lo1", status: "missed" as const, durationMinutes: 20 }]
const cuResult2 = evaluateCatchUpMode(lowOverdue, topicsMapCU, subjectsMapCU, nearestExamsCU, upcomingDaysCU)
assert(cuResult2.isCatchUpActive === false, "catch-up NOT active with 1 missed 20min task")

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
