"use client"

// ---------------------------------------------------------------------------
// Zenithsui Real-Time Clock & Location System — Top Bar Component & Popover
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useShellStore } from "@/lib/shell-store"
import {
  detectBrowserTimezone,
  getTimeSnapshot,
  fetchApproximateLocation,
  syncServerTimeCalibration,
  getCachedCalibration,
  getCachedLocation,
  requestPreciseBrowserLocation,
  clearCachedLocation,
} from "@/lib/time/time-service"
import type { GeoLocationInfo, TimeCalibration, TimeSnapshot } from "@/lib/time/types"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  Clock,
  MapPin,
  Globe,
  ArrowsClockwise,
  Gear,
  Check,
  CaretDown,
  Crosshair,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react"

export function TopBarClock() {
  const clockPrefs = useShellStore((s) => s.preferences.clockSettings)
  const updateClockPrefs = useShellStore((s) => s.updateClockPreferences)
  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)
  const setSettingsSection = useShellStore((s) => s.setSettingsSection)

  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date>(() => new Date())
  const [calibration, setCalibration] = useState<TimeCalibration | null>(() => getCachedCalibration())
  const [geoInfo, setGeoInfo] = useState<GeoLocationInfo | null>(() => getCachedLocation())
  const [isRefreshingGeo, setIsRefreshingGeo] = useState(false)
  const [isSyncingTime, setIsSyncingTime] = useState(false)
  const [requestingGps, setRequestingGps] = useState(false)

  // Resolve active timezone
  const activeTimezone = useMemo(() => {
    if (!clockPrefs.autoTimezone && clockPrefs.manualTimezone) {
      return clockPrefs.manualTimezone
    }
    return detectBrowserTimezone()
  }, [clockPrefs.autoTimezone, clockPrefs.manualTimezone])

  // Compute live time snapshot
  const snapshot: TimeSnapshot = useMemo(() => {
    return getTimeSnapshot({
      date: now,
      timezone: activeTimezone,
      format24h: clockPrefs.format24h,
      showSeconds: clockPrefs.showSeconds,
      offsetMs: calibration?.offsetMs ?? 0,
    })
  }, [now, activeTimezone, clockPrefs.format24h, clockPrefs.showSeconds, calibration?.offsetMs])

  // 1-second accurate ticker with visibility/focus resume
  useEffect(() => {
    setMounted(true)

    // Accurate interval aligned to seconds
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)

    // Immediate tick upon visibility or window focus
    const handleResume = () => {
      setNow(new Date())
    }

    // Timezone change listener (re-detect if user changes OS timezone)
    const handleTimezoneChange = () => {
      setNow(new Date())
    }

    window.addEventListener("focus", handleResume)
    document.addEventListener("visibilitychange", handleResume)
    window.addEventListener("timezonechange" as any, handleTimezoneChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleResume)
      document.removeEventListener("visibilitychange", handleResume)
      window.removeEventListener("timezonechange" as any, handleTimezoneChange)
    }
  }, [])

  // Initial location fetch
  useEffect(() => {
    if (!clockPrefs.autoLocation) return

    let cancelled = false
    fetchApproximateLocation({ timezone: activeTimezone })
      .then((info) => {
        if (!cancelled && info) {
          setGeoInfo(info)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [clockPrefs.autoLocation, activeTimezone])

  // Initial server calibration
  useEffect(() => {
    if (!clockPrefs.serverCalibration) return

    let cancelled = false
    syncServerTimeCalibration()
      .then((cal) => {
        if (!cancelled && cal) {
          setCalibration(cal)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [clockPrefs.serverCalibration])

  // Refresh approximate IP geolocation
  const handleRefreshLocation = useCallback(async () => {
    setIsRefreshingGeo(true)
    try {
      const info = await fetchApproximateLocation({ force: true, timezone: activeTimezone })
      setGeoInfo(info)
    } finally {
      setIsRefreshingGeo(false)
    }
  }, [activeTimezone])

  // Refresh server calibration
  const handleSyncTime = useCallback(async () => {
    setIsSyncingTime(true)
    try {
      const cal = await syncServerTimeCalibration()
      setCalibration(cal)
      setNow(new Date())
    } finally {
      setIsSyncingTime(false)
    }
  }, [])

  // Explicit user GPS request
  const handleRequestPreciseLocation = useCallback(async () => {
    setRequestingGps(true)
    try {
      const info = await requestPreciseBrowserLocation()
      setGeoInfo(info)
      updateClockPrefs({ usePreciseLocation: true })
    } catch {
      // Permission denied or unavailable: keep approximate location
    } finally {
      setRequestingGps(false)
    }
  }, [updateClockPrefs])

  // Open full settings
  const handleOpenTimeSettings = useCallback(() => {
    setSettingsSection("time")
    setSettingsOpen(true)
  }, [setSettingsSection, setSettingsOpen])

  if (!clockPrefs.enabled || !clockPrefs.showInTopBar) {
    return null
  }

  // Fallback for SSR
  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-stone-400 select-none">
        <Clock size={13} className="text-stone-400" />
        <span>--:--:--</span>
      </div>
    )
  }

  const cityLabel = geoInfo?.city || snapshot.timezone.split("/")[1]?.replace(/_/g, " ") || ""
  const countryLabel = geoInfo?.country || ""
  const displayLocation = cityLabel ? (countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          "group tactile-press flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full outline-none transition-all duration-150 cursor-pointer select-none",
          "hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 text-stone-800 dark:text-stone-200"
        )}
        title={`${snapshot.fullDate} · ${snapshot.timezone} (${snapshot.utcOffset})`}
        aria-label={`Current time: ${snapshot.formattedTime}, ${displayLocation ? `location: ${displayLocation}` : ""}`}
      >
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-stone-500 dark:text-stone-400 group-hover:text-[#007AFF] transition-colors" />
          <span className="font-mono font-semibold text-[11px] tracking-tight">
            {snapshot.formattedTime}
          </span>
        </div>

        {clockPrefs.showLocation && displayLocation && (
          <div className="hidden md:flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400 font-sans truncate max-w-[150px]">
            <MapPin size={11} className="text-rose-500 shrink-0" />
            <span className="truncate">{cityLabel}</span>
          </div>
        )}

        <CaretDown size={10} className="text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform duration-150" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        side="bottom"
        sideOffset={10}
        className="w-80 p-3 font-sans max-h-[88vh] overflow-y-auto space-y-3"
      >
        {/* Big Live Digital Clock Display */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-stone-100/90 to-stone-50/80 dark:from-stone-800/80 dark:to-stone-900/80 border border-stone-200/60 dark:border-stone-700/60 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="flex items-baseline gap-1.5 font-mono font-bold tracking-tight text-3xl text-stone-900 dark:text-stone-100">
            <span>{snapshot.hours}:{snapshot.minutes}</span>
            {clockPrefs.showSeconds && (
              <span className="text-xl text-[#007AFF] dark:text-[#0A84FF]">
                :{snapshot.seconds}
              </span>
            )}
            {snapshot.ampm && (
              <span className="text-xs font-semibold uppercase text-stone-400 ml-0.5">
                {snapshot.ampm}
              </span>
            )}
          </div>

          <div className="text-xs font-medium text-stone-600 dark:text-stone-300 mt-1">
            {snapshot.fullDate}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-stone-200/70 dark:bg-stone-700/70 text-stone-700 dark:text-stone-300">
              {snapshot.timezone}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {snapshot.utcOffset}
            </span>
          </div>
        </div>

        {/* Location Information Card */}
        <div className="p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60 bg-white/50 dark:bg-stone-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <MapPin size={14} className="text-rose-500" />
              <span>Location</span>
            </div>

            <button
              type="button"
              onClick={handleRefreshLocation}
              disabled={isRefreshingGeo}
              className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Refresh IP location detection"
            >
              <ArrowsClockwise size={11} className={cn(isRefreshingGeo && "animate-spin")} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="text-xs font-medium text-stone-900 dark:text-stone-100">
            {displayLocation ? (
              <span>{displayLocation}</span>
            ) : (
              <span className="text-stone-400">Detecting location…</span>
            )}
            {geoInfo?.region && (
              <span className="text-[11px] text-stone-400 block font-normal">
                Region: {geoInfo.region}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 dark:border-stone-800 text-[10px] text-stone-500">
            <span>
              Source: {geoInfo?.source === "gps" ? "Precise GPS" : geoInfo?.source === "ip" ? "Approximate IP" : "Timezone Context"}
            </span>

            {geoInfo?.source !== "gps" && (
              <button
                type="button"
                onClick={handleRequestPreciseLocation}
                disabled={requestingGps}
                className="text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                title="Enable precise device location"
              >
                <Crosshair size={11} className={cn(requestingGps && "animate-spin")} />
                <span>Precise GPS</span>
              </button>
            )}
          </div>
        </div>

        {/* Calibration & Accuracy Card */}
        <div className="p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60 bg-white/50 dark:bg-stone-900/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Globe size={14} className="text-emerald-500" />
              <span>Time Accuracy</span>
            </div>

            <button
              type="button"
              onClick={handleSyncTime}
              disabled={isSyncingTime}
              className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Calibrate against /api/time"
            >
              <ArrowsClockwise size={11} className={cn(isSyncingTime && "animate-spin")} />
              <span>Sync</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-600 dark:text-stone-400">Status:</span>
            <div className="flex items-center gap-1 font-mono font-medium">
              {calibration?.status === "calibrated" ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Server Calibrated ({calibration.offsetMs > 0 ? `+${calibration.offsetMs}` : calibration.offsetMs}ms)
                  </span>
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  <span className="text-stone-700 dark:text-stone-300">Device Local Time</span>
                </>
              )}
            </div>
          </div>

          {calibration?.roundTripMs !== undefined && calibration.roundTripMs > 0 && (
            <div className="text-[10px] text-stone-400 text-right">
              Round-trip latency: {calibration.roundTripMs}ms
            </div>
          )}
        </div>

        {/* Inline Quick Appearance Toggles */}
        <div className="space-y-2 pt-1 border-t border-stone-200/60 dark:border-stone-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-700 dark:text-stone-300">24-Hour Clock</span>
            <Switch
              checked={clockPrefs.format24h}
              onCheckedChange={(checked) => updateClockPrefs({ format24h: checked })}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-700 dark:text-stone-300">Show Seconds</span>
            <Switch
              checked={clockPrefs.showSeconds}
              onCheckedChange={(checked) => updateClockPrefs({ showSeconds: checked })}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-700 dark:text-stone-300">Show Location Pill</span>
            <Switch
              checked={clockPrefs.showLocation}
              onCheckedChange={(checked) => updateClockPrefs({ showLocation: checked })}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-700 dark:text-stone-300">Auto Timezone</span>
            <Switch
              checked={clockPrefs.autoTimezone}
              onCheckedChange={(checked) => updateClockPrefs({ autoTimezone: checked })}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleOpenTimeSettings}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <Gear size={13} />
            <span>Time & Location Settings…</span>
          </button>

          <button
            type="button"
            onClick={clearCachedLocation}
            className="text-[10px] text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Clear cached location"
          >
            Clear Cache
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
