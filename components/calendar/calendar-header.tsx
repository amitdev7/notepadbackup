"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Header & Navigation Controls
//
// Clean toolbar with view switcher (MONTH | WEEK), navigation, category
// filters, search, and a dedicated drag-handle for canvas positioning.
// ---------------------------------------------------------------------------

import { useState, useRef } from "react"
import type { CalendarView } from "@/lib/calendar/types"
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  Plus,
  MagnifyingGlass,
  X,
  DotsSixVertical,
  CalendarBlank,
  Funnel,
  ListBullets,
  DownloadSimple,
  UploadSimple,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  title: string
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  filterType: string
  onFilterChange: (type: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onNewEvent: () => void
  nodeWidth: number
  onTitleClick?: () => void
  onToggleAgenda?: () => void
  isAgendaOpen?: boolean
  onExportIcs?: () => void
  onImportIcs?: (content: string) => void
  onClearAll?: () => void
  eventsCount?: number
}

const FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "Study", label: "Study" },
  { value: "Assignment", label: "Assignments" },
  { value: "Exam", label: "Exams" },
  { value: "Revision", label: "Revision" },
  { value: "Practice", label: "Practice" },
  { value: "Homework", label: "Homework" },
  { value: "Personal", label: "Personal" },
  { value: "Other", label: "Other" },
]

export function CalendarHeader({
  title,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  filterType,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onNewEvent,
  nodeWidth,
  onTitleClick,
  onToggleAgenda,
  isAgendaOpen,
  onExportIcs,
  onImportIcs,
  onClearAll,
  eventsCount,
}: CalendarHeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const isCompact = nodeWidth < 600
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text && onImportIcs) {
        onImportIcs(text)
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col border-b border-[var(--sq-border)] bg-[var(--sq-paper)] select-none">
      {/* Hidden file input for .ics import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top drag handle & title row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--sq-border)]/60 bg-[var(--sq-shade)]/30">
        {/* Left: Drag Handle, Clickable Title, Agenda Button */}
        <div className="flex items-center gap-2">
          {/* Canvas Drag Handle: user can drag node from here */}
          <div
            data-node-drag-handle="true"
            className="cursor-move p-0.5 rounded text-[var(--sq-ink)] opacity-40 hover:opacity-100 transition-opacity"
            title="Drag to reposition calendar on canvas"
          >
            <DotsSixVertical size={16} weight="bold" />
          </div>

          {/* Windows-style clickable Month/Year title */}
          <button
            type="button"
            onClick={onTitleClick}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--sq-shade)] transition-colors cursor-pointer text-left"
            title="Click to jump to another month or year"
          >
            <CalendarBlank size={16} weight="bold" className="text-[var(--sq-ink)] shrink-0" />
            <h1 className="text-sm font-bold tracking-tight text-[var(--sq-ink)]">
              {title}
            </h1>
            <CaretDown size={11} weight="bold" className="opacity-60" />
          </button>

          {/* Agenda / Mini-Calendar Toggle Button */}
          {onToggleAgenda && (
            <button
              type="button"
              onClick={onToggleAgenda}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                isAgendaOpen
                  ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)] font-bold shadow-2xs"
                  : "border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
              )}
              title="Toggle Agenda & Date Navigator"
            >
              <ListBullets size={13} weight="bold" />
              {!isCompact && <span>Agenda</span>}
            </button>
          )}
        </div>

        {/* Right: View Mode Toggle (MONTH | WEEK | DAY | AGENDA) */}
        <div className="flex items-center p-0.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)]">
          {(["month", "week", "day", "agenda"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-xs uppercase transition-colors cursor-pointer",
                view === mode
                  ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-xs"
                  : "text-[var(--sq-ink)] opacity-70 hover:opacity-100 hover:bg-[var(--sq-shade)]"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sub toolbar: Navigation, Filters, Search, +New Event */}
      <div className="flex items-center justify-between px-3 py-1.5 gap-2 text-xs flex-wrap">
        {/* Left Navigation: Prev, Next, Today */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
            title="Previous"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
            title="Next"
          >
            <CaretRight size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="px-2 py-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] font-semibold transition-colors text-[11px]"
          >
            Today
          </button>
        </div>

        {/* Right Tools: Filter, Search, New Event */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          {!isCompact && (
            <div className="flex items-center gap-1">
              <Funnel size={13} className="opacity-60" />
              <select
                value={filterType}
                onChange={(e) => onFilterChange(e.target.value)}
                className="px-2 py-1 rounded text-[11px] border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[var(--sq-ink)] font-medium focus:outline-hidden"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Bar */}
          {showSearch ? (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search events..."
                autoFocus
                className="w-32 sm:w-44 pl-2 pr-6 py-0.5 text-xs rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[var(--sq-ink)] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchChange("")
                  setShowSearch(false)
                }}
                className="absolute right-1 p-0.5 opacity-60 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] opacity-80 hover:opacity-100 transition-colors"
              title="Search events"
            >
              <MagnifyingGlass size={13} weight="bold" />
            </button>
          )}

          {/* iCalendar Export & Import */}
          {onExportIcs && (
            <button
              type="button"
              onClick={onExportIcs}
              className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] opacity-80 hover:opacity-100 transition-colors"
              title="Export calendar to .ics (Outlook / Google Calendar / Apple)"
            >
              <DownloadSimple size={13} weight="bold" />
            </button>
          )}

          {onImportIcs && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] opacity-80 hover:opacity-100 transition-colors"
              title="Import .ics calendar file"
            >
              <UploadSimple size={13} weight="bold" />
            </button>
          )}

          {/* Clear All Events with confirmation dialog */}
          {onClearAll && eventsCount !== undefined && eventsCount > 0 && (
            <div className="relative">
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/40 bg-red-50 dark:bg-red-950/60 animate-in fade-in duration-100">
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                    Clear all {eventsCount}?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll()
                      setShowClearConfirm(false)
                    }}
                    className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-1.5 py-0.5 rounded border border-[var(--sq-border)] text-[10px] font-medium hover:bg-[var(--sq-shade)] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-[var(--sq-ink)] opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                  title={`Clear all ${eventsCount} events`}
                  aria-label="Clear all calendar events"
                >
                  <Trash size={13} weight="bold" />
                </button>
              )}
            </div>
          )}

          {/* New Event Button */}
          <button
            type="button"
            onClick={onNewEvent}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--sq-ink)] text-[var(--sq-paper)] font-semibold text-[11px] hover:opacity-90 shadow-xs transition-opacity"
          >
            <Plus size={13} weight="bold" />
            <span>Event</span>
          </button>
        </div>
      </div>
    </div>
  )
}
