// ---------------------------------------------------------------------------
// Zenithsui Calendar Engine — Unified Type Definitions
// ---------------------------------------------------------------------------

export type CalendarView = "month" | "week"
export type { WeekStartsOn } from "./date-utils"

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

export interface CalendarColor {
  id: string
  name: string
  hex: string
  bg: string
  text: string
  border: string
}

export const CALENDAR_COLORS: CalendarColor[] = [
  {
    id: "default",
    name: "Ink & Paper",
    hex: "#4b5563",
    bg: "var(--sq-shade)",
    text: "var(--sq-ink)",
    border: "var(--sq-border)",
  },
  {
    id: "blue",
    name: "Study & Lectures",
    hex: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#1d4ed8",
    border: "#93c5fd",
  },
  {
    id: "red",
    name: "Exams & Deadlines",
    hex: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#b91c1c",
    border: "#fca5a5",
  },
  {
    id: "green",
    name: "Homework & Labs",
    hex: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#047857",
    border: "#6ee7b7",
  },
  {
    id: "amber",
    name: "Revision & Practice",
    hex: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#b45309",
    border: "#fcd34d",
  },
  {
    id: "purple",
    name: "Assignments & Projects",
    hex: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#6d28d9",
    border: "#c4b5fd",
  },
  {
    id: "pink",
    name: "Personal & Social",
    hex: "#ec4899",
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#be185d",
    border: "#f9a8d4",
  },
]

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
  color?: string
  reminderMinutes?: number
  reminderTriggered?: boolean
  url?: string
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
