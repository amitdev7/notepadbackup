"use client"

// ---------------------------------------------------------------------------
// Zenithsui — About & Updates Panel
//
// Dual-Target Intelligence:
// - Web Edition: Displays web version details and Windows desktop download options
// - Windows Desktop Edition: Displays live update status, progress bar,
//   auto-update configuration (check/download/next-launch installation),
//   and safe manual "Install & Restart" controls.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react"
import {
  type DesktopUpdatePreferences,
  type DesktopUpdateStatus,
  DEFAULT_DESKTOP_UPDATE_PREFERENCES,
} from "@/electron/types"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Check,
  CircleNotch,
  DownloadSimple,
  ArrowsClockwise,
  WarningCircle,
  WindowsLogo,
  GithubLogo,
  Sparkle,
  HardDrives,
  ShieldCheck,
  ArrowRight,
  ArrowSquareOut,
} from "@phosphor-icons/react"
import { useSquig } from "@/lib/store"

const GITHUB_REPO_URL = "https://github.com/amitdev7/notepadbackup"
const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`
const GITHUB_LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`

export function AboutUpdatesTab() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [appVersion, setAppVersion] = useState("0.1.0")
  const [isPortable, setIsPortable] = useState(false)
  const [status, setStatus] = useState<DesktopUpdateStatus>({
    state: "idle",
    currentVersion: "0.1.0",
  })
  const [prefs, setPrefs] = useState<DesktopUpdatePreferences>(DEFAULT_DESKTOP_UPDATE_PREFERENCES)
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Detect desktop bridge and subscribe to live update notifications
  useEffect(() => {
    if (typeof window !== "undefined" && window.zenithsuiDesktop) {
      const desktop = window.zenithsuiDesktop
      setIsDesktop(true)
      setAppVersion(desktop.appVersion || "0.1.0")
      setIsPortable(Boolean(desktop.isPortable))

      // Load initial preferences
      desktop.getUpdatePreferences().then((loadedPrefs) => {
        if (loadedPrefs) {
          setPrefs(loadedPrefs)
        }
      }).catch((err) => {
        console.warn("[AboutUpdates] Failed to load update preferences:", err)
      })

      // Subscribe to real-time update events
      const unsubscribe = desktop.onUpdateStatus((newStatus) => {
        setStatus(newStatus)
        setActionLoading(false)
      })

      return unsubscribe
    }
  }, [])

  const handleTogglePreference = useCallback(async (key: keyof DesktopUpdatePreferences, value: boolean | "stable" | "beta") => {
    if (!isDesktop || !window.zenithsuiDesktop) return

    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    try {
      await window.zenithsuiDesktop.setUpdatePreferences({ [key]: value })
    } catch (err) {
      console.error("[AboutUpdates] Error updating preference:", err)
    }
  }, [isDesktop, prefs])

  const handleCheckForUpdates = useCallback(async () => {
    if (!window.zenithsuiDesktop) return
    setActionLoading(true)
    setStatus((prev) => ({ ...prev, state: "checking", error: undefined }))
    try {
      await window.zenithsuiDesktop.checkForUpdates()
    } catch (err) {
      console.error("[AboutUpdates] Check error:", err)
      setStatus((prev) => ({
        ...prev,
        state: "error",
        error: err instanceof Error ? err.message : String(err),
      }))
      setActionLoading(false)
    }
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    if (!window.zenithsuiDesktop) return
    setActionLoading(true)
    try {
      await window.zenithsuiDesktop.downloadUpdate()
    } catch (err) {
      console.error("[AboutUpdates] Download error:", err)
      setStatus((prev) => ({
        ...prev,
        state: "error",
        error: err instanceof Error ? err.message : String(err),
      }))
      setActionLoading(false)
    }
  }, [])

  const handleInstallAndRestart = useCallback(async () => {
    if (!window.zenithsuiDesktop) return
    setActionLoading(true)
    // Flush canvas saves before triggering restart
    try {
      useSquig.getState().saveNow()
    } catch (err) {
      console.warn("[AboutUpdates] Save error prior to restart:", err)
    }

    try {
      await window.zenithsuiDesktop.installAndRestart()
    } catch (err) {
      console.error("[AboutUpdates] Restart error:", err)
      setActionLoading(false)
      setConfirmRestartOpen(false)
    }
  }, [])

  const openLink = (url: string) => {
    if (window.zenithsuiDesktop?.openExternal) {
      window.zenithsuiDesktop.openExternal(url).catch(() => {
        window.open(url, "_blank", "noopener,noreferrer")
      })
    } else {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  // Format bytes for download progress
  const formatMB = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0"
    return (bytes / (1024 * 1024)).toFixed(1)
  }

  // Format speed
  const formatSpeed = (bps?: number) => {
    if (!bps || bps <= 0) return "0 KB/s"
    if (bps > 1024 * 1024) {
      return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
    }
    return `${Math.round(bps / 1024)} KB/s`
  }

  // Format timestamp
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return null
    const diffSec = Math.floor((Date.now() - timestamp) / 1000)
    if (diffSec < 60) return "Just now"
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // =========================================================================
  // Desktop Render Mode
  // =========================================================================
  if (isDesktop) {
    return (
      <div className="space-y-5">
        {/* Header App Card */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
                Z
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Zenithsui Desktop</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {isPortable ? "Portable Edition" : "Installed (NSIS)"}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Version {appVersion} • Windows x64
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckForUpdates}
              disabled={actionLoading || status.state === "checking" || status.state === "downloading"}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                "bg-stone-200/70 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300/80 dark:hover:bg-stone-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {status.state === "checking" ? (
                <>
                  <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking…</span>
                </>
              ) : (
                <>
                  <ArrowsClockwise className="w-3.5 h-3.5" />
                  <span>Check Now</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
            Minimalist infinite canvas with paper-like tactile physics, 100% offline local loopback server, and non-intrusive next-launch background updater.
          </p>
        </div>

        {/* Update Status Card */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Update Status
            </span>
            {status.lastChecked && (
              <span className="text-[11px] text-stone-400">
                Last checked: {formatTimeAgo(status.lastChecked)}
              </span>
            )}
          </div>

          {/* State: Checking */}
          {status.state === "checking" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-100/70 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300">
              <CircleNotch className="w-4 h-4 animate-spin text-amber-500" />
              <div className="text-xs">
                <span className="font-medium block">Checking GitHub Releases for updates…</span>
                <span className="text-[11px] text-stone-500">Connecting to github.com/amitdev7/notepadbackup</span>
              </div>
            </div>
          )}

          {/* State: Not Available / Up to date */}
          {(status.state === "idle" || status.state === "not-available") && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <span className="font-medium block">Zenithsui is up to date</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  You are currently running the latest version (v{appVersion}).
                </span>
              </div>
            </div>
          )}

          {/* State: Available */}
          {status.state === "available" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-stone-800 dark:text-stone-200 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-xs">
                    New version v{status.availableVersion} is available!
                  </span>
                </div>
                {!isPortable && (
                  <button
                    onClick={handleDownloadUpdate}
                    disabled={actionLoading}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors flex items-center gap-1"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              {isPortable && status.portableDownloadUrl && (
                <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1 pt-1">
                  <p>Portable update available. Download the latest executable:</p>
                  <button
                    onClick={() => openLink(status.portableDownloadUrl || GITHUB_LATEST_RELEASE_URL)}
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    <span>Download Zenithsui Portable v{status.availableVersion}</span>
                    <ArrowSquareOut className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* State: Downloading with Progress */}
          {status.state === "downloading" && (
            <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200">
                  <DownloadSimple className="w-4 h-4 text-amber-500 animate-bounce" />
                  <span>Downloading update…</span>
                </div>
                <span className="font-mono text-[11px] text-stone-500">
                  {status.downloadProgress?.percent ?? 0}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${status.downloadProgress?.percent ?? 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>
                  {formatMB(status.downloadProgress?.transferred)} MB / {formatMB(status.downloadProgress?.total)} MB
                </span>
                <span>{formatSpeed(status.downloadProgress?.bytesPerSecond)}</span>
              </div>
            </div>
          )}

          {/* State: Ready on Next Launch / Downloaded */}
          {(status.state === "downloaded" || status.state === "ready-on-next-launch") && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-stone-800 dark:text-stone-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">
                    Update v{status.availableVersion} is ready!
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                    This update will be automatically applied next time you launch Zenithsui. Your current active canvas session will not be interrupted.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20">
                <button
                  onClick={() => setConfirmRestartOpen(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowsClockwise className="w-3.5 h-3.5" />
                  <span>Restart & Apply Now</span>
                </button>
                <span className="text-[11px] text-stone-500">or keep working and update later</span>
              </div>
            </div>
          )}

          {/* State: Error */}
          {status.state === "error" && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200 space-y-2">
              <div className="flex items-center gap-2">
                <WarningCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-semibold text-xs">Failed to check or download update</span>
              </div>
              <p className="text-[11px] text-red-800/80 dark:text-red-300/80 font-mono text-[10px] break-all">
                {status.error || "Network error while connecting to update server."}
              </p>
              <button
                onClick={handleCheckForUpdates}
                className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 text-[11px] font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Update Configuration Preferences */}
        {!isPortable && (
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/40 space-y-4">
            <h5 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Automatic Update Preferences
            </h5>

            <div className="space-y-3.5 divide-y divide-stone-100 dark:divide-stone-900">
              {/* Check toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="pr-4">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 block">
                    Automatically Check for Updates
                  </span>
                  <span className="text-[11px] text-stone-500 leading-normal block">
                    Checks GitHub Releases in the background when connected to the internet.
                  </span>
                </div>
                <Switch
                  checked={prefs.autoCheckUpdates}
                  onCheckedChange={(checked) => handleTogglePreference("autoCheckUpdates", checked)}
                />
              </div>

              {/* Download toggle */}
              <div className="flex items-center justify-between pt-3">
                <div className="pr-4">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 block">
                    Automatically Download Updates
                  </span>
                  <span className="text-[11px] text-stone-500 leading-normal block">
                    Silently downloads verified update packages in the background.
                  </span>
                </div>
                <Switch
                  checked={prefs.autoDownloadUpdates}
                  disabled={!prefs.autoCheckUpdates}
                  onCheckedChange={(checked) => handleTogglePreference("autoDownloadUpdates", checked)}
                />
              </div>

              {/* Install on next launch toggle */}
              <div className="flex items-center justify-between pt-3">
                <div className="pr-4">
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 block">
                    Apply Updates on Next Launch
                  </span>
                  <span className="text-[11px] text-stone-500 leading-normal block">
                    When enabled, updates apply silently upon next launch without interrupting your session.
                  </span>
                </div>
                <Switch
                  checked={prefs.autoInstallUpdates}
                  disabled={!prefs.autoCheckUpdates}
                  onCheckedChange={(checked) => handleTogglePreference("autoInstallUpdates", checked)}
                />
              </div>

              {/* Channel toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 block">
                    Release Channel
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Stable recommended for daily academic and production use.
                  </span>
                </div>
                <div className="flex rounded-lg border border-stone-200 dark:border-stone-800 p-0.5 bg-stone-100 dark:bg-stone-900">
                  <button
                    onClick={() => handleTogglePreference("channel", "stable")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                      prefs.channel === "stable"
                        ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm"
                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    )}
                  >
                    Stable
                  </button>
                  <button
                    onClick={() => handleTogglePreference("channel", "beta")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                      prefs.channel === "beta"
                        ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm"
                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    )}
                  >
                    Beta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Immediate Restart */}
        {confirmRestartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-2xl space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Restart Zenithsui Now?
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your open canvas document will be safely flushed to local storage before the application restarts into the new version.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmRestartOpen(false)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInstallAndRestart}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Restarting…</span>
                    </>
                  ) : (
                    <span>Save & Restart</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Links & Metadata */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-800">
          <p>© 2026 Zenithsui. Open source under MIT License.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openLink(GITHUB_REPO_URL)}
              className="hover:text-stone-600 dark:hover:text-stone-300 inline-flex items-center gap-1"
            >
              <GithubLogo className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </button>
            <button
              onClick={() => openLink(GITHUB_RELEASES_URL)}
              className="hover:text-stone-600 dark:hover:text-stone-300 inline-flex items-center gap-1"
            >
              <ArrowSquareOut className="w-3.5 h-3.5" />
              <span>Releases</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // Web Render Mode (when viewing in standard browser)
  // =========================================================================
  return (
    <div className="space-y-5">
      {/* App Header */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
            Z
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Zenithsui Web</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Web Edition
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Version 2.4.0 Production Release • Browser / Cloud
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
          A minimalist, paper-like infinite canvas for wireframing, note-taking, and academic planning. Built with Next.js Turbopack, React 19, Rough.js, and Zustand.
        </p>
      </div>

      {/* Windows Desktop Promotion Card */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-stone-50/50 to-stone-100/50 dark:from-amber-500/10 dark:via-stone-900/30 dark:to-stone-950/50 space-y-3">
        <div className="flex items-center gap-2.5 text-stone-900 dark:text-stone-100">
          <WindowsLogo className="w-5 h-5 text-amber-500" />
          <h5 className="font-bold text-xs uppercase tracking-wider">
            Zenithsui for Windows Available
          </h5>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Experience 100% offline startup with an embedded loopback server, native file dialogs, background automatic updates applied on next launch, and full local persistence.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => openLink(GITHUB_LATEST_RELEASE_URL)}
            className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-stone-900 dark:text-stone-100 transition-colors flex items-center justify-between group"
          >
            <div className="text-left">
              <span className="text-xs font-semibold block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Setup Installer (.exe)
              </span>
              <span className="text-[10px] text-stone-500 block">
                Standard Windows installer with auto-updates
              </span>
            </div>
            <DownloadSimple className="w-4 h-4 text-amber-500 shrink-0" />
          </button>

          <button
            onClick={() => openLink(GITHUB_LATEST_RELEASE_URL)}
            className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 transition-colors flex items-center justify-between group"
          >
            <div className="text-left">
              <span className="text-xs font-semibold block">
                Portable Edition (.exe)
              </span>
              <span className="text-[10px] text-stone-500 block">
                Single binary, zero installation required
              </span>
            </div>
            <DownloadSimple className="w-4 h-4 text-stone-500 shrink-0" />
          </button>
        </div>
      </div>

      {/* Local-first architecture feature points */}
      <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-400">
        <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex items-start gap-2.5">
          <HardDrives className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <span className="font-semibold block text-stone-800 dark:text-stone-200">Local-First Storage</span>
            <span>IndexedDB multi-version store with zero forced lock-in.</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <span className="font-semibold block text-stone-800 dark:text-stone-200">Privacy Respecting</span>
            <span>All drawing data remains in your local sandbox by default.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-800">
        <p>© 2026 Zenithsui. Open source under MIT License.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openLink(GITHUB_REPO_URL)}
            className="hover:text-stone-600 dark:hover:text-stone-300 inline-flex items-center gap-1"
          >
            <GithubLogo className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </button>
          <button
            onClick={() => openLink(GITHUB_RELEASES_URL)}
            className="hover:text-stone-600 dark:hover:text-stone-300 inline-flex items-center gap-1"
          >
            <ArrowSquareOut className="w-3.5 h-3.5" />
            <span>Releases</span>
          </button>
        </div>
      </div>
    </div>
  )
}
