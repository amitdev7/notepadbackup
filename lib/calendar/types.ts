// ---------------------------------------------------------------------------
// Zenithsui Calendar Engine — Unified Type Definitions
// ---------------------------------------------------------------------------

export type CalendarView = "month" | "week"

export type CalendarEventType =
  | "Study"
  | "Revision"
  | "Practice"
  | "Homework"
  | "Assignment"
  | "Exam"
  | "Mock Test"
  | "Reading"
  | "Personal"
  | "Other"

export type CalendarEventPriority = "High" | "Medium" | "Low"

export type CalendarRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD for multi-day events
  startTime?: string // HH:mm (24h)
  endTime?: string // HH:mm (24h)
  durationMinutes: number
  isAllDay?: boolean
  type: CalendarEventType | string
  status: "pending" | "completed"
  priority: CalendarEventPriority
  location?: string
  subjectId?: string
  subjectName?: string
  recurrence?: CalendarRecurrence
  recurrenceEnd?: string // YYYY-MM-DD
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type CreateCalendarEventInput = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> & {
  id?: string
}

export type UpdateCalendarEventInput = Partial<Omit<CalendarEvent, "id">>

export interface PositionedEvent extends CalendarEvent {
  startMinute: number
  endMinute: number
  topPx: number
  heightPx: number
  lane: number
  totalLanes: number
}

export interface FunctionalCalendarProps {
  view?: CalendarView
  weekStartsOn?: "sunday" | "monday"
  showWeekends?: boolean
  startHour?: number
  endHour?: number
  timeFormat?: "12h" | "24h"
  selectedDate?: string
  filterType?: string
  searchQuery?: string
}
