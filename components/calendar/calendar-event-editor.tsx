"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Event Creation & Editing Dialog
//
// Accessible event modal with time range validation, conflict detection,
// free slot recommendations, and strict keyboard ownership isolation.
// ---------------------------------------------------------------------------

import { useEffect, useState, useMemo, useRef } from "react"
import type { CalendarEvent, CalendarEventType, CalendarEventPriority, CalendarRecurrence } from "@/lib/calendar/types"
import { CALENDAR_COLORS } from "@/lib/calendar/types"
import { checkEventConflict, getAvailableFreeSlots } from "@/lib/calendar/event-store"
import { parseTimeToMinutes, minutesToTimeString, formatTime } from "@/lib/calendar/date-utils"
import { Button } from "@/components/ui/button"
import { X, WarningCircle, Clock, Trash, CalendarBlank, MapPin, Sparkle, Tag, Bell, PaintBrush } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface CalendarEventEditorProps {
  isOpen: boolean
  event?: CalendarEvent | null
  initialDate?: string
  initialStartTime?: string
  initialEndTime?: string
  onSave: (eventData: Partial<CalendarEvent>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const EVENT_TYPES: CalendarEventType[] = [
  "Study",
  "Assignment",
  "Exam",
  "Revision",
  "Practice",
  "Homework",
  "Mock Test",
  "Reading",
  "Personal",
  "Other",
]

const PRIORITIES: CalendarEventPriority[] = ["Low", "Medium", "High"]

const RECURRENCES: { value: CalendarRecurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

export function CalendarEventEditor({
  isOpen,
  event,
  initialDate,
  initialStartTime,
  initialEndTime,
  onSave,
  onDelete,
  onClose,
}: CalendarEventEditorProps) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [isAllDay, setIsAllDay] = useState(false)
  const [type, setType] = useState<CalendarEventType>("Study")
  const [priority, setPriority] = useState<CalendarEventPriority>("Medium")
  const [color, setColor] = useState<string>("default")
  const [reminderMinutes, setReminderMinutes] = useState<number>(15)
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [recurrence, setRecurrence] = useState<CalendarRecurrence>("none")
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Populate form on open
  useEffect(() => {
    if (!isOpen) return
    if (event) {
      setTitle(event.title || "")
      setDate(event.date || initialDate || "")
      setEndDate(event.endDate || "")
      setStartTime(event.startTime || "09:00")
      setEndTime(event.endTime || "10:00")
      setIsAllDay(event.isAllDay ?? false)
      setType((event.type as CalendarEventType) || "Study")
      setPriority(event.priority || "Medium")
      setColor(event.color || "default")
      setReminderMinutes(typeof event.reminderMinutes === "number" ? event.reminderMinutes : 15)
      setDescription(event.description || "")
      setLocation(event.location || "")
      setRecurrence(event.recurrence || "none")
    } else {
      setTitle("")
      setDate(initialDate || new Date().toISOString().slice(0, 10))
      setEndDate("")
      setStartTime(initialStartTime || "09:00")
      setEndTime(initialEndTime || "10:00")
      setIsAllDay(false)
      setType("Study")
      setPriority("Medium")
      setColor("default")
      setReminderMinutes(15)
      setDescription("")
      setLocation("")
      setRecurrence("none")
    }
    setError(null)
    setConfirmDelete(false)

    // Focus input after render
    setTimeout(() => {
      titleInputRef.current?.focus()
    }, 50)
  }, [isOpen, event, initialDate, initialStartTime, initialEndTime])

  // Conflict detection
  const conflict = useMemo(() => {
    if (isAllDay || !date || !startTime || !endTime) return null
    const sM = parseTimeToMinutes(startTime)
    const eM = parseTimeToMinutes(endTime)
    if (eM <= sM) return null
    return checkEventConflict(date, sM, eM, event?.id)
  }, [date, startTime, endTime, isAllDay, event?.id])

  // Suggested free slots
  const freeSlots = useMemo(() => {
    if (!date) return []
    try {
      return getAvailableFreeSlots(date).slice(0, 3)
    } catch {
      return []
    }
  }, [date])

  if (!isOpen) return null

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError("Please enter an event title")
      return
    }
    if (!date) {
      setError("Please select a date")
      return
    }

    if (!isAllDay && startTime && endTime) {
      const sM = parseTimeToMinutes(startTime)
      const eM = parseTimeToMinutes(endTime)
      if (eM <= sM) {
        setError("End time must be after start time")
        return
      }
    }

    const sM = isAllDay ? 0 : parseTimeToMinutes(startTime)
    const eM = isAllDay ? 1440 : parseTimeToMinutes(endTime)
    const duration = isAllDay ? 1440 : Math.max(15, eM - sM)

    onSave({
      title: trimmedTitle,
      date,
      endDate: endDate && endDate > date ? endDate : undefined,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      durationMinutes: duration,
      isAllDay,
      type,
      priority,
      color,
      reminderMinutes: reminderMinutes >= 0 ? reminderMinutes : undefined,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      recurrence,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-lg p-5 flex flex-col gap-4 text-left shadow-xl transition-all",
          "bg-[var(--sq-paper)] text-[var(--sq-ink)] border-2 border-[var(--sq-ink)]"
        )}
        style={{
          boxShadow: "4px 4px 0px var(--sq-ink)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sq-border)] pb-3">
          <div className="flex items-center gap-2">
            <CalendarBlank size={18} weight="bold" />
            <h2 className="text-base font-semibold">
              {event ? "Edit Event" : "Create New Event"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 text-xs rounded bg-red-100 text-red-900 border border-red-300 flex items-center gap-2">
            <WarningCircle size={14} weight="bold" />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
              Event Title
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Physics Revision, Math Homework, Unit Test"
              className="w-full px-3 py-1.5 text-sm rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] focus:outline-hidden focus:border-[var(--sq-ink)] font-medium"
            />
          </div>

          {/* Date & All-Day toggle */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                id="all-day-toggle"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-[var(--sq-border)] text-[var(--sq-ink)] cursor-pointer"
              />
              <label htmlFor="all-day-toggle" className="text-xs font-medium cursor-pointer select-none">
                All-day event
              </label>
            </div>
          </div>

          {/* Start & End Time (if not all day) */}
          {!isAllDay && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                    <Clock size={12} />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                    <Clock size={12} />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] font-mono"
                  />
                </div>
              </div>

              {/* Conflict indicator */}
              {conflict && conflict.hasCollision && (
                <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                  <WarningCircle size={14} weight="bold" className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Schedule Conflict:</span> Overlaps with{" "}
                    {conflict.collidingIntervals.map((c) => c.title).join(", ")} ({conflict.overlapMinutes} min).
                  </div>
                </div>
              )}

              {/* Free Slot Recommendations */}
              {freeSlots.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] flex-wrap">
                  <span className="opacity-70 flex items-center gap-1">
                    <Sparkle size={12} /> Free:
                  </span>
                  {freeSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setStartTime(slot.startTime)
                        setEndTime(slot.endTime)
                      }}
                      className="px-1.5 py-0.5 rounded border border-[var(--sq-border)] bg-[var(--sq-shade)] hover:border-[var(--sq-ink)] transition-colors font-mono text-[10px]"
                    >
                      {slot.startTime}–{slot.endTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                <Tag size={12} /> Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CalendarEventType)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CalendarEventPriority)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence & Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                Repeat
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as CalendarRecurrence)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]"
              >
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
                <Bell size={12} /> Reminder
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]"
              >
                <option value={-1}>No alert</option>
                <option value={0}>At time of event</option>
                <option value={5}>5m before</option>
                <option value={10}>10m before</option>
                <option value={15}>15m before</option>
                <option value={30}>30m before</option>
                <option value={60}>1h before</option>
                <option value={1440}>1d before</option>
              </select>
            </div>
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
              <PaintBrush size={12} /> Color Tag
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CALENDAR_COLORS.map((c) => {
                const isSelected = color === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.name}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer",
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[var(--sq-ink)] scale-110"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                )
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70 flex items-center gap-1">
              <MapPin size={12} /> Location / Room
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Room 204, Library, Online"
              className="w-full px-3 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
              Notes & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key concepts, formula reminders, page numbers..."
              className="w-full px-3 py-1.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--sq-border)]">
            <div>
              {event && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(event.id)
                        onClose()
                      }}
                      className="px-2 py-1 text-xs rounded bg-red-600 text-white font-medium hover:bg-red-700"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs rounded border hover:bg-[var(--sq-shade)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-xs rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1"
                    title="Delete Event"
                  >
                    <Trash size={14} />
                    <span>Delete</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs rounded border border-[var(--sq-border)] hover:bg-[var(--sq-shade)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs rounded bg-[var(--sq-ink)] text-[var(--sq-paper)] font-semibold hover:opacity-90 transition-opacity"
              >
                {event ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
