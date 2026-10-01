// ---------------------------------------------------------------------------
// Zenithsui Calendar — iCalendar (.ics) Interoperability Engine
//
// Compliant with RFC 5545 (Internet Calendaring and Scheduling Core Object).
// Supports exporting to and importing from Windows Calendar, Google Calendar,
// Outlook, Apple Calendar, and Android Calendar.
// ---------------------------------------------------------------------------

import type { CalendarEvent, CalendarRecurrence } from "./types"
import { parseTimeToMinutes, minutesToTimeString, addDaysIso } from "./date-utils"

/**
 * Escapes text for RFC 5545 iCalendar values.
 */
function escapeIcsText(text: string): string {
  if (!text) return ""
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/**
 * Unescapes RFC 5545 text back to plain text.
 */
function unescapeIcsText(text: string): string {
  if (!text) return ""
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
}

/**
 * Formats a Date or ISO date string into iCalendar DTSTART / DTEND format.
 */
function formatIcsDateTime(dateIso: string, timeStr?: string, isAllDay = false): string {
  const cleanDate = dateIso.slice(0, 10).replace(/-/g, "")
  if (isAllDay || !timeStr) {
    return `;VALUE=DATE:${cleanDate}`
  }
  const cleanTime = timeStr.replace(":", "").padEnd(4, "0") + "00"
  return `:${cleanDate}T${cleanTime}`
}

/**
 * Exports a list of CalendarEvent objects into an RFC 5545 .ics calendar string.
 */
export function exportToIcs(
  events: CalendarEvent[],
  calendarName = "Zenithsui Calendar"
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zenithsui//Functional Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
  ]

  const nowStamp =
    new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "") + "Z"

  for (const ev of events) {
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${ev.id}@zenithsui.local`)
    lines.push(`DTSTAMP:${nowStamp}`)

    // Start date/time
    lines.push(`DTSTART${formatIcsDateTime(ev.date, ev.startTime, ev.isAllDay)}`)

    // End date/time
    if (ev.isAllDay) {
      // In RFC 5545, all-day DTEND is exclusive (next day)
      const nextDay = addDaysIso(ev.endDate || ev.date, 1)
      lines.push(`DTEND${formatIcsDateTime(nextDay, undefined, true)}`)
    } else if (ev.endTime) {
      lines.push(`DTEND${formatIcsDateTime(ev.endDate || ev.date, ev.endTime, false)}`)
    } else if (ev.startTime) {
      const startM = parseTimeToMinutes(ev.startTime)
      const endM = startM + (ev.durationMinutes || 60)
      const endStr = minutesToTimeString(endM)
      lines.push(`DTEND${formatIcsDateTime(ev.endDate || ev.date, endStr, false)}`)
    }

    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`)

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`)
    }

    if (ev.location) {
      lines.push(`LOCATION:${escapeIcsText(ev.location)}`)
    }

    if (ev.type) {
      lines.push(`CATEGORIES:${escapeIcsText(ev.type)}`)
    }

    // Status: COMPLETED vs CONFIRMED
    if (ev.status === "completed") {
      lines.push("STATUS:COMPLETED")
    } else {
      lines.push("STATUS:CONFIRMED")
    }

    // Priority mapping (RFC 5545: 1=High, 5=Medium, 9=Low)
    if (ev.priority === "High") {
      lines.push("PRIORITY:1")
    } else if (ev.priority === "Medium") {
      lines.push("PRIORITY:5")
    } else if (ev.priority === "Low") {
      lines.push("PRIORITY:9")
    }

    // Recurrence Rule
    if (ev.recurrence && ev.recurrence !== "none") {
      let rrule = `RRULE:FREQ=${ev.recurrence.toUpperCase()}`
      if (ev.recurrenceEnd) {
        const cleanUntil = ev.recurrenceEnd.replace(/-/g, "") + "T235959Z"
        rrule += `;UNTIL=${cleanUntil}`
      }
      lines.push(rrule)
    }

    // Alarm / Reminder (Windows / Android notification alert)
    if (typeof ev.reminderMinutes === "number" && ev.reminderMinutes >= 0) {
      lines.push("BEGIN:VALARM")
      lines.push(`TRIGGER:-PT${ev.reminderMinutes}M`)
      lines.push("ACTION:DISPLAY")
      lines.push(`DESCRIPTION:Reminder: ${escapeIcsText(ev.title)}`)
      lines.push("END:VALARM")
    }

    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

/**
 * Triggers a browser download of an .ics file.
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === "undefined") return

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Unfolds folded lines in RFC 5545 iCalendar content.
 */
function unfoldIcsLines(raw: string): string[] {
  const rawLines = raw.split(/\r?\n/)
  const unfolded: string[] = []

  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else if (line.trim()) {
      unfolded.push(line)
    }
  }

  return unfolded
}

/**
 * Parses RFC 5545 iCalendar text into partial CalendarEvent objects.
 */
export function parseIcs(icsText: string): Partial<CalendarEvent>[] {
  const lines = unfoldIcsLines(icsText)
  const events: Partial<CalendarEvent>[] = []
  let inEvent = false
  let current: Partial<CalendarEvent> = {}

  for (const line of lines) {
    const upper = line.toUpperCase()

    if (upper.startsWith("BEGIN:VEVENT")) {
      inEvent = true
      current = {
        status: "pending",
        priority: "Medium",
        type: "Study",
        recurrence: "none",
        color: "blue",
      }
      continue
    }

    if (upper.startsWith("END:VEVENT")) {
      if (inEvent && current.title && current.date) {
        events.push(current)
      }
      inEvent = false
      current = {}
      continue
    }

    if (!inEvent) continue

    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue

    const propHeader = line.slice(0, colonIdx)
    const val = line.slice(colonIdx + 1)
    const propName = propHeader.split(";")[0].toUpperCase()

    switch (propName) {
      case "SUMMARY":
        current.title = unescapeIcsText(val)
        break

      case "DESCRIPTION":
        current.description = unescapeIcsText(val)
        break

      case "LOCATION":
        current.location = unescapeIcsText(val)
        break

      case "CATEGORIES": {
        const cat = unescapeIcsText(val).split(",")[0]
        if (cat) current.type = cat.trim()
        break
      }

      case "DTSTART": {
        // e.g. 20261015, or 20261015T140000, or 20261015T140000Z
        const isAllDay = propHeader.includes("VALUE=DATE")
        const dateMatch = val.match(/(\d{4})(\d{2})(\d{2})/)
        if (dateMatch) {
          const y = dateMatch[1]
          const m = dateMatch[2]
          const d = dateMatch[3]
          current.date = `${y}-${m}-${d}`
        }

        const timeMatch = val.match(/T(\d{2})(\d{2})/)
        if (timeMatch && !isAllDay) {
          current.startTime = `${timeMatch[1]}:${timeMatch[2]}`
          current.isAllDay = false
        } else {
          current.isAllDay = true
        }
        break
      }

      case "DTEND": {
        const timeMatch = val.match(/T(\d{2})(\d{2})/)
        if (timeMatch && !current.isAllDay) {
          current.endTime = `${timeMatch[1]}:${timeMatch[2]}`
        }
        break
      }

      case "STATUS":
        current.status = val.toUpperCase() === "COMPLETED" ? "completed" : "pending"
        break

      case "PRIORITY": {
        const pNum = parseInt(val, 10)
        if (pNum >= 1 && pNum <= 3) current.priority = "High"
        else if (pNum >= 4 && pNum <= 6) current.priority = "Medium"
        else if (pNum >= 7) current.priority = "Low"
        break
      }

      case "RRULE": {
        const freqMatch = val.match(/FREQ=([A-Z]+)/i)
        if (freqMatch) {
          const freq = freqMatch[1].toLowerCase() as CalendarRecurrence
          if (["daily", "weekly", "monthly", "yearly"].includes(freq)) {
            current.recurrence = freq
          }
        }
        break
      }
    }
  }

  // Calculate durationMinutes for parsed events
  for (const ev of events) {
    if (ev.startTime && ev.endTime) {
      const sM = parseTimeToMinutes(ev.startTime)
      const eM = parseTimeToMinutes(ev.endTime)
      if (eM > sM) {
        ev.durationMinutes = eM - sM
      }
    }
  }

  return events
}
