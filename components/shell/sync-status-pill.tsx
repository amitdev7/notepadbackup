"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Global Intelligent Sync & Offline Status Pill with Details Popover
//
// Shows live connectivity and persistence states:
// - Synced (green check / dot)
// - Saved locally · Waiting to sync (amber cloud)
// - Syncing... (pulsing blue spinner)
// - Offline · Changes saved locally (cloud slash)
// - Server unavailable · Changes saved locally (amber cloud alert)
// - Sync needs attention (red warning)
// - Conflict detected (amber split arrows)
// - Save failed · Retry required (red alert)
// - Saved on this device (neutral local disk)
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react"
import { useSyncStore } from "@/lib/sync/engine"
import { useNetworkStore } from "@/lib/sync/network"
import { useShellStore } from "@/lib/shell-store"
import { getStorageQuotaEstimate, type StorageQuotaInfo } from "@/lib/storage/storage-quota"
import {
  Check,
  ArrowsClockwise,
  CloudSlash,
  CloudCheck,
  CloudWarning,
  WarningCircle,
  HardDrive,
  GitFork,
  ArrowClockwise,
  Gear,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "Never"
  const elapsedSec = Math.floor((Date.now() - timestamp) / 1000)
  if (elapsedSec < 10) return "Just now"
  if (elapsedSec < 60) return `${elapsedSec}s ago`
  const min = Math.floor(elapsedSec / 60)
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  return `${hours}h ago`
}

export function SyncStatusPill({ className }: { className?: string } = {}) {
  const syncStatus = useSyncStore((s) => s.status)
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const failedCount = useSyncStore((s) => s.failedCount)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const lastSyncError = useSyncStore((s) => s.lastSyncError)
  const triggerSync = useSyncStore((s) => s.triggerSync)
  const retryFailed = useSyncStore((s) => s.retryFailed)
  const refreshCounts = useSyncStore((s) => s.refreshCounts)

  const networkState = useNetworkStore((s) => s.state)
  const latencyMs = useNetworkStore((s) => s.latencyMs)
  const checkReachability = useNetworkStore((s) => s.checkReachability)

  const [isOpen, setIsOpen] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Load storage quota when popover opens
  useEffect(() => {
    if (isOpen) {
      void refreshCounts()
      void getStorageQuotaEstimate().then(setQuotaInfo)
    }
  }, [isOpen, refreshCounts])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  // Determine effective status display
  let label = "Saved locally"
  let dotColor = "bg-stone-400"
  let Icon = HardDrive

  if (syncStatus === "save-failed") {
    label = "Save failed · Retry required"
    dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
    Icon = WarningCircle
  } else if (networkState === "offline" || syncStatus === "offline") {
    label = "Offline · Changes saved locally"
    dotColor = "bg-stone-500"
    Icon = CloudSlash
  } else if (networkState === "server-unavailable" || syncStatus === "server-unavailable") {
    label = "Server unavailable · Changes saved locally"
    dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
    Icon = CloudWarning
  } else if (syncStatus === "syncing") {
    label = "Syncing…"
    dotColor = "bg-blue-500 animate-ping"
    Icon = ArrowsClockwise
  } else if (syncStatus === "conflict") {
    label = "Conflict detected"
    dotColor = "bg-amber-500"
    Icon = GitFork
  } else if (syncStatus === "error") {
    label = "Sync needs attention"
    dotColor = "bg-red-500"
    Icon = WarningCircle
  } else if (pendingCount > 0) {
    label = "Saved locally · Waiting to sync"
    dotColor = "bg-amber-500"
    Icon = CloudCheck
  } else if (syncStatus === "synced") {
    label = "Synced"
    dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-ios-save-halo"
    Icon = Check
  } else if (syncStatus === "local-only") {
    label = "Saved on this device"
    dotColor = "bg-stone-400"
    Icon = HardDrive
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Status Pill Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono select-none transition-all cursor-pointer tactile-press",
          "hover:bg-black/5 dark:hover:bg-white/10 outline-none",
          className,
          syncStatus === "save-failed"
            ? "text-red-600 bg-red-500/10 border border-red-500/30"
            : syncStatus === "synced"
            ? "text-emerald-600 dark:text-emerald-400"
            : networkState === "offline"
            ? "text-stone-500"
            : "text-stone-600 dark:text-stone-300"
        )}
        title="Click to view connection & sync details"
        aria-label={`Sync status: ${label}. Click for details.`}
      >
        <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} aria-hidden="true" />
        <span className="hidden sm:inline font-semibold">{label}</span>
      </button>

      {/* ── Detailed Sync & Connectivity Popover ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Sync & Storage Details"
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 p-4 rounded-2xl bg-[var(--sq-paper)] border border-[var(--sq-border)] shadow-2xl backdrop-blur-xl z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--sq-ink)] select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--sq-border)] mb-3">
            <div className="flex items-center gap-2">
              <Icon size={16} weight="bold" className={cn(
                syncStatus === "synced" ? "text-emerald-500" :
                syncStatus === "save-failed" || syncStatus === "error" ? "text-red-500" :
                networkState === "offline" ? "text-stone-400" : "text-amber-500"
              )} />
              <span className="font-bold text-[13px]">{label}</span>
            </div>
            {latencyMs !== null && networkState === "online" && (
              <span className="text-[10px] font-mono text-stone-400">
                {latencyMs}ms
              </span>
            )}
          </div>

          {/* Details List */}
          <div className="space-y-2 mb-3.5">
            {/* Network State */}
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Connection</span>
              <span className="font-semibold flex items-center gap-1.5">
                <span className={cn(
                  "size-2 rounded-full",
                  networkState === "online" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" :
                  networkState === "server-unavailable" ? "bg-amber-500" : "bg-stone-400"
                )} />
                {networkState === "online" ? "Online" : networkState === "server-unavailable" ? "Server Unavailable" : "Offline"}
              </span>
            </div>

            {/* Local Persistence */}
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Local Storage</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={12} weight="bold" />
                Durable in IndexedDB
              </span>
            </div>

            {/* Pending Mutations */}
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Pending Changes</span>
              <span className="font-mono font-bold">
                {pendingCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">{pendingCount} queued</span>
                ) : (
                  <span className="text-stone-400">0 pending</span>
                )}
              </span>
            </div>

            {/* Last Synced */}
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Last Synced</span>
              <span className="font-mono text-stone-600 dark:text-stone-300">
                {formatRelativeTime(lastSyncedAt)}
              </span>
            </div>

            {/* Disk Usage */}
            {quotaInfo && quotaInfo.isSupported && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Storage Used</span>
                <span className="font-mono text-stone-600 dark:text-stone-300">
                  {quotaInfo.usageFormatted} ({quotaInfo.percentUsed}%)
                </span>
              </div>
            )}

            {/* Sync Error Notice if any */}
            {lastSyncError && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] mt-2">
                <span className="font-bold block">Sync Issue:</span>
                <span className="truncate block">{lastSyncError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--sq-border)]">
            <button
              type="button"
              onClick={async () => {
                await checkReachability(true)
                triggerSync(false)
              }}
              className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--ui-accent,#007AFF)] hover:opacity-90 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
            >
              <ArrowClockwise size={13} weight="bold" />
              <span>Sync Now</span>
            </button>

            {failedCount > 0 && (
              <button
                type="button"
                onClick={() => void retryFailed()}
                className="py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/30 transition cursor-pointer"
                title="Retry failed mutations"
              >
                Retry ({failedCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                useShellStore.getState().setSettingsOpen(true)
                useShellStore.getState().setSettingsSection("visibility")
              }}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition cursor-pointer"
              title="Open Display & Visibility Settings"
            >
              <Gear size={15} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
            <span className="text-[11px] text-muted-foreground">Show in Top Toolbar</span>
            <button
              type="button"
              onClick={() => {
                useShellStore.getState().setShowStatusIndicators(false)
                setIsOpen(false)
              }}
              className="text-[11px] font-medium text-[#007AFF] hover:underline cursor-pointer"
            >
              Hide Pill
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
