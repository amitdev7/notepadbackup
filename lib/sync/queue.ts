// ---------------------------------------------------------------------------
// Zenithsui Offline Mutation Queue Engine with Coalescing
// ---------------------------------------------------------------------------

import { openZenithsuiDb, STORES, withTransaction } from "../storage/db"
import type { CanvasDocumentJson } from "../db/types"

export type MutationType = "upsert_document" | "delete_document" | "upload_asset"

export interface QueuedMutation {
  id: string
  docId: string
  type: MutationType
  baseRevision: number
  payload: {
    name?: string
    documentJson?: CanvasDocumentJson
    projectId?: string | null
    [key: string]: unknown
  }
  retryCount: number
  nextRetryAt: number
  createdAt: number
  lastError?: string
}

export async function enqueueMutation(
  docId: string,
  type: MutationType,
  baseRevision: number,
  payload: QueuedMutation["payload"]
): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", async (tx) => {
    const store = tx.objectStore(STORES.SYNC_QUEUE)
    const index = store.index("by_docId")

    // Coalescing: check if an existing mutation for this docId is already queued
    const req = index.getAll(docId)

    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const existingList = (req.result as QueuedMutation[]) || []
        const existingUpsert = existingList.find((m) => m.type === "upsert_document")

        if (type === "upsert_document" && existingUpsert) {
          // Collapse into existing mutation: preserve initial baseRevision, update payload & timestamp
          existingUpsert.payload = {
            ...existingUpsert.payload,
            ...payload,
            documentJson: payload.documentJson || existingUpsert.payload.documentJson,
          }
          existingUpsert.retryCount = 0
          existingUpsert.nextRetryAt = Date.now()
          store.put(existingUpsert)
        } else {
          // New mutation entry
          const item: QueuedMutation = {
            id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            docId,
            type,
            baseRevision,
            payload,
            retryCount: 0,
            nextRetryAt: Date.now(),
            createdAt: Date.now(),
          }
          store.put(item)
        }
        resolve()
      }
    })
  })
}

export async function getNextPendingMutation(): Promise<QueuedMutation | null> {
  const db = await openZenithsuiDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readonly")
    const store = tx.objectStore(STORES.SYNC_QUEUE)
    const index = store.index("by_createdAt")
    const req = index.openCursor()

    const now = Date.now()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve(null)
        return
      }
      const item = cursor.value as QueuedMutation
      if (item.nextRetryAt <= now) {
        resolve(item)
      } else {
        cursor.continue()
      }
    }
    req.onerror = () => resolve(null)
  })
}

export async function removeMutation(id: string): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", (tx) => {
    tx.objectStore(STORES.SYNC_QUEUE).delete(id)
  })
}

export async function updateMutationRetry(
  id: string,
  retryCount: number,
  delayMs: number,
  errorMsg: string
): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", async (tx) => {
    const store = tx.objectStore(STORES.SYNC_QUEUE)
    const req = store.get(id)
    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const item = req.result as QueuedMutation | undefined
        if (item) {
          item.retryCount = retryCount
          item.nextRetryAt = Date.now() + delayMs
          item.lastError = errorMsg
          store.put(item)
        }
        resolve()
      }
    })
  })
}

export async function clearMutationsForDoc(docId: string): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", async (tx) => {
    const store = tx.objectStore(STORES.SYNC_QUEUE)
    const index = store.index("by_docId")
    const req = index.getAll(docId)

    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const items = (req.result as QueuedMutation[]) || []
        for (const item of items) {
          store.delete(item.id)
        }
        resolve()
      }
    })
  })
}

export async function getPendingMutationCount(): Promise<number> {
  const db = await openZenithsuiDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readonly")
    const store = tx.objectStore(STORES.SYNC_QUEUE)
    const req = store.count()
    req.onsuccess = () => resolve(req.result || 0)
    req.onerror = () => resolve(0)
  })
}

