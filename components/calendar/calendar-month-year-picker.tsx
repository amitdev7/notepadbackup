"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Windows-Style Month & Year Quick Jump Picker
//
// Fast date jumping matching Windows Calendar:
// Clicking the month title opens a 12-month grid with decade navigation.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { CaretLeft, CaretRight, X, CalendarCheck } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface MonthYearPickerProps {
  isOpen: boolean
  currentYear: number
  currentMonth: number // 1-indexed (1..12)
  onSelect: (year: number, month: number) => void
  onClose: () => void
}

const MONTHS_SHORT = [
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
    >
      <div
        className="w-full max-w-xs rounded-lg border border-[var(--sq-border)] bg-[var(--sq-paper)] p-4 shadow-xl text-[var(--sq-ink)]"
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

        {/* Picker Grid */}
        <div className="pt-3">
          {mode === "months" ? (
            <div className="grid grid-cols-4 gap-2">
              {MONTHS_SHORT.map((mName, idx) => {
                const monthNum = idx + 1
                const isSelected =
                  pickerYear === currentYear && monthNum === currentMonth
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      onSelect(pickerYear, monthNum)
                    }}
                    className={cn(
                      "py-2.5 text-xs font-semibold rounded transition-colors text-center border",
                      isSelected
                        ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)] shadow-xs"
                        : "border-transparent hover:border-[var(--sq-border)] hover:bg-[var(--sq-shade)]"
                    )}
                  >
                    {mName}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {decadeYears.map((yr) => {
                const isCurrent = yr === currentYear
                const isOut = yr < decadeStart || yr > decadeStart + 9
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setPickerYear(yr)
                      setMode("months")
                    }}
                    className={cn(
                      "py-2.5 text-xs font-semibold rounded transition-colors text-center border",
                      isCurrent
                        ? "bg-[var(--sq-ink)] text-[var(--sq-paper)] border-[var(--sq-ink)] shadow-xs"
                        : isOut
                          ? "opacity-40 border-transparent hover:bg-[var(--sq-shade)]"
                          : "border-transparent hover:border-[var(--sq-border)] hover:bg-[var(--sq-shade)]"
                    )}
                  >
                    {yr}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Quick Return */}
        <div className="mt-3 pt-2.5 border-t border-[var(--sq-border)] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              onSelect(now.getFullYear(), now.getMonth() + 1)
            }}
            className="text-xs font-medium text-[var(--sq-ink)] hover:underline"
          >
            Jump to current month
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--sq-border)] hover:bg-[var(--sq-shade)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
