"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Day View Schedule
//
// Single-day detailed schedule featuring:
// 1. Time axis with configurable start/end hours and 12h/24h formats
// 2. All-day events bar at the top
// 3. Side-by-side lane allocation for overlapping appointments
// 4. Real-time current-time indicator line with live breathing badge
// 5. Click-to-create on any hour or half-hour slot
// 6. Direct task completion toggling with instant visual feedback
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useRef } from "react"
import {
  getTodayIso,
  formatTime,
  parseDateIso,
  getWeekday,
  WEEKDAY_NAMES,
  MONTH_NAMES,
} from "@/lib/calendar/date-utils"
import { computeDayEventPositions } from "@/lib/calendar/layout"
import type { CalendarEvent, PositionedEvent } from "@/lib/calendar/types"
import { CalendarEventPill } from "./calendar-event-pill"
import { Plus, Clock, MapPin, Check } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface CalendarDayViewProps {
  date: string
  startHour?: number
  endHour?: number
  timeFormat?: "12h" | "24h"
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onNewEventAtSlot: (date: string, startTime: string) => void
  onDeleteEvent?: (id: string) => void
  nodeWidth: number
  nodeHeight: number
}

const HOUR_HEIGHT = 56 // Height per hour slot in px

export function CalendarDayView({
  date,
  startHour = 7,
  endHour = 21,
  timeFormat = "12h",
  events,
  onEventClick,
  onToggleComplete,
  onNewEventAtSlot,
  onDeleteEvent,
  nodeWidth,
  nodeHeight,
}: CalendarDayViewProps) {
  const [currentMinuteOfDay, setCurrentMinuteOfDay] = useState<number>(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })

  const todayIso = useMemo(() => getTodayIso(), [])
  const isToday = date === todayIso

  const parsed = useMemo(() => parseDateIso(date), [date])
  const weekdayIndex = useMemo(() => getWeekday(parsed.year, parsed.month, parsed.day), [parsed])
  const weekdayName = WEEKDAY_NAMES[weekdayIndex]
  const monthName = MONTH_NAMES[parsed.month - 1]

  // Timer for current-time indicator
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentMinuteOfDay(now.getHours() * 60 + now.getMinutes())
    }
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [])

  // Time slot hours list
  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = startHour; h < endHour; h++) {
      list.push(h)
    }
    return list
  }, [startHour, endHour])

  // Split into All-Day events vs Timed events
  const { allDayEvents, positionedTimedEvents } = useMemo(() => {
    const dayNorm = date.slice(0, 10)
    const dayEvents = events.filter((e) => {
      const s = e.date.slice(0, 10)
      const end = e.endDate ? e.endDate.slice(0, 10) : s
      return dayNorm >= s && dayNorm <= end
    })

    const allDay = dayEvents.filter((e) => e.isAllDay)
    const timed = computeDayEventPositions(
      dayEvents,
      date,
      startHour,
      endHour,
      HOUR_HEIGHT
    )

    return { allDayEvents: allDay, positionedTimedEvents: timed }
  }, [events, date, startHour, endHour])

  // Scroll to current time or 8am on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolledRef = useRef(false)
  useEffect(() => {
    if (!hasInitialScrolledRef.current && scrollContainerRef.current) {
      hasInitialScrolledRef.current = true
      const targetMinute = isToday ? Math.max(startHour * 60, currentMinuteOfDay - 60) : 8 * 60
      const offsetMinutes = Math.max(0, targetMinute - startHour * 60)
      scrollContainerRef.current.scrollTop = (offsetMinutes / 60) * HOUR_HEIGHT
    }
  }, [isToday, startHour, currentMinuteOfDay])

  // Current time line calculation
  const currentTimeTop = useMemo(() => {
    if (!isToday) return null
    const startM = startHour * 60
    const endM = endHour * 60
    if (currentMinuteOfDay < startM || currentMinuteOfDay > endM) return null
    return ((currentMinuteOfDay - startM) / 60) * HOUR_HEIGHT
  }, [isToday, currentMinuteOfDay, startHour, endHour])

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 bg-[var(--sq-paper)] select-none">
      {/* Day Summary Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex flex-col items-center justify-center size-10 rounded-xl font-bold border shadow-2xs",
              isToday
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)]"
                : "bg-[var(--sq-paper)] text-[var(--sq-ink)] border-[var(--sq-border)]"
            )}
          >
            <span className="text-[10px] uppercase font-semibold leading-none opacity-80">
              {weekdayName.slice(0, 3)}
            </span>
            <span className="text-sm leading-tight mt-0.5">{parsed.day}</span>
          </div>
          <div>
            <h2 className="text-xs font-bold text-[var(--sq-ink)] leading-tight">
              {weekdayName}, {monthName} {parsed.day}, {parsed.year}
            </h2>
            <div className="text-[11px] text-[var(--sq-ink)] opacity-60 flex items-center gap-2 mt-0.5">
              <span>{positionedTimedEvents.length + allDayEvents.length} events scheduled</span>
              {isToday && (
                <span className="px-1.5 py-0.25 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => onNewEventAtSlot(date, "09:00")}
          className="tactile-btn flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--sq-ink)] text-[var(--sq-paper)] text-xs font-semibold shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
        >
          <Plus size={13} weight="bold" />
          <span>Add Event</span>
        </button>
      </div>

      {/* All-Day Events Strip */}
      {allDayEvents.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-1.5 border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/15 shrink-0 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sq-ink)] opacity-60 w-14 shrink-0 pt-1">
            All-Day
          </span>
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {allDayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="group flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cursor-pointer shadow-2xs hover:scale-[1.01] transition-transform"
                style={{
                  backgroundColor: ev.color ? `${ev.color}18` : "var(--sq-shade)",
                  borderColor: ev.color || "var(--sq-border)",
                  color: "var(--sq-ink)",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleComplete(ev.id)
                  }}
                  className={cn(
                    "size-3.5 rounded flex items-center justify-center border transition-all cursor-pointer",
                    ev.status === "completed"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-[var(--sq-border)] bg-[var(--sq-paper)] hover:border-[var(--sq-ink)]"
                  )}
                >
                  {ev.status === "completed" && <Check size={10} weight="bold" />}
                </button>
                <span className={cn("truncate", ev.status === "completed" && "line-through opacity-50")}>
                  {ev.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto relative scrollbar-thin"
      >
        <div
          className="relative"
          style={{ height: hours.length * HOUR_HEIGHT }}
        >
          {/* Time axis rows */}
          {hours.map((h, idx) => {
            const timeLabel = formatTime(h * 60, timeFormat)
            return (
              <div
                key={h}
                className="absolute inset-x-0 border-b border-[var(--sq-border)]/50 flex"
                style={{
                  top: idx * HOUR_HEIGHT,
                  height: HOUR_HEIGHT,
                }}
              >
                {/* Time Label */}
                <div className="w-16 shrink-0 text-right pr-3 pt-1 text-[11px] font-mono font-medium text-[var(--sq-ink)] opacity-50 select-none">
                  {timeLabel}
                </div>

                {/* Slot Area (Clickable to create event) */}
                <div
                  className="flex-1 relative group cursor-pointer hover:bg-[var(--sq-shade)]/20 transition-colors"
                  onClick={() =>
                    onNewEventAtSlot(
                      date,
                      `${String(h).padStart(2, "0")}:00`
                    )
                  }
                >
                  {/* Half-hour subtle dashed line */}
                  <div className="absolute inset-x-0 top-1/2 border-b border-[var(--sq-border)]/25 pointer-events-none" />

                  {/* Hover create prompt */}
                  <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] text-[var(--sq-ink)] opacity-40 font-mono pl-2 pt-1">
                    <Plus size={10} /> {timeLabel}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Current-Time Line */}
          {currentTimeTop !== null && (
            <div
              className="absolute inset-x-0 z-30 pointer-events-none flex items-center"
              style={{ top: currentTimeTop }}
            >
              <div className="w-16 shrink-0 flex items-center justify-end pr-1">
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold shadow-xs">
                  {formatTime(currentMinuteOfDay, timeFormat)}
                </span>
              </div>
              <div className="size-2 rounded-full bg-red-600 shadow-xs animate-pulse-subtle" />
              <div className="flex-1 h-0.5 bg-red-600 shadow-xs" />
            </div>
          )}

          {/* Positioned Timed Events Overlay */}
          <div className="absolute top-0 bottom-0 left-16 right-2 pointer-events-none">
            {positionedTimedEvents.map((ev) => {
              const lanePct = 100 / (ev.totalLanes || 1)
              const leftPct = (ev.lane || 0) * lanePct

              return (
                <div
                  key={ev.id}
                  className="absolute pointer-events-auto p-0.5"
                  style={{
                    top: Math.max(0, ev.topPx),
                    height: Math.max(26, ev.heightPx),
                    left: `${leftPct}%`,
                    width: `${lanePct}%`,
                  }}
                >
                  <CalendarEventPill
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                    onDelete={() => onDeleteEvent?.(ev.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
