export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "missed"
  | "rescheduled"
  | "skipped"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface StudyTask {
  id: string
  title: string
  description?: string
  subject?: string
  date: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  status: TaskStatus
  priority?: TaskPriority
  tags?: string[]
  documentId?: string
  isAllDay?: boolean
  completedAt?: string | null
  rescheduledTo?: string | null
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type CreateStudyTaskInput = Omit<StudyTask, "id" | "createdAt" | "updatedAt"> & {
  id?: string
  status?: TaskStatus
}

export type UpdateStudyTaskInput = Partial<Omit<StudyTask, "id">>

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"

export interface TimetableRule {
  id?: string
  title?: string
  name?: string
  dayOfWeek?: DayOfWeek | number
  daysOfWeek?: (DayOfWeek | number)[]
  startTime: string
  endTime: string
  type?: string
  subject?: string
  room?: string
  location?: string
  isRecurring?: boolean
  startDate?: string
  endDate?: string
  metadata?: Record<string, unknown>
}

export interface CalendarEvent {
  id?: string
  title?: string
  name?: string
  date?: string
  start?: string | Date
  end?: string | Date
  startTime?: string
  endTime?: string
  isAllDay?: boolean
  type?: string
  metadata?: Record<string, unknown>
}

export interface BlockedInterval {
  id?: string
  source: "timetable" | "calendar" | "custom" | string
  sourceId?: string
  title: string
  startMinute: number
  endMinute: number
  startTime: string
  endTime: string
  date?: string
  type?: string
}

export interface CollisionResult {
  hasCollision: boolean
  collidingIntervals: BlockedInterval[]
  overlapMinutes: number
}

export interface FreeSlot {
  startMinute: number
  endMinute: number
  startTime: string
  endTime: string
  durationMinutes: number
}

const STORAGE_KEY = "academic_planner_study_tasks"

const studyTasksStore: Map<string, StudyTask> = new Map()

let isInitialized = false

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }
  return null
}

function loadFromStorage(): void {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      studyTasksStore.clear()
      for (const item of parsed) {
        if (item && typeof item === "object" && typeof item.id === "string") {
          studyTasksStore.set(item.id, item as StudyTask)
        }
      }
    }
  } catch {}
}

function saveToStorage(): void {
  const storage = getLocalStorage()
  if (!storage) return
  try {
    const array = Array.from(studyTasksStore.values())
    storage.setItem(STORAGE_KEY, JSON.stringify(array))
  } catch {}
}

function ensureInitialized(): void {
  if (!isInitialized) {
    isInitialized = true
    loadFromStorage()
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function normalizeDateStr(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return ""
  const trimmed = dateStr.trim()
  if (trimmed.length >= 10 && trimmed.charAt(4) === "-" && trimmed.charAt(7) === "-") {
    return trimmed.slice(0, 10)
  }
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return trimmed
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateToIsoDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0
  const parts = timeStr.trim().split(":")
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1] || "0", 10)
  const validHours = isNaN(hours) ? 0 : Math.max(0, hours)
  const validMinutes = isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes))
  return validHours * 60 + validMinutes
}

export function minutesToTimeString(minutes: number): string {
  const totalMinutes = Math.max(0, Math.floor(isNaN(minutes) ? 0 : minutes))
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function createTask(input: CreateStudyTaskInput): StudyTask {
  ensureInitialized()
  const now = new Date().toISOString()
  const id = input.id && input.id.trim() ? input.id.trim() : generateId()
  let duration = input.durationMinutes
  if (duration === undefined && input.startTime && input.endTime) {
    const startM = timeStringToMinutes(input.startTime)
    const endM = timeStringToMinutes(input.endTime)
    if (endM > startM) {
      duration = endM - startM
    }
  }

  const task: StudyTask = {
    ...input,
    id,
    status: input.status || "pending",
    durationMinutes: duration,
    createdAt: now,
    updatedAt: now,
  }

  studyTasksStore.set(id, task)
  saveToStorage()
  return task
}

export const createStudyTask = createTask

export function getTaskById(id: string): StudyTask | null {
  ensureInitialized()
  return studyTasksStore.get(id) || null
}

export const getStudyTask = getTaskById

export function getAllTasks(): StudyTask[] {
  ensureInitialized()
  return Array.from(studyTasksStore.values())
}

export const getAllStudyTasks = getAllTasks

export function updateTask(id: string, updates: UpdateStudyTaskInput): StudyTask | null {
  ensureInitialized()
  const existing = studyTasksStore.get(id)
  if (!existing) return null

  const now = new Date().toISOString()
  let duration = updates.durationMinutes !== undefined ? updates.durationMinutes : existing.durationMinutes
  const effectiveStart = updates.startTime !== undefined ? updates.startTime : existing.startTime
  const effectiveEnd = updates.endTime !== undefined ? updates.endTime : existing.endTime

  if (updates.durationMinutes === undefined && effectiveStart && effectiveEnd) {
    const startM = timeStringToMinutes(effectiveStart)
    const endM = timeStringToMinutes(effectiveEnd)
    if (endM > startM) {
      duration = endM - startM
    }
  }

  const updated: StudyTask = {
    ...existing,
    ...updates,
    id: existing.id,
    durationMinutes: duration,
    updatedAt: now,
  }

  if (updates.status !== undefined) {
    if (updates.status === "completed" && !existing.completedAt) {
      updated.completedAt = now
    } else if (updates.status !== "completed") {
      updated.completedAt = null
    }
  }

  studyTasksStore.set(id, updated)
  saveToStorage()
  return updated
}

export const updateStudyTask = updateTask

export function updateTaskStatus(
  id: string,
  status: TaskStatus,
  metadata?: Record<string, unknown>
): StudyTask | null {
  const updates: UpdateStudyTaskInput = { status }
  if (metadata) {
    updates.metadata = metadata
  }
  return updateTask(id, updates)
}

export function deleteTask(id: string): boolean {
  ensureInitialized()
  const existed = studyTasksStore.delete(id)
  if (existed) {
    saveToStorage()
  }
  return existed
}

export const deleteStudyTask = deleteTask

export function getTasksForDate(dateIso: string): StudyTask[] {
  ensureInitialized()
  const target = normalizeDateStr(dateIso)
  return Array.from(studyTasksStore.values()).filter((task) => {
    return normalizeDateStr(task.date) === target
  })
}

export function getTasksForWeek(weekStartIso: string): StudyTask[] {
  ensureInitialized()
  const startNormalized = normalizeDateStr(weekStartIso)
  const startDate = new Date(`${startNormalized}T00:00:00.000Z`)
  if (isNaN(startDate.getTime())) return []
  const startTime = startDate.getTime()
  const endTime = startTime + 7 * 24 * 60 * 60 * 1000

  return Array.from(studyTasksStore.values()).filter((task) => {
    const taskDateNorm = normalizeDateStr(task.date)
    const taskDate = new Date(`${taskDateNorm}T00:00:00.000Z`)
    if (isNaN(taskDate.getTime())) return false
    const taskTime = taskDate.getTime()
    return taskTime >= startTime && taskTime < endTime
  })
}

export function setStudyTasks(tasks: StudyTask[]): void {
  ensureInitialized()
  studyTasksStore.clear()
  for (const t of tasks) {
    studyTasksStore.set(t.id, t)
  }
  saveToStorage()
}

export function clearStudyTasks(): void {
  ensureInitialized()
  studyTasksStore.clear()
  saveToStorage()
}

const DAY_NAMES: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

function matchesRuleDay(rule: TimetableRule, dayNum: number, dayName: DayOfWeek): boolean {
  if (rule.dayOfWeek !== undefined) {
    if (typeof rule.dayOfWeek === "number" && rule.dayOfWeek === dayNum) {
      return true
    }
    if (typeof rule.dayOfWeek === "string" && rule.dayOfWeek.trim().toLowerCase() === dayName) {
      return true
    }
  }
  if (Array.isArray(rule.daysOfWeek)) {
    for (const d of rule.daysOfWeek) {
      if (typeof d === "number" && d === dayNum) return true
      if (typeof d === "string" && d.trim().toLowerCase() === dayName) return true
    }
  }
  return false
}

export function buildBlockedIntervalsForDate(
  date: Date,
  rules: TimetableRule[],
  events: CalendarEvent[]
): BlockedInterval[] {
  const result: BlockedInterval[] = []
  const targetDayNum = date.getDay()
  const targetDayName = DAY_NAMES[targetDayNum]
  const targetDateStr = formatDateToIsoDay(date)

  for (const rule of rules) {
    if (!matchesRuleDay(rule, targetDayNum, targetDayName)) {
      continue
    }

    if (rule.startDate && normalizeDateStr(rule.startDate) > targetDateStr) {
      continue
    }
    if (rule.endDate && normalizeDateStr(rule.endDate) < targetDateStr) {
      continue
    }

    const startMinute = timeStringToMinutes(rule.startTime)
    const endMinute = timeStringToMinutes(rule.endTime)
    if (endMinute <= startMinute) {
      continue
    }

    result.push({
      id: rule.id || `rule_${targetDateStr}_${startMinute}_${endMinute}`,
      source: "timetable",
      sourceId: rule.id,
      title: rule.title || rule.name || rule.subject || "Class Timetable",
      startMinute,
      endMinute,
      startTime: minutesToTimeString(startMinute),
      endTime: minutesToTimeString(endMinute),
      date: targetDateStr,
      type: rule.type || "timetable",
    })
  }

  for (const event of events) {
    let matchesDate = false
    let startMinute = 0
    let endMinute = 1440

    if (event.date) {
      matchesDate = normalizeDateStr(event.date) === targetDateStr
    }

    let parsedStartDate: Date | null = null
    let parsedEndDate: Date | null = null

    if (event.start instanceof Date) {
      parsedStartDate = event.start
    } else if (typeof event.start === "string") {
      if (event.start.includes("T") || (event.start.includes("-") && event.start.length >= 10)) {
        const d = new Date(event.start)
        if (!isNaN(d.getTime())) parsedStartDate = d
      }
    }

    if (event.end instanceof Date) {
      parsedEndDate = event.end
    } else if (typeof event.end === "string") {
      if (event.end.includes("T") || (event.end.includes("-") && event.end.length >= 10)) {
        const d = new Date(event.end)
        if (!isNaN(d.getTime())) parsedEndDate = d
      }
    }

    if (parsedStartDate) {
      const eventStartDay = formatDateToIsoDay(parsedStartDate)
      const eventEndDay = parsedEndDate ? formatDateToIsoDay(parsedEndDate) : eventStartDay

      if (targetDateStr >= eventStartDay && targetDateStr <= eventEndDay) {
        matchesDate = true
        if (event.isAllDay) {
          startMinute = 0
          endMinute = 1440
        } else {
          if (eventStartDay === targetDateStr) {
            startMinute = parsedStartDate.getHours() * 60 + parsedStartDate.getMinutes()
          } else {
            startMinute = 0
          }

          if (parsedEndDate && eventEndDay === targetDateStr) {
            endMinute = parsedEndDate.getHours() * 60 + parsedEndDate.getMinutes()
          } else if (parsedEndDate && targetDateStr < eventEndDay) {
            endMinute = 1440
          } else if (!parsedEndDate && event.endTime) {
            endMinute = timeStringToMinutes(event.endTime)
          } else if (!parsedEndDate) {
            endMinute = Math.min(1440, startMinute + 60)
          }
        }
      }
    } else if (matchesDate) {
      if (event.isAllDay) {
        startMinute = 0
        endMinute = 1440
      } else if (event.startTime && event.endTime) {
        startMinute = timeStringToMinutes(event.startTime)
        endMinute = timeStringToMinutes(event.endTime)
      } else if (typeof event.start === "string" && typeof event.end === "string") {
        startMinute = timeStringToMinutes(event.start)
        endMinute = timeStringToMinutes(event.end)
      }
    }

    if (!matchesDate) {
      continue
    }

    if (endMinute <= startMinute) {
      continue
    }

    result.push({
      id: event.id || `event_${targetDateStr}_${startMinute}_${endMinute}`,
      source: "calendar",
      sourceId: event.id,
      title: event.title || event.name || "Calendar Event",
      startMinute,
      endMinute,
      startTime: minutesToTimeString(startMinute),
      endTime: minutesToTimeString(endMinute),
      date: targetDateStr,
      type: event.type || "event",
    })
  }

  result.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute)
  return result
}

export function detectIntervalCollision(
  startMinute: number,
  endMinute: number,
  blockedIntervals: BlockedInterval[]
): CollisionResult {
  const collidingIntervals: BlockedInterval[] = []
  const overlapRanges: Array<[number, number]> = []

  const validStart = Math.min(startMinute, endMinute)
  const validEnd = Math.max(startMinute, endMinute)

  for (const interval of blockedIntervals) {
    const overlapStart = Math.max(validStart, interval.startMinute)
    const overlapEnd = Math.min(validEnd, interval.endMinute)

    if (overlapEnd > overlapStart) {
      collidingIntervals.push(interval)
      overlapRanges.push([overlapStart, overlapEnd])
    }
  }

  let overlapMinutes = 0
  if (overlapRanges.length > 0) {
    overlapRanges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const merged: Array<[number, number]> = [overlapRanges[0]]
    for (let i = 1; i < overlapRanges.length; i++) {
      const prev = merged[merged.length - 1]
      const curr = overlapRanges[i]
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1])
      } else {
        merged.push(curr)
      }
    }
    for (const [start, end] of merged) {
      overlapMinutes += end - start
    }
  }

  return {
    hasCollision: collidingIntervals.length > 0,
    collidingIntervals,
    overlapMinutes,
  }
}

export function computeAvailableFreeSlots(
  dayStartMinute: number,
  dayEndMinute: number,
  blockedIntervals: BlockedInterval[]
): FreeSlot[] {
  if (dayEndMinute <= dayStartMinute) {
    return []
  }

  const clampedIntervals: Array<[number, number]> = []
  for (const interval of blockedIntervals) {
    const start = Math.max(dayStartMinute, interval.startMinute)
    const end = Math.min(dayEndMinute, interval.endMinute)
    if (end > start) {
      clampedIntervals.push([start, end])
    }
  }

  clampedIntervals.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const mergedIntervals: Array<[number, number]> = []
  for (const item of clampedIntervals) {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push([...item])
    } else {
      const last = mergedIntervals[mergedIntervals.length - 1]
      if (item[0] <= last[1]) {
        last[1] = Math.max(last[1], item[1])
      } else {
        mergedIntervals.push([...item])
      }
    }
  }

  const freeSlots: FreeSlot[] = []
  let currentMinute = dayStartMinute

  for (const [start, end] of mergedIntervals) {
    if (start > currentMinute) {
      freeSlots.push({
        startMinute: currentMinute,
        endMinute: start,
        startTime: minutesToTimeString(currentMinute),
        endTime: minutesToTimeString(start),
        durationMinutes: start - currentMinute,
      })
    }
    currentMinute = Math.max(currentMinute, end)
  }

  if (currentMinute < dayEndMinute) {
    freeSlots.push({
      startMinute: currentMinute,
      endMinute: dayEndMinute,
      startTime: minutesToTimeString(currentMinute),
      endTime: minutesToTimeString(dayEndMinute),
      durationMinutes: dayEndMinute - currentMinute,
    })
  }

  return freeSlots
}
