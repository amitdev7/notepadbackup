"use client"

// ---------------------------------------------------------------------------
// Zenithsui Background Sync Engine & Finite State Machine
//
// Key Principles:
// 1. Local persistence always succeeds first before cloud synchronization.
// 2. Intelligent connectivity awareness (online, offline, server-unavailable).
// 3. Durable queue with coalescing, exponential backoff, and idempotency.
// 4. Web Locks API & BroadcastChannel to prevent multi-tab concurrency races.
// 5. Authentic conflict resolution without silent data loss.
// ---------------------------------------------------------------------------

import { create } from "zustand"
import {
  getNextPendingMutation,
  removeMutation,
  updateMutationRetry,
  getPendingMutationCount,
  getFailedMutationCount,
  resetFailedMutations,
  type QueuedMutation,
} from "./queue"
import { getLocalDocument, saveLocalDocument, type LocalSyncStatus } from "../storage/documents"
import { syncPendingDocumentAssets } from "../storage/document-assets"
import { useAuthStore } from "../auth-store"
import { useShellStore } from "../shell-store"
import { useNetworkStore } from "./network"
import type { CanvasDocumentJson } from "../db/types"

export interface ConflictInfo {
  docId: string
  docName: string
  localRevision: number
  serverRevision: number
  localDocument: CanvasDocumentJson
  serverDocument: CanvasDocumentJson
}

interface SyncEngineStore {
  status: LocalSyncStatus
  pendingCount: number
  failedCount: number
  lastSyncedAt: number | null
  lastSyncError: string | null
  conflictInfo: ConflictInfo | null

  // Actions
  setStatus: (status: LocalSyncStatus) => void
  setConflict: (info: ConflictInfo | null) => void
  triggerSync: (forceRetryFailed?: boolean) => void
  retryFailed: () => Promise<void>
  refreshCounts: () => Promise<void>
  resolveConflict: (resolution: "save_as_copy" | "keep_mine" | "use_cloud") => Promise<void>
}

export const useSyncStore = create<SyncEngineStore>((set, get) => ({
  status: "saved-locally",
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  lastSyncError: null,
  conflictInfo: null,

  setStatus: (status) => set({ status }),
  setConflict: (conflictInfo) =>
    set({
      conflictInfo,
      status: conflictInfo ? "conflict" : "synced",
    }),

  refreshCounts: async () => {
    try {
      const pending = await getPendingMutationCount()
      const failed = await getFailedMutationCount()
      set({ pendingCount: pending, failedCount: failed })
    } catch {}
  },

  retryFailed: async () => {
    await resetFailedMutations()
    set({ lastSyncError: null })
    get().triggerSync(true)
  },

  triggerSync: (forceRetryFailed = false) => {
    const dbSettings = useShellStore.getState().preferences?.databaseSettings
    if (dbSettings && (!dbSettings.enabled || dbSettings.storageMode === "local")) {
      set({ status: "local-only" })
      return
    }

    if (forceRetryFailed) {
      void resetFailedMutations()
    }

    void runSyncWorker()
  },

  resolveConflict: async (resolution) => {
    const conflict = get().conflictInfo
    if (!conflict) return

    const { docId, docName, localDocument, serverDocument, serverRevision } = conflict
    const localRecord = await getLocalDocument(docId)

    if (resolution === "save_as_copy") {
      // 1. Create a copy of user's local edits as a separate document
      const copyId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await saveLocalDocument({
        id: copyId,
        name: `${docName} (My Copy)`,
        doc: {
          fileName: `${docName} (My Copy)`,
          nodes: localDocument.nodes,
          order: localDocument.order,
        },
        baseRevision: 1,
        serverRevision: 1,
        syncStatus: "saved-locally",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      })

      // 2. Accept server version on original document
      if (localRecord) {
        localRecord.doc = {
          fileName: docName,
          nodes: serverDocument.nodes,
          order: serverDocument.order,
        }
        localRecord.baseRevision = serverRevision
        localRecord.serverRevision = serverRevision
        localRecord.syncStatus = "synced"
        localRecord.updatedAt = Date.now()
        await saveLocalDocument(localRecord)
      }
    } else if (resolution === "keep_mine") {
      // Force overwrite by updating baseRevision to current server revision and re-enqueueing
      if (localRecord) {
        localRecord.baseRevision = serverRevision
        localRecord.syncStatus = "saved-locally"
        await saveLocalDocument(localRecord)
      }
    } else if (resolution === "use_cloud") {
      // Accept cloud version
      if (localRecord) {
        localRecord.doc = {
          fileName: docName,
          nodes: serverDocument.nodes,
          order: serverDocument.order,
        }
        localRecord.baseRevision = serverRevision
        localRecord.serverRevision = serverRevision
        localRecord.syncStatus = "synced"
        localRecord.updatedAt = Date.now()
        await saveLocalDocument(localRecord)
      }
    }

    set({ conflictInfo: null, status: "synced" })
    void runSyncWorker()
  },
}))

let isWorkerRunning = false

function calculateBackoff(retryCount: number): number {
  const base = 1000 // 1s
  const max = 30000 // 30s
  const exponential = Math.min(base * Math.pow(2, retryCount), max)
  const jitter = Math.random() * 1000
  return exponential + jitter
}

/**
 * Executes synchronization with cross-tab Web Locks API concurrency protection.
 */
export async function runSyncWorker(): Promise<void> {
  if (typeof window === "undefined" || isWorkerRunning) return

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      await navigator.locks.request("zenithsui_sync_lock", { ifAvailable: true }, async (lock) => {
        if (!lock) return // Another browser tab is currently syncing the queue
        await runInternalSyncWorker()
      })
    } catch {
      await runInternalSyncWorker()
    }
  } else {
    await runInternalSyncWorker()
  }
}

async function runInternalSyncWorker(): Promise<void> {
  if (isWorkerRunning || typeof window === "undefined") return
  isWorkerRunning = true

  const syncStore = useSyncStore.getState()
  const authStore = useAuthStore.getState()
  const network = useNetworkStore.getState()

  // 1. Offline status check
  if (network.state === "offline" || (typeof navigator !== "undefined" && !navigator.onLine)) {
    syncStore.setStatus("offline")
    await syncStore.refreshCounts()
    isWorkerRunning = false
    return
  }

  // 2. Auth status check
  if (authStore.state !== "authenticated") {
    syncStore.setStatus("local-only")
    await syncStore.refreshCounts()
    isWorkerRunning = false
    return
  }

  // 3. Database configuration check
  const dbSettings = useShellStore.getState().preferences?.databaseSettings
  if (dbSettings && (!dbSettings.enabled || dbSettings.storageMode === "local")) {
    syncStore.setStatus("local-only")
    await syncStore.refreshCounts()
    isWorkerRunning = false
    return
  }

  try {
    let pendingCount = await getPendingMutationCount()
    let failedCount = await getFailedMutationCount()
    useSyncStore.setState({ pendingCount, failedCount })

    if (pendingCount === 0) {
      if (!syncStore.conflictInfo) {
        syncStore.setStatus("synced")
      }
      isWorkerRunning = false
      return
    }

    // 4. Verify backend reachability before opening stream
    const isReachable = await network.checkReachability()
    if (!isReachable) {
      syncStore.setStatus("server-unavailable")
      isWorkerRunning = false
      return
    }

    let mutation = await getNextPendingMutation()

    while (mutation) {
      syncStore.setStatus("syncing")

      const result = await processMutation(mutation)

      if (result.success) {
        await removeMutation(mutation.id)
        useSyncStore.setState({
          lastSyncedAt: Date.now(),
          lastSyncError: null,
        })
      } else if (result.conflict) {
        // Revision mismatch: halt and prompt user via conflict resolution UI
        syncStore.setConflict({
          docId: mutation.docId,
          docName: mutation.payload.name || "Untitled Drawing",
          localRevision: mutation.baseRevision,
          serverRevision: result.conflict.serverRevision,
          localDocument: (mutation.payload.documentJson as CanvasDocumentJson) || { nodes: {}, order: [] },
          serverDocument: result.conflict.serverDocument,
        })
        break
      } else {
        // Transient network or server failure: increment retry backoff
        const nextRetry = mutation.retryCount + 1
        const delay = calculateBackoff(nextRetry)
        await updateMutationRetry(mutation.id, nextRetry, delay, result.error || "Sync failed")
        useSyncStore.setState({
          lastSyncError: result.error || "Sync failed",
        })

        if (result.isServerDown) {
          syncStore.setStatus("server-unavailable")
        } else {
          syncStore.setStatus("error")
        }
        break
      }

      pendingCount = await getPendingMutationCount()
      failedCount = await getFailedMutationCount()
      useSyncStore.setState({ pendingCount, failedCount })
      mutation = await getNextPendingMutation()
    }

    pendingCount = await getPendingMutationCount()
    failedCount = await getFailedMutationCount()
    useSyncStore.setState({ pendingCount, failedCount })

    if (!syncStore.conflictInfo && syncStore.status !== "error" && syncStore.status !== "server-unavailable") {
      syncStore.setStatus(pendingCount > 0 ? "saved-locally" : "synced")
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Sync worker exception"
    useSyncStore.setState({ lastSyncError: errorMsg })
    syncStore.setStatus("error")
  } finally {
    isWorkerRunning = false
  }
}

async function processMutation(mutation: QueuedMutation): Promise<{
  success: boolean
  conflict?: { serverRevision: number; serverDocument: CanvasDocumentJson }
  error?: string
  isServerDown?: boolean
}> {
  try {
    if (mutation.type === "upsert_document") {
      const response = await fetch(`/api/documents/${mutation.docId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": mutation.idempotencyKey || mutation.id,
        },
        body: JSON.stringify({
          baseRevision: mutation.baseRevision,
          documentJson: mutation.payload.documentJson,
          name: mutation.payload.name,
        }),
      })

      if (response.status === 409) {
        const data = await response.json()
        return {
          success: false,
          conflict: {
            serverRevision: data.error?.serverRevision || mutation.baseRevision + 1,
            serverDocument: data.error?.serverDocument || { nodes: {}, order: [] },
          },
        }
      }

      if (!response.ok) {
        useNetworkStore.getState().reportRequestFailure(response.status)
        const data = await response.json().catch(() => ({}))
        const isServerDown = response.status >= 500 || response.status === 408
        return {
          success: false,
          error: data.error?.message || response.statusText,
          isServerDown,
        }
      }

      useNetworkStore.getState().reportRequestSuccess()
      return { success: true }
    } else if (mutation.type === "delete_document") {
      const response = await fetch(`/api/documents/${mutation.docId}`, {
        method: "DELETE",
        headers: {
          "X-Idempotency-Key": mutation.id,
        },
      })
      if (!response.ok) {
        useNetworkStore.getState().reportRequestFailure(response.status)
        return { success: false, error: response.statusText }
      }
      useNetworkStore.getState().reportRequestSuccess()
      return { success: true }
    } else if (mutation.type === "upload_asset") {
      await syncPendingDocumentAssets()
      return { success: true }
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    useNetworkStore.getState().reportRequestFailure()
    return { success: false, error: errorMsg, isServerDown: true }
  }
}

// Global lifecycle listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useSyncStore.getState().setStatus("saved-locally")
    void syncPendingDocumentAssets()
    void runSyncWorker()
  })

  window.addEventListener("offline", () => {
    useSyncStore.getState().setStatus("offline")
  })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void runSyncWorker()
    }
  })

  window.addEventListener("focus", () => {
    void runSyncWorker()
  })
}
