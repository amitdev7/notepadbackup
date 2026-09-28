"use client"

// ---------------------------------------------------------------------------
// Client Workspaces, Multi-Boards, Storage, Trash & Offline Synchronization
// ---------------------------------------------------------------------------

import type {
  WorkspaceClientSummary,
  BoardClientSummary,
  BoardRecord,
  TrashedItem,
  StorageSummary,
  WorkspaceBackupPackage,
} from "./workspace-types"
import { getClientSessionId } from "./database"

export type SaveStatusState = "saved" | "saving" | "syncing" | "offline" | "failed" | "retry"

const OFFLINE_QUEUE_KEY = "zenithsui:offline_queue:v2"
const ACTIVE_WORKSPACE_KEY = "zenithsui:active_ws:v1"
const ACTIVE_BOARD_KEY = "zenithsui:active_board:v1"

export interface OfflineSaveItem {
  workspaceId: string
  boardId: string
  boardData: BoardRecord
  timestamp: number
}

function getStoredQueue(): OfflineSaveItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredQueue(queue: OfflineSaveItem[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  } catch {}
}

export function getStoredActiveWorkspaceId(): string {
  if (typeof window === "undefined") return "personal-workspace"
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "personal-workspace"
}

export function setStoredActiveWorkspaceId(id: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
}

export function getStoredActiveBoardId(workspaceId: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(`${ACTIVE_BOARD_KEY}:${workspaceId}`)
}

export function setStoredActiveBoardId(workspaceId: string, boardId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`${ACTIVE_BOARD_KEY}:${workspaceId}`, boardId)
}

function getHeaders(): Record<string, string> {
  const sessionId = getClientSessionId()
  return {
    "Content-Type": "application/json",
    "x-session-id": sessionId,
    "x-user-id": sessionId,
  }
}

// ---------------------------------------------------------------------------
// Workspaces Client APIs
// ---------------------------------------------------------------------------

export async function fetchWorkspacesClient(): Promise<WorkspaceClientSummary[]> {
  try {
    const res = await fetch("/api/workspaces", {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error("Failed to fetch workspaces")
    const data = await res.json()
    return data.workspaces || []
  } catch (err) {
    console.warn("[Workspaces] Fetch error, using fallback:", err)
    return [
      {
        id: "personal-workspace",
        name: "Personal Workspace",
        slug: "personal",
        description: "Your local and cloud workspace.",
        role: "owner",
        boardCount: 1,
        memberCount: 1,
        isOwner: true,
        isPersonal: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]
  }
}

export async function createWorkspaceClient(name: string, description?: string): Promise<any> {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to create workspace")
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Multi-Boards Client APIs
// ---------------------------------------------------------------------------

export async function fetchBoardsClient(workspaceId: string): Promise<BoardClientSummary[]> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error("Failed to fetch boards")
    const data = await res.json()
    return data.boards || []
  } catch (err) {
    console.warn("[Boards] Fetch error:", err)
    return []
  }
}

export async function fetchBoardClient(workspaceId: string, boardId: string): Promise<BoardRecord | null> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(boardId)}`, {
      headers: getHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.board || null
  } catch {
    return null
  }
}

export async function saveBoardClient(workspaceId: string, board: BoardRecord): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Queue offline
    const queue = getStoredQueue().filter((item) => !(item.workspaceId === workspaceId && item.boardId === board.id))
    queue.push({
      workspaceId,
      boardId: board.id,
      boardData: board,
      timestamp: Date.now(),
    })
    saveStoredQueue(queue)
    return true
  }

  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(board.id)}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(board),
    })
    return res.ok
  } catch (_err) {
    // Save to offline queue on network failure
    const queue = getStoredQueue().filter((item) => !(item.workspaceId === workspaceId && item.boardId === board.id))
    queue.push({
      workspaceId,
      boardId: board.id,
      boardData: board,
      timestamp: Date.now(),
    })
    saveStoredQueue(queue)
    return false
  }
}

export async function createBoardClient(workspaceId: string, name: string, description?: string): Promise<BoardRecord> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to create board")
  }
  const data = await res.json()
  return data.board
}

export async function renameBoardClient(workspaceId: string, boardId: string, name: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  })
  return res.ok
}

export async function duplicateBoardClient(workspaceId: string, boardId: string): Promise<BoardRecord | null> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ action: "duplicate" }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.board || null
}

export async function deleteBoardClient(workspaceId: string, boardId: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/boards/${encodeURIComponent(boardId)}`, {
    method: "DELETE",
    headers: getHeaders(),
  })
  return res.ok
}

// ---------------------------------------------------------------------------
// Trash & Recovery Client APIs
// ---------------------------------------------------------------------------

export async function fetchTrashClient(workspaceId: string): Promise<TrashedItem[]> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/trash`, {
      headers: getHeaders(),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.trash || []
  } catch {
    return []
  }
}

export async function restoreTrashItemClient(workspaceId: string, itemId: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/trash`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ action: "restore", itemId }),
  })
  return res.ok
}

export async function permanentlyDeleteTrashItemClient(workspaceId: string, itemId: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/trash`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ action: "delete_permanent", itemId }),
  })
  return res.ok
}

// ---------------------------------------------------------------------------
// Bookmarks / Favorites Client APIs
// ---------------------------------------------------------------------------

export async function fetchFavoritesClient(workspaceId: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/favorites`, {
      headers: getHeaders(),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.favorites || []
  } catch {
    return []
  }
}

export async function toggleFavoriteClient(workspaceId: string, itemId: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/favorites`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ itemId }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return !!data.isFavorite
}

// ---------------------------------------------------------------------------
// Storage Management Client APIs
// ---------------------------------------------------------------------------

export async function fetchStorageClient(workspaceId: string): Promise<StorageSummary | null> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/storage`, {
      headers: getHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.storage || null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Workspace Backup Export & Restore Client APIs
// ---------------------------------------------------------------------------

export async function exportWorkspaceBackupClient(workspaceId: string): Promise<WorkspaceBackupPackage | null> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/backup`, {
      headers: getHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.backup || null
  } catch {
    return null
  }
}

export async function importWorkspaceBackupClient(pkg: WorkspaceBackupPackage, name?: string): Promise<any> {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ backupPackage: pkg, name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to import workspace backup")
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Offline Queue Synchronization Runner
// ---------------------------------------------------------------------------

export async function flushOfflineQueueClient(): Promise<number> {
  const queue = getStoredQueue()
  if (queue.length === 0) return 0

  let synced = 0
  const remaining: OfflineSaveItem[] = []

  for (const item of queue) {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(item.workspaceId)}/boards/${encodeURIComponent(item.boardId)}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(item.boardData),
        }
      )
      if (res.ok) {
        synced++
      } else {
        remaining.push(item)
      }
    } catch {
      remaining.push(item)
    }
  }

  saveStoredQueue(remaining)
  return synced
}
