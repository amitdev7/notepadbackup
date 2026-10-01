// ---------------------------------------------------------------------------
// Zenithsui Calendar Engine — Date & Time Mathematical Utilities
//
// Pure, timezone-safe date calculations avoiding UTC conversion shifts.
// Handles leap years, month boundaries, year rollovers, and week offsets.
// ---------------------------------------------------------------------------

export type WeekStartsOn = "sunday" | "monday"

export interface MonthCell {
  date: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  weekday: number // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface WeekDay {
  date: string // YYYY-MM-DD
  dayNumber: number
  dayName: string
  isToday: boolean
  weekday: number
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const WEEKDAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 1-indexed (1 = January, 12 = December)
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30
  }
  return 31
}

export function formatDateIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0")
  const m = String(month).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateIso(iso: string): { year: number; month: number; day: number } {
  if (!iso || typeof iso !== "string") {
    const today = new Date()
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    }
  }
  const parts = iso.trim().slice(0, 10).split("-")
  const year = parseInt(parts[0] || "2026", 10)
  const month = parseInt(parts[1] || "1", 10)
  const day = parseInt(parts[2] || "1", 10)
  return {
    year: isNaN(year) ? 2026 : year,
    month: isNaN(month) ? 1 : Math.max(1, Math.min(12, month)),
    day: isNaN(day) ? 1 : Math.max(1, Math.min(31, day)),
  }
}

export function getTodayIso(): string {
  const now = new Date()
  return formatDateIso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Zeller-like weekday calculation in pure integer arithmetic:
 * Returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
 */
export function getWeekday(year: number, month: number, day: number): number {
  // JavaScript Date using local time coordinates
  const d = new Date(year, month - 1, day)
  return d.getDay()
}

export function addDaysIso(iso: string, days: number): string {
  const { year, month, day } = parseDateIso(iso)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return formatDateIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = (totalMonths % 12) + 1
  return { year: nextYear, month: nextMonth }
}

export function addWeeksIso(iso: string, deltaWeeks: number): string {
  return addDaysIso(iso, deltaWeeks * 7)
}

export function formatMonthYear(year: number, month: number): string {
  const mName = MONTH_NAMES[Math.max(0, Math.min(11, month - 1))]
  return `${mName} ${year}`
}

export function getWeekdayHeaders(weekStartsOn: WeekStartsOn = "sunday"): string[] {
  return weekStartsOn === "sunday" ? WEEKDAY_NAMES_SUN : WEEKDAY_NAMES_MON
}

/**
 * Builds the exact 28 to 42 cells needed for any given month,
 * correctly prepending previous-month overflow and appending next-month overflow.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn = "sunday"
): MonthCell[] {
  const todayIso = getTodayIso()
  const daysInCurrent = getDaysInMonth(year, month)
  const firstDayWeekday = getWeekday(year, month, 1)

  // Calculate how many days from previous month are visible
  const leadingOffset = weekStartsOn === "sunday" ? firstDayWeekday : (firstDayWeekday + 6) % 7

  const { year: prevYear, month: prevMonth } = addMonths(year, month, -1)
  const daysInPrev = getDaysInMonth(prevYear, prevMonth)

  const cells: MonthCell[] = []

  // 1. Previous month overflow days
  for (let i = leadingOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const date = formatDateIso(prevYear, prevMonth, d)
    cells.push({
      date,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: date === todayIso,
      weekday: getWeekday(prevYear, prevMonth, d),
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrent; d++) {
    const date = formatDateIso(year, month, d)
    cells.push({
      date,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: date === todayIso,
      weekday: getWeekday(year, month, d),
    })
  }

  // 3. Next month overflow days (fill to 35 or 42 cells for consistent row grid)
  const totalCells = cells.length > 35 ? 42 : 35
  const trailingDays = totalCells - cells.length
  const { year: nextYear, month: nextMonth } = addMonths(year, month, 1)

  for (let d = 1; d <= trailingDays; d++) {
    const date = formatDateIso(nextYear, nextMonth, d)
    cells.push({
      date,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: date === todayIso,
      weekday: getWeekday(nextYear, nextMonth, d),
    })
  }

  return cells
}

/**
 * Builds the 7 days of the week containing the reference date.
 */
export function buildWeekDays(
  referenceDateIso: string,
  weekStartsOn: WeekStartsOn = "sunday"
): WeekDay[] {
  const { year, month, day } = parseDateIso(referenceDateIso)
  const weekday = getWeekday(year, month, day)
  const todayIso = getTodayIso()

  // Calculate day offset to the start of the week
  const offset = weekStartsOn === "sunday" ? weekday : (weekday + 6) % 7
  const startOfWeekIso = addDaysIso(referenceDateIso, -offset)

  const result: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDaysIso(startOfWeekIso, i)
    const { year: y, month: m, day: d } = parseDateIso(date)
    const wd = getWeekday(y, m, d)
    const dayName = WEEKDAY_NAMES_SUN[wd]
    result.push({
      date,
      dayNumber: d,
      dayName,
      isToday: date === todayIso,
      weekday: wd,
    })
  }

  return result
}

export function formatTime(minutes: number, format: "12h" | "24h" = "12h"): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  const mStr = String(m).padStart(2, "0")

  if (format === "24h") {
    return `${String(h).padStart(2, "0")}:${mStr}`
  }

  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${period}`
}

export function minutesToTimeString(minutes: number): string {
  return formatTime(minutes, "24h")
}


export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0
  const parts = timeStr.trim().split(":")
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1] || "0", 10)
  const validHours = isNaN(hours) ? 0 : Math.max(0, Math.min(23, hours))
  const validMinutes = isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes))
  return validHours * 60 + validMinutes
}

export function isSameDay(dateA: string, dateB: string): boolean {
  return dateA.slice(0, 10) === dateB.slice(0, 10)
}

export function isDateInRange(targetDate: string, startDate: string, endDate?: string): boolean {
  const target = targetDate.slice(0, 10)
  const start = startDate.slice(0, 10)
  const end = endDate ? endDate.slice(0, 10) : start
  return target >= start && target <= end
}
