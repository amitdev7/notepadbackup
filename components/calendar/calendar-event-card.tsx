"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Event Details Peek Card (Android & Windows Style)
//
// Shows complete event metadata, status, recurrence, location, and quick actions
// without immediately popping open the form editor.
// ---------------------------------------------------------------------------

import type { CalendarEvent } from "@/lib/calendar/types"
import { CALENDAR_COLORS } from "@/lib/calendar/types"
import { formatTime, parseDateIso, parseTimeToMinutes } from "@/lib/calendar/date-utils"
import { exportToIcs, downloadIcsFile } from "@/lib/calendar/ics"
import {
  Clock,
  CalendarBlank,
  MapPin,
  Tag,
  CheckCircle,
  PencilSimple,
  Trash,
  Copy,
  DownloadSimple,
  X,
  Bell,
  ArrowsClockwise,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface CalendarEventCardProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onDuplicate: (event: CalendarEvent) => void
  onDelete: (id: string) => void
}

export function CalendarEventCard({
  event,
  isOpen,
  onClose,
  onEdit,
  onToggleComplete,
  onDuplicate,
  onDelete,
}: CalendarEventCardProps) {
  if (!isOpen || !event) return null

  const isCompleted = event.status === "completed"
  const colorPreset = CALENDAR_COLORS.find((c) => c.id === event.color) || CALENDAR_COLORS[0]

  // Formatted date string
  const { year, month, day } = parseDateIso(event.date)
  const dateObj = new Date(year, month - 1, day)
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Format time display
  let timeLabel = "All Day"
  if (!event.isAllDay) {
    if (event.startTime && event.endTime) {
      timeLabel = `${formatTime(parseTimeToMinutes(event.startTime))} – ${formatTime(parseTimeToMinutes(event.endTime))}`
    } else if (event.startTime) {
      timeLabel = `${formatTime(parseTimeToMinutes(event.startTime))} (${event.durationMinutes || 60}m)`
      timeLabel = formatTime(parseTimeToMinutes(event.startTime))
    }
  }

  const handleExportSingle = () => {
    const ics = exportToIcs([event], event.title)
    downloadIcsFile(`${event.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ics`, ics)
    const icsString = exportToIcs([event], `Zenithsui – ${event.title}`)
    const filename = `${event.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ics`
    downloadIcsFile(icsString, filename)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--sq-border)] bg-[var(--sq-paper)] shadow-2xl text-[var(--sq-ink)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-card-title"
        className="w-full max-w-sm rounded-2xl border border-[var(--sq-border)] bg-[var(--sq-paper)] shadow-2xl text-[var(--sq-ink)] overflow-hidden animate-popover-enter font-sans"
        style={{
          boxShadow: "0 14px 40px rgba(0,0,0,0.22), 4px 4px 0px rgba(0,0,0,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color Strip Header Accent */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: colorPreset.hex }}
        />

        {/* Header with Title and Close Button */}
        <div className="p-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
                style={{
                  backgroundColor: colorPreset.bg,
                  color: colorPreset.text,
                  borderColor: colorPreset.border,
                }}
              >
                {event.type || "Event"}
              </span>

              {event.priority && event.priority !== "Medium" && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                    event.priority === "High"
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800"
                  )}
                >
                  {event.priority}
                </span>
              )}
            </div>

            <h3
              id="calendar-card-title"
              className={cn(
                "text-base font-bold tracking-tight break-words",
                isCompleted && "line-through opacity-60"
              )}
            >
              {event.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors shrink-0"
            title="Close"
            className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors shrink-0 cursor-pointer"
            aria-label="Close details"
          >
            <X size={16} />
          </button>
        </div>

        {/* Metadata Details */}
        {/* Event Meta Details */}
        <div className="px-4 py-3 space-y-2.5 text-xs border-y border-[var(--sq-border)]/60 bg-[var(--sq-paper)]">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-90">
            <CalendarBlank size={16} className="shrink-0 opacity-70" />
            <div className="flex items-center gap-2.5 text-[var(--sq-ink)]">
              <CalendarBlank size={16} className="text-[var(--sq-muted)] shrink-0" />
              <span className="font-medium">{dateLabel}</span>
            </div>

            <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-90">
              <Clock size={16} className="shrink-0 opacity-70" />
              <div className="flex items-center gap-2.5 text-[var(--sq-ink)]">
                <Clock size={16} className="text-[var(--sq-muted)] shrink-0" />
                <span>{timeLabel}</span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-90">
                  <MapPin size={16} className="shrink-0 opacity-70" />
                  <div className="flex items-center gap-2.5 text-[var(--sq-ink)]">
                    <MapPin size={16} className="text-[var(--sq-muted)] shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
          )}

                  {/* Recurrence */}
                  {event.recurrence && event.recurrence !== "none" && (
                    <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-80">
                      <ArrowsClockwise size={16} className="shrink-0 opacity-70" />
                      <span className="capitalize">Repeats {event.recurrence}</span>
                      <div className="flex items-center gap-2.5 text-[var(--sq-ink)] capitalize">
                        <ArrowsClockwise size={16} className="text-[var(--sq-muted)] shrink-0" />
                        <span>Repeats {event.recurrence}</span>
                      </div>
          )}

                      {/* Reminder */}
                      {typeof event.reminderMinutes === "number" && event.reminderMinutes >= 0 && (
                        <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-80">
                          <Bell size={16} className="shrink-0 opacity-70" />
                          <span>
                            {event.reminderMinutes === 0
                              ? "At time of event"
                              : `${event.reminderMinutes} minutes before`}
                          </span>
                          {typeof event.reminderMinutes === "number" && (
                            <div className="flex items-center gap-2.5 text-[var(--sq-ink)]">
                              <Bell size={16} className="text-[var(--sq-muted)] shrink-0" />
                              <span>{event.reminderMinutes} minutes before</span>
                            </div>
                          )}

                          {/* Description */}
                          {event.description && (
                            <div className="mt-2 pt-2 border-t border-[var(--sq-border)]/40 text-[var(--sq-ink)] text-xs whitespace-pre-wrap leading-relaxed opacity-85 max-h-28 overflow-y-auto">
                              <div className="pt-2 text-xs opacity-80 leading-relaxed border-t border-[var(--sq-border)]/40 whitespace-pre-wrap">
                                {event.description}
                              </div>
          )}
                            </div>

        {/* Quick Action Toolbar */}
                          <div className="p-3 bg-[var(--sq-shade)]/30 flex items-center justify-between gap-1 text-xs">
                            {/* Quick Actions Footer Toolbar */}
                            <div className="p-3 bg-[var(--sq-paper)] flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                {/* Complete Toggle */}
                                {/* Toggle Completion */}
                                <button
                                  type="button"
                                  onClick={() => onToggleComplete(event.id)}
                                  onClick={() => {
                                    onToggleComplete(event.id)
                                    onClose()
                                  }}
                                  className={cn(
                                    "px-2 py-1.5 rounded flex items-center gap-1.5 font-medium border transition-colors",
                                    "px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                                    isCompleted
                                      ? "bg-emerald-600 text-white border-emerald-700"
                                      : "bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] border-[var(--sq-border)]"
                                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
                                  )}
                                  title={isCompleted ? "Mark Pending" : "Mark Completed"}
                                >
                                  <CheckCircle size={15} weight={isCompleted ? "fill" : "regular"} />
                                  <CheckCircle size={15} weight={isCompleted ? "fill" : "bold"} />
                                  <span>{isCompleted ? "Done" : "Complete"}</span>
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => onEdit(event)}
                                  className="px-2 py-1.5 rounded flex items-center gap-1.5 font-medium border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors"
                                  title="Edit Event"
                                  onClick={() => {
                                    onEdit(event)
                                    onClose()
                                  }}
                                  className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                                  title="Edit event"
                                >
                                  <PencilSimple size={15} />
                                  <span>Edit</span>
                                  <PencilSimple size={16} />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => onDuplicate(event)}
                                  className="p-1.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors"
                                  title="Duplicate Event"
                                  onClick={() => {
                                    onDuplicate(event)
                                    onClose()
                                  }}
                                  className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                                  title="Duplicate event"
                                >
                                  <Copy size={15} />
                                  <Copy size={16} />
                                </button>

                                {/* Export .ics */}
                                {/* Export single .ics */}
                                <button
                                  type="button"
                                  onClick={handleExportSingle}
                                  className="p-1.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors"
                                  title="Export as .ics"
                                  className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                                  title="Export to .ics file"
                                >
                                  <DownloadSimple size={15} />
                                  <DownloadSimple size={16} />
                                </button>
                              </div>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => onDelete(event.id)}
                                className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Delete Event"
                              >
                                <Trash size={15} />
                              </button>
                            </div>
                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${event.title}"?`)) {
                                  onDelete(event.id)
                                  onClose()
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                              title="Delete event"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
    </div>
                  )
                  }
