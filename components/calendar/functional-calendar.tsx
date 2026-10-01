"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Root Interactive Canvas Component
//
// Production-grade interactive calendar supporting Month & Week display modes,
// event creation/editing, drag-and-drop rescheduling, duration resizing,
// Windows-style Month/Year decade jump picker, Android-style Event Peek Card,
// Collapsible Agenda & Mini-Calendar side drawer, RFC 5545 iCalendar sync,
// offline Web Audio API reminder chime, and academic planner synchronization.
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback, useEffect } from "react"
import type { ComponentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import {
  parseDateIso,
  formatMonthYear,
  addMonths,
  addWeeksIso,
  getTodayIso,
  parseTimeToMinutes,
  type WeekStartsOn,
} from "@/lib/calendar/date-utils"
import { expandRecurringEvents } from "@/lib/calendar/layout"
import { useCalendarEvents } from "@/lib/calendar/event-store"
import type { CalendarEvent, CalendarView } from "@/lib/calendar/types"
import { exportToIcs, downloadIcsFile, parseIcs } from "@/lib/calendar/ics"

import { CalendarHeader } from "./calendar-header"
import { CalendarMonthView } from "./calendar-month-view"
import { CalendarWeekView } from "./calendar-week-view"
import { CalendarEventEditor } from "./calendar-event-editor"
import { CalendarMonthYearPicker } from "./calendar-month-year-picker"
import { CalendarEventCard } from "./calendar-event-card"
import { CalendarAgendaDrawer } from "./calendar-agenda-drawer"
import { CalendarReminderToast } from "./calendar-reminder-toast"

export interface FunctionalCalendarProps {
  node: ComponentNode
  selected: boolean
  zoom: number
}

export function FunctionalCalendar({ node, selected, zoom: _zoom }: FunctionalCalendarProps) {
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
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  // Event modal & peek state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [peekEvent, setPeekEvent] = useState<CalendarEvent | null>(null)
  const [slotDate, setSlotDate] = useState<string>(todayIso)
  const [slotStartTime, setSlotStartTime] = useState<string>("09:00")

  // Windows & Android feature dialogs
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isAgendaOpen, setIsAgendaOpen] = useState(false)

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

  // Real-time reminder monitoring
  const [activeReminder, setActiveReminder] = useState<{
    event: CalendarEvent
    minutesBefore: number
  } | null>(null)
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set())

  // Periodic reminder checking interval (every 30 seconds)
  useEffect(() => {
    const checkReminders = () => {
      if (typeof window === "undefined") return
      const now = new Date()
      const currentIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      for (const ev of events) {
        if (ev.status === "completed") continue
        if (typeof ev.reminderMinutes !== "number" || ev.reminderMinutes < 0) continue

        const reminderKey = `${ev.id}_${ev.date}_${ev.reminderMinutes}`
        if (dismissedReminders.has(reminderKey)) continue

        if (ev.date === currentIso) {
          let eventStartMinutes = 9 * 60 // Default 9 AM for all-day
          if (ev.startTime) {
            eventStartMinutes = parseTimeToMinutes(ev.startTime)
          }

          const diffMinutes = eventStartMinutes - currentMinutes
          // Trigger reminder if within configured window (e.g. 10m before) and not past by more than 15m
          if (diffMinutes <= ev.reminderMinutes && diffMinutes >= -15) {
            setActiveReminder({ event: ev, minutesBefore: ev.reminderMinutes })
            break
          }
        }
      }
    }

    const intervalId = window.setInterval(checkReminders, 30000)
    checkReminders()

    return () => window.clearInterval(intervalId)
  }, [events, dismissedReminders])

  // Category toggle handler for Agenda drawer
  const handleToggleCategory = useCallback((cat: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  // Filter & Search events
  const filteredEvents = useMemo(() => {
    let result = events

    // 1. Hidden Category Filter (from Agenda drawer)
    if (hiddenCategories.size > 0) {
      result = result.filter(
        (e) => !e.type || !hiddenCategories.has(e.type)
      )
    }

    // 2. Category Filter (from Header dropdown)
    if (filterType !== "all") {
      result = result.filter(
        (e) => e.type?.toLowerCase() === filterType.toLowerCase()
      )
    }

    // 3. Text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      )
    }

    // 4. Expand Recurring Events across visible boundary (+/- 2 months)
    const rangeStart = `${navYear - 1}-01-01`
    const rangeEnd = `${navYear + 1}-12-31`
    return expandRecurringEvents(result, rangeStart, rangeEnd)
  }, [events, hiddenCategories, filterType, searchQuery, navYear])

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

  const handleEditFromPeek = useCallback((event: CalendarEvent) => {
    setPeekEvent(null)
    setEditingEvent(event)
    setIsEditorOpen(true)
  }, [])

  const handleDuplicateEvent = useCallback(
    (event: CalendarEvent) => {
      createEvent({
        title: `${event.title} (Copy)`,
        date: event.date,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        durationMinutes: event.durationMinutes || 60,
        isAllDay: event.isAllDay ?? false,
        type: event.type || "Study",
        priority: event.priority || "Medium",
        description: event.description,
        location: event.location,
        url: event.url,
        recurrence: event.recurrence || "none",
        status: "pending",
        color: event.color || "blue",
        reminderMinutes: event.reminderMinutes,
      })
      setPeekEvent(null)
    },
    [createEvent]
  )

  const handleSaveEvent = useCallback(
    (data: Partial<CalendarEvent>) => {
      if (editingEvent) {
        updateEvent(editingEvent.id, data)
      } else {
        createEvent({
          title: data.title || "New Event",
          date: data.date || slotDate,
          endDate: data.endDate,
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes: data.durationMinutes || 60,
          isAllDay: data.isAllDay ?? false,
          type: data.type || "Study",
          priority: data.priority || "Medium",
          description: data.description,
          location: data.location,
          url: data.url,
          recurrence: data.recurrence || "none",
          status: data.status || "pending",
          color: data.color || "blue",
          reminderMinutes: data.reminderMinutes,
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
      setPeekEvent(null)
    },
    [deleteEvent]
  )

  // RFC 5545 iCalendar Export & Import
  const handleExportIcs = useCallback(() => {
    const icsContent = exportToIcs(events)
    downloadIcsFile("zenithsui-calendar.ics", icsContent)
  }, [events])

  const handleImportIcs = useCallback(
    (icsContent: string) => {
      try {
        const parsed = parseIcs(icsContent)
        if (!parsed.length) return
        for (const item of parsed) {
          if (item.title && item.date) {
            createEvent({
              title: item.title,
              date: item.date,
              endDate: item.endDate,
              startTime: item.startTime,
              endTime: item.endTime,
              durationMinutes: item.durationMinutes || 60,
              isAllDay: item.isAllDay ?? false,
              type: item.type || "Study",
              priority: item.priority || "Medium",
              description: item.description,
              location: item.location,
              recurrence: item.recurrence || "none",
              status: item.status || "pending",
              color: item.color || "blue",
              reminderMinutes: item.reminderMinutes,
            })
          }
        }
      } catch (err) {
        console.error("Failed to import iCalendar file:", err)
      }
    },
    [createEvent]
  )

  return (
    <div
      className="w-full h-full flex flex-col rounded-md overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)] relative"
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
        onTitleClick={() => setIsPickerOpen(true)}
        onToggleAgenda={() => setIsAgendaOpen((prev) => !prev)}
        isAgendaOpen={isAgendaOpen}
        onExportIcs={handleExportIcs}
        onImportIcs={handleImportIcs}
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
            onEventClick={(ev) => setPeekEvent(ev)}
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
            onEventClick={(ev) => setPeekEvent(ev)}
            onToggleComplete={toggleComplete}
            onMoveEvent={(id, newDate, newS, newE) => moveEvent(id, newDate, newS, newE)}
            onResizeEvent={(id, newEndTime) => resizeEvent(id, newEndTime)}
            onNewEventAtSlot={(d, sT) => handleOpenNewEvent(d, sT)}
            nodeWidth={nodeWidth}
            nodeHeight={nodeHeight}
          />
        )}

        {/* 3. Collapsible Agenda & Mini-Calendar Side Drawer */}
        <CalendarAgendaDrawer
          isOpen={isAgendaOpen}
          onClose={() => setIsAgendaOpen(false)}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onEventClick={(ev) => setPeekEvent(ev)}
          onToggleComplete={toggleComplete}
          onNewEventAtDate={(d) => handleOpenNewEvent(d)}
          hiddenCategories={hiddenCategories}
          onToggleCategory={handleToggleCategory}
          weekStartsOn={weekStartsOn}
        />
      </div>

      {/* 4. Windows-Style Month & Year Quick Jump Picker */}
      <CalendarMonthYearPicker
        isOpen={isPickerOpen}
        currentYear={navYear}
        currentMonth={navMonth}
        onSelect={(y, m) => {
          setNavYear(y)
          setNavMonth(m)
          setIsPickerOpen(false)
        }}
        onClose={() => setIsPickerOpen(false)}
      />

      {/* 5. Android/Windows Event Details Peek Card */}
      <CalendarEventCard
        event={peekEvent}
        isOpen={!!peekEvent}
        onClose={() => setPeekEvent(null)}
        onEdit={handleEditFromPeek}
        onToggleComplete={(id) => {
          toggleComplete(id)
          if (peekEvent && peekEvent.id === id) {
            setPeekEvent({
              ...peekEvent,
              status: peekEvent.status === "completed" ? "pending" : "completed",
            })
          }
        }}
        onDuplicate={handleDuplicateEvent}
        onDelete={handleDeleteEvent}
      />

      {/* 6. Event Editor Modal */}
      <CalendarEventEditor
        isOpen={isEditorOpen}
        event={editingEvent}
        initialDate={slotDate}
        initialStartTime={slotStartTime}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onClose={() => setIsEditorOpen(false)}
      />

      {/* 7. Real-Time Reminder Toast & Offline Chime */}
      <CalendarReminderToast
        event={activeReminder?.event || null}
        minutesBefore={activeReminder?.minutesBefore || 0}
        onDismiss={() => {
          if (activeReminder) {
            setDismissedReminders((prev) =>
              new Set(prev).add(
                `${activeReminder.event.id}_${activeReminder.event.date}_${activeReminder.minutesBefore}`
              )
            )
            setActiveReminder(null)
          }
        }}
        onView={(ev) => {
          setPeekEvent(ev)
          setActiveReminder(null)
        }}
      />
    </div>
  )
}
