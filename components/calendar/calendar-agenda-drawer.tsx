"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Agenda & Mini Calendar Side Drawer (Android / Windows)
//
// Features:
// 1. Compact Mini Month Calendar with date dots & instant navigation
// 2. Upcoming Agenda List grouped by Today, Tomorrow, and Later
// 3. Category Visibility Filters with checkboxes and color indicators
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react"
import type { CalendarEvent } from "@/lib/calendar/types"
import { CALENDAR_COLORS } from "@/lib/calendar/types"
import {
  buildMonthGrid,
  formatMonthYear,
  getTodayIso,
  addDaysIso,
  parseDateIso,
  type WeekStartsOn,
} from "@/lib/calendar/date-utils"
import {
  CaretLeft,
  CaretRight,
  X,
  CheckCircle,
  CalendarBlank,
  Clock,
  MapPin,
  ListBullets,
  Tag,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface CalendarAgendaDrawerProps {
  isOpen: boolean
  onClose: () => void
  events: CalendarEvent[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
  onToggleComplete: (id: string) => void
  onNewEventAtDate: (date: string) => void
  hiddenCategories: Set<string>
  onToggleCategory: (category: string) => void
  weekStartsOn: WeekStartsOn
}

export function CalendarAgendaDrawer({
  isOpen,
  onClose,
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  onToggleComplete,
  onNewEventAtDate,
  hiddenCategories,
  onToggleCategory,
  weekStartsOn,
}: CalendarAgendaDrawerProps) {
  const todayIso = useMemo(() => getTodayIso(), [])
  const { year: curYear, month: curMonth } = useMemo(
    () => parseDateIso(selectedDate || todayIso),
    [selectedDate, todayIso]
  )

  const [miniYear, setMiniYear] = useState<number>(curYear)
  const [miniMonth, setMiniMonth] = useState<number>(curMonth)

  // Mini month grid
  const monthGrid = useMemo(
    () => buildMonthGrid(miniYear, miniMonth, weekStartsOn),
    [miniYear, miniMonth, weekStartsOn]
  )

  // Dates with events in the current mini month
  const datesWithEvents = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) {
      set.add(ev.date.slice(0, 10))
    }
    return set
  }, [events])

  // Group upcoming events into Today, Tomorrow, and Upcoming
  const tomorrowIso = useMemo(() => addDaysIso(todayIso, 1), [todayIso])
  const nextWeekIso = useMemo(() => addDaysIso(todayIso, 7), [todayIso])

  const { todayEvents, tomorrowEvents, upcomingEvents } = useMemo(() => {
    const todayList: CalendarEvent[] = []
    const tomorrowList: CalendarEvent[] = []
    const upcomingList: CalendarEvent[] = []

    // Sort by date then start time
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      const aT = a.startTime || "00:00"
      const bT = b.startTime || "00:00"
      return aT.localeCompare(bT)
    })

    for (const ev of sorted) {
      if (hiddenCategories.has(ev.type?.toLowerCase())) continue
      const d = ev.date.slice(0, 10)
      if (d === todayIso) {
        todayList.push(ev)
      } else if (d === tomorrowIso) {
        tomorrowList.push(ev)
      } else if (d > tomorrowIso && d <= nextWeekIso) {
        upcomingList.push(ev)
      }
    }

    return {
      todayEvents: todayList,
      tomorrowEvents: tomorrowList,
      upcomingEvents: upcomingList,
    }
  }, [events, todayIso, tomorrowIso, nextWeekIso, hiddenCategories])

  // Category summary for checkboxes
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const ev of events) {
      const type = ev.type || "General"
      map.set(type, (map.get(type) || 0) + 1)
    }
    return Array.from(map.entries())
  }, [events])

  if (!isOpen) return null

  const handleMiniPrev = () => {
    if (miniMonth === 1) {
      setMiniYear((y) => y - 1)
      setMiniMonth(12)
    } else {
      setMiniMonth((m) => m - 1)
    }
  }

  const handleMiniNext = () => {
    if (miniMonth === 12) {
      setMiniYear((y) => y + 1)
      setMiniMonth(1)
    } else {
      setMiniMonth((m) => m + 1)
    }
  }

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-72 sm:w-80 flex flex-col bg-[var(--sq-paper)] text-[var(--sq-ink)] border-l border-[var(--sq-border)] shadow-xl select-none animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <ListBullets size={16} weight="bold" />
          <span>Agenda & Date Navigator</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
          title="Close drawer"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 text-xs">
        {/* 1. Mini Month Calendar */}
        <div className="rounded-md border border-[var(--sq-border)] p-2.5 bg-[var(--sq-paper)] shadow-2xs">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs">
              {formatMonthYear(miniYear, miniMonth)}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleMiniPrev}
                className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
                title="Previous month"
              >
                <CaretLeft size={13} />
              </button>
              <button
                type="button"
                onClick={handleMiniNext}
                className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
                title="Next month"
              >
                <CaretRight size={13} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold opacity-60 mb-1">
            {weekStartsOn === "monday"
              ? ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))
              : ["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
            {monthGrid.map((cell) => {
              const isSelected = cell.date === selectedDate
              const hasEvents = datesWithEvents.has(cell.date)

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => onSelectDate(cell.date)}
                  className={cn(
                    "h-6 w-6 mx-auto rounded-full flex flex-col items-center justify-center relative transition-colors",
                    !cell.isCurrentMonth && "opacity-30",
                    isSelected
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] font-bold shadow-xs"
                      : cell.isToday
                        ? "border border-[var(--sq-ink)] font-bold"
                        : "hover:bg-[var(--sq-shade)]"
                  )}
                >
                  <span>{cell.dayNumber}</span>
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--sq-ink)] opacity-70" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Category Visibility Layers */}
        {categoryCounts.length > 0 && (
          <div className="rounded-md border border-[var(--sq-border)] p-2.5 bg-[var(--sq-paper)] shadow-2xs">
            <div className="font-bold text-[11px] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag size={13} />
                <span>Categories</span>
              </span>
              <span className="text-[10px] opacity-60">
                {categoryCounts.length} active
              </span>
            </div>

            <div className="space-y-1.5">
              {categoryCounts.map(([catName, count]) => {
                const isHidden = hiddenCategories.has(catName.toLowerCase())
                return (
                  <label
                    key={catName}
                    className="flex items-center justify-between text-[11px] cursor-pointer hover:bg-[var(--sq-shade)]/50 p-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => onToggleCategory(catName.toLowerCase())}
                        className="rounded border-[var(--sq-border)] cursor-pointer"
                      />
                      <span className={cn(isHidden && "opacity-40 line-through")}>
                        {catName}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-60 font-mono">
                      {count}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. Upcoming Agenda List */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Today Group */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider opacity-80">
                Today
              </span>
              <button
                type="button"
                onClick={() => onNewEventAtDate(todayIso)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <div className="p-2 text-center text-[11px] opacity-50 border border-dashed border-[var(--sq-border)] rounded">
                No events today
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayEvents.map((ev) => (
                  <AgendaItem
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tomorrow Group */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider opacity-80">
                Tomorrow
              </span>
              <button
                type="button"
                onClick={() => onNewEventAtDate(tomorrowIso)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add
              </button>
            </div>

            {tomorrowEvents.length === 0 ? (
              <div className="p-2 text-center text-[11px] opacity-50 border border-dashed border-[var(--sq-border)] rounded">
                No events tomorrow
              </div>
            ) : (
              <div className="space-y-1.5">
                {tomorrowEvents.map((ev) => (
                  <AgendaItem
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Group */}
          {upcomingEvents.length > 0 && (
            <div>
              <div className="font-bold text-[11px] uppercase tracking-wider opacity-80 mb-1.5">
                Later this week
              </div>
              <div className="space-y-1.5">
                {upcomingEvents.map((ev) => (
                  <AgendaItem
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    onToggleComplete={() => onToggleComplete(ev.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgendaItem({
  event,
  onClick,
  onToggleComplete,
}: {
  event: CalendarEvent
  onClick: () => void
  onToggleComplete: () => void
}) {
  const isCompleted = event.status === "completed"
  const colorPreset = CALENDAR_COLORS.find((c) => c.id === event.color) || CALENDAR_COLORS[0]

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-2 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:border-[var(--sq-ink)] flex items-start gap-2 cursor-pointer transition-all",
        isCompleted && "opacity-60 bg-[var(--sq-shade)]/30"
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: colorPreset.hex,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleComplete()
        }}
        className={cn(
          "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
          isCompleted
            ? "bg-emerald-600 text-white border-emerald-700"
            : "border-[var(--sq-border)] hover:border-[var(--sq-ink)]"
        )}
      >
        {isCompleted && <CheckCircle size={12} weight="fill" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-semibold text-xs truncate",
            isCompleted && "line-through"
          )}
        >
          {event.title}
        </div>
        <div className="text-[10px] opacity-70 flex items-center gap-1.5 mt-0.5">
          <Clock size={10} />
          <span>
            {event.isAllDay ? "All Day" : event.startTime || "Timed"}
          </span>
          {event.location && (
            <span className="truncate flex items-center gap-0.5">
              • <MapPin size={9} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
