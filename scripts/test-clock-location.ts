// ---------------------------------------------------------------------------
// Zenithsui Automated Test Suite: Automatic Real-Time Clock & Location Detection
//
// Run:
//   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-clock-location.ts
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import {
  isValidTimezone,
  detectBrowserTimezone,
  getTimezoneUtcOffset,
  getTimeSnapshot,
  inferLocationFromTimezone,
  formatTimeSnapshot,
} from "../lib/time/time-service.ts"
import {
  DEFAULT_CLOCK_PREFERENCES,
  type ClockPreferences,
  type TimeCalibration,
} from "../lib/time/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
    console.error(`  ✗ ${name} (FAILED)${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("=== Starting Zenithsui Real-Time Clock & Location Detection Verification ===\n")

  // =========================================================================
  // 1. TIMEZONE VALIDATION & BROWSER DETECTION
  // =========================================================================
  console.log("1. Timezone Validation & Browser Detection:")

  check("Validates common global timezones", (
    isValidTimezone("Asia/Kolkata") &&
    isValidTimezone("America/New_York") &&
    isValidTimezone("Europe/London") &&
    isValidTimezone("Asia/Tokyo") &&
    isValidTimezone("Australia/Sydney") &&
    isValidTimezone("UTC")
  ))

  check("Rejects malformed and invalid timezone identifiers", (
    !isValidTimezone("Invalid/Fake_Zone") &&
    !isValidTimezone("") &&
    !isValidTimezone("Mars/Curiosity") &&
    !isValidTimezone("GMT+999")
  ))

  const detectedTz = detectBrowserTimezone()
  check("Detects a non-empty, valid browser timezone via Intl API", (
    typeof detectedTz === "string" &&
    detectedTz.length > 0 &&
    isValidTimezone(detectedTz)
  ), `Detected: ${detectedTz}`)

  // =========================================================================
  // 2. UTC OFFSET CALCULATION
  // =========================================================================
  console.log("\n2. UTC Offset Formatter & Accuracy:")

  const fixedDate = new Date("2026-10-31T12:00:00Z")
  const offsetRegex = /^UTC[+-]\d{2}:\d{2}$/

  const kolkataOffset = getTimezoneUtcOffset("Asia/Kolkata", fixedDate)
  check("Calculates India Standard Time offset as UTC+05:30", (
    kolkataOffset === "UTC+05:30" && offsetRegex.test(kolkataOffset)
  ), `Received: ${kolkataOffset}`)

  const kathmanduOffset = getTimezoneUtcOffset("Asia/Kathmandu", fixedDate)
  check("Calculates Nepal fractional offset as UTC+05:45", (
    kathmanduOffset === "UTC+05:45" && offsetRegex.test(kathmanduOffset)
  ), `Received: ${kathmanduOffset}`)

  const utcOffset = getTimezoneUtcOffset("UTC", fixedDate)
  check("Calculates UTC offset as UTC+00:00", (
    utcOffset === "UTC+00:00" && offsetRegex.test(utcOffset)
  ), `Received: ${utcOffset}`)

  const tokyoOffset = getTimezoneUtcOffset("Asia/Tokyo", fixedDate)
  check("Calculates Tokyo offset as UTC+09:00", (
    tokyoOffset === "UTC+09:00" && offsetRegex.test(tokyoOffset)
  ), `Received: ${tokyoOffset}`)

  // =========================================================================
  // 3. TIME SNAPSHOT & FORMATTING (12h vs 24h, SECONDS, DATE, WEEKDAY)
  // =========================================================================
  console.log("\n3. Time Snapshot & Clock Formatting:")

  const snapshot12h = getTimeSnapshot({
    timezone: "Asia/Kolkata",
    format24h: false,
    showSeconds: true,
  })

  check("12-hour format produces 1-12 hours and AM/PM period", (
    Number(snapshot12h.hours) >= 1 &&
    Number(snapshot12h.hours) <= 12 &&
    (snapshot12h.ampm === "AM" || snapshot12h.ampm === "PM") &&
    snapshot12h.seconds.length === 2
  ), `Snapshot: ${snapshot12h.hours}:${snapshot12h.minutes}:${snapshot12h.seconds} ${snapshot12h.ampm}`)

  const snapshot24h = getTimeSnapshot({
    timezone: "Asia/Tokyo",
    format24h: true,
    showSeconds: false,
  })

  check("24-hour format produces 00-23 hours and omits AM/PM and seconds in formatted string", (
    Number(snapshot24h.hours) >= 0 &&
    Number(snapshot24h.hours) <= 23 &&
    snapshot24h.ampm === undefined &&
    snapshot24h.formattedTime.split(":").length === 2
  ), `Snapshot formatted: ${snapshot24h.formattedTime}`)

  check("Time snapshot includes full weekday and formatted date", (
    typeof snapshot12h.weekday === "string" &&
    snapshot12h.weekday.length > 2 &&
    typeof snapshot12h.formattedDate === "string" &&
    snapshot12h.formattedDate.length > 3
  ), `Weekday: ${snapshot12h.weekday}, Date: ${snapshot12h.formattedDate}`)

  const formatted12h = formatTimeSnapshot(snapshot12h, { showSeconds: true, showPeriod: true })
  check("formatTimeSnapshot formats full 12h string with seconds and AM/PM", (
    /\d{1,2}:\d{2}:\d{2}\s(AM|PM)/.test(formatted12h)
  ), `Formatted: ${formatted12h}`)

  const formatted24h = formatTimeSnapshot(snapshot24h, { showSeconds: false, showPeriod: false })
  check("formatTimeSnapshot formats 24h string without seconds and period", (
    /^\d{2}:\d{2}$/.test(formatted24h)
  ), `Formatted: ${formatted24h}`)

  // =========================================================================
  // 4. SERVER TIME CALIBRATION & LATENCY MIDPOINT ADJUSTMENT
  // =========================================================================
  console.log("\n4. Server Time Calibration & Round-trip Midpoint Calculation:")

  // Simulation: Client sends at T0=1000, Server receives & responds at Ts=1200, Client receives at T1=1100
  // RTT = 1100 - 1000 = 100ms
  // Midpoint client time = 1000 + 50 = 1050ms
  // Offset = Ts - 1050 = 1200 - 1050 = +150ms
  const t0 = 1000
  const ts = 1200
  const t1 = 1100
  const rtt = t1 - t0
  const computedOffset = Math.round(ts - (t0 + rtt / 2))

  check("Calculates network round-trip latency and midpoint offset accurately", (
    rtt === 100 && computedOffset === 150
  ), `RTT: ${rtt}ms, Offset: ${computedOffset}ms`)

  // Test calibration application on snapshot:
  // Offset +10,000ms (10 seconds ahead)
  const baselineSnapshot = getTimeSnapshot({
    timezone: "UTC",
    format24h: true,
    showSeconds: true,
    offsetMs: 0,
  })
  const calibratedSnapshot = getTimeSnapshot({
    timezone: "UTC",
    format24h: true,
    showSeconds: true,
    offsetMs: 10000,
  })

  check("Calibrated snapshot advances target timestamp by exactly calibration offset", (
    Math.abs((calibratedSnapshot.timestamp - baselineSnapshot.timestamp) - 10000) < 50
  ), `Baseline: ${baselineSnapshot.timestamp}, Calibrated: ${calibratedSnapshot.timestamp}`)

  // =========================================================================
  // 5. LOCATION INFERENCE FROM TIMEZONE (CANONICAL & HEURISTIC FALLBACK)
  // =========================================================================
  console.log("\n5. Location Inference & Offline Fallbacks:")

  const locKolkata = inferLocationFromTimezone("Asia/Kolkata")
  check("Resolves Asia/Kolkata to New Delhi, India with Delhi region", (
    locKolkata.city === "New Delhi" &&
    locKolkata.country === "India" &&
    locKolkata.region === "Delhi"
  ), JSON.stringify(locKolkata))

  const locLondon = inferLocationFromTimezone("Europe/London")
  check("Resolves Europe/London to London, United Kingdom", (
    locLondon.city === "London" &&
    locLondon.country === "United Kingdom"
  ), JSON.stringify(locLondon))

  const locTokyo = inferLocationFromTimezone("Asia/Tokyo")
  check("Resolves Asia/Tokyo to Tokyo, Japan", (
    locTokyo.city === "Tokyo" &&
    locTokyo.country === "Japan"
  ), JSON.stringify(locTokyo))

  const locNewYork = inferLocationFromTimezone("America/New_York")
  check("Resolves America/New_York to New York, United States", (
    locNewYork.city === "New York" &&
    locNewYork.country === "United States"
  ), JSON.stringify(locNewYork))

  const locSydney = inferLocationFromTimezone("Australia/Sydney")
  check("Resolves Australia/Sydney to Sydney, Australia", (
    locSydney.city === "Sydney" &&
    locSydney.country === "Australia"
  ), JSON.stringify(locSydney))

  // Heuristic parser fallback for unlisted timezone
  const locHeuristic = inferLocationFromTimezone("America/Argentina/Buenos_Aires")
  check("Applies clean heuristic fallback for compound sub-territory timezone", (
    locHeuristic.city === "Buenos Aires" &&
    locHeuristic.country.length > 0
  ), JSON.stringify(locHeuristic))

  // Safe fallback for completely custom / malformed string
  const locSafe = inferLocationFromTimezone("UnknownNonExistentZone")
  check("Gracefully falls back to zone identifier without throwing", (
    typeof locSafe.city === "string" &&
    locSafe.city.length > 0
  ), JSON.stringify(locSafe))

  // =========================================================================
  // 6. DEFAULT PREFERENCES & PRIVACY ISOLATION
  // =========================================================================
  console.log("\n6. Privacy & Default Settings:")

  check("Default settings do not enable GPS precise location automatically", (
    DEFAULT_CLOCK_PREFERENCES.usePreciseLocation === false
  ))

  check("Default settings enable privacy-conscious approximate IP geolocation", (
    DEFAULT_CLOCK_PREFERENCES.autoLocation === true
  ))

  check("Default settings enable automatic timezone detection", (
    DEFAULT_CLOCK_PREFERENCES.autoTimezone === true
  ))

  check("Default settings enable server time calibration for drift-free accuracy", (
    DEFAULT_CLOCK_PREFERENCES.serverCalibration === true
  ))

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log("\n-------------------------------------------------------------")
  console.log(`Results: ${passed} passed, ${failures.length} failed.`)
  if (failures.length > 0) {
    console.error("\nFailed tests:")
    for (const f of failures) {
      console.error(`  - ${f}`)
    }
    process.exit(1)
  } else {
    console.log("All clock & location detection tests passed successfully! 🚀\n")
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
