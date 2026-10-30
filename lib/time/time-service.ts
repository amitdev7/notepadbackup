// ---------------------------------------------------------------------------
// Zenithsui Real-Time Clock & Location Detection Engine
// ---------------------------------------------------------------------------

import type { GeoLocationInfo, TimeCalibration, TimeSnapshot } from "./types"

const GEO_CACHE_KEY = "zenithsui:geo_cache"
const CALIBRATION_CACHE_KEY = "zenithsui:time_calibration"
const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

// Mapping of primary IANA timezones to canonical city & country for offline & instant fallback
const IANA_CANONICAL_LOCATIONS: Record<string, { city: string; country: string; region?: string }> = {
  // Asia
  "Asia/Kolkata": { city: "New Delhi", country: "India", region: "Delhi" },
  "Asia/Calcutta": { city: "Kolkata", country: "India", region: "West Bengal" },
  "Asia/Tokyo": { city: "Tokyo", country: "Japan" },
  "Asia/Singapore": { city: "Singapore", country: "Singapore" },
  "Asia/Dubai": { city: "Dubai", country: "United Arab Emirates" },
  "Asia/Bangkok": { city: "Bangkok", country: "Thailand" },
  "Asia/Hong_Kong": { city: "Hong Kong", country: "Hong Kong SAR" },
  "Asia/Seoul": { city: "Seoul", country: "South Korea" },
  "Asia/Shanghai": { city: "Shanghai", country: "China" },
  "Asia/Jakarta": { city: "Jakarta", country: "Indonesia" },
  "Asia/Karachi": { city: "Karachi", country: "Pakistan" },
  "Asia/Dhaka": { city: "Dhaka", country: "Bangladesh" },
  "Asia/Colombo": { city: "Colombo", country: "Sri Lanka" },
  "Asia/Kathmandu": { city: "Kathmandu", country: "Nepal" },
  "Asia/Riyadh": { city: "Riyadh", country: "Saudi Arabia" },
  "Asia/Taipei": { city: "Taipei", country: "Taiwan" },
  "Asia/Manila": { city: "Manila", country: "Philippines" },
  "Asia/Kuala_Lumpur": { city: "Kuala Lumpur", country: "Malaysia" },

  // Europe
  "Europe/London": { city: "London", country: "United Kingdom", region: "England" },
  "Europe/Paris": { city: "Paris", country: "France" },
  "Europe/Berlin": { city: "Berlin", country: "Germany" },
  "Europe/Rome": { city: "Rome", country: "Italy" },
  "Europe/Madrid": { city: "Madrid", country: "Spain" },
  "Europe/Amsterdam": { city: "Amsterdam", country: "Netherlands" },
  "Europe/Brussels": { city: "Brussels", country: "Belgium" },
  "Europe/Vienna": { city: "Vienna", country: "Austria" },
  "Europe/Zurich": { city: "Zurich", country: "Switzerland" },
  "Europe/Stockholm": { city: "Stockholm", country: "Sweden" },
  "Europe/Oslo": { city: "Oslo", country: "Norway" },
  "Europe/Copenhagen": { city: "Copenhagen", country: "Denmark" },
  "Europe/Dublin": { city: "Dublin", country: "Ireland" },
  "Europe/Helsinki": { city: "Helsinki", country: "Finland" },
  "Europe/Athens": { city: "Athens", country: "Greece" },
  "Europe/Warsaw": { city: "Warsaw", country: "Poland" },
  "Europe/Prague": { city: "Prague", country: "Czech Republic" },
  "Europe/Budapest": { city: "Budapest", country: "Hungary" },
  "Europe/Bucharest": { city: "Bucharest", country: "Romania" },
  "Europe/Lisbon": { city: "Lisbon", country: "Portugal" },
  "Europe/Istanbul": { city: "Istanbul", country: "Turkey" },

  // Americas
  "America/New_York": { city: "New York", country: "United States", region: "New York" },
  "America/Los_Angeles": { city: "Los Angeles", country: "United States", region: "California" },
  "America/Chicago": { city: "Chicago", country: "United States", region: "Illinois" },
  "America/Denver": { city: "Denver", country: "United States", region: "Colorado" },
  "America/Phoenix": { city: "Phoenix", country: "United States", region: "Arizona" },
  "America/Toronto": { city: "Toronto", country: "Canada", region: "Ontario" },
  "America/Vancouver": { city: "Vancouver", country: "Canada", region: "British Columbia" },
  "America/Montreal": { city: "Montreal", country: "Canada", region: "Quebec" },
  "America/Mexico_City": { city: "Mexico City", country: "Mexico" },
  "America/Sao_Paulo": { city: "São Paulo", country: "Brazil" },
  "America/Buenos_Aires": { city: "Buenos Aires", country: "Argentina" },
  "America/Bogota": { city: "Bogotá", country: "Colombia" },
  "America/Lima": { city: "Lima", country: "Peru" },
  "America/Santiago": { city: "Santiago", country: "Chile" },

  // Australia & Pacific
  "Australia/Sydney": { city: "Sydney", country: "Australia", region: "New South Wales" },
  "Australia/Melbourne": { city: "Melbourne", country: "Australia", region: "Victoria" },
  "Australia/Brisbane": { city: "Brisbane", country: "Australia", region: "Queensland" },
  "Australia/Perth": { city: "Perth", country: "Australia", region: "Western Australia" },
  "Australia/Adelaide": { city: "Adelaide", country: "Australia", region: "South Australia" },
  "Pacific/Auckland": { city: "Auckland", country: "New Zealand" },
  "Pacific/Honolulu": { city: "Honolulu", country: "United States", region: "Hawaii" },

  // Africa
  "Africa/Cairo": { city: "Cairo", country: "Egypt" },
  "Africa/Johannesburg": { city: "Johannesburg", country: "South Africa" },
  "Africa/Lagos": { city: "Lagos", country: "Nigeria" },
  "Africa/Nairobi": { city: "Nairobi", country: "Kenya" },
  "Africa/Casablanca": { city: "Casablanca", country: "Morocco" },
}

/**
 * Automatically detects the user's IANA timezone using native Internationalization API.
 * Never hardcodes any timezone and validates formatting.
 */
export function detectBrowserTimezone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) {
    return "UTC"
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && isValidTimezone(tz)) {
      return tz
    }
  } catch {
    // fallback
  }
  return "UTC"
}

/**
 * Validates whether a timezone identifier is a recognized IANA identifier.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string" || tz.trim() === "") return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Computes the live UTC offset for any IANA timezone (e.g. "UTC+05:30", "UTC-05:00", "UTC+00:00").
 * Automatically respects daylight saving time based on target date.
 */
export function getTimezoneUtcOffset(timezone: string, targetDate: Date = new Date()): string {
  const tz = isValidTimezone(timezone) ? timezone : "UTC"
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
    const parts = formatter.formatToParts(targetDate)
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value
    if (tzPart) {
      if (tzPart === "GMT" || tzPart === "UTC") return "UTC+00:00"
      const match = tzPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
      if (match) {
        const sign = match[1]
        const hours = match[2].padStart(2, "0")
        const mins = match[3] ?? "00"
        return `UTC${sign}${hours}:${mins}`
      }
    }
  } catch {
    // Fallback via epoch comparison
  }

  try {
    // Compare date strings in UTC vs target timezone
    const utcDate = new Date(targetDate.toLocaleString("en-US", { timeZone: "UTC" }))
    const targetTzDate = new Date(targetDate.toLocaleString("en-US", { timeZone: tz }))
    const diffMinutes = Math.round((targetTzDate.getTime() - utcDate.getTime()) / (60 * 1000))
    const sign = diffMinutes >= 0 ? "+" : "-"
    const absMinutes = Math.abs(diffMinutes)
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0")
    const minutes = String(absMinutes % 60).padStart(2, "0")
    return `UTC${sign}${hours}:${minutes}`
  } catch {
    return "UTC+00:00"
  }
}

/**
 * Generates an accurate, localized snapshot of the current time.
 */
export function getTimeSnapshot(options: {
  date?: Date
  timezone: string
  format24h?: boolean
  showSeconds?: boolean
  offsetMs?: number
}): TimeSnapshot {
  const tz = isValidTimezone(options.timezone) ? options.timezone : "UTC"
  const baseDate = options.date ?? new Date()
  const offset = options.offsetMs ?? 0
  const adjustedTime = new Date(baseDate.getTime() + offset)

  // Format time parts
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: !options.format24h,
  })

  const parts = timeFormatter.formatToParts(adjustedTime)
  let hours = ""
  let minutes = ""
  let seconds = ""
  let ampm: "AM" | "PM" | undefined

  for (const part of parts) {
    if (part.type === "hour") hours = part.value
    else if (part.type === "minute") minutes = part.value
    else if (part.type === "second") seconds = part.value
    else if (part.type === "dayPeriod") ampm = part.value.toUpperCase() as "AM" | "PM"
  }

  // Ensure 24-hour hour is two digits
  if (options.format24h && hours.length === 1) {
    hours = `0${hours}`
  }

  let formattedTime = `${hours}:${minutes}`
  if (options.showSeconds !== false) {
    formattedTime += `:${seconds}`
  }
  if (!options.format24h && ampm) {
    formattedTime += ` ${ampm}`
  }

  // Format date parts
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const dateParts = dateFormatter.formatToParts(adjustedTime)
  let weekday = ""
  let month = ""
  let day = ""
  let year = ""

  for (const part of dateParts) {
    if (part.type === "weekday") weekday = part.value
    else if (part.type === "month") month = part.value
    else if (part.type === "day") day = part.value
    else if (part.type === "year") year = part.value
  }

  const formattedDate = `${weekday}, ${month} ${day}`
  const fullDate = `${weekday}, ${month} ${day}, ${year}`
  const utcOffset = getTimezoneUtcOffset(tz, adjustedTime)

  return {
    hours,
    minutes,
    seconds,
    ampm,
    formattedTime,
    formattedDate,
    weekday,
    fullDate,
    timezone: tz,
    utcOffset,
    timestamp: adjustedTime.getTime(),
  }
}

/**
 * Formats a TimeSnapshot into a custom digital string.
 */
export function formatTimeSnapshot(
  snapshot: TimeSnapshot,
  options: { showSeconds?: boolean; showPeriod?: boolean } = {}
): string {
  let res = `${snapshot.hours}:${snapshot.minutes}`
  if (options.showSeconds && snapshot.seconds) {
    res += `:${snapshot.seconds}`
  }
  if (options.showPeriod !== false && snapshot.ampm) {
    res += ` ${snapshot.ampm}`
  }
  return res
}

/**
 * Extracts candidate city and country from an IANA timezone identifier when IP geolocation is offline or unavailable.
 */
export function inferLocationFromTimezone(timezone: string): { city: string; country: string; region: string | null } {
  const tz = isValidTimezone(timezone) ? timezone : "UTC"

  if (IANA_CANONICAL_LOCATIONS[tz]) {
    const loc = IANA_CANONICAL_LOCATIONS[tz]
    return {
      city: loc.city,
      country: loc.country,
      region: loc.region ?? null,
    }
  }

  // Fallback: parse segment after slash e.g. "Europe/Berlin" -> "Berlin"
  const segments = tz.split("/")
  if (segments.length >= 2) {
    const rawCity = segments[segments.length - 1].replace(/_/g, " ")
    const rawContinent = segments[0].replace(/_/g, " ")
    return {
      city: rawCity,
      country: rawContinent,
      region: null,
    }
  }

  return {
    city: tz,
    country: "World",
    region: null,
  }
}

/**
 * Retrieves cached location information from localStorage.
 */
export function getCachedLocation(): GeoLocationInfo | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return null
    const parsed: GeoLocationInfo = JSON.parse(raw)
    // Check TTL
    if (Date.now() - parsed.updatedAt < GEO_CACHE_TTL_MS) {
      return parsed
    }
  } catch {
    // Ignore cache parse error
  }
  return null
}

/**
 * Saves geolocation information into localStorage cache.
 */
export function setCachedLocation(info: GeoLocationInfo): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(info))
  } catch {
    // Ignore storage quota
  }
}

/**
 * Clears cached location information for privacy.
 */
export function clearCachedLocation(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(GEO_CACHE_KEY)
  } catch {}
}

/**
 * Fetches approximate location from the first-party /api/time endpoint,
 * with graceful fallback to cached location or timezone inference.
 */
export async function fetchApproximateLocation(options?: {
  force?: boolean
  timezone?: string
}): Promise<GeoLocationInfo> {
  const currentTz = options?.timezone || detectBrowserTimezone()

  // 1. Return cache if valid and not forcing refresh
  if (!options?.force) {
    const cached = getCachedLocation()
    if (cached) return cached
  }

  // 2. Query first-party /api/time endpoint
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3500)

    const res = await fetch("/api/time", {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      if (data && data.location && (data.location.city || data.location.country)) {
        const info: GeoLocationInfo = {
          city: data.location.city,
          region: data.location.region,
          country: data.location.country,
          countryCode: data.location.countryCode,
          timezone: data.timezone || currentTz,
          source: data.location.source === "ip" ? "ip" : "ip",
          accuracy: "approximate",
          updatedAt: Date.now(),
        }
        setCachedLocation(info)
        return info
      }
    }
  } catch {
    // Fall through to fallback
  }

  // 3. Graceful fallback: infer location from local timezone
  const inferred = inferLocationFromTimezone(currentTz)
  const fallbackInfo: GeoLocationInfo = {
    city: inferred.city,
    region: inferred.region,
    country: inferred.country,
    countryCode: null,
    timezone: currentTz,
    source: "timezone-fallback",
    accuracy: "fallback",
    updatedAt: Date.now(),
  }

  // Store fallback temporarily
  setCachedLocation(fallbackInfo)
  return fallbackInfo
}

/**
 * Synchronizes client clock with /api/time server timestamp using network roundtrip estimation.
 */
export async function syncServerTimeCalibration(): Promise<TimeCalibration> {
  if (typeof window === "undefined") {
    return {
      offsetMs: 0,
      roundTripMs: 0,
      lastCalibratedAt: null,
      status: "device",
    }
  }

  try {
    const t0 = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const res = await fetch("/api/time", {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timer)

    const t1 = Date.now()
    if (!res.ok) throw new Error("HTTP error")

    const data = await res.json()
    const serverTimestamp = Number(data.timestamp)
    if (!serverTimestamp || !Number.isFinite(serverTimestamp)) {
      throw new Error("Invalid timestamp")
    }

    const roundTripMs = t1 - t0
    const requestMidpoint = Math.round((t0 + t1) / 2)
    const offsetMs = serverTimestamp - requestMidpoint

    const calibration: TimeCalibration = {
      offsetMs,
      roundTripMs,
      lastCalibratedAt: Date.now(),
      status: "calibrated",
    }

    try {
      localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(calibration))
    } catch {}

    return calibration
  } catch {
    return {
      offsetMs: 0,
      roundTripMs: 0,
      lastCalibratedAt: null,
      status: "unavailable",
    }
  }
}

/**
 * Loads cached calibration if available.
 */
export function getCachedCalibration(): TimeCalibration | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CALIBRATION_CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

/**
 * Requests high-accuracy browser geolocation only upon explicit user request.
 */
export async function requestPreciseBrowserLocation(): Promise<GeoLocationInfo> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Browser geolocation is not supported in this environment.")
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let city: string | null = null
        let country: string | null = null
        let region: string | null = null

        // Attempt lightweight reverse geocoding via OpenStreetMap Nominatim with fast fallback
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 2500)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { signal: controller.signal, headers: { Accept: "application/json" } }
          )
          clearTimeout(timer)
          if (res.ok) {
            const data = await res.json()
            city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || null
            region = data.address?.state || data.address?.region || null
            country = data.address?.country || null
          }
        } catch {
          // Keep coordinates even if reverse geocode fails
        }

        const info: GeoLocationInfo = {
          city: city || "Precise Location",
          region,
          country,
          countryCode: null,
          timezone: detectBrowserTimezone(),
          latitude,
          longitude,
          source: "gps",
          accuracy: "precise",
          updatedAt: Date.now(),
        }
        setCachedLocation(info)
        resolve(info)
      },
      (err) => {
        reject(err)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  })
}
