"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Month View Grid
//
// 7-column monthly calendar with overflow handling, drag-and-drop date moving,
// current-day treatment, and selected date state.
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import {
  buildMonthGrid,
  getWeekdayHeaders,
  type MonthCell,
  type WeekStartsOn,
} from "@/lib/calendar/date-utils"
import type { CalendarEvent } from "@/lib/calendar/types"
import { CalendarEventPill } from "./calendar-event-pill"
import { cn } from "@/lib/utils"
import { Plus, X, CalendarBlank } from "@phosphor-icons/react"

interface CalendarMonthViewProps {
  year: number
  month: number
  weekStartsOn?: WeekStartsOn
  selectedDate: string
  events: CalendarEvent[]
  onSelectDate: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onMoveEvent: (id: string, newDate: string) => void
  onNewEventAtDate: (date: string) => void
  nodeWidth: number
  nodeHeight: number
}

export function CalendarMonthView({
  year,
  month,
  weekStartsOn = "sunday",
  selectedDate,
  events,
  onSelectDate,
  onEventClick,
  onToggleComplete,
  onMoveEvent,
  onNewEventAtDate,
  nodeWidth,
  nodeHeight,
}: CalendarMonthViewProps) {
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null)
  const [overflowPopoverDate, setOverflowPopoverDate] = useState<string | null>(null)

  const headers = useMemo(() => getWeekdayHeaders(weekStartsOn), [weekStartsOn])
  const cells = useMemo(() => buildMonthGrid(year, month, weekStartsOn), [year, month, weekStartsOn])

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const d = ev.date.slice(0, 10)
      const list = map.get(d) || []
      list.push(ev)
      map.set(d, list)
    }
    return map
  }, [events])

  const maxVisiblePerCell = nodeHeight < 400 ? 1 : nodeHeight < 560 ? 2 : 3

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--sq-paper)] overflow-hidden select-none">
      {/* 7-column weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/40 text-[11px] font-semibold text-[var(--sq-ink)] opacity-75">
        {headers.map((h, i) => (
          <div key={i} className="py-1 text-center border-r last:border-r-0 border-[var(--sq-border)]/50">
            {h}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div
        className="flex-1 grid grid-cols-7 auto-rows-fr bg-[var(--sq-border)]/40 gap-px border-b border-[var(--sq-border)] overflow-y-auto"
      >
        {cells.map((cell) => {
          const isSelected = cell.date === selectedDate
          const dayEvents = eventsByDate.get(cell.date) || []
          const visibleEvents = dayEvents.slice(0, maxVisiblePerCell)
          const overflowCount = dayEvents.length - visibleEvents.length

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              onDoubleClick={() => onNewEventAtDate(cell.date)}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onDrop={(e) => {
                e.preventDefault()
                const evId = e.dataTransfer.getData("text/plain") || draggedEventId
                if (evId) {
                  onMoveEvent(evId, cell.date)
                  setDraggedEventId(null)
                }
              }}
              className={cn(
                "group relative flex flex-col p-1 transition-colors min-h-[50px] overflow-hidden",
                cell.isCurrentMonth
                  ? "bg-[var(--sq-paper)] text-[var(--sq-ink)]"
                  : "bg-[var(--sq-shade)]/25 text-[var(--sq-ink)] opacity-40",
                isSelected && "ring-2 ring-[var(--sq-ink)] ring-inset z-10",
                "hover:bg-[var(--sq-shade)]/40"
              )}
            >
              {/* Day header: number + add button */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full",
                    cell.isToday
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-xs"
                      : isSelected
                      ? "font-bold underline"
                      : ""
                  )}
                >
                  {cell.dayNumber}
                </span>

                {/* Quick Add icon visible on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onNewEventAtDate(cell.date)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-opacity"
                  title="Add event on this day"
                >
                  <Plus size={11} weight="bold" />
                </button>
              </div>

              {/* Event list */}
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((ev) => (
                  <CalendarEventPill
                    key={ev.id}
                    event={ev}
                    isMonthView
                    draggable
                    onDragStart={(e) => {
                      setDraggedEventId(ev.id)
                      e.dataTransfer.setData("text/plain", ev.id)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(ev)
                    }}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                  />
                ))}

                {/* Overflow count button */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOverflowPopoverDate(cell.date)
                    }}
                    className="text-[10px] font-semibold text-[var(--sq-ink)] opacity-70 hover:opacity-100 hover:underline text-left px-1 mt-auto"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overflow Popover Modal if clicked +X more */}
      {overflowPopoverDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs"
          onClick={() => setOverflowPopoverDate(null)}
        >
          <div
            className="w-full max-w-xs rounded-lg p-4 bg-[var(--sq-paper)] text-[var(--sq-ink)] border-2 border-[var(--sq-ink)] shadow-xl flex flex-col gap-3"
            style={{ boxShadow: "3px 3px 0px var(--sq-ink)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--sq-border)] pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <CalendarBlank size={14} weight="bold" />
                <span>Events for {overflowPopoverDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setOverflowPopoverDate(null)}
                className="p-1 rounded hover:bg-[var(--sq-shade)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {(eventsByDate.get(overflowPopoverDate) || []).map((ev) => (
                <CalendarEventPill
                  key={ev.id}
                  event={ev}
                  isMonthView
                  onClick={() => {
                    setOverflowPopoverDate(null)
                    onEventClick(ev)
                  }}
                  onToggleComplete={() => onToggleComplete(ev.id)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const d = overflowPopoverDate
                setOverflowPopoverDate(null)
                onNewEventAtDate(d)
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded bg-[var(--sq-shade)] hover:bg-[var(--sq-shade-strong)] text-[var(--sq-ink)] border border-[var(--sq-border)] transition-colors"
            >
              <Plus size={13} weight="bold" />
              <span>Add Event</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
