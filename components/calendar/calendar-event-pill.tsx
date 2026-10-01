"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Event Pill Component
//
// Hand-drawn sketch aesthetic event item adhering to Zenithsui's single-ink
// pen model (--sq-ink, --sq-paper, --sq-shade, --sq-shade-strong).
// ---------------------------------------------------------------------------

import { useState } from "react"
import type { CalendarEvent } from "@/lib/calendar/types"
import { CALENDAR_COLORS } from "@/lib/calendar/types"
import { cn } from "@/lib/utils"
import { Check, Clock, Sparkle, BookOpen, GraduationCap, NotePencil } from "@phosphor-icons/react"

interface CalendarEventPillProps {
  event: CalendarEvent
  isMonthView?: boolean
  onClick?: (e: React.MouseEvent) => void
  onToggleComplete?: (e: React.MouseEvent) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
}

export function CalendarEventPill({
  event,
  isMonthView = false,
  onClick,
  onToggleComplete,
  draggable = true,
  onDragStart,
}: CalendarEventPillProps) {
  const isCompleted = event.status === "completed"
  const colorPreset = CALENDAR_COLORS.find((c) => c.id === event.color) || CALENDAR_COLORS[0]

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-1.5 px-1.5 py-0.5 rounded text-left transition-all cursor-pointer select-none",
        "border border-[var(--sq-border)]",
        isCompleted
          ? "bg-[var(--sq-shade)] opacity-60 line-through text-[var(--sq-ink)]"
          : "bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] shadow-xs",
        isMonthView ? "w-full text-[11px] truncate mb-1" : "h-full w-full text-xs overflow-hidden"
      )}
      style={{
        boxShadow: "1px 1px 0px rgba(0,0,0,0.06)",
        borderLeftWidth: "3px",
        borderLeftColor: colorPreset.hex,
      }}
      title={`${event.title}${event.startTime ? ` (${event.startTime})` : ""}`}
    >
      {/* Complete toggle checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleComplete?.(e)
        }}
        className={cn(
          "shrink-0 flex items-center justify-center w-3 h-3 rounded-xs border transition-colors",
          isCompleted
            ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)]"
            : "border-[var(--sq-ink)]/50 hover:border-[var(--sq-ink)] bg-transparent"
        )}
      >
        {isCompleted && <Check size={8} weight="bold" />}
      </button>

      {/* Title & time preview */}
      <div className="flex-1 min-w-0 truncate flex items-center gap-1">
        <span className="font-medium truncate">{event.title}</span>
        {!isMonthView && event.startTime && (
          <span className="text-[10px] opacity-60 shrink-0 font-mono">
            {event.startTime}
          </span>
        )}
      </div>

      {/* Priority badge if High */}
      {event.priority === "High" && !isCompleted && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--sq-ink)] shrink-0" title="High Priority" />
      )}
    </div>
  )
}
