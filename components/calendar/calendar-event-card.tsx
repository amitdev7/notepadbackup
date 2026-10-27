"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Event Details Peek Card (macOS & Apple Style)
//
// Shows complete event metadata, status, recurrence, location, and quick actions
// rendered via createPortal directly to document.body (immune to canvas transforms).
// Supports inline confirmation deletion and keyboard Delete/Backspace shortcuts.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import type { CalendarEvent } from "@/lib/calendar/types"
import { CALENDAR_COLORS } from "@/lib/calendar/types"
import { formatTime, parseDateIso, parseTimeToMinutes } from "@/lib/calendar/date-utils"
import { exportToIcs, downloadIcsFile } from "@/lib/calendar/ics"
import {
  CalendarBlank,
  Clock,
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
  const [mounted, setMounted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setConfirmingDelete(false)
  }, [event?.id, isOpen])

  // Native macOS shortcut: Delete or Backspace removes event immediately
  useEffect(() => {
    if (!isOpen || !event) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        onDelete(event.id)
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, event, onDelete, onClose])

  if (!isOpen || !event || !mounted || typeof document === "undefined") return null

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
      timeLabel = formatTime(parseTimeToMinutes(event.startTime))
    }
  }

  const handleExportSingle = () => {
    const icsString = exportToIcs([event], `Zenithsui – ${event.title}`)
    const filename = `${event.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ics`
    downloadIcsFile(icsString, filename)
  }

  const cardModal = (
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
            <h3
              id="calendar-card-title"
              className={cn(
                "text-base font-bold text-[var(--sq-ink)] leading-snug break-words",
                isCompleted && "line-through opacity-60"
              )}
            >
              {event.title}
            </h3>
            <p className="text-xs text-[var(--sq-ink)] opacity-60 mt-0.5">
              {dateLabel} · {timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] opacity-60 hover:opacity-100 transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content & Metadata Fields */}
        <div className="p-4 pt-1 space-y-3 text-xs border-b border-[var(--sq-border)]">
          {/* Category / Type & Priority Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px]"
              style={{
                backgroundColor: colorPreset.bg,
                color: colorPreset.text,
                border: `1px solid ${colorPreset.border}`,
              }}
            >
              <Tag size={12} weight="bold" />
              <span>{event.type || "Event"}</span>
            </span>

            {event.priority && event.priority !== "Medium" && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  event.priority === "High"
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                )}
              >
                {event.priority} Priority
              </span>
            )}

            {event.recurrence && event.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--sq-ink)] opacity-70">
                <ArrowsClockwise size={12} />
                <span className="capitalize">{event.recurrence}</span>
              </span>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-80">
              <MapPin size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Academic Subject */}
          {event.subjectName && (
            <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-80">
              <CalendarBlank size={14} className="shrink-0 opacity-70" />
              <span>Subject: {event.subjectName}</span>
            </div>
          )}

          {/* Reminder */}
          {typeof event.reminderMinutes === "number" && (
            <div className="flex items-center gap-2 text-[var(--sq-ink)] opacity-80">
              <Bell size={14} className="shrink-0 opacity-70" />
              <span>
                Reminder: {event.reminderMinutes === 0 ? "At event start" : `${event.reminderMinutes}m before`}
              </span>
            </div>
          )}

          {/* Description / Notes */}
          {event.description && (
            <div className="mt-2 p-2.5 rounded-lg bg-[var(--sq-shade)]/30 border border-[var(--sq-border)] text-[var(--sq-ink)] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {event.description}
            </div>
          )}
        </div>

        {/* Quick Actions Footer Toolbar */}
        <div className="p-3 bg-[var(--sq-paper)] flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {/* Toggle Completion */}
            <button
              type="button"
              onClick={() => {
                onToggleComplete(event.id)
                onClose()
              }}
              className={cn(
                "px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                isCompleted
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                  : "hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
              )}
            >
              <CheckCircle size={15} weight={isCompleted ? "fill" : "bold"} />
              <span>{isCompleted ? "Done" : "Complete"}</span>
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                onEdit(event)
                onClose()
              }}
              className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
              title="Edit event"
            >
              <PencilSimple size={16} />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => {
                onDuplicate(event)
                onClose()
              }}
              className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
              title="Duplicate event"
            >
              <Copy size={16} />
            </button>

            {/* Export single .ics */}
            <button
              type="button"
              onClick={handleExportSingle}
              className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
              title="Export to .ics file"
            >
              <DownloadSimple size={16} />
            </button>
          </div>

          {/* Delete Action with Inline Confirmation */}
          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                Delete?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDelete(event.id)
                  onClose()
                }}
                className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-2 py-1 rounded border border-[var(--sq-border)] text-[11px] font-semibold hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="p-1.5 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Delete event (Delete/Backspace)"
              aria-label="Delete event"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(cardModal, document.body)
}

