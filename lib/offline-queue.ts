"use client"

// ---------------------------------------------------------------------------
// Durable Offline Mutation Queue
//
// Ensures changes made while disconnected or offline are durably saved to
// local storage / IndexedDB and cleanly reconciled upon network restoration.
// ---------------------------------------------------------------------------

import type { CollaborationOp } from "./collaboration-types"

export interface QueuedOfflineOp {
  id: string
  dbId: string
  fileId: string
  op: CollaborationOp
  baseRevision: number
  timestamp: number
}

const QUEUE_PREFIX = "zenithsui:offline_queue:"

function getQueueKey(dbId: string, fileId: string): string {
  return `${QUEUE_PREFIX}${dbId}:${fileId}`
}

/**
 * Retrieve queued operations for a specific database file
 */
export function getOfflineQueue(dbId: string, fileId: string): QueuedOfflineOp[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(getQueueKey(dbId, fileId))
    if (!raw) return []
    return JSON.parse(raw) as QueuedOfflineOp[]
  } catch (err) {
    console.warn("[OfflineQueue] Error reading queue:", err)
    return []
  }
}

/**
 * Enqueue a mutation to the durable offline queue
 */
export function enqueueOfflineOp(
  dbId: string,
  fileId: string,
  op: CollaborationOp,
  baseRevision: number
): void {
  if (typeof window === "undefined") return
  try {
    const queue = getOfflineQueue(dbId, fileId)
    const item: QueuedOfflineOp = {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dbId,
      fileId,
      op,
      baseRevision,
      timestamp: Date.now(),
    }
    queue.push(item)
    localStorage.setItem(getQueueKey(dbId, fileId), JSON.stringify(queue))
  } catch (err) {
    console.warn("[OfflineQueue] Error enqueueing operation:", err)
  }
}

/**
 * Clear the offline queue for a file once mutations are confirmed by server
 */
export function clearOfflineQueue(dbId: string, fileId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(getQueueKey(dbId, fileId))
  } catch (err) {
    console.warn("[OfflineQueue] Error clearing queue:", err)
  }
}

/**
 * Get total count of all pending offline operations across all files
 */
export function getTotalPendingOfflineCount(): number {
  if (typeof window === "undefined") return 0
  try {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(QUEUE_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const items = JSON.parse(raw) as unknown[]
          if (Array.isArray(items)) count += items.length
        }
      }
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Check if a specific file has uncommitted offline changes
 */
export function hasPendingOfflineOps(dbId: string, fileId: string): boolean {
  return getOfflineQueue(dbId, fileId).length > 0
}
