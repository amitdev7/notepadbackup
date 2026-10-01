// ---------------------------------------------------------------------------
// Zenithsui Calendar Engine — Event Layout & Overlap Resolution
//
// Calculates deterministic side-by-side lane allocations for overlapping events,
// and expands recurring events lazily for a visible date window.
// ---------------------------------------------------------------------------

import { addDaysIso, addMonths, parseDateIso, parseTimeToMinutes } from "./date-utils"
import type { CalendarEvent, PositionedEvent } from "./types"

/**
 * Expands recurring events (daily, weekly, monthly, yearly) lazily within
 * a bounded date window [rangeStartIso, rangeEndIso].
 * Prevents memory explosion by restricting expansion to the visible calendar.
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStartIso: string,
  rangeEndIso: string
): CalendarEvent[] {
  const result: CalendarEvent[] = []
  const startNorm = rangeStartIso.slice(0, 10)
  const endNorm = rangeEndIso.slice(0, 10)

  for (const ev of events) {
    if (!ev.recurrence || ev.recurrence === "none") {
      // Normal single or multi-day event
      const evDate = ev.date.slice(0, 10)
      const evEndDate = ev.endDate ? ev.endDate.slice(0, 10) : evDate
      if (evEndDate >= startNorm && evDate <= endNorm) {
        result.push(ev)
      }
      continue
    }

    // Recurring event expansion
    const baseDate = ev.date.slice(0, 10)
    const recurrenceEnd = ev.recurrenceEnd ? ev.recurrenceEnd.slice(0, 10) : endNorm
    const maxEnd = recurrenceEnd < endNorm ? recurrenceEnd : endNorm

    let currentDate = baseDate
    let occurrenceIndex = 0
    const MAX_OCCURRENCES = 400 // Safety circuit-breaker

    while (currentDate <= maxEnd && occurrenceIndex < MAX_OCCURRENCES) {
      if (currentDate >= startNorm && currentDate <= maxEnd) {
        result.push({
          ...ev,
          id: occurrenceIndex === 0 ? ev.id : `${ev.id}_rec_${currentDate}`,
          date: currentDate,
        })
      }

      // Compute next date based on recurrence pattern
      if (ev.recurrence === "daily") {
        currentDate = addDaysIso(currentDate, 1)
      } else if (ev.recurrence === "weekly") {
        currentDate = addDaysIso(currentDate, 7)
      } else if (ev.recurrence === "monthly") {
        const { year, month, day } = parseDateIso(currentDate)
        const nextMonth = addMonths(year, month, 1)
        currentDate = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      } else if (ev.recurrence === "yearly") {
        const { year, month, day } = parseDateIso(currentDate)
        currentDate = `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      } else {
        break
      }

      occurrenceIndex++
    }
  }

  return result
}

/**
 * Computes exact pixel positions and horizontal lane sharing for all timed events on a given day.
 * Overlapping events are assigned adjacent lanes (columns) so neither obscures the other.
 */
export function computeDayEventPositions(
  events: CalendarEvent[],
  targetDateIso: string = "2026-10-01",
  visibleStartHour: number = 7,
  visibleEndHour: number = 21,
  hourHeightPx: number = 56
): PositionedEvent[] {
  const targetDate = targetDateIso.slice(0, 10)
  const visibleStartMinute = visibleStartHour * 60
  const visibleEndMinute = visibleEndHour * 60
  const pxPerMinute = hourHeightPx / 60

  // Filter events active on this date and exclude all-day events
  const timed = events.filter((e) => {
    if (e.isAllDay) return false
    const sDate = e.date.slice(0, 10)
    const eDate = e.endDate ? e.endDate.slice(0, 10) : sDate
    return targetDate >= sDate && targetDate <= eDate
  })

  if (timed.length === 0) return []

  // Extract start and end minutes
  const parsed = timed.map((e) => {
    let startM = e.startTime ? parseTimeToMinutes(e.startTime) : 9 * 60
    let endM = e.endTime ? parseTimeToMinutes(e.endTime) : startM + (e.durationMinutes || 60)
    if (endM <= startM) endM = startM + 30 // Minimum 30 mins

    return {
      event: e,
      startMinute: startM,
      endMinute: endM,
    }
  })

  // Sort: earlier start first, then longer duration first
  parsed.sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute)

  // 1. Assign each event to the first available lane
  const laneEndTimes: number[] = []
  const assignments: Array<{
    item: (typeof parsed)[0]
    lane: number
  }> = []

  for (const item of parsed) {
    let assignedLane = -1
    for (let l = 0; l < laneEndTimes.length; l++) {
      if (laneEndTimes[l] <= item.startMinute) {
        assignedLane = l
        laneEndTimes[l] = item.endMinute
        break
      }
    }
    if (assignedLane === -1) {
      assignedLane = laneEndTimes.length
      laneEndTimes.push(item.endMinute)
    }
    assignments.push({ item, lane: assignedLane })
  }

  // 2. Group into overlapping clusters to determine total lanes in cluster
  const clusters: Array<typeof assignments> = []
  let currentCluster: typeof assignments = []
  let clusterEndMinute = -1

  for (const entry of assignments) {
    if (currentCluster.length === 0) {
      currentCluster.push(entry)
      clusterEndMinute = entry.item.endMinute
    } else {
      if (entry.item.startMinute < clusterEndMinute) {
        currentCluster.push(entry)
        clusterEndMinute = Math.max(clusterEndMinute, entry.item.endMinute)
      } else {
        clusters.push(currentCluster)
        currentCluster = [entry]
        clusterEndMinute = entry.item.endMinute
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  // 3. Compute final layout coordinates for each cluster
  const result: PositionedEvent[] = []

  for (const cluster of clusters) {
    const totalLanes = Math.max(...cluster.map((c) => c.lane)) + 1

    for (const { item, lane } of cluster) {
      const topPx = Math.max(0, (item.startMinute - visibleStartMinute) * pxPerMinute)
      const durationM = Math.max(15, item.endMinute - item.startMinute)
      const heightPx = Math.max(20, durationM * pxPerMinute)

      result.push({
        ...item.event,
        startMinute: item.startMinute,
        endMinute: item.endMinute,
        topPx,
        heightPx,
        lane,
        totalLanes,
      })
    }
  }

  return result
}

export const computeOverlapLanes = computeDayEventPositions

export function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval
}

export function clampTimeToDay(minutes: number): number {
  return Math.max(0, Math.min(1439, Math.floor(minutes)))
}
