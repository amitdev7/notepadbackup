"use client"

// ---------------------------------------------------------------------------
// Zenithsui Settings — Temporary Elements & Expiration Dedicated Control Panel
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from "react"
import { useShellStore, DEFAULT_TEMPORARY_PREFERENCES } from "@/lib/shell-store"
import { EXPIRATION_PRESETS } from "@/lib/types"
import {
  getSynchronousExpiredCount,
  subscribeExpiredArchive,
  clearExpiredRecords,
} from "@/lib/storage/expired-archive"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Timer,
  Clock,
  Archive,
  Trash,
  Sparkle,
  Bell,
  Eye,
  CheckCircle,
  ArrowCounterClockwise,
} from "@phosphor-icons/react"

export function TemporarySettingsTab() {
  const temporarySettings = useShellStore((s) => s.preferences.temporarySettings)
  const updateTemporarySettings = useShellStore((s) => s.updateTemporarySettings)
  const setExpiredArchiveOpen = useShellStore((s) => s.setExpiredArchiveOpen)

  const [archiveCount, setArchiveCount] = useState<number>(() => getSynchronousExpiredCount())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)

  // Custom duration local state
  const currentDurationMs = temporarySettings.defaultDurationMs
  const isCustom = !EXPIRATION_PRESETS.some((p) => p.value === currentDurationMs)
  
  const customDays = Math.floor(currentDurationMs / (24 * 3600 * 1000))
  const customHours = Math.floor((currentDurationMs % (24 * 3600 * 1000)) / (3600 * 1000))
  const customMins = Math.floor((currentDurationMs % (3600 * 1000)) / (60 * 1000))
  const customSecs = Math.floor((currentDurationMs % (60 * 1000)) / 1000)

  // Subscribe to archive changes to keep badge count in sync
  useEffect(() => {
    setArchiveCount(getSynchronousExpiredCount())
    const unsubscribe = subscribeExpiredArchive(() => {
      setArchiveCount(getSynchronousExpiredCount())
    })
    return () => unsubscribe()
  }, [])

  const handleSelectPreset = useCallback((ms: number) => {
    updateTemporarySettings({ defaultDurationMs: ms })
  }, [updateTemporarySettings])

  const handleCustomDurationChange = useCallback((d: number, h: number, m: number, s: number) => {
    const totalMs = (d * 86400 + h * 3600 + m * 60 + s) * 1000
    if (totalMs >= 1000) {
      updateTemporarySettings({ defaultDurationMs: totalMs })
    }
  }, [updateTemporarySettings])

  const handleClearArchive = useCallback(async () => {
    await clearExpiredRecords()
    setShowClearConfirm(false)
    setArchiveCount(0)
    setFeedbackNotice("Expired Elements Archive has been cleared.")
    setTimeout(() => setFeedbackNotice(null), 3000)
  }, [])

  const handleResetDefaults = useCallback(() => {
    updateTemporarySettings(DEFAULT_TEMPORARY_PREFERENCES)
    setFeedbackNotice("Temporary elements settings reset to defaults.")
    setTimeout(() => setFeedbackNotice(null), 3000)
  }, [updateTemporarySettings])

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Notice Feedback Banner */}
      {feedbackNotice && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs animate-card-fade">
          <CheckCircle className="w-4 h-4 shrink-0" weight="fill" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Hero Overview Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
          <Timer className="w-6 h-6" weight="duotone" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Temporary Elements & Automatic Expiration Engine
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Specify how long canvas elements remain visible. Once their countdown reaches zero, they automatically vanish from the active canvas and move to the local Expired Elements Archive for safe recovery.
          </p>
        </div>
      </div>

      {/* Section 1: Global Mode Toggle */}
      <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
              Temporary Creation Mode
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              When turned on, any newly created drawings, shapes, text, images, or notes automatically receive an expiration timer.
            </span>
          </div>
          <Switch
            checked={temporarySettings.temporaryMode}
            onCheckedChange={(checked) => updateTemporarySettings({ temporaryMode: checked })}
          />
        </div>

        {temporarySettings.temporaryMode && (
          <div className="pt-2 border-t border-stone-200/50 dark:border-stone-800/50 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Temporary Mode is currently ACTIVE on the canvas.
          </div>
        )}
      </div>

      {/* Section 2: Default Duration Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" weight="bold" />
              Default Element Lifetime
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Initial duration assigned to newly created temporary elements.
            </p>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {EXPIRATION_PRESETS.map((preset) => {
            const isSelected = !isCustom && currentDurationMs === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleSelectPreset(preset.value)}
                className={cn(
                  "py-2 px-2.5 rounded-xl border text-center transition-all text-xs font-medium",
                  isSelected
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20"
                    : "bg-white dark:bg-stone-800 border-stone-200/70 dark:border-stone-700/70 text-stone-700 dark:text-stone-300 hover:border-amber-500/50 hover:bg-amber-500/5"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Custom Duration Inputs */}
        <div className="p-3 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/40 dark:bg-stone-900/40 space-y-2 mt-2">
          <div className="text-[11px] font-medium text-stone-600 dark:text-stone-300">
            Or specify custom duration:
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Days</label>
              <input
                type="number"
                min="0"
                max="365"
                value={customDays}
                onChange={(e) =>
                  handleCustomDurationChange(
                    Math.max(0, parseInt(e.target.value) || 0),
                    customHours,
                    customMins,
                    customSecs
                  )
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Hours</label>
              <input
                type="number"
                min="0"
                max="23"
                value={customHours}
                onChange={(e) =>
                  handleCustomDurationChange(
                    customDays,
                    Math.max(0, parseInt(e.target.value) || 0),
                    customMins,
                    customSecs
                  )
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={customMins}
                onChange={(e) =>
                  handleCustomDurationChange(
                    customDays,
                    customHours,
                    Math.max(0, parseInt(e.target.value) || 0),
                    customSecs
                  )
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-0.5">Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={customSecs}
                onChange={(e) =>
                  handleCustomDurationChange(
                    customDays,
                    customHours,
                    customMins,
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Canvas Overlay & Animation Experience */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-stone-500" weight="bold" />
          Canvas Display & Animations
        </h4>

        <div className="divide-y divide-stone-200/50 dark:divide-stone-800/50 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white dark:bg-stone-800/40 overflow-hidden">
          {/* Show Countdown Badges */}
          <div className="flex items-center justify-between p-3.5">
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Show Countdown Badges on Canvas
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Render an interactive floating badge above temporary elements displaying their remaining lifetime.
              </span>
            </div>
            <Switch
              checked={temporarySettings.showCountdown}
              onCheckedChange={(checked) => updateTemporarySettings({ showCountdown: checked })}
            />
          </div>

          {/* Vanishing Animation */}
          <div className="flex items-center justify-between p-3.5">
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Disappearing Fade Animation
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Smoothly fade and collapse elements as their countdown reaches zero before moving to archive.
              </span>
            </div>
            <Switch
              checked={temporarySettings.disappearingAnimation}
              onCheckedChange={(checked) => updateTemporarySettings({ disappearingAnimation: checked })}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Notifications & Urgency Warnings */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-stone-500" weight="bold" />
          Notifications & Expiration Warnings
        </h4>

        <div className="divide-y divide-stone-200/50 dark:divide-stone-800/50 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-white dark:bg-stone-800/40 overflow-hidden">
          {/* Notify On Expiration */}
          <div className="flex items-center justify-between p-3.5">
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Expiration Notifications
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Display in-app toast notices when elements vanish from the canvas.
              </span>
            </div>
            <Switch
              checked={temporarySettings.notificationsEnabled}
              onCheckedChange={(checked) => updateTemporarySettings({ notificationsEnabled: checked })}
            />
          </div>

          {/* Expiring Soon Threshold */}
          <div className="flex items-center justify-between p-3.5">
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Urgency Warning Threshold
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Highlight badges in amber when lifetime is below this threshold (red pulse at 10s).
              </span>
            </div>
            <select
              value={temporarySettings.expiringSoonSeconds}
              onChange={(e) =>
                updateTemporarySettings({ expiringSoonSeconds: parseInt(e.target.value) || 60 })
              }
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds (1 min)</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 5: Expired Elements Archive & Retention */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5 text-stone-500" weight="bold" />
          Archive Storage & Retention
        </h4>

        <div className="p-4 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">
                Archive Retention Period
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Choose how long vanished elements remain recoverable in IndexedDB.
              </span>
            </div>
            <select
              value={temporarySettings.archiveRetention}
              onChange={(e) =>
                updateTemporarySettings({
                  archiveRetention: e.target.value as "indefinite" | "7days" | "30days",
                })
              }
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
            >
              <option value="indefinite">Indefinite (Keep forever)</option>
              <option value="30days">30 Days</option>
              <option value="7days">7 Days</option>
            </select>
          </div>

          <div className="pt-3 border-t border-stone-200/50 dark:border-stone-800/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Currently Archived:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold">
                {archiveCount} {archiveCount === 1 ? "element" : "elements"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpiredArchiveOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" weight="bold" />
                Open Archive…
              </button>

              {archiveCount > 0 && !showClearConfirm && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              {showClearConfirm && (
                <div className="flex items-center gap-1.5 animate-card-fade">
                  <span className="text-[11px] text-red-600 dark:text-red-400">Clear all?</span>
                  <button
                    type="button"
                    onClick={handleClearArchive}
                    className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-medium hover:bg-red-700"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px]"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Defaults Action */}
      <div className="pt-4 border-t border-stone-200/60 dark:border-stone-800/60 flex justify-end">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors"
        >
          <ArrowCounterClockwise className="w-3.5 h-3.5" />
          Reset temporary settings to defaults
        </button>
      </div>
    </div>
  )
}
