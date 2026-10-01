"use client"

// ---------------------------------------------------------------------------
// Zenithsui Calendar — Real-time Event Reminder Toast & Notification
//
// Matches Windows Action Center and Android notifications:
// Triggers visual banner + synthesised audio chime when an event is due.
// ---------------------------------------------------------------------------

import { useEffect } from "react"
import type { CalendarEvent } from "@/lib/calendar/types"
import { Bell, Clock, X, Eye } from "@phosphor-icons/react"

interface ReminderToastProps {
  event: CalendarEvent | null
  minutesBefore: number
  onDismiss: () => void
  onView: (event: CalendarEvent) => void
}

/**
 * Synthesizes a subtle, pleasant calendar notification chime using Web Audio API.
 * 100% offline, requires no external sound files.
 */
function playChime() {
  try {
    if (typeof window === "undefined") return
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880.0, now + 0.12) // A5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.45)
  } catch {}
}

export function CalendarReminderToast({
  event,
  minutesBefore,
  onDismiss,
  onView,
}: ReminderToastProps) {
  useEffect(() => {
    if (!event) return
    playChime()

    // Trigger browser native Notification if permission granted
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const timeText = event.startTime
          ? `Starting at ${event.startTime}`
          : "All Day event"
        new Notification(`Reminder: ${event.title}`, {
          body: `${timeText}${event.location ? ` • ${event.location}` : ""}`,
          icon: "/icon.svg",
        })
      } catch {}
    }
  }, [event])

  if (!event) return null

  return (
    <div className="absolute bottom-4 right-4 z-50 max-w-sm rounded-lg border border-[var(--sq-border)] bg-[var(--sq-paper)] p-3 shadow-2xl text-[var(--sq-ink)] animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
          <Bell size={18} weight="fill" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
              {minutesBefore === 0
                ? "Starting Now"
                : `In ${minutesBefore} minutes`}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="p-0.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors opacity-70 hover:opacity-100"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <h4 className="font-bold text-xs truncate mt-0.5">{event.title}</h4>

          <div className="flex items-center gap-1.5 text-[10px] opacity-70 mt-0.5">
            <Clock size={11} />
            <span>
              {event.isAllDay ? "All Day" : event.startTime || "Scheduled"}
            </span>
            {event.location && (
              <span className="truncate">• {event.location}</span>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onView(event)}
              className="px-2 py-1 rounded bg-[var(--sq-ink)] text-[var(--sq-paper)] text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              <Eye size={12} />
              <span>View Details</span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-2 py-1 rounded border border-[var(--sq-border)] text-[10px] font-medium hover:bg-[var(--sq-shade)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
