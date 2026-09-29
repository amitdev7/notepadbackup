import {
  calculateNextReview,
  calculateCardPriority,
  getDueCardsQueue,
  getDeckStats,
  getRevisionStage,
  getDefaultInterval,
  computeTopicRevisionPriority,
  DEFAULT_INTERVAL_SEQUENCE,
} from "../lib/academic/revision.ts"

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

function assertApprox(actual: number, expected: number, label: string, tolerance = 0.01) {
  assert(Math.abs(actual - expected) <= tolerance, `${label} (got ${actual}, expected ${expected})`)
}

console.log("=== Revision Engine Tests ===\n")

console.log("--- calculateNextReview ---")

const r1 = calculateNextReview(1, 2.5, 0, 1, "2026-01-01")
assert(r1.nextInterval === 1, "Again: interval = 1")
assert(r1.newRepetitions === 0, "Again: reps reset to 0")
assert(r1.nextDueDate === "2026-01-02", "Again: due date +1 day")
assertApprox(r1.newEaseFactor, 2.18, "Again: EF decreases", 0.01)

const r2 = calculateNextReview(5, 2.5, 3, 2, "2026-03-01")
assert(r2.nextInterval === Math.max(1, Math.round(5 * 1.2)), "Hard: interval = round(prev * 1.2)")
assert(r2.newRepetitions === 4, "Hard: reps incremented")
assert(r2.nextDueDate === "2026-03-07", "Hard: due date correct")

const r3a = calculateNextReview(1, 2.5, 0, 3, "2026-01-01")
assert(r3a.nextInterval === 1, "Good rep=0: interval = 1")
assert(r3a.newRepetitions === 1, "Good rep=0: reps = 1")

const r3b = calculateNextReview(1, 2.5, 1, 3, "2026-01-01")
assert(r3b.nextInterval === 3, "Good rep=1: interval = 3")
assert(r3b.newRepetitions === 2, "Good rep=1: reps = 2")

const r3c = calculateNextReview(3, 2.5, 2, 3, "2026-01-01")
const expectedInterval = Math.round(3 * r3c.newEaseFactor)
assert(r3c.nextInterval === expectedInterval, `Good rep=2: interval = round(3 * EF) = ${expectedInterval}`)

const r4 = calculateNextReview(7, 2.5, 3, 4, "2026-01-01")
const expectedEasy = Math.round(7 * r4.newEaseFactor * 1.3)
assert(r4.nextInterval === expectedEasy, `Easy: interval = round(7 * EF * 1.3) = ${expectedEasy}`)

const rEfMin = calculateNextReview(1, 1.3, 0, 1, "2026-01-01")
assertApprox(rEfMin.newEaseFactor, 1.3, "EF floor clamped at 1.30", 0.01)

const rEfMax = calculateNextReview(1, 2.9, 5, 4, "2026-01-01")
assert(rEfMax.newEaseFactor <= 3.0, "EF ceiling clamped at 3.00")

console.log("\n--- calculateCardPriority ---")

const p1 = calculateCardPriority(
  { dueDate: "2026-01-01", intervalDays: 1, easeFactor: 2.5 },
  "2026-01-01"
)
assertApprox(p1, 100 * 1.0 + (3.0 - 2.5) * 10, "Not overdue: priority score", 0.1)

const p2 = calculateCardPriority(
  { dueDate: "2026-01-01", intervalDays: 7, easeFactor: 2.5 },
  "2026-01-08"
)
const expected_p2 = 100 * (1.0 + 7 / 7) + (3.0 - 2.5) * 10
assertApprox(p2, expected_p2, "7 days overdue / 7 day interval", 0.1)

const p3 = calculateCardPriority(
  { dueDate: "2026-01-01", intervalDays: 1, easeFactor: 1.3 },
  "2026-01-04"
)
const expected_p3 = 100 * (1.0 + 3 / 1) + (3.0 - 1.3) * 10
assertApprox(p3, expected_p3, "Low EF = higher penalty", 0.1)

console.log("\n--- getDueCardsQueue ---")

const cards = [
  { id: "c1", dueDate: "2026-01-01", intervalDays: 1, easeFactor: 2.5, repetitions: 0 },
  { id: "c2", dueDate: "2025-12-25", intervalDays: 3, easeFactor: 2.0, repetitions: 2 },
  { id: "c3", dueDate: "2026-01-05", intervalDays: 7, easeFactor: 2.5, repetitions: 3 },
  { id: "c4", dueDate: "2025-12-20", intervalDays: 1, easeFactor: 1.5, repetitions: 1 },
]

const queue = getDueCardsQueue(cards, "2026-01-02")
assert(queue.length === 3, "3 cards due (c1, c2, c4)")
assert(!queue.some((c) => c.id === "c3"), "c3 not due yet")
assert(queue[0].id === "c4", "Most overdue card first (c4 = 13 days overdue / interval 1)")

console.log("\n--- getDeckStats ---")

const stats = getDeckStats(cards, "2026-01-02")
assert(stats.total === 4, "total = 4")
assert(stats.due === 3, "due = 3")
assert(stats.learning + stats.mastered === 4, "learning + mastered = total")

console.log("\n--- getRevisionStage ---")

assert(getRevisionStage(0) === "Learn", "stage 0 = Learn")
assert(getRevisionStage(1) === "Practice", "stage 1 = Practice")
assert(getRevisionStage(2) === "Rev 1", "stage 2 = Rev 1")
assert(getRevisionStage(3) === "Rev 2", "stage 3 = Rev 2")
assert(getRevisionStage(4) === "Rev 3", "stage 4 = Rev 3")
assert(getRevisionStage(5) === "Mastered", "stage 5 = Mastered")
assert(getRevisionStage(99) === "Mastered", "stage 99 = Mastered")

console.log("\n--- DEFAULT_INTERVAL_SEQUENCE ---")

assert(DEFAULT_INTERVAL_SEQUENCE[0] === 1, "interval[0] = 1")
assert(DEFAULT_INTERVAL_SEQUENCE[1] === 3, "interval[1] = 3")
assert(DEFAULT_INTERVAL_SEQUENCE[2] === 7, "interval[2] = 7")
assert(DEFAULT_INTERVAL_SEQUENCE[3] === 14, "interval[3] = 14")
assert(DEFAULT_INTERVAL_SEQUENCE[4] === 30, "interval[4] = 30")

assert(getDefaultInterval(0) === 1, "getDefaultInterval(0) = 1")
assert(getDefaultInterval(4) === 30, "getDefaultInterval(4) = 30")
assert(getDefaultInterval(10) === 30, "getDefaultInterval(10) = 30 (clamped)")

console.log("\n--- computeTopicRevisionPriority ---")

const tp1 = computeTopicRevisionPriority(
  { nextReviewDue: "2026-01-01", reviewStage: 1, confidenceScore: 2, isWeak: true },
  "2026-01-08"
)
assert(tp1 > 0, "overdue + weak + low confidence = high priority")

const tp2 = computeTopicRevisionPriority(
  { nextReviewDue: "2026-02-01", reviewStage: 5, confidenceScore: 5, isWeak: false },
  "2026-01-08"
)
assert(tp2 < tp1, "not overdue + mastered + high confidence = lower priority")

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
