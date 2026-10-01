"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Root Interactive Canvas Component
//
// Production-grade interactive calendar supporting Month & Week display modes,
// event creation/editing, drag-and-drop rescheduling, duration resizing,
// offline IndexedDB persistence, and academic planner synchronization.
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from "react"
import type { ComponentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import {
  parseDateIso,
  formatMonthYear,
  addMonths,
  addWeeksIso,
  getTodayIso,
  type WeekStartsOn,
} from "@/lib/calendar/date-utils"
import { expandRecurringEvents } from "@/lib/calendar/layout"
import { useCalendarEvents } from "@/lib/calendar/event-store"
import type { CalendarEvent, CalendarView } from "@/lib/calendar/types"
import { CalendarHeader } from "./calendar-header"
import { CalendarMonthView } from "./calendar-month-view"
import { CalendarWeekView } from "./calendar-week-view"
import { CalendarEventEditor } from "./calendar-event-editor"

export interface FunctionalCalendarProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

export function FunctionalCalendar({ node, selected, zoom }: FunctionalCalendarProps) {
  const props = node.props || {}
  const nodeWidth = node.w
  const nodeHeight = node.h

  // Synchronize view mode with node props (persists across document reloads)
  const initialView = (props.view as CalendarView) || "month"
  const [view, setView] = useState<CalendarView>(initialView)

  // Current selected & navigated date
  const todayIso = useMemo(() => getTodayIso(), [])
  const initialSelected = (props.selectedDate as string) || todayIso
  const [selectedDate, setSelectedDate] = useState<string>(initialSelected)

  const { year: currentYear, month: currentMonth } = useMemo(
    () => parseDateIso(selectedDate),
    [selectedDate]
  )
  const [navYear, setNavYear] = useState<number>(currentYear)
  const [navMonth, setNavMonth] = useState<number>(currentMonth)

  // Filtering & search state
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Event modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [slotDate, setSlotDate] = useState<string>(todayIso)
  const [slotStartTime, setSlotStartTime] = useState<string>("09:00")

  // Calendar configuration options from props
  const weekStartsOn = ((props.weekStartsOn as string) || "sunday") as WeekStartsOn
  const startHour = typeof props.startHour === "number" ? props.startHour : 7
  const endHour = typeof props.endHour === "number" ? props.endHour : 21
  const timeFormat = (props.timeFormat as "12h" | "24h") || "12h"

  // Unified event store (reads and updates student store, planner tasks, & IndexedDB)
  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    resizeEvent,
    toggleComplete,
  } = useCalendarEvents()

  // Filter & Search events
  const filteredEvents = useMemo(() => {
    let result = events

    // 1. Category Filter
    if (filterType !== "all") {
      result = result.filter(
        (e) => e.type?.toLowerCase() === filterType.toLowerCase()
      )
    }

    // 2. Text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      )
    }

    // 3. Expand Recurring Events across visible boundary (+/- 2 months)
    const rangeStart = `${navYear - 1}-01-01`
    const rangeEnd = `${navYear + 1}-12-31`
    return expandRecurringEvents(result, rangeStart, rangeEnd)
  }, [events, filterType, searchQuery, navYear])

  // View mode switcher: saves to node.props for canvas persistence
  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      setView(newView)
      useSquig.getState().updateNode(node.id, {
        props: { ...node.props, view: newView },
      })
    },
    [node.id, node.props]
  )

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (view === "month") {
      const { year: nextY, month: nextM } = addMonths(navYear, navMonth, -1)
      setNavYear(nextY)
      setNavMonth(nextM)
    } else {
      const prevWeekIso = addWeeksIso(selectedDate, -1)
      setSelectedDate(prevWeekIso)
      const { year: py, month: pm } = parseDateIso(prevWeekIso)
      setNavYear(py)
      setNavMonth(pm)
    }
  }, [view, navYear, navMonth, selectedDate])

  const handleNext = useCallback(() => {
    if (view === "month") {
      const { year: nextY, month: nextM } = addMonths(navYear, navMonth, 1)
      setNavYear(nextY)
      setNavMonth(nextM)
    } else {
      const nextWeekIso = addWeeksIso(selectedDate, 1)
      setSelectedDate(nextWeekIso)
      const { year: ny, month: nm } = parseDateIso(nextWeekIso)
      setNavYear(ny)
      setNavMonth(nm)
    }
  }, [view, navYear, navMonth, selectedDate])

  const handleToday = useCallback(() => {
    const today = getTodayIso()
    setSelectedDate(today)
    const { year: ty, month: tm } = parseDateIso(today)
    setNavYear(ty)
    setNavMonth(tm)
  }, [])

  // Date selection
  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date)
    const { year: y, month: m } = parseDateIso(date)
    setNavYear(y)
    setNavMonth(m)
  }, [])

  // Event modal actions
  const handleOpenNewEvent = useCallback((date?: string, startTime?: string) => {
    setEditingEvent(null)
    setSlotDate(date || selectedDate || getTodayIso())
    setSlotStartTime(startTime || "09:00")
    setIsEditorOpen(true)
  }, [selectedDate])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setIsEditorOpen(true)
  }, [])

  const handleSaveEvent = useCallback(
    (data: Partial<CalendarEvent>) => {
      if (editingEvent) {
        updateEvent(editingEvent.id, data)
      } else {
        createEvent({
          title: data.title || "New Event",
          date: data.date || slotDate,
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes || 60,
          isAllDay: data.isAllDay ?? false,
          type: data.type || "Study",
          priority: data.priority || "Medium",
          description: data.description,
          location: data.location,
          recurrence: data.recurrence || "none",
          status: data.status || "pending",
        })
      }
      setIsEditorOpen(false)
    },
    [editingEvent, slotDate, createEvent, updateEvent]
  )

  const handleDeleteEvent = useCallback(
    (id: string) => {
      deleteEvent(id)
      setIsEditorOpen(false)
    },
    [deleteEvent]
  )

  return (
    <div
      className="w-full h-full flex flex-col rounded-md overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)]"
      style={{
        boxShadow: selected ? "0 0 0 1px var(--sq-ink), 3px 3px 0px rgba(0,0,0,0.08)" : "2px 2px 0px rgba(0,0,0,0.06)",
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        // Prevent keyboard shortcuts when focused on inputs or textareas
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
          return
        }

        if (e.key === "t" || e.key === "T") {
          e.stopPropagation()
          handleToday()
        } else if (e.key === "m" || e.key === "M") {
          e.stopPropagation()
          handleViewChange("month")
        } else if (e.key === "w" || e.key === "W") {
          e.stopPropagation()
          handleViewChange("week")
        } else if (e.key === "n" || e.key === "N") {
          e.stopPropagation()
          handleOpenNewEvent()
        } else if (e.key === "ArrowLeft") {
          e.stopPropagation()
          handlePrev()
        } else if (e.key === "ArrowRight") {
          e.stopPropagation()
          handleNext()
        }
      }}
    >
      {/* 1. Header Toolbar */}
      <CalendarHeader
        title={formatMonthYear(navYear, navMonth)}
        view={view}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        filterType={filterType}
        onFilterChange={setFilterType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewEvent={() => handleOpenNewEvent()}
        nodeWidth={nodeWidth}
      />

      {/* 2. Main Viewport (Month or Week) */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {view === "month" ? (
          <CalendarMonthView
            year={navYear}
            month={navMonth}
            weekStartsOn={weekStartsOn}
            selectedDate={selectedDate}
            events={filteredEvents}
            onSelectDate={handleSelectDate}
            onEventClick={handleEditEvent}
            onToggleComplete={toggleComplete}
            onMoveEvent={(id, newDate) => moveEvent(id, newDate)}
            onNewEventAtDate={(d) => handleOpenNewEvent(d)}
            nodeWidth={nodeWidth}
            nodeHeight={nodeHeight}
          />
        ) : (
          <CalendarWeekView
            referenceDate={selectedDate}
            weekStartsOn={weekStartsOn}
            startHour={startHour}
            endHour={endHour}
            timeFormat={timeFormat}
            events={filteredEvents}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onEventClick={handleEditEvent}
            onToggleComplete={toggleComplete}
            onMoveEvent={(id, newDate, newS, newE) => moveEvent(id, newDate, newS, newE)}
            onResizeEvent={(id, newEndTime) => resizeEvent(id, newEndTime)}
            onNewEventAtSlot={(d, sT) => handleOpenNewEvent(d, sT)}
            nodeWidth={nodeWidth}
            nodeHeight={nodeHeight}
          />
        )}
      </div>

      {/* 3. Event Editor Modal */}
      <CalendarEventEditor
        isOpen={isEditorOpen}
        event={editingEvent}
        initialDate={slotDate}
        initialStartTime={slotStartTime}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setIsEditorOpen(false)}
      />
    </div>
  )
}
