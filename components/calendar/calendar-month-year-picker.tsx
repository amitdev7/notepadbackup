"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Month & Year Decade Jump Picker
//
// Fast navigation dialog allowing users to jump across years, decades,
// and months with a single tap, inspired by the Windows calendar flyout.
// ---------------------------------------------------------------------------

import { useState } from "react"
import {
  CaretLeft,
  CaretRight,
  X,
  CalendarCheck,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface MonthYearPickerProps {
  isOpen: boolean
  currentYear: number
  currentMonth: number
  onSelect: (year: number, month: number) => void
  onClose: () => void
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export function CalendarMonthYearPicker({
  isOpen,
  currentYear,
  currentMonth,
  onSelect,
  onClose,
}: MonthYearPickerProps) {
  // Mode: "months" (picking month within year) or "years" (picking year within decade)
  const [mode, setMode] = useState<"months" | "years">("months")
  const [pickerYear, setPickerYear] = useState<number>(currentYear)

  if (!isOpen) return null

  // Calculate 12-year decade window (e.g. 2020 - 2031)
  const decadeStart = Math.floor(pickerYear / 10) * 10
  const decadeYears: number[] = []
  for (let y = decadeStart - 1; y <= decadeStart + 10; y++) {
    decadeYears.push(y)
  }

  const handlePrev = () => {
    if (mode === "months") {
      setPickerYear((prev) => prev - 1)
    } else {
      setPickerYear((prev) => prev - 10)
    }
  }

  const handleNext = () => {
    if (mode === "months") {
      setPickerYear((prev) => prev + 1)
    } else {
      setPickerYear((prev) => prev + 10)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Month and year picker"
        className="w-full max-w-xs rounded-2xl border border-[var(--sq-border)] bg-[var(--sq-paper)] p-4 shadow-xl text-[var(--sq-ink)] animate-popover-enter"
        style={{
          boxShadow: "0 10px 30px rgba(0,0,0,0.18), 3px 3px 0px rgba(0,0,0,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sq-border)]">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <CalendarCheck size={18} weight="bold" />
            <button
              type="button"
              onClick={() => setMode(mode === "months" ? "years" : "months")}
              className="px-2 py-0.5 rounded hover:bg-[var(--sq-shade)] transition-colors underline decoration-dotted underline-offset-2"
            >
              {mode === "months"
                ? pickerYear
                : `${decadeStart} – ${decadeStart + 9}`}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
              title="Previous"
            >
              <CaretLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
              title="Next"
            >
              <CaretRight size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 ml-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Months Grid (3 columns x 4 rows) */}
        {mode === "months" && (
          <div className="grid grid-cols-3 gap-2 pt-3">
            {MONTH_NAMES.map((name, index) => {
              const monthNum = index + 1
              const isSelected =
                pickerYear === currentYear && monthNum === currentMonth

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSelect(pickerYear, monthNum)
                    onClose()
                  }}
                  className={cn(
                    "py-2.5 px-1 rounded text-xs font-semibold text-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-xs scale-105"
                      : "hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {/* Decade Years Grid (3 columns x 4 rows) */}
        {mode === "years" && (
          <div className="grid grid-cols-3 gap-2 pt-3">
            {decadeYears.map((yr) => {
              const isSelected = yr === currentYear
              const isOutOfDecade = yr < decadeStart || yr > decadeStart + 9

              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setPickerYear(yr)
                    setMode("months")
                  }}
                  className={cn(
                    "py-2.5 px-1 rounded text-xs font-semibold text-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-xs scale-105"
                      : isOutOfDecade
                        ? "text-[var(--sq-muted)] hover:bg-[var(--sq-shade)] opacity-60"
                        : "hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
                  )}
                >
                  {yr}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
