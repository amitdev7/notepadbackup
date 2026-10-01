// ---------------------------------------------------------------------------
// Zenithsui Calendar Engine — Unified Event Store & Academic Bridge
//
// Unifies Calendar events, Student Hub activities, and Academic Planner tasks
// into a single source-of-truth with local-first IndexedDB persistence.
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import { useStudentStore, type CalendarActivity, type ActivityType } from "@/lib/academic/student-store"
import {
  createTask,
  updateTask,
  deleteTask as deletePlannerTask,
  getAllTasks,
  clearStudyTasks,
  timeStringToMinutes,
  minutesToTimeString,
  detectIntervalCollision,
  computeAvailableFreeSlots,
  type StudyTask,
  type BlockedInterval,
  type CollisionResult,
  type FreeSlot,
} from "@/lib/academic/planner"
import { ACADEMIC_STORES, putAcademicItem, deleteAcademicItem } from "@/lib/storage/academic-db"
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from "./types"
import { parseTimeToMinutes } from "./date-utils"

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Normalizes a Student Hub activity into a unified CalendarEvent.
 */
function activityToCalendarEvent(act: CalendarActivity): CalendarEvent {
  return {
    id: act.id,
    title: act.title,
    description: act.notes,
    date: act.date.slice(0, 10),
    startTime: act.startTime,
    endTime: act.endTime,
    durationMinutes: act.durationMinutes || 60,
    isAllDay: act.isAllDay ?? (!act.startTime && !act.endTime),
    type: act.type,
    status: act.status,
    priority: act.priority,
    subjectId: act.subjectId,
    subjectName: act.subjectName,
    location: act.location,
    recurrence: act.recurrence ?? "none",
    completedAt: act.completedAt,
    createdAt: act.createdAt,
    updatedAt: act.updatedAt,
  }
}

/**
 * Normalizes an Academic Planner StudyTask into a unified CalendarEvent.
 */
function taskToCalendarEvent(task: StudyTask): CalendarEvent {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    date: task.date.slice(0, 10),
    startTime: task.startTime,
    endTime: task.endTime,
    durationMinutes: task.durationMinutes || 60,
    isAllDay: task.isAllDay ?? (!task.startTime && !task.endTime),
    type: task.subject ? "Study" : "Assignment",
    status: task.status === "completed" ? "completed" : "pending",
    priority: task.priority === "urgent" || task.priority === "high" ? "High" : task.priority === "medium" ? "Medium" : "Low",
    subjectName: task.subject,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

/**
 * Hook to retrieve all calendar events (merging student activities & planner tasks).
 */
export function useCalendarEvents(): {
  events: CalendarEvent[]
  createEvent: (input: CreateCalendarEventInput) => CalendarEvent
  updateEvent: (id: string, updates: UpdateCalendarEventInput) => CalendarEvent | null
  deleteEvent: (id: string) => boolean
  moveEvent: (id: string, newDate: string, newStartTime?: string, newEndTime?: string) => void
  resizeEvent: (id: string, newEndTime: string) => void
  toggleComplete: (id: string) => void
} {
  const activities = useStudentStore((s) => s.activities)

  const events = useMemo(() => {
    const seenIds = new Set<string>()
    const merged: CalendarEvent[] = []

    // 1. Add student store activities
    for (const act of activities) {
      if (!seenIds.has(act.id)) {
        seenIds.add(act.id)
        merged.push(activityToCalendarEvent(act))
      }
    }

    // 2. Add planner tasks
    try {
      const plannerTasks = getAllTasks()
      for (const t of plannerTasks) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id)
          merged.push(taskToCalendarEvent(t))
        }
      }
    } catch {}

    // Sort: all-day first, then by start time, then title
    merged.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      const aTime = a.startTime || "00:00"
      const bTime = b.startTime || "00:00"
      return aTime.localeCompare(bTime) || a.title.localeCompare(b.title)
    })

    return merged
  }, [activities])

  return {
    events,
    createEvent: createCalendarEvent,
    updateEvent: updateCalendarEvent,
    deleteEvent: deleteCalendarEvent,
    moveEvent: moveCalendarEvent,
    resizeEvent: resizeCalendarEvent,
    toggleComplete: toggleCalendarEventComplete,
  }
}

/**
 * Creates a new calendar event, persisting to StudentStore, Planner, and IndexedDB.
 */
export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const now = new Date().toISOString()
  const id = input.id && input.id.trim() ? input.id.trim() : generateId()

  let duration = input.durationMinutes
  if ((!duration || duration <= 0) && input.startTime && input.endTime) {
    const sM = parseTimeToMinutes(input.startTime)
    const eM = parseTimeToMinutes(input.endTime)
    if (eM > sM) duration = eM - sM
  }
  if (!duration) duration = 60

  const event: CalendarEvent = {
    ...input,
    id,
    durationMinutes: duration,
    status: input.status || "pending",
    priority: input.priority || "Medium",
    isAllDay: input.isAllDay ?? false,
    type: input.type || "Study",
    createdAt: now,
    updatedAt: now,
  }

  // 1. Persist to StudentStore
  const activityInput: Omit<CalendarActivity, "createdAt" | "updatedAt"> = {
    id: event.id,
    title: event.title,
    type: (event.type as ActivityType) || "Study",
    subjectId: event.subjectId,
    subjectName: event.subjectName,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    status: event.status,
    priority: event.priority,
    notes: event.description,
    location: event.location,
    isAllDay: event.isAllDay,
    recurrence: event.recurrence === "none" ? undefined : event.recurrence === "yearly" || event.recurrence === "monthly" ? "weekly" : event.recurrence,
  }
  const actualId = useStudentStore.getState().addActivity(activityInput)
  if (actualId) event.id = actualId

  // 2. Persist to Academic Planner
  createTask({
    id: event.id,
    title: event.title,
    description: event.description,
    subject: event.subjectName,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    status: event.status === "completed" ? "completed" : "pending",
    priority: event.priority === "High" ? "high" : event.priority === "Low" ? "low" : "medium",
    isAllDay: event.isAllDay,
  })

  // 3. Persist to IndexedDB
  try {
    putAcademicItem(ACADEMIC_STORES.TASKS, {
      id: event.id,
      title: event.title,
      subject: event.subjectName || "General",
      status: event.status,
      dueDate: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      durationMinutes: event.durationMinutes,
      isAllDay: event.isAllDay,
      updatedAt: now,
    })
  } catch {}

  return event
}

/**
 * Updates an existing calendar event across all stores.
 */
export function updateCalendarEvent(id: string, updates: UpdateCalendarEventInput): CalendarEvent | null {
  const now = new Date().toISOString()

  // 1. Update Student Store
  useStudentStore.getState().updateActivity(id, {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.date !== undefined ? { date: updates.date } : {}),
    ...(updates.startTime !== undefined ? { startTime: updates.startTime } : {}),
    ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
    ...(updates.durationMinutes !== undefined ? { durationMinutes: updates.durationMinutes } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
    ...(updates.description !== undefined ? { notes: updates.description } : {}),
    ...(updates.location !== undefined ? { location: updates.location } : {}),
    ...(updates.isAllDay !== undefined ? { isAllDay: updates.isAllDay } : {}),
    ...(updates.type !== undefined ? { type: updates.type as ActivityType } : {}),
    ...(updates.recurrence !== undefined ? { recurrence: updates.recurrence === "none" ? undefined : updates.recurrence === "yearly" || updates.recurrence === "monthly" ? "weekly" : updates.recurrence } : {}),
  })

  // 2. Update Planner
  updateTask(id, {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.date !== undefined ? { date: updates.date } : {}),
    ...(updates.startTime !== undefined ? { startTime: updates.startTime } : {}),
    ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
    ...(updates.durationMinutes !== undefined ? { durationMinutes: updates.durationMinutes } : {}),
    ...(updates.status !== undefined ? { status: updates.status === "completed" ? "completed" : "pending" } : {}),
    ...(updates.isAllDay !== undefined ? { isAllDay: updates.isAllDay } : {}),
  })

  // 3. Update IndexedDB
  try {
    putAcademicItem(ACADEMIC_STORES.TASKS, {
      id,
      ...updates,
      updatedAt: now,
    })
  } catch {}

  return null
}

/**
 * Deletes a calendar event from all stores.
 */
export function deleteCalendarEvent(id: string): boolean {
  useStudentStore.getState().deleteActivity(id)
  deletePlannerTask(id)
  try {
    deleteAcademicItem(ACADEMIC_STORES.TASKS, id)
  } catch {}
  return true
}

/**
 * Moves an event to a new date and optional time.
 */
export function moveCalendarEvent(
  id: string,
  newDate: string,
  newStartTime?: string,
  newEndTime?: string
): void {
  let computedEndTime = newEndTime
  if (newStartTime !== undefined && computedEndTime === undefined) {
    const act = useStudentStore.getState().activities.find((a) => a.id === id)
    const duration = act?.durationMinutes || 60
    const sM = timeStringToMinutes(newStartTime)
    computedEndTime = minutesToTimeString(sM + duration)
  }

  useStudentStore.getState().moveActivity(id, newDate, newStartTime, computedEndTime)
  updateTask(id, {
    date: newDate,
    ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
    ...(computedEndTime !== undefined ? { endTime: computedEndTime } : {}),
  })
}

/**
 * Resizes an event by setting a new end time.
 */
export function resizeCalendarEvent(id: string, newEndTime: string): void {
  const act = useStudentStore.getState().activities.find((a) => a.id === id)
  if (!act) return

  let duration = act.durationMinutes
  if (act.startTime) {
    const sM = timeStringToMinutes(act.startTime)
    const eM = timeStringToMinutes(newEndTime)
    if (eM > sM) {
      duration = eM - sM
    }
  }

  updateCalendarEvent(id, {
    endTime: newEndTime,
    durationMinutes: duration,
  })
}

/**
 * Toggles an event's completion state.
 */
export function toggleCalendarEventComplete(id: string): void {
  useStudentStore.getState().toggleActivityComplete(id)
  const act = useStudentStore.getState().activities.find((a) => a.id === id)
  if (act) {
    updateTask(id, {
      status: act.status === "completed" ? "completed" : "pending",
    })
  }
}

/**
 * Retrieves a calendar event by ID.
 */
export function getCalendarEventById(id: string): CalendarEvent | undefined {
  const act = useStudentStore.getState().activities.find((a) => a.id === id)
  if (act) return activityToCalendarEvent(act)
  try {
    const task = getAllTasks().find((t) => t.id === id)
    if (task) return taskToCalendarEvent(task)
  } catch {}
  return undefined
}

/**
 * Retrieves all calendar events for a specific date.
 */
export function getCalendarEventsForDate(dateIso: string): CalendarEvent[] {
  const target = dateIso.slice(0, 10)
  const activities = useStudentStore.getState().activities
    .filter((a) => a.date.slice(0, 10) === target)
    .map(activityToCalendarEvent)

  const seenIds = new Set(activities.map((a) => a.id))
  const merged = [...activities]

  try {
    const tasks = getAllTasks()
      .filter((t) => t.date.slice(0, 10) === target && !seenIds.has(t.id))
      .map(taskToCalendarEvent)
    merged.push(...tasks)
  } catch {}

  return merged
}

/**
 * Clears all calendar events from stores.
 */
export function clearCalendarEvents(): void {
  useStudentStore.setState({ activities: [] })
  try {
    clearStudyTasks()
  } catch {}
}

/**
 * Checks for schedule collisions on a date using planner's detectIntervalCollision.
 */
export function checkEventConflict(
  dateIso: string,
  start: string | number,
  end: string | number,
  excludeId?: string
): CollisionResult & { hasConflict: boolean; conflictingTitles: string[] } {
  const targetDate = dateIso.slice(0, 10)
  const startMinute = typeof start === "string" ? timeStringToMinutes(start) : start
  const endMinute = typeof end === "string" ? timeStringToMinutes(end) : end
  const activities = useStudentStore.getState().activities

  const blocked: BlockedInterval[] = []
  for (const a of activities) {
    if (a.id === excludeId || a.isAllDay || a.date.slice(0, 10) !== targetDate) continue
    if (!a.startTime || !a.endTime) continue

    const sM = timeStringToMinutes(a.startTime)
    const eM = timeStringToMinutes(a.endTime)
    if (eM > sM) {
      blocked.push({
        id: a.id,
        source: "calendar",
        title: a.title,
        startMinute: sM,
        endMinute: eM,
        startTime: a.startTime,
        endTime: a.endTime,
        date: targetDate,
      })
    }
  }

  const result = detectIntervalCollision(startMinute, endMinute, blocked)
  return {
    ...result,
    hasConflict: result.hasCollision,
    conflictingTitles: result.collidingIntervals.map((c) => c.title),
  }
}

/**
 * Computes free time slots for a day using planner's computeAvailableFreeSlots.
 */
export function getAvailableFreeSlots(
  dateIso: string,
  minDurationOrDayStart: number = 60,
  dayStartOrEnd: string | number = 7 * 60,
  dayEndOptional?: string | number
): FreeSlot[] {
  const targetDate = dateIso.slice(0, 10)
  let dayStartMinute: number
  let dayEndMinute: number

  if (dayEndOptional !== undefined) {
    dayStartMinute = typeof dayStartOrEnd === "string" ? timeStringToMinutes(dayStartOrEnd) : dayStartOrEnd
    dayEndMinute = typeof dayEndOptional === "string" ? timeStringToMinutes(dayEndOptional) : dayEndOptional
  } else {
    dayStartMinute = typeof minDurationOrDayStart === "number" && minDurationOrDayStart > 240 ? minDurationOrDayStart : 7 * 60
    dayEndMinute = typeof dayStartOrEnd === "string" ? timeStringToMinutes(dayStartOrEnd) : typeof dayStartOrEnd === "number" ? dayStartOrEnd : 21 * 60
  }

  const activities = useStudentStore.getState().activities
  const blocked: BlockedInterval[] = []
  for (const a of activities) {
    if (a.isAllDay || a.date.slice(0, 10) !== targetDate) continue
    if (!a.startTime || !a.endTime) continue

    const sM = timeStringToMinutes(a.startTime)
    const eM = timeStringToMinutes(a.endTime)
    if (eM > sM) {
      blocked.push({
        id: a.id,
        source: "calendar",
        title: a.title,
        startMinute: sM,
        endMinute: eM,
        startTime: a.startTime,
        endTime: a.endTime,
        date: targetDate,
      })
    }
  }

  return computeAvailableFreeSlots(dayStartMinute, dayEndMinute, blocked)
}

/**
 * Store accessor object for non-React contexts and testing.
 */
export const calendarStore = {
  createEvent: createCalendarEvent,
  updateEvent: updateCalendarEvent,
  deleteEvent: deleteCalendarEvent,
  moveEvent: moveCalendarEvent,
  resizeEvent: (id: string, durationMinutes: number) => {
    const ev = getCalendarEventById(id)
    if (!ev || !ev.startTime) return
    const sM = timeStringToMinutes(ev.startTime)
    const eM = sM + durationMinutes
    const newEndTime = minutesToTimeString(eM)
    updateCalendarEvent(id, { durationMinutes, endTime: newEndTime })
  },
  toggleComplete: toggleCalendarEventComplete,
  getEventById: getCalendarEventById,
  getEventsForDate: getCalendarEventsForDate,
  clearAllEvents: clearCalendarEvents,
}

export const useCalendarStore = {
  getState: () => calendarStore,
}
