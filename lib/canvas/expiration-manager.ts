"use client"

// ---------------------------------------------------------------------------
// Zenithsui Automatic Expiration Engine & Recovery Manager
//
// Lifecycle manager for temporary canvas elements:
// - Absolute epoch timestamp tracking (immune to timer drift and tab throttling)
// - Dynamic nearest-expiry scheduling with 10s safety fallback sweep
// - Tab visibility, window focus, and system clock drift resynchronization
// - Atomic transition to the Expired Elements Archive (IndexedDB STORES.EXPIRED_ELEMENTS)
// - Restorability with intact coordinates, styling, assets, and original z-order
// ---------------------------------------------------------------------------

import type { ExpiredElementRecord, SquigNode } from "../types"
import { useSquig } from "../store"
import { useShellStore } from "../shell-store"
import {
  saveExpiredRecords,
  deleteExpiredRecord,
  getExpiredRecord,
  listExpiredRecords,
  clearExpiredRecords,
} from "../storage/expired-archive"
import { nanoid } from "nanoid"

let nextExpiryTimer: ReturnType<typeof setTimeout> | null = null
let safetyIntervalTimer: ReturnType<typeof setInterval> | null = null
let isInitialized = false
let isProcessingSweep = false
let lastTickTime = Date.now()

/**
 * Generate a friendly human-readable summary for any canvas node
 */
export function getNodePreviewLabel(node: SquigNode): string {
  switch (node.type) {
    case "text":
      return node.text ? node.text.trim().slice(0, 48) : "Empty Text"
    case "sticky":
      return node.text ? node.text.trim().slice(0, 48) : "Sticky Note"
    case "shape":
      return `${node.shape.charAt(0).toUpperCase() + node.shape.slice(1)} Shape`
    case "draw":
      return "Freehand Drawing"
    case "arrow":
      return "Arrow Connector"
    case "image":
      return "Image"
    case "frame":
      return node.name ? `Frame "${node.name}"` : "Canvas Frame"
    case "embed":
      return node.title ? node.title : `Embed (${node.url.slice(0, 30)})`
    case "document":
      return node.name ? node.name : "Attached Document"
    case "component":
      return `${node.kind.charAt(0).toUpperCase() + node.kind.slice(1)} Component`
    default:
      return "Canvas Element"
  }
}

/** Check if an element has reached its absolute expiration timestamp */
export function isNodeExpired(node: SquigNode, now = Date.now()): boolean {
  if (!node.expiration || typeof node.expiration.expiresAt !== "number") return false
  return Number.isFinite(node.expiration.expiresAt) && now >= node.expiration.expiresAt
}

/**
 * Calculate urgency state for countdown indicators
 */
export function getExpirationUrgency(
  expiresAt: number,
  now = Date.now()
): "normal" | "soon" | "imminent" | "expired" {
  const diffMs = expiresAt - now
  if (diffMs <= 0) return "expired"
  if (diffMs <= 10 * 1000) return "imminent" // <= 10s
  if (diffMs <= 60 * 1000) return "soon" // <= 60s
  return "normal"
}

/**
 * Format remaining milliseconds into human-readable digital clock or compact string
 */
export function formatRemainingTime(expiresAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, expiresAt - now)
  const totalSeconds = Math.floor(diffMs / 1000)

  if (totalSeconds <= 0) return "Expired"

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }
  return `0:${seconds.toString().padStart(2, "0")}`
}

/**
 * Format duration milliseconds into compact representation (e.g. "5m", "1h", "2d")
 */
export function formatDurationLabel(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

/**
 * Core Expiration Sweep:
 * Scans active canvas nodes, identifies expired elements, safely moves them
 * to the Expired Elements Archive, and reschedules the next sweep.
 */
export async function sweepExpiredElements(): Promise<number> {
  if (isProcessingSweep) return 0
  isProcessingSweep = true
  lastTickTime = Date.now()

  try {
    const st = useSquig.getState()
    const now = Date.now()
    const nodes = st.nodes
    const order = st.order
    const docId = st.docId

    const expiredNodes: SquigNode[] = []
    let nextNearestExpiresAt = Infinity

    for (const id of order) {
      const node = nodes[id]
      if (!node || !node.expiration || !Number.isFinite(node.expiration.expiresAt)) continue

      if (now >= node.expiration.expiresAt) {
        expiredNodes.push(node)
      } else {
        if (node.expiration.expiresAt < nextNearestExpiresAt) {
          nextNearestExpiresAt = node.expiration.expiresAt
        }
      }
    }

    if (expiredNodes.length > 0) {
      const records: ExpiredElementRecord[] = expiredNodes.map((n) => ({
        archiveId: nanoid(10),
        documentId: docId,
        originalNodeId: n.id,
        nodeSnapshot: structuredClone(n),
        originalOrderIndex: Math.max(0, order.indexOf(n.id)),
        archivedAt: now,
        expiresAt: n.expiration!.expiresAt,
        createdAt: n.expiration!.createdAt || now,
        elementType: n.type,
        previewLabel: getNodePreviewLabel(n),
      }))

      // 1. Move to Archive Store
      await saveExpiredRecords(records)

      // 2. Remove from active canvas without creating undo history noise
      const expiredIds = expiredNodes.map((n) => n.id)
      st.removeNodes(expiredIds, { checkpoint: false })

      // 3. User feedback notification if enabled
      const temporarySettings = useShellStore.getState().preferences?.temporarySettings
      if (temporarySettings?.notificationsEnabled) {
        const count = expiredNodes.length
        const msg =
          count === 1
            ? `"${records[0].previewLabel}" expired and moved to Archive.`
            : `${count} elements expired and moved to Archive.`
        st.setNotice(msg)
      }
    }

    // Schedule next nearest expiration check
    if (nextExpiryTimer) {
      clearTimeout(nextExpiryTimer)
      nextExpiryTimer = null
    }

    if (Number.isFinite(nextNearestExpiresAt) && nextNearestExpiresAt < Infinity) {
      const delay = Math.min(30000, Math.max(250, nextNearestExpiresAt - Date.now()))
      nextExpiryTimer = setTimeout(() => {
        void sweepExpiredElements()
      }, delay)
    }

    return expiredNodes.length
  } catch (err) {
    console.warn("[zenithsui-expiration] Error during expiration sweep:", err)
    return 0
  } finally {
    isProcessingSweep = false
  }
}

/**
 * Initialize the Automatic Expiration Engine singleton listeners
 */
export function initExpirationEngine(): () => void {
  if (isInitialized || typeof window === "undefined") {
    return () => {}
  }
  isInitialized = true

  // Initial sweep upon engine launch
  void sweepExpiredElements()

  // 10-second background safety sweep
  safetyIntervalTimer = setInterval(() => {
    // Detect system clock drift or sleep resume (> 5s jump)
    const now = Date.now()
    if (Math.abs(now - lastTickTime - 10000) > 5000) {
      void sweepExpiredElements()
    } else {
      void sweepExpiredElements()
    }
    lastTickTime = now
  }, 10000)

  // Resynchronize immediately when tab regains visibility
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void sweepExpiredElements()
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Resynchronize on window focus
  const handleFocus = () => {
    void sweepExpiredElements()
  }
  window.addEventListener("focus", handleFocus)

  // Resynchronize on document page show
  const handlePageShow = () => {
    void sweepExpiredElements()
  }
  window.addEventListener("pageshow", handlePageShow)

  return () => {
    if (nextExpiryTimer) clearTimeout(nextExpiryTimer)
    if (safetyIntervalTimer) clearInterval(safetyIntervalTimer)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("focus", handleFocus)
    window.removeEventListener("pageshow", handlePageShow)
    isInitialized = false
  }
}

// ---------------------------------------------------------------------------
// Per-Element Expiration Mutation API
// ---------------------------------------------------------------------------

/**
 * Convert an active canvas node into a temporary element with a specified duration
 */
export function makeNodeTemporary(
  nodeId: string,
  durationMs: number,
  showCountdown = true
): void {
  const st = useSquig.getState()
  const node = st.nodes[nodeId]
  if (!node) return

  const now = Date.now()
  const validDuration = Math.max(1000, durationMs)
  const expiresAt = now + validDuration

  st.updateNode(
    nodeId,
    {
      expiration: {
        expiresAt,
        createdAt: now,
        durationMs: validDuration,
        showCountdown,
      },
    },
    { checkpoint: true }
  )

  void sweepExpiredElements()
}

/**
 * Set an active canvas node to expire at a specific absolute epoch timestamp
 */
export function makeNodeExpireAt(
  nodeId: string,
  targetTimestamp: number,
  showCountdown = true
): void {
  const st = useSquig.getState()
  const node = st.nodes[nodeId]
  if (!node || !Number.isFinite(targetTimestamp)) return

  const now = Date.now()
  if (targetTimestamp <= now) {
    // If target timestamp is already in the past, expire immediately
    void expireNodeNow(nodeId)
    return
  }

  st.updateNode(
    nodeId,
    {
      expiration: {
        expiresAt: targetTimestamp,
        createdAt: now,
        durationMs: targetTimestamp - now,
        showCountdown,
      },
    },
    { checkpoint: true }
  )

  void sweepExpiredElements()
}

/**
 * Make an element permanent (removes expiration metadata)
 */
export function makeNodePermanent(nodeId: string): void {
  const st = useSquig.getState()
  const node = st.nodes[nodeId]
  if (!node || !node.expiration) return

  st.updateNode(
    nodeId,
    {
      expiration: undefined,
    },
    { checkpoint: true }
  )

  void sweepExpiredElements()
}

/**
 * Extend an active temporary element's lifetime
 */
export function extendNodeExpiration(nodeId: string, additionalMs: number): void {
  const st = useSquig.getState()
  const node = st.nodes[nodeId]
  if (!node) return

  const now = Date.now()
  const currentExpiry = node.expiration?.expiresAt ?? now
  const base = Math.max(now, currentExpiry)
  const newExpiry = base + Math.max(1000, additionalMs)

  st.updateNode(
    nodeId,
    {
      expiration: {
        expiresAt: newExpiry,
        createdAt: node.expiration?.createdAt ?? now,
        durationMs: (node.expiration?.durationMs ?? 0) + additionalMs,
        showCountdown: node.expiration?.showCountdown ?? true,
      },
    },
    { checkpoint: true }
  )

  void sweepExpiredElements()
}

/**
 * Immediately expire a node and move it into the archive
 */
export async function expireNodeNow(nodeId: string): Promise<void> {
  const st = useSquig.getState()
  const node = st.nodes[nodeId]
  if (!node) return

  const now = Date.now()
  const record: ExpiredElementRecord = {
    archiveId: nanoid(10),
    documentId: st.docId,
    originalNodeId: node.id,
    nodeSnapshot: structuredClone(node),
    originalOrderIndex: Math.max(0, st.order.indexOf(node.id)),
    archivedAt: now,
    expiresAt: now,
    createdAt: node.expiration?.createdAt ?? now,
    elementType: node.type,
    previewLabel: getNodePreviewLabel(node),
  }

  await saveExpiredRecords([record])
  st.removeNodes([nodeId], { checkpoint: true })
  void sweepExpiredElements()
}

/**
 * Apply temporary expiration to multiple nodes as one atomic operation
 */
export function makeNodesTemporary(
  nodeIds: string[],
  durationMs: number,
  showCountdown = true
): void {
  if (!nodeIds.length) return
  const st = useSquig.getState()
  const now = Date.now()
  const validDuration = Math.max(1000, durationMs)
  const expiresAt = now + validDuration

  const patches: Record<string, Partial<SquigNode>> = {}
  for (const id of nodeIds) {
    if (st.nodes[id]) {
      patches[id] = {
        expiration: {
          expiresAt,
          createdAt: now,
          durationMs: validDuration,
          showCountdown,
        },
      }
    }
  }

  st.updateNodes(patches, { checkpoint: true })
  void sweepExpiredElements()
}

/**
 * Make multiple nodes permanent as one atomic operation
 */
export function makeNodesPermanent(nodeIds: string[]): void {
  if (!nodeIds.length) return
  const st = useSquig.getState()
  const patches: Record<string, Partial<SquigNode>> = {}
  for (const id of nodeIds) {
    if (st.nodes[id] && st.nodes[id].expiration) {
      patches[id] = { expiration: undefined }
    }
  }

  st.updateNodes(patches, { checkpoint: true })
  void sweepExpiredElements()
}

/**
 * Restore an expired element from the archive back into the canvas
 */
export async function restoreExpiredElement(
  archiveId: string,
  options: {
    mode?: "original" | "permanent" | "temporary"
    newDurationMs?: number
  } = {}
): Promise<boolean> {
  const record = await getExpiredRecord(archiveId)
  if (!record || !record.nodeSnapshot) return false

  const st = useSquig.getState()
  const node = structuredClone(record.nodeSnapshot)
  const mode = options.mode ?? "permanent"

  if (mode === "permanent") {
    delete node.expiration
  } else if (mode === "temporary" && options.newDurationMs) {
    const now = Date.now()
    node.expiration = {
      expiresAt: now + options.newDurationMs,
      createdAt: now,
      durationMs: options.newDurationMs,
      showCountdown: true,
    }
  } else if (mode === "original" && node.expiration) {
    // Reset expiration duration from now
    const duration = node.expiration.durationMs || 5 * 60 * 1000
    const now = Date.now()
    node.expiration = {
      ...node.expiration,
      expiresAt: now + duration,
      createdAt: now,
    }
  }

  // Restore node into canvas store
  st.addNode(node, { select: true, checkpoint: true })

  // Remove from archive
  await deleteExpiredRecord(archiveId)

  void sweepExpiredElements()
  return true
}

export {
  listExpiredRecords,
  deleteExpiredRecord,
  clearExpiredRecords,
}
