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
  const [optimisticStatus, setOptimisticStatus] = useState<"pending" | "completed" | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOptimisticStatus(null)
  }, [event?.id, event?.status])

  // Native macOS & iOS keyboard shortcuts: Delete/Backspace removes, Escape closes
  useEffect(() => {
    if (!isOpen || !event) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        onDelete(event.id)
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, event, onDelete, onClose])

  if (!isOpen || !event || !mounted || typeof document === "undefined") return null

  const isCompleted = (optimisticStatus ?? event.status) === "completed"
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
    downloadIcsFile(filename, icsString)
  }

  const cardModal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-card-title"
        className={cn(
          "w-full max-w-sm rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden font-sans",
          "bg-white/92 dark:bg-stone-900/92 backdrop-blur-2xl text-[var(--sq-ink)]",
          "animate-popover-enter ring-1 ring-black/5 dark:ring-white/10"
        )}
        style={{
          boxShadow:
            "0 24px 55px -10px rgba(0,0,0,0.32), 0 8px 24px -4px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color Strip Header Accent */}
        <div
          className="h-1.5 w-full bg-gradient-to-r"
          style={{
            backgroundColor: colorPreset.hex,
            backgroundImage: `linear-gradient(90deg, ${colorPreset.hex}, ${colorPreset.border || colorPreset.hex})`,
          }}
        />
        {/* Specular rim reflection hairline */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent" />

        {/* Header with Title and Close Button */}
        <div className="p-4 pb-2.5 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              id="calendar-card-title"
              className={cn(
                "text-base font-bold text-stone-900 dark:text-stone-100 leading-snug break-words tracking-tight",
                isCompleted && "line-through opacity-60"
              )}
            >
              {event.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
              {dateLabel} · {timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-full flex items-center justify-center bg-stone-100/80 hover:bg-stone-200/90 dark:bg-stone-800/80 dark:hover:bg-stone-700/90 text-stone-500 dark:text-stone-300 transition-all tactile-press shrink-0 cursor-pointer border border-stone-200/50 dark:border-stone-700/50 shadow-2xs"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Content & Metadata Fields */}
        <div className="px-4 pb-3 pt-1 space-y-2.5 text-xs">
          {/* Category / Type & Priority Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] shadow-2xs backdrop-blur-xs"
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
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs",
                  event.priority === "High"
                    ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                )}
              >
                {event.priority} Priority
              </span>
            )}

            {event.recurrence && event.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/80 text-[11px] font-medium text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60">
                <ArrowsClockwise size={12} weight="bold" />
                <span className="capitalize">{event.recurrence}</span>
              </span>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium">
              <MapPin size={14} className="shrink-0 text-stone-400 dark:text-stone-500" weight="duotone" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Academic Subject */}
          {event.subjectName && (
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium">
              <CalendarBlank size={14} className="shrink-0 text-stone-400 dark:text-stone-500" weight="duotone" />
              <span>Subject: {event.subjectName}</span>
            </div>
          )}

          {/* Reminder */}
          {typeof event.reminderMinutes === "number" && (
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium">
              <Bell size={14} className="shrink-0 text-stone-400 dark:text-stone-500" weight="duotone" />
              <span>
                Reminder: {event.reminderMinutes === 0 ? "At event start" : `${event.reminderMinutes}m before`}
              </span>
            </div>
          )}

          {/* Description / Notes */}
          {event.description && (
            <div className="mt-2 p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60 text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto scrollbar-thin text-xs shadow-inner">
              {event.description}
            </div>
          )}
        </div>

        {/* Quick Actions Footer Toolbar */}
        <div className="p-3 bg-stone-50/80 dark:bg-stone-950/40 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-1.5">
            {/* Toggle Completion */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setOptimisticStatus(isCompleted ? "pending" : "completed")
                onToggleComplete(event.id)
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all tactile-press cursor-pointer border shadow-2xs",
                isCompleted
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-200/70 dark:border-stone-700/70"
              )}
            >
              <CheckCircle size={15} weight={isCompleted ? "fill" : "bold"} className={isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400"} />
              <span>{isCompleted ? "Done" : "Complete"}</span>
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onEdit(event)
              }}
              className="size-8 rounded-xl flex items-center justify-center bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/70 transition-all tactile-press cursor-pointer shadow-2xs"
              title="Edit event"
              aria-label="Edit event"
            >
              <PencilSimple size={15} weight="bold" />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDuplicate(event)
                onClose()
              }}
              className="size-8 rounded-xl flex items-center justify-center bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/70 transition-all tactile-press cursor-pointer shadow-2xs"
              title="Duplicate event"
              aria-label="Duplicate event"
            >
              <Copy size={15} weight="bold" />
            </button>

            {/* Export single .ics */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleExportSingle()
              }}
              className="size-8 rounded-xl flex items-center justify-center bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/70 transition-all tactile-press cursor-pointer shadow-2xs"
              title="Export to .ics file"
              aria-label="Export to .ics file"
            >
              <DownloadSimple size={15} weight="bold" />
            </button>
          </div>

          {/* Delete Action (1-Click Instant Delete matching macOS Calendar) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDelete(event.id)
              onClose()
            }}
            className="size-8 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 transition-all tactile-press cursor-pointer shadow-2xs"
            title="Delete event (Delete/Backspace)"
            aria-label="Delete event"
          >
            <Trash size={15} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(cardModal, document.body)
}

