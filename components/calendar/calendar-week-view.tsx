"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Week View Schedule
//
// 7-day schedule with time axis, real-time current time indicator, lane allocation
// for overlapping events, vertical duration resizing, and horizontal date dragging.
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useRef } from "react"
import {
  buildWeekDays,
  getTodayIso,
  formatTime,
  parseTimeToMinutes,
  minutesToTimeString,
  type WeekStartsOn,
} from "@/lib/calendar/date-utils"
import { computeDayEventPositions } from "@/lib/calendar/layout"
import type { CalendarEvent, PositionedEvent } from "@/lib/calendar/types"
import { CalendarEventPill } from "./calendar-event-pill"
import { cn } from "@/lib/utils"

interface CalendarWeekViewProps {
  referenceDate: string
  weekStartsOn?: WeekStartsOn
  startHour?: number
  endHour?: number
  timeFormat?: "12h" | "24h"
  events: CalendarEvent[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onMoveEvent: (id: string, newDate: string, newStartTime?: string, newEndTime?: string) => void
  onResizeEvent: (id: string, newEndTime: string) => void
  onNewEventAtSlot: (date: string, startTime: string) => void
  nodeWidth: number
  nodeHeight: number
}

const HOUR_HEIGHT = 52 // Height per hour in px

export function CalendarWeekView({
  referenceDate,
  weekStartsOn = "sunday",
  startHour = 7,
  endHour = 21,
  timeFormat = "12h",
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  onToggleComplete,
  onMoveEvent,
  onResizeEvent,
  onNewEventAtSlot,
  nodeWidth,
  nodeHeight,
}: CalendarWeekViewProps) {
  const [currentMinuteOfDay, setCurrentMinuteOfDay] = useState<number>(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })

  // Resize drag tracking
  const [resizingEvent, setResizingEvent] = useState<{
    id: string
    date: string
    startM: number
    origEndM: number
    currentEndM: number
    startY: number
  } | null>(null)

  // Move drag tracking
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null)

  const weekDays = useMemo(() => buildWeekDays(referenceDate, weekStartsOn), [referenceDate, weekStartsOn])
  const todayIso = useMemo(() => getTodayIso(), [])

  // Timer for current time line (updates every minute, cleaned up on unmount)
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentMinuteOfDay(now.getHours() * 60 + now.getMinutes())
    }
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [])

  // Hours array for time axis
  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = startHour; h < endHour; h++) {
      list.push(h)
    }
    return list
  }, [startHour, endHour])

  const visibleStartMinute = startHour * 60
  const visibleEndMinute = endHour * 60
  const totalScheduleHeight = (endHour - startHour) * HOUR_HEIGHT

  // All-day events for visible week
  const allDayEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const d of weekDays) {
      map.set(d.date, [])
    }
    for (const ev of events) {
      if (ev.isAllDay) {
        const sD = ev.date.slice(0, 10)
        const eD = ev.endDate ? ev.endDate.slice(0, 10) : sD
        for (const d of weekDays) {
          if (d.date >= sD && d.date <= eD) {
            const list = map.get(d.date) || []
            list.push(ev)
            map.set(d.date, list)
          }
        }
      }
    }
    return map
  }, [events, weekDays])

  // Timed positioned events per day
  const positionedEventsByDate = useMemo(() => {
    const map = new Map<string, PositionedEvent[]>()
    for (const d of weekDays) {
      const pos = computeDayEventPositions(events, d.date, startHour, endHour, HOUR_HEIGHT)
      map.set(d.date, pos)
    }
    return map
  }, [events, weekDays, startHour, endHour])

  // Mouse move / up handler during event resizing
  useEffect(() => {
    if (!resizingEvent) return

    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - resizingEvent.startY
      const deltaMinutes = (deltaY / HOUR_HEIGHT) * 60
      // Snap to 15-minute increments
      const snappedDelta = Math.round(deltaMinutes / 15) * 15
      const newEndM = Math.max(resizingEvent.startM + 15, Math.min(24 * 60, resizingEvent.origEndM + snappedDelta))

      setResizingEvent((prev) => (prev ? { ...prev, currentEndM: newEndM } : null))
    }

    const handlePointerUp = () => {
      if (resizingEvent) {
        const finalTimeStr = minutesToTimeString(resizingEvent.currentEndM)
        onResizeEvent(resizingEvent.id, finalTimeStr)
        setResizingEvent(null)
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [resizingEvent, onResizeEvent])

  const currentTimeTopPx =
    currentMinuteOfDay >= visibleStartMinute && currentMinuteOfDay <= visibleEndMinute
      ? ((currentMinuteOfDay - visibleStartMinute) / 60) * HOUR_HEIGHT
      : null

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--sq-paper)] overflow-hidden select-none">
      {/* 1. Header row with day names & dates */}
      <div className="flex border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30 text-xs">
        {/* Empty corner above time axis */}
        <div className="w-14 shrink-0 border-r border-[var(--sq-border)]" />

        {/* 7 day columns */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-[var(--sq-border)]/50">
          {weekDays.map((d) => {
            const isSelected = d.date === selectedDate
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelectDate(d.date)}
                className={cn(
                  "py-1.5 px-1 text-center flex flex-col items-center justify-center transition-colors",
                  d.isToday && "bg-[var(--sq-shade)]/60 font-bold",
                  isSelected && "bg-[var(--sq-shade)]",
                  "hover:bg-[var(--sq-shade)]/40"
                )}
              >
                <span className="text-[10px] uppercase font-semibold text-[var(--sq-ink)] opacity-70">
                  {d.dayName}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full mt-0.5",
                    d.isToday
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                      : isSelected
                      ? "underline"
                      : "text-[var(--sq-ink)]"
                  )}
                >
                  {d.dayNumber}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. All-day events row */}
      <div className="flex border-b border-[var(--sq-border)] bg-[var(--sq-paper)] min-h-[28px] max-h-24 overflow-y-auto">
        <div className="w-14 shrink-0 p-1 border-r border-[var(--sq-border)] text-[10px] font-semibold text-[var(--sq-ink)] opacity-60 flex items-center justify-end pr-2">
          all-day
        </div>
        <div className="flex-1 grid grid-cols-7 divide-x divide-[var(--sq-border)]/50 p-0.5">
          {weekDays.map((d) => {
            const dayAllDay = allDayEventsByDate.get(d.date) || []
            return (
              <div key={d.date} className="flex flex-col gap-0.5 px-0.5 min-h-[22px]">
                {dayAllDay.map((ev) => (
                  <CalendarEventPill
                    key={ev.id}
                    event={ev}
                    isMonthView
                    onClick={() => onEventClick(ev)}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Main scrollable time grid */}
      <div className="flex-1 flex overflow-y-auto relative bg-[var(--sq-paper)]">
        {/* Time labels axis */}
        <div
          className="w-14 shrink-0 border-r border-[var(--sq-border)] flex flex-col text-[10px] font-mono text-[var(--sq-ink)] opacity-60 select-none bg-[var(--sq-shade)]/15"
          style={{ height: totalScheduleHeight }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="relative pr-2 text-right border-b border-[var(--sq-border)]/30"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="-top-2 relative">
                {formatTime(h * 60, timeFormat)}
              </span>
            </div>
          ))}
        </div>

        {/* 7 Columns for the days */}
        <div
          className="flex-1 grid grid-cols-7 divide-x divide-[var(--sq-border)]/40 relative"
          style={{ height: totalScheduleHeight }}
        >
          {weekDays.map((d) => {
            const isToday = d.date === todayIso
            const dayEvents = positionedEventsByDate.get(d.date) || []

            return (
              <div
                key={d.date}
                className={cn(
                  "relative h-full transition-colors",
                  isToday && "bg-[var(--sq-shade)]/15"
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const evId = e.dataTransfer.getData("text/plain") || draggedEventId
                  if (!evId) return

                  const rect = e.currentTarget.getBoundingClientRect()
                  const offsetY = e.clientY - rect.top
                  const minutesFromStart = (offsetY / HOUR_HEIGHT) * 60
                  const snappedStartM = Math.round((visibleStartMinute + minutesFromStart) / 15) * 15
                  const clampedStartM = Math.max(0, Math.min(23 * 60, snappedStartM))

                  const targetEv = events.find((x) => x.id === evId)
                  const dur = targetEv?.durationMinutes || 60
                  const newEndM = Math.min(24 * 60, clampedStartM + dur)

                  onMoveEvent(
                    evId,
                    d.date,
                    minutesToTimeString(clampedStartM),
                    minutesToTimeString(newEndM)
                  )
                  setDraggedEventId(null)
                }}
              >
                {/* Horizontal hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => {
                      const timeStr = `${String(h).padStart(2, "0")}:00`
                      onNewEventAtSlot(d.date, timeStr)
                    }}
                    className="border-b border-[var(--sq-border)]/25 hover:bg-[var(--sq-shade)]/30 transition-colors cursor-pointer"
                    style={{ height: HOUR_HEIGHT }}
                    title={`Click to add event at ${formatTime(h * 60, timeFormat)}`}
                  />
                ))}

                {/* Current time indicator line on today's column */}
                {isToday && currentTimeTopPx !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: currentTimeTopPx }}
                  >
                    <div className="w-2 h-2 rounded-full bg-[var(--sq-ink)] -ml-1" />
                    <div className="flex-1 h-0.5 bg-[var(--sq-ink)]" />
                  </div>
                )}

                {/* Timed events in this column */}
                {dayEvents.map((ev) => {
                  const isResizingThis = resizingEvent?.id === ev.id
                  const heightPx = isResizingThis
                    ? Math.max(20, ((resizingEvent.currentEndM - ev.startMinute) / 60) * HOUR_HEIGHT)
                    : ev.heightPx

                  const leftPct = (ev.lane / ev.totalLanes) * 100
                  const widthPct = (1 / ev.totalLanes) * 100

                  return (
                    <div
                      key={ev.id}
                      draggable={!isResizingThis}
                      onDragStart={(e) => {
                        setDraggedEventId(ev.id)
                        e.dataTransfer.setData("text/plain", ev.id)
                      }}
                      className="absolute z-10 p-0.5 transition-all group"
                      style={{
                        top: ev.topPx,
                        height: heightPx,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(ev)
                      }}
                    >
                      <CalendarEventPill
                        event={ev}
                        onToggleComplete={() => onToggleComplete(ev.id)}
                      />

                      {/* Resize drag handle at bottom edge of event card */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setResizingEvent({
                            id: ev.id,
                            date: d.date,
                            startM: ev.startMinute,
                            origEndM: ev.endMinute,
                            currentEndM: ev.endMinute,
                            startY: e.clientY,
                          })
                        }}
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center bg-[var(--sq-ink)]/10 hover:bg-[var(--sq-ink)]/25 rounded-b"
                        title="Drag to resize duration"
                      >
                        <div className="w-4 h-0.5 bg-[var(--sq-ink)] opacity-60 rounded" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
