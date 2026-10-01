// ---------------------------------------------------------------------------
// Zenithsui Functional Calendar — Automated Test Suite
//
// Verifies:
// 1. Timezone-safe date math & leap-year handling
// 2. Month and week grid construction & overflow days
// 3. Multi-column overlap lane clustering in Week View
// 4. Event CRUD, status updates, and date filtering
// 5. Recurrence pattern expansion (daily, weekly, monthly)
// 6. Collision detection & free slot computation via academic planner
// 7. Library registry registration & backward compatibility
// ---------------------------------------------------------------------------

import {
  isLeapYear,
  getDaysInMonth,
  formatDateIso,
  parseDateIso,
  getWeekday,
  addDaysIso,
  addMonths,
  addWeeksIso,
  buildMonthGrid,
  buildWeekDays,
  formatTime,
  parseTimeToMinutes,
  minutesToTimeString,
  isSameDay,
  isDateInRange,
} from "../lib/calendar/date-utils.ts"

import {
  computeOverlapLanes,
  expandRecurringEvents,
  snapToInterval,
  clampTimeToDay,
} from "../lib/calendar/layout.ts"

import {
  useCalendarStore,
  checkEventConflict,
  getAvailableFreeSlots,
} from "../lib/calendar/event-store.ts"

import type { CalendarEvent } from "../lib/calendar/types.ts"
import { getDef, ALL_DEFS } from "../lib/library/registry.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed]: ${message}`)
  }
}

console.log("=== Starting Zenithsui Functional Calendar Test Suite ===")

// ---------------------------------------------------------------------------
// 1. Date Math & Leap Year Verification
// ---------------------------------------------------------------------------
console.log("-> 1. Testing pure date math & leap years...")

assert(isLeapYear(2024) === true, "2024 is a leap year")
assert(isLeapYear(2020) === true, "2020 is a leap year")
assert(isLeapYear(2000) === true, "2000 is a leap year (divisible by 400)")
assert(isLeapYear(1900) === false, "1900 is NOT a leap year (divisible by 100 but not 400)")
assert(isLeapYear(2025) === false, "2025 is not a leap year")
assert(isLeapYear(2026) === false, "2026 is not a leap year")

assert(getDaysInMonth(2024, 2) === 29, "Feb 2024 has 29 days")
assert(getDaysInMonth(2026, 2) === 28, "Feb 2026 has 28 days")
assert(getDaysInMonth(2026, 1) === 31, "Jan has 31 days")
assert(getDaysInMonth(2026, 4) === 30, "Apr has 30 days")
assert(getDaysInMonth(2026, 12) === 31, "Dec has 31 days")

// Date ISO formatting & parsing
assert(formatDateIso(2026, 10, 1) === "2026-10-01", "Format ISO date 2026-10-01")
assert(formatDateIso(2026, 3, 5) === "2026-03-05", "Format ISO date with zero padding")
const parsed = parseDateIso("2026-10-01")
assert(parsed.year === 2026 && parsed.month === 10 && parsed.day === 1, "Parse ISO date")

// Weekday calculation (Zeller's congruence / pure formula)
// 2026-10-01 is a Thursday (4: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
assert(getWeekday(2026, 10, 1) === 4, "2026-10-01 is Thursday (weekday 4)")
// 2026-10-04 is Sunday (0)
assert(getWeekday(2026, 10, 4) === 0, "2026-10-04 is Sunday (weekday 0)")

// Date arithmetic across month & year boundaries
assert(addDaysIso("2026-10-31", 1) === "2026-11-01", "Add 1 day across month boundary")
assert(addDaysIso("2026-12-31", 1) === "2027-01-01", "Add 1 day across year boundary")
assert(addDaysIso("2026-03-01", -1) === "2026-02-28", "Subtract 1 day across non-leap Feb")
assert(addDaysIso("2024-03-01", -1) === "2024-02-29", "Subtract 1 day across leap Feb")

const nextM = addMonths(2026, 12, 1)
assert(nextM.year === 2027 && nextM.month === 1, "addMonths December to January")
const prevM = addMonths(2026, 1, -1)
assert(prevM.year === 2025 && prevM.month === 12, "addMonths January to December")

assert(addWeeksIso("2026-10-01", 1) === "2026-10-08", "addWeeksIso forward")
assert(addWeeksIso("2026-10-01", -1) === "2026-09-24", "addWeeksIso backward")

// Time string parsing and formatting
assert(parseTimeToMinutes("00:00") === 0, "parse 00:00 to 0 min")
assert(parseTimeToMinutes("09:30") === 570, "parse 09:30 to 570 min")
assert(parseTimeToMinutes("14:15") === 855, "parse 14:15 to 855 min")
assert(parseTimeToMinutes("23:59") === 1439, "parse 23:59 to 1439 min")
assert(minutesToTimeString(570) === "09:30", "minutesToTimeString 570 to 09:30")
assert(formatTime(855, "12h") === "2:15 PM", "format 855 min to 12h")
assert(formatTime(570, "12h") === "9:30 AM", "format 570 min to 12h")

console.log("✓ Pure date math tests passed.")

// ---------------------------------------------------------------------------
// 2. Month Grid & Week Construction
// ---------------------------------------------------------------------------
console.log("-> 2. Testing month grid & week construction...")

// Month grid for October 2026 (starts on Thursday, 31 days)
const monthGrid = buildMonthGrid(2026, 10, "sunday")
assert(monthGrid.length % 7 === 0, "Month grid length must be a multiple of 7")
assert(monthGrid.length >= 35, "October 2026 needs at least 5 rows (35 cells)")

// First cell should be Sunday of overflow from September (Sep 27)
const firstCell = monthGrid[0]
assert(!firstCell.isCurrentMonth, "First cell is overflow from previous month")
assert(firstCell.date === "2026-09-27", "First cell date is 2026-09-27")

// Target 1st October cell
const oct1Cell = monthGrid.find((c) => c.date === "2026-10-01")
assert(Boolean(oct1Cell && oct1Cell.isCurrentMonth), "2026-10-01 cell found in current month")
assert(oct1Cell!.weekday === 4, "2026-10-01 cell weekday is 4 (Thu)")

// Last cell of October 2026 is Saturday Oct 31 (completes exactly 35 cells)
const lastCell = monthGrid[monthGrid.length - 1]
assert(lastCell.date === "2026-10-31" && lastCell.weekday === 6, "October 2026 ends on Saturday Oct 31")

// September 2026 grid overflows into October
const sepGrid = buildMonthGrid(2026, 9, "sunday")
const lastSepCell = sepGrid[sepGrid.length - 1]
assert(!lastSepCell.isCurrentMonth && lastSepCell.date.startsWith("2026-10"), "September grid overflows into October")

// Week construction
const weekSunday = buildWeekDays("2026-10-01", "sunday")
assert(weekSunday.length === 7, "Week view has exactly 7 days")
assert(weekSunday[0].weekday === 0, "Week starting Sunday has first day weekday 0")
assert(weekSunday[0].date === "2026-09-27", "Week for 2026-10-01 starts on 2026-09-27")
assert(weekSunday[6].date === "2026-10-03", "Week for 2026-10-01 ends on 2026-10-03")

const weekMonday = buildWeekDays("2026-10-01", "monday")
assert(weekMonday[0].weekday === 1, "Week starting Monday has first day weekday 1")
assert(weekMonday[0].date === "2026-09-28", "Week for 2026-10-01 starts on Mon 2026-09-28")

console.log("✓ Month & Week construction tests passed.")

// ---------------------------------------------------------------------------
// 3. Multi-Column Overlap Lane Clustering
// ---------------------------------------------------------------------------
console.log("-> 3. Testing overlap lane clustering for timed events...")

const testEvents: CalendarEvent[] = [
  {
    id: "ev1",
    title: "Morning Lecture",
    date: "2026-10-01",
    startTime: "09:00",
    endTime: "10:30",
    durationMinutes: 90,
    isAllDay: false,
    type: "Lecture",
    priority: "High",
    status: "pending",
    recurrence: "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "ev2",
    title: "Study Group",
    date: "2026-10-01",
    startTime: "10:00", // Overlaps with ev1 (09:00 - 10:30)
    endTime: "11:00",
    durationMinutes: 60,
    isAllDay: false,
    type: "Study",
    priority: "Medium",
    status: "pending",
    recurrence: "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "ev3",
    title: "Lunch Break",
    date: "2026-10-01",
    startTime: "12:00", // Disjoint from ev1 and ev2
    endTime: "13:00",
    durationMinutes: 60,
    isAllDay: false,
    type: "Personal",
    priority: "Low",
    status: "pending",
    recurrence: "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const positioned = computeOverlapLanes(testEvents)
assert(positioned.length === 3, "All 3 events positioned")

const pos1 = positioned.find((p) => p.id === "ev1")!
const pos2 = positioned.find((p) => p.id === "ev2")!
const pos3 = positioned.find((p) => p.id === "ev3")!

// ev1 and ev2 overlap, so they must be in separate lanes with totalLanes = 2
assert(pos1.lane !== pos2.lane, "Overlapping events ev1 and ev2 must have different lanes")
assert(pos1.totalLanes === 2, "ev1 totalLanes should be 2")
assert(pos2.totalLanes === 2, "ev2 totalLanes should be 2")

// ev3 is disjoint, so it should occupy lane 0 with totalLanes = 1
assert(pos3.lane === 0, "Disjoint event ev3 occupies lane 0")
assert(pos3.totalLanes === 1, "Disjoint event ev3 totalLanes is 1")

// Snapping and clamping
assert(snapToInterval(52, 15) === 45, "52 min snaps to 45 min")
assert(snapToInterval(53, 15) === 60, "53 min snaps to 60 min")
assert(clampTimeToDay(1500) === 1439, "Clamps beyond midnight to 1439")
assert(clampTimeToDay(-20) === 0, "Clamps below 0 to 0")

console.log("✓ Overlap lane clustering tests passed.")

// ---------------------------------------------------------------------------
// 4. Calendar Event CRUD & State Store Operations
// ---------------------------------------------------------------------------
console.log("-> 4. Testing event CRUD & store operations...")

const store = useCalendarStore.getState()
store.clearAllEvents()

const created = store.createEvent({
  title: "Algorithms Final Exam",
  date: "2026-10-15",
  startTime: "14:00",
  endTime: "16:00",
  durationMinutes: 120,
  isAllDay: false,
  type: "Exam",
  priority: "High",
  status: "pending",
  recurrence: "none",
})

assert(created.id !== undefined, "Created event has generated ID")
assert(created.title === "Algorithms Final Exam", "Title is correct")

// Update event
store.updateEvent(created.id, {
  location: "Hall B",
  status: "in_progress",
})
const updated = useCalendarStore.getState().getEventById(created.id)
assert(updated?.location === "Hall B", "Event location updated")
assert(updated?.status === "in_progress", "Event status updated")

// Move event to another date/time (drag & drop simulation)
store.moveEvent(created.id, "2026-10-16", "15:00")
const moved = useCalendarStore.getState().getEventById(created.id)
assert(moved?.date === "2026-10-16", "Event moved to new date")
assert(moved?.startTime === "15:00", "Event moved to new start time")
assert(moved?.endTime === "17:00", "Event end time adjusted for duration")

// Resize duration (duration drag simulation)
store.resizeEvent(created.id, 90)
const resized = useCalendarStore.getState().getEventById(created.id)
assert(resized?.durationMinutes === 90, "Event duration resized to 90 min")
assert(resized?.endTime === "16:30", "Event end time updated to 16:30")

// Query by date
const dateEvents = useCalendarStore.getState().getEventsForDate("2026-10-16")
assert(dateEvents.length === 1 && dateEvents[0].id === created.id, "Query by date returned moved event")

// Delete event
store.deleteEvent(created.id)
const deleted = useCalendarStore.getState().getEventById(created.id)
assert(deleted === undefined, "Deleted event no longer in store")

console.log("✓ Event CRUD tests passed.")

// ---------------------------------------------------------------------------
// 5. Recurrence Expansion
// ---------------------------------------------------------------------------
console.log("-> 5. Testing recurrence expansion...")

const recurringDaily: CalendarEvent = {
  id: "rec-daily",
  title: "Morning Routine",
  date: "2026-10-01",
  startTime: "07:00",
  endTime: "07:30",
  durationMinutes: 30,
  isAllDay: false,
  type: "Personal",
  priority: "Low",
  status: "pending",
  recurrence: "daily",
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Expand across first 5 days of October
const expandedDaily = expandRecurringEvents([recurringDaily], "2026-10-01", "2026-10-05")
assert(expandedDaily.length === 5, "Daily event expands to 5 instances in 5 days")
assert(expandedDaily[0].date === "2026-10-01", "First instance date")
assert(expandedDaily[4].date === "2026-10-05", "Last instance date")

const recurringWeekly: CalendarEvent = {
  id: "rec-weekly",
  title: "Weekly Lab",
  date: "2026-10-01", // Thursday
  startTime: "14:00",
  endTime: "16:00",
  durationMinutes: 120,
  isAllDay: false,
  type: "Lab",
  priority: "Medium",
  status: "pending",
  recurrence: "weekly",
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Expand across whole month of October (Thu Oct 1, 8, 15, 22, 29)
const expandedWeekly = expandRecurringEvents([recurringWeekly], "2026-10-01", "2026-10-31")
assert(expandedWeekly.length === 5, "Weekly event on Thursday occurs 5 times in October 2026")
assert(expandedWeekly[1].date === "2026-10-08", "Second instance is Oct 8")

console.log("✓ Recurrence expansion tests passed.")

// ---------------------------------------------------------------------------
// 6. Collision Detection & Academic Free Slots
// ---------------------------------------------------------------------------
console.log("-> 6. Testing collision detection & free slot computation...")

// Populate two events on 2026-10-20
useCalendarStore.getState().clearAllEvents()
useCalendarStore.getState().createEvent({
  title: "Physics Class",
  date: "2026-10-20",
  startTime: "10:00",
  endTime: "11:30",
  durationMinutes: 90,
  isAllDay: false,
  type: "Lecture",
  priority: "High",
  status: "pending",
  recurrence: "none",
})

useCalendarStore.getState().createEvent({
  title: "Chemistry Lab",
  date: "2026-10-20",
  startTime: "13:00",
  endTime: "15:00",
  durationMinutes: 120,
  isAllDay: false,
  type: "Lab",
  priority: "High",
  status: "pending",
  recurrence: "none",
})

// Test conflicting proposal (10:30 - 11:00 overlaps with Physics Class 10:00-11:30)
const conflictResult = checkEventConflict("2026-10-20", "10:30", "11:00")
assert(conflictResult.hasConflict === true, "Must detect conflict with 10:00-11:30 class")
assert(conflictResult.conflictingTitles.length > 0, "Returns conflicting titles")

// Test non-conflicting proposal (11:30 - 12:30 is clear)
const noConflictResult = checkEventConflict("2026-10-20", "11:30", "12:30")
assert(noConflictResult.hasConflict === false, "11:30-12:30 is free from conflict")

// Test available free slots computation (asking for 60 min slots between 09:00 and 16:00)
const freeSlots = getAvailableFreeSlots("2026-10-20", 60, "09:00", "16:00")
assert(freeSlots.length >= 2, "Must find free slots before and between scheduled events")
// Slot between 11:30 and 13:00 is 90 mins, can fit 60 mins
const midSlot = freeSlots.find((s) => s.startTime === "11:30")
assert(Boolean(midSlot), "Identified 11:30 free slot")

console.log("✓ Collision detection & free slot tests passed.")

// ---------------------------------------------------------------------------
// 7. Library Registry Registration & Backward Compatibility
// ---------------------------------------------------------------------------
console.log("-> 7. Testing library registry & backward compatibility...")

const functionalDef = getDef("functional-calendar")
assert(Boolean(functionalDef), "functional-calendar must be registered in component registry")
assert(functionalDef!.name === "Calendar", "Component display name is 'Calendar'")
assert(functionalDef!.category === "blocks", "Category is 'blocks'")
assert(functionalDef!.group === "App", "Group is 'App'")
assert(functionalDef!.interactive === true, "Must be flagged as interactive")
assert(typeof functionalDef!.render === "function", "Must have render() fallback for wireframing & preview")

// Test preview render produces valid prims
const previewPrims = functionalDef!.render(functionalDef!.defaults, 760, 560)
assert(Array.isArray(previewPrims) && previewPrims.length > 10, "render() returns wireframe sketch prims")

// Verify existing static calendar definitions remain unharmed
const staticCalendar = getDef("calendar")
assert(Boolean(staticCalendar), "Existing 'calendar' component definition preserved")
const monthlyCalendar = getDef("monthly-calendar")
assert(Boolean(monthlyCalendar), "Existing 'monthly-calendar' component definition preserved")
const weeklyCalendar = getDef("weekly-calendar")
assert(Boolean(weeklyCalendar), "Existing 'weekly-calendar' component definition preserved")
const calendarBlock = getDef("calendar-block")
assert(Boolean(calendarBlock), "Existing 'calendar-block' component definition preserved")
const datePicker = getDef("date-picker")
assert(Boolean(datePicker), "Existing 'date-picker' component definition preserved")

// Ensure search finds functional-calendar
const foundByKeyword = ALL_DEFS.filter((d) => d.keywords.includes("schedule") || d.keywords.includes("calendar"))
assert(foundByKeyword.some((d) => d.kind === "functional-calendar"), "Searchable by 'schedule' or 'calendar' keywords")

console.log("✓ Library registry & backward compatibility tests passed.")

console.log("=== All Zenithsui Functional Calendar Tests Passed Successfully! ===")
