"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Agenda View
//
// Chronological timeline view of all upcoming and scheduled events featuring:
// 1. Date grouping with smart relative labels (Today, Tomorrow, Weekdays)
// 2. Category badge, priority pill, and location metadata
// 3. One-click completion checkbox with immediate visual feedback
// 4. Quick Edit and Delete action controls
// 5. Elegant empty state with contextual call-to-action
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import {
  getTodayIso,
  addDaysIso,
  parseDateIso,
  getWeekday,
  WEEKDAY_NAMES,
  MONTH_NAMES,
  formatTime,
  parseTimeToMinutes,
} from "@/lib/calendar/date-utils"
import type { CalendarEvent } from "@/lib/calendar/types"
import {
  CalendarBlank,
  Clock,
  MapPin,
  Check,
  PencilSimple,
  Trash,
  Plus,
  BookmarkSimple,
  WarningCircle,
} from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CalendarAgendaViewProps {
  events: CalendarEvent[]
  timeFormat?: "12h" | "24h"
  onEventClick: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onDeleteEvent: (id: string) => void
  onNewEvent: () => void
  nodeWidth: number
  nodeHeight: number
}

export function CalendarAgendaView({
  events,
  timeFormat = "12h",
  onEventClick,
  onToggleComplete,
  onDeleteEvent,
  onNewEvent,
  nodeWidth,
  nodeHeight: _nodeHeight,
}: CalendarAgendaViewProps) {
  const todayIso = useMemo(() => getTodayIso(), [])
  const tomorrowIso = useMemo(() => addDaysIso(todayIso, 1), [todayIso])
  const isCompact = nodeWidth < 500

  // Group events by date sorted chronologically
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    // Sort events by date and time
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return (a.startTime || "00:00").localeCompare(b.startTime || "00:00")
    })

    for (const ev of sorted) {
      const d = ev.date.slice(0, 10)
      const list = map.get(d) || []
      list.push(ev)
      map.set(d, list)
    }

    return Array.from(map.entries()).map(([date, dayEvents]) => ({
      date,
      events: dayEvents,
    }))
  }, [events])

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-y-auto bg-[var(--sq-paper)] p-3 sm:p-4 select-none scrollbar-thin">
      {groupedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="size-12 rounded-2xl bg-[var(--sq-shade)] border border-[var(--sq-border)] flex items-center justify-center text-[var(--sq-ink)] opacity-60 mb-3 shadow-2xs">
            <CalendarBlank size={24} weight="duotone" />
          </div>
          <h3 className="text-sm font-bold text-[var(--sq-ink)]">No events scheduled</h3>
          <p className="text-xs text-[var(--sq-ink)] opacity-60 max-w-xs mt-1 mb-4">
            Your agenda is clear. Create study sessions, exams, assignment deadlines, or personal tasks.
          </p>
          <button
            type="button"
            onClick={onNewEvent}
            className="tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sq-ink)] text-[var(--sq-paper)] text-xs font-semibold shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Plus size={14} weight="bold" />
            <span>Create Event</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto pb-8">
          {groupedEvents.map(({ date, events: dayEvents }) => {
            const parsed = parseDateIso(date)
            const weekday = WEEKDAY_NAMES[getWeekday(parsed.year, parsed.month, parsed.day)]
            const month = MONTH_NAMES[parsed.month - 1]
            const isToday = date === todayIso
            const isTomorrow = date === tomorrowIso
            const isPast = date < todayIso

            let dateLabel = `${weekday}, ${month} ${parsed.day}`
            if (isToday) dateLabel = `Today · ${dateLabel}`
            else if (isTomorrow) dateLabel = `Tomorrow · ${dateLabel}`

            return (
              <div key={date} className="space-y-1.5">
                {/* Date Group Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between py-1 px-2 rounded-lg bg-[var(--sq-paper)]/95 backdrop-blur-sm border-b border-[var(--sq-border)]/60">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold tracking-tight",
                        isToday
                          ? "text-blue-600 dark:text-blue-400 font-extrabold"
                          : isPast
                            ? "text-[var(--sq-ink)] opacity-50"
                            : "text-[var(--sq-ink)]"
                      )}
                    >
                      {dateLabel}
                    </span>
                    {isToday && (
                      <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse-subtle" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--sq-ink)] opacity-50">
                    {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Event Cards */}
                <div className="space-y-1.5 pl-1 sm:pl-2">
                  {dayEvents.map((ev) => {
                    const isCompleted = ev.status === "completed"

                    return (
                      <div
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          "group relative flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                          "hover:shadow-xs hover:border-[var(--sq-ink)]/30",
                          isCompleted
                            ? "bg-[var(--sq-shade)]/30 border-[var(--sq-border)]/40 opacity-70"
                            : "bg-[var(--sq-paper)] border-[var(--sq-border)]"
                        )}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: ev.color || "var(--sq-ink)",
                        }}
                      >
                        {/* Completion Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleComplete(ev.id)
                          }}
                          className={cn(
                            "size-4 rounded mt-0.5 flex items-center justify-center border transition-all shrink-0 cursor-pointer",
                            isCompleted
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-[var(--sq-border)] bg-[var(--sq-paper)] hover:border-[var(--sq-ink)]"
                          )}
                          title={isCompleted ? "Mark pending" : "Mark completed"}
                        >
                          {isCompleted && <Check size={11} weight="bold" />}
                        </button>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={cn(
                                "text-xs font-semibold text-[var(--sq-ink)] leading-snug truncate",
                                isCompleted && "line-through opacity-50"
                              )}
                            >
                              {ev.title}
                            </h4>

                            {ev.type && (
                              <Badge variant="pill" size="sm" className="text-[10px]">
                                {ev.type}
                              </Badge>
                            )}

                            {ev.priority === "High" && (
                              <Badge variant="destructive" size="sm" className="text-[10px]">
                                High
                              </Badge>
                            )}
                          </div>

                          {/* Time & Meta Row */}
                          <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--sq-ink)] opacity-60 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {ev.isAllDay ? (
                                <span>All-Day</span>
                              ) : (
                                <span>
                                  {ev.startTime ? formatTime(parseTimeToMinutes(ev.startTime), timeFormat) : ""}
                                  {ev.endTime ? ` – ${formatTime(parseTimeToMinutes(ev.endTime), timeFormat)}` : ""}
                                </span>
                              )}
                            </span>

                            {ev.location && (
                              <span className="flex items-center gap-1 truncate max-w-[140px]">
                                <MapPin size={12} />
                                <span>{ev.location}</span>
                              </span>
                            )}

                            {ev.subjectName && (
                              <span className="flex items-center gap-1 truncate max-w-[140px]">
                                <BookmarkSimple size={12} />
                                <span>{ev.subjectName}</span>
                              </span>
                            )}
                          </div>

                          {/* Description preview */}
                          {ev.description && !isCompact && (
                            <p className="text-[11px] text-[var(--sq-ink)] opacity-70 line-clamp-2 mt-1.5 font-sans leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                        </div>

                        {/* Quick action buttons on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick(ev)
                            }}
                            className="p-1 rounded text-[var(--sq-ink)] opacity-60 hover:opacity-100 hover:bg-[var(--sq-shade)] cursor-pointer"
                            title="Edit event"
                          >
                            <PencilSimple size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteEvent(ev.id)
                            }}
                            className="p-1 rounded text-red-600 hover:bg-red-500/10 cursor-pointer"
                            title="Delete event"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
