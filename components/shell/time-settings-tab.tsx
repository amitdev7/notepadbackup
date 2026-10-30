"use client"

// ---------------------------------------------------------------------------
// Zenithsui Settings — Time & Location Dedicated Control Panel
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from "react"
import { useShellStore } from "@/lib/shell-store"
import {
  detectBrowserTimezone,
  getTimezoneUtcOffset,
  fetchApproximateLocation,
  syncServerTimeCalibration,
  getCachedCalibration,
  getCachedLocation,
  requestPreciseBrowserLocation,
  clearCachedLocation,
} from "@/lib/time/time-service"
import type { GeoLocationInfo, TimeCalibration } from "@/lib/time/types"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Clock,
  MapPin,
  Globe,
  ArrowsClockwise,
  Crosshair,
  ShieldCheck,
  Check,
  WarningCircle,
} from "@phosphor-icons/react"

const COMMON_TIMEZONES = [
  { id: "Asia/Kolkata", label: "India Standard Time (IST) — Kolkata, New Delhi, Mumbai" },
  { id: "America/New_York", label: "Eastern Time (ET) — New York, Toronto, Miami" },
  { id: "America/Chicago", label: "Central Time (CT) — Chicago, Dallas, Mexico City" },
  { id: "America/Denver", label: "Mountain Time (MT) — Denver, Phoenix, Calgary" },
  { id: "America/Los_Angeles", label: "Pacific Time (PT) — Los Angeles, San Francisco, Vancouver" },
  { id: "Europe/London", label: "Greenwich Mean Time (GMT / BST) — London, Dublin, Lisbon" },
  { id: "Europe/Paris", label: "Central European Time (CET) — Paris, Berlin, Rome, Madrid" },
  { id: "Europe/Athens", label: "Eastern European Time (EET) — Athens, Helsinki, Bucharest" },
  { id: "Asia/Dubai", label: "Gulf Standard Time (GST) — Dubai, Abu Dhabi, Muscat" },
  { id: "Asia/Singapore", label: "Singapore Standard Time (SGT) — Singapore, Kuala Lumpur" },
  { id: "Asia/Hong_Kong", label: "Hong Kong Time (HKT) — Hong Kong" },
  { id: "Asia/Tokyo", label: "Japan Standard Time (JST) — Tokyo, Osaka, Kyoto" },
  { id: "Asia/Seoul", label: "Korea Standard Time (KST) — Seoul" },
  { id: "Australia/Sydney", label: "Australian Eastern Time (AET) — Sydney, Melbourne, Brisbane" },
  { id: "Australia/Perth", label: "Australian Western Time (AWST) — Perth" },
  { id: "Pacific/Auckland", label: "New Zealand Time (NZST) — Auckland, Wellington" },
  { id: "UTC", label: "Coordinated Universal Time (UTC)" },
]

export function TimeSettingsTab() {
  const clockPrefs = useShellStore((s) => s.preferences.clockSettings)
  const updateClockPrefs = useShellStore((s) => s.updateClockPreferences)

  const [geoInfo, setGeoInfo] = useState<GeoLocationInfo | null>(() => getCachedLocation())
  const [calibration, setCalibration] = useState<TimeCalibration | null>(() => getCachedCalibration())
  const [isRefreshingGeo, setIsRefreshingGeo] = useState(false)
  const [isSyncingTime, setIsSyncingTime] = useState(false)
  const [isRequestingGps, setIsRequestingGps] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)

  const detectedTz = useMemo(() => detectBrowserTimezone(), [])
  const activeTz = clockPrefs.autoTimezone ? detectedTz : clockPrefs.manualTimezone || detectedTz
  const activeUtcOffset = useMemo(() => getTimezoneUtcOffset(activeTz), [activeTz])

  useEffect(() => {
    if (!geoInfo && clockPrefs.autoLocation) {
      fetchApproximateLocation({ timezone: activeTz })
        .then((info) => setGeoInfo(info))
        .catch(() => {})
    }
  }, [geoInfo, clockPrefs.autoLocation, activeTz])

  const handleRefreshGeo = useCallback(async () => {
    setIsRefreshingGeo(true)
    try {
      const info = await fetchApproximateLocation({ force: true, timezone: activeTz })
      setGeoInfo(info)
      setFeedbackNotice("Location refreshed from IP geolocation.")
      setTimeout(() => setFeedbackNotice(null), 3000)
    } finally {
      setIsRefreshingGeo(false)
    }
  }, [activeTz])

  const handleSyncTime = useCallback(async () => {
    setIsSyncingTime(true)
    try {
      const cal = await syncServerTimeCalibration()
      setCalibration(cal)
      setFeedbackNotice(`Calibrated against /api/time (offset: ${cal.offsetMs > 0 ? `+${cal.offsetMs}` : cal.offsetMs}ms).`)
      setTimeout(() => setFeedbackNotice(null), 3500)
    } finally {
      setIsSyncingTime(false)
    }
  }, [])

  const handleEnableGps = useCallback(async () => {
    setIsRequestingGps(true)
    try {
      const info = await requestPreciseBrowserLocation()
      setGeoInfo(info)
      updateClockPrefs({ usePreciseLocation: true })
      setFeedbackNotice("Precise device location acquired.")
      setTimeout(() => setFeedbackNotice(null), 3000)
    } catch {
      setFeedbackNotice("Precise location permission was denied or unavailable.")
      setTimeout(() => setFeedbackNotice(null), 3500)
    } finally {
      setIsRequestingGps(false)
    }
  }, [updateClockPrefs])

  const handleClearCache = useCallback(() => {
    clearCachedLocation()
    setGeoInfo(null)
    setFeedbackNotice("Cached location cleared.")
    setTimeout(() => setFeedbackNotice(null), 3000)
  }, [])

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notice */}
      {feedbackNotice && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <Check size={14} className="shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Group 1: Automatic Detection & Environment Context */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Automatic Detection & Timezone
        </h5>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 block">
                Automatic Timezone Detection
              </span>
              <span className="text-[11px] text-stone-500">
                Uses browser&apos;s native Internationalization API to detect your local environment
              </span>
            </div>
            <Switch
              checked={clockPrefs.autoTimezone}
              onCheckedChange={(checked) => updateClockPrefs({ autoTimezone: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
            <span className="text-stone-600 dark:text-stone-400">Current Timezone:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="font-semibold text-stone-900 dark:text-stone-100">{activeTz}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                {activeUtcOffset}
              </span>
            </div>
          </div>

          {!clockPrefs.autoTimezone && (
            <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                Manual Timezone Override
              </label>
              <select
                value={clockPrefs.manualTimezone || activeTz}
                onChange={(e) => updateClockPrefs({ manualTimezone: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs outline-none"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label} ({tz.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Approximate Geolocation Card */}
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 block">
                Approximate Geographical Location (IP)
              </span>
              <span className="text-[11px] text-stone-500">
                Identifies city and country via privacy-conscious server proxy headers
              </span>
            </div>
            <Switch
              checked={clockPrefs.autoLocation}
              onCheckedChange={(checked) => updateClockPrefs({ autoLocation: checked })}
            />
          </div>

          {clockPrefs.autoLocation && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-500" />
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {geoInfo?.city ? `${geoInfo.city}, ${geoInfo.country || ""}` : "Resolving location…"}
                </span>
                {geoInfo?.source && (
                  <span className="text-[10px] text-stone-400">
                    ({geoInfo.source === "gps" ? "GPS" : geoInfo.source === "ip" ? "IP" : "Timezone"})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRefreshGeo}
                disabled={isRefreshingGeo}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <ArrowsClockwise size={12} className={cn(isRefreshingGeo && "animate-spin")} />
                <span>Refresh Location</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group 2: Clock Appearance */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Clock Appearance & Formatting
        </h5>

        <div className="space-y-2.5 divide-y divide-stone-200/60 dark:divide-stone-800/60">
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Show Clock in Top Bar</span>
              <span className="text-[11px] text-stone-500">Display live real-time clock in the top navigation capsule</span>
            </div>
            <Switch
              checked={clockPrefs.showInTopBar}
              onCheckedChange={(checked) => updateClockPrefs({ showInTopBar: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">24-Hour Time Format</span>
              <span className="text-[11px] text-stone-500">Display 14:30 instead of 2:30 PM</span>
            </div>
            <Switch
              checked={clockPrefs.format24h}
              onCheckedChange={(checked) => updateClockPrefs({ format24h: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Show Seconds</span>
              <span className="text-[11px] text-stone-500">Continuously update second transitions</span>
            </div>
            <Switch
              checked={clockPrefs.showSeconds}
              onCheckedChange={(checked) => updateClockPrefs({ showSeconds: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Show Location Pill in Toolbar</span>
              <span className="text-[11px] text-stone-500">Display city badge next to time</span>
            </div>
            <Switch
              checked={clockPrefs.showLocation}
              onCheckedChange={(checked) => updateClockPrefs({ showLocation: checked })}
            />
          </div>
        </div>
      </div>

      {/* Group 3: Server Calibration & Accuracy */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Time Accuracy & Server Calibration
        </h5>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 block">
                Server Time Calibration (/api/time)
              </span>
              <span className="text-[11px] text-stone-500">
                Synchronizes client clock with server UTC timestamps accounting for network latency
              </span>
            </div>
            <Switch
              checked={clockPrefs.serverCalibration}
              onCheckedChange={(checked) => updateClockPrefs({ serverCalibration: checked })}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
            <div>
              <span className="text-stone-600 dark:text-stone-400 block">Calibration Status:</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {calibration?.status === "calibrated"
                  ? `Calibrated (offset: ${calibration.offsetMs > 0 ? `+${calibration.offsetMs}` : calibration.offsetMs}ms, RTT: ${calibration.roundTripMs}ms)`
                  : "Device Local Time"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSyncTime}
              disabled={isSyncingTime}
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <ArrowsClockwise size={12} className={cn(isSyncingTime && "animate-spin")} />
              <span>Calibrate Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Group 4: Location Privacy */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Location Privacy & Permissions
        </h5>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                Local-First & Zero-Tracking Privacy Guarantee
              </p>
              <p>
                Zenithsui only derives approximate geographical context from proxy headers to display your local environment.
                Coordinates and location are never saved into canvas documents, never added to shared links, and never broadcasted via Wi-Fi sync.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Use Precise Location (GPS)
              </span>
              <span className="text-[11px] text-stone-500">
                Explicit device sensor prompt — never requested automatically
              </span>
            </div>

            <button
              type="button"
              onClick={handleEnableGps}
              disabled={isRequestingGps || geoInfo?.source === "gps"}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer",
                geoInfo?.source === "gps"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-stone-200 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              )}
            >
              <Crosshair size={12} className={cn(isRequestingGps && "animate-spin")} />
              <span>{geoInfo?.source === "gps" ? "GPS Active" : "Request GPS"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
            <div>
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Cached Geolocation
              </span>
              <span className="text-[11px] text-stone-500">
                Clear locally cached city and country data from browser storage
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearCache}
              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
