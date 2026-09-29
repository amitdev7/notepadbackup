import {
  timeStringToMinutes,
  minutesToTimeString,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTasksForDate,
  getTasksForWeek,
  buildBlockedIntervalsForDate,
  detectIntervalCollision,
  computeAvailableFreeSlots,
  clearStudyTasks
} from "../lib/academic/planner.ts"
import type {
  TimetableRule,
  CalendarEvent,
  TaskStatus
} from "../lib/academic/planner.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

console.log("Starting Academic Planner tests...")

clearStudyTasks()

assert(timeStringToMinutes("14:30") === 870, "timeStringToMinutes 14:30 should be 870")
assert(timeStringToMinutes("00:00") === 0, "timeStringToMinutes 00:00 should be 0")
assert(timeStringToMinutes("09:15") === 555, "timeStringToMinutes 09:15 should be 555")
assert(minutesToTimeString(870) === "14:30", "minutesToTimeString 870 should be 14:30")
assert(minutesToTimeString(0) === "00:00", "minutesToTimeString 0 should be 00:00")
assert(minutesToTimeString(555) === "09:15", "minutesToTimeString 555 should be 09:15")
console.log("Time conversions passed")

const task1 = createTask({
  title: "Math Homework",
  date: "2026-09-29",
  startTime: "10:00",
  endTime: "11:30",
  subject: "Mathematics"
})
assert(task1.id !== undefined, "Task should have ID")
assert(task1.status === "pending", "Task default status should be pending")
assert(task1.durationMinutes === 90, "Task durationMinutes should be 90")

const task2 = createTask({
  title: "Physics Lab Prep",
  date: "2026-09-29",
  startTime: "13:00",
  endTime: "14:00",
  status: "in_progress",
  subject: "Physics"
})

const task3 = createTask({
  title: "Chemistry Revision",
  date: "2026-10-02",
  status: "pending"
})

const dateTasks = getTasksForDate("2026-09-29")
assert(dateTasks.length === 2, `Expected 2 tasks for 2026-09-29, got ${dateTasks.length}`)

const weekTasks = getTasksForWeek("2026-09-28")
assert(weekTasks.length === 3, `Expected 3 tasks for week starting 2026-09-28, got ${weekTasks.length}`)

const statuses: TaskStatus[] = ["pending", "in_progress", "completed", "missed", "rescheduled", "skipped"]
for (const s of statuses) {
  const updated = updateTaskStatus(task1.id, s)
  assert(updated !== null && updated.status === s, `Status should be updated to ${s}`)
}

const updatedDesc = updateTask(task1.id, { description: "Chapter 4 questions" })
assert(updatedDesc?.description === "Chapter 4 questions", "Description should be updated")

const deleted = deleteTask(task2.id)
assert(deleted === true, "Task 2 should be deleted")
assert(getTasksForDate("2026-09-29").length === 1, "Expected 1 task after deletion")
console.log("CRUD tests passed")

const rules: TimetableRule[] = [
  {
    id: "lecture-1",
    title: "Math Lecture",
    dayOfWeek: "tuesday",
    startTime: "09:00",
    endTime: "10:30"
  },
  {
    id: "lecture-2",
    title: "Physics Lab",
    dayOfWeek: 2,
    startTime: "14:00",
    endTime: "16:00"
  }
]

const targetDate = new Date("2026-09-29T12:00:00Z")

const events: CalendarEvent[] = [
  {
    id: "doc-meet",
    title: "Advisor Meeting",
    date: "2026-09-29",
    startTime: "11:00",
    endTime: "12:00"
  }
]

const blocked = buildBlockedIntervalsForDate(targetDate, rules, events)
assert(blocked.length === 3, `Expected 3 blocked intervals, got ${blocked.length}`)
assert(blocked[0].startMinute === 540 && blocked[0].endMinute === 630, "Interval 0: 09:00 - 10:30")
assert(blocked[1].startMinute === 660 && blocked[1].endMinute === 720, "Interval 1: 11:00 - 12:00")
assert(blocked[2].startMinute === 840 && blocked[2].endMinute === 960, "Interval 2: 14:00 - 16:00")
console.log("Blocked intervals passed")

const collision1 = detectIntervalCollision(570, 600, blocked)
assert(collision1.hasCollision === true, "Expected collision during 09:30-10:00")
assert(collision1.collidingIntervals.length === 1, "Expected 1 colliding interval")
assert(collision1.overlapMinutes === 30, "Expected 30 min overlap")

const collision2 = detectIntervalCollision(630, 660, blocked)
assert(collision2.hasCollision === false, "10:30-11:00 should not collide with boundaries")
assert(collision2.overlapMinutes === 0, "Expected 0 min overlap")

const collision3 = detectIntervalCollision(600, 690, blocked)
assert(collision3.hasCollision === true, "Expected collision across two intervals")
assert(collision3.collidingIntervals.length === 2, "Expected 2 colliding intervals")
assert(collision3.overlapMinutes === 60, `Expected 60 min overlap (30m from interval 1 + 30m from interval 2), got ${collision3.overlapMinutes}`)
console.log("Collision tests passed")

const freeSlots = computeAvailableFreeSlots(480, 1080, blocked)
assert(freeSlots.length === 4, `Expected 4 free slots, got ${freeSlots.length}`)
assert(freeSlots[0].startMinute === 480 && freeSlots[0].endMinute === 540, "Slot 0: 08:00 - 09:00 (60m)")
assert(freeSlots[1].startMinute === 630 && freeSlots[1].endMinute === 660, "Slot 1: 10:30 - 11:00 (30m)")
assert(freeSlots[2].startMinute === 720 && freeSlots[2].endMinute === 840, "Slot 2: 12:00 - 14:00 (120m)")
assert(freeSlots[3].startMinute === 960 && freeSlots[3].endMinute === 1080, "Slot 3: 16:00 - 18:00 (120m)")
console.log("Free slots tests passed")

console.log("All academic planner tests passed successfully!")
