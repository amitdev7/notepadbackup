"use client"

// ---------------------------------------------------------------------------
// Zenithsui Background Sync Engine & Finite State Machine
// ---------------------------------------------------------------------------

import { create } from "zustand"
import {
  getNextPendingMutation,
  removeMutation,
  updateMutationRetry,
  getPendingMutationCount,
  type QueuedMutation,
} from "./queue"
import { getLocalDocument, saveLocalDocument, type LocalSyncStatus } from "../storage/documents"
import { syncPendingDocumentAssets } from "../storage/document-assets"
import { useAuthStore } from "../auth-store"
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
  lastSyncedAt: number | null
  conflictInfo: ConflictInfo | null

  // Actions
  setStatus: (status: LocalSyncStatus) => void
  setConflict: (info: ConflictInfo | null) => void
  triggerSync: () => void
  resolveConflict: (resolution: "save_as_copy" | "keep_mine" | "use_cloud") => Promise<void>
}

export const useSyncStore = create<SyncEngineStore>((set, get) => ({
  status: "saved-locally",
  pendingCount: 0,
  lastSyncedAt: null,
  conflictInfo: null,

  setStatus: (status) => set({ status }),
  setConflict: (conflictInfo) => set({ conflictInfo, status: conflictInfo ? "conflict" : "synced" }),

  triggerSync: () => {
    runSyncWorker()
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
    runSyncWorker()
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

export async function runSyncWorker(): Promise<void> {
  if (isWorkerRunning || typeof window === "undefined") return
  isWorkerRunning = true

  const syncStore = useSyncStore.getState()
  const authStore = useAuthStore.getState()

  // Only run sync if online and authenticated
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    syncStore.setStatus("offline")
    isWorkerRunning = false
    return
  }

  if (authStore.state !== "authenticated") {
    syncStore.setStatus("local-only")
    isWorkerRunning = false
    return
  }

  try {
    let pendingCount = await getPendingMutationCount()
    useSyncStore.setState({ pendingCount })

    let mutation = await getNextPendingMutation()

    while (mutation) {
      syncStore.setStatus("syncing")

      const result = await processMutation(mutation)

      if (result.success) {
        await removeMutation(mutation.id)
        useSyncStore.setState({ lastSyncedAt: Date.now() })
      } else if (result.conflict) {
        // Halt processing for this document and display conflict resolution
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
        // Transient error: update backoff retry
        const nextRetry = mutation.retryCount + 1
        const delay = calculateBackoff(nextRetry)
        await updateMutationRetry(mutation.id, nextRetry, delay, result.error || "Sync failed")
        syncStore.setStatus("error")
        break
      }

      pendingCount = await getPendingMutationCount()
      useSyncStore.setState({ pendingCount })
      mutation = await getNextPendingMutation()
    }

    if (!syncStore.conflictInfo) {
      syncStore.setStatus(pendingCount > 0 ? "saved-locally" : "synced")
    }
  } catch {
    syncStore.setStatus("error")
  } finally {
    isWorkerRunning = false
  }
}

async function processMutation(mutation: QueuedMutation): Promise<{
  success: boolean
  conflict?: { serverRevision: number; serverDocument: CanvasDocumentJson }
  error?: string
}> {
  try {
    if (mutation.type === "upsert_document") {
      const response = await fetch(`/api/documents/${mutation.docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        const data = await response.json().catch(() => ({}))
        return { success: false, error: data.error?.message || response.statusText }
      }

      return { success: true }
    } else if (mutation.type === "delete_document") {
      const response = await fetch(`/api/documents/${mutation.docId}`, {
        method: "DELETE",
      })
      return { success: response.ok }
    } else if (mutation.type === "upload_asset") {
      await syncPendingDocumentAssets()
      return { success: true }
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: errorMsg }
  }
}

// Window event listeners for online and visibility
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useSyncStore.getState().setStatus("saved-locally")
    void syncPendingDocumentAssets()
    runSyncWorker()
  })

  window.addEventListener("offline", () => {
    useSyncStore.getState().setStatus("offline")
  })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      runSyncWorker()
    }
  })
}

