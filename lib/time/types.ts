// ---------------------------------------------------------------------------
// Zenithsui Real-Time Clock & Location Detection System — Type Definitions
// ---------------------------------------------------------------------------

export interface ClockPreferences {
  enabled: boolean
  showInTopBar: boolean
  showInDock?: boolean
  format24h: boolean
  showSeconds: boolean
  showDate: boolean
  showLocation: boolean
  showTimezone: boolean
  autoTimezone: boolean
  manualTimezone?: string
  autoLocation: boolean
  usePreciseLocation: boolean
  serverCalibration: boolean
}

export const DEFAULT_CLOCK_PREFERENCES: ClockPreferences = {
  enabled: true,
  showInTopBar: true,
  showInDock: false,
  format24h: false,
  showSeconds: true,
  showDate: true,
  showLocation: true,
  showTimezone: true,
  autoTimezone: true,
  manualTimezone: undefined,
  autoLocation: true,
  usePreciseLocation: false,
  serverCalibration: true,
}

export interface GeoLocationInfo {
  city: string | null
  region: string | null
  country: string | null
  countryCode: string | null
  timezone: string | null
  latitude?: number
  longitude?: number
  source: "ip" | "gps" | "timezone-fallback" | "manual"
  accuracy: "approximate" | "precise" | "fallback"
  updatedAt: number
}

export interface TimeCalibration {
  offsetMs: number
  roundTripMs: number
  lastCalibratedAt: number | null
  status: "device" | "calibrated" | "unavailable"
}

export interface TimeSnapshot {
  hours: string
  minutes: string
  seconds: string
  ampm?: "AM" | "PM"
  formattedTime: string
  formattedDate: string
  weekday: string
  fullDate: string
  timezone: string
  utcOffset: string
  timestamp: number
}

export interface TimeApiResponse {
  ok: boolean
  timestamp: number
  timezone: string
  location: {
    city: string | null
    region: string | null
    country: string | null
    countryCode: string | null
    source: "ip" | "headers" | "fallback"
  }
}
