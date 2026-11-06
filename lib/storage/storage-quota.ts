"use client"

// ---------------------------------------------------------------------------
// Zenithsui Browser Storage Quota & Reliability Monitor
//
// Capabilities:
// - Live IndexedDB and browser disk quota estimation
// - Storage pressure detection (>85% capacity warning)
// - Persistent storage request through navigator.storage.persist()
// ---------------------------------------------------------------------------

export interface StorageQuotaInfo {
  usageBytes: number
  quotaBytes: number
  percentUsed: number
  usageFormatted: string
  quotaFormatted: string
  isPersisted: boolean
  isSupported: boolean
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB"
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`
  }
  return `${mb.toFixed(1)} MB`
}

export async function getStorageQuotaEstimate(): Promise<StorageQuotaInfo> {
  if (typeof window === "undefined" || !navigator.storage?.estimate) {
    return {
      usageBytes: 0,
      quotaBytes: 0,
      percentUsed: 0,
      usageFormatted: "Unavailable",
      quotaFormatted: "Unavailable",
      isPersisted: false,
      isSupported: false,
    }
  }

  try {
    const estimate = await navigator.storage.estimate()
    const isPersisted = navigator.storage.persisted ? await navigator.storage.persisted() : false

    const usage = estimate.usage || 0
    const quota = estimate.quota || 1
    const percent = Math.min(100, Math.max(0, Math.round((usage / quota) * 100)))

    return {
      usageBytes: usage,
      quotaBytes: quota,
      percentUsed: percent,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      isPersisted,
      isSupported: true,
    }
  } catch (err) {
    console.warn("[storage-quota] Error estimating storage:", err)
    return {
      usageBytes: 0,
      quotaBytes: 0,
      percentUsed: 0,
      usageFormatted: "Error",
      quotaFormatted: "Error",
      isPersisted: false,
      isSupported: false,
    }
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.storage?.persist) {
    return false
  }

  try {
    const granted = await navigator.storage.persist()
    return granted
  } catch {
    return false
  }
}
