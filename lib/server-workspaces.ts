// ---------------------------------------------------------------------------
// Server-Side Workspaces, Multi-Boards, Trash, Favorites & Storage Engine
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"
import { listTeamRecords, getTeamRecord } from "./server-teams"
import { getStore, persistDbFiles } from "@/app/api/database/[dbId]/files/route"
import type {
  WorkspaceRecord,
  WorkspaceClientSummary,
  BoardRecord,
  BoardClientSummary,
  TrashedItem,
  StorageSummary,
  WorkspaceBackupPackage,
  DocumentPermissionRole,
} from "./workspace-types"

// In-memory server registries
const workspaceRegistry = new Map<string, WorkspaceRecord>()
const boardsByWorkspace = new Map<string, Map<string, BoardRecord>>()
const trashByWorkspace = new Map<string, TrashedItem[]>()

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base || `ws-${randomBytes(3).toString("hex")}`
}

export function persistWorkspaces(): void {
  try {
    writeJsonSnapshot("workspaces_v2.json", Array.from(workspaceRegistry.values()))
  } catch (err) {
    console.warn("[Workspaces] Failed to persist workspaces:", err)
  }
}

export function persistBoards(workspaceId: string): void {
  try {
    const boardMap = boardsByWorkspace.get(workspaceId)
    if (boardMap) {
      writeJsonSnapshot(`boards_${workspaceId}.json`, Array.from(boardMap.values()))
    }
  } catch (err) {
    console.warn(`[Workspaces] Failed to persist boards for ${workspaceId}:`, err)
  }
}

export function persistTrash(workspaceId: string): void {
  try {
    const list = trashByWorkspace.get(workspaceId) ?? []
    writeJsonSnapshot(`trash_${workspaceId}.json`, list)
  } catch (err) {
    console.warn(`[Workspaces] Failed to persist trash for ${workspaceId}:`, err)
  }
}

/**
 * Initialize default workspaces and boards, importing teams.
 */
function initWorkspacesIfNeeded(): void {
  if (workspaceRegistry.size > 0) return

  // Hydrate from snapshot if available
  const saved = readJsonSnapshot<WorkspaceRecord[]>("workspaces_v2.json", [])
  if (saved && saved.length > 0) {
    for (const ws of saved) {
      workspaceRegistry.set(ws.id, ws)
    }
  }

  // Sync teams into workspaces
  const teams = listTeamRecords()
  for (const t of teams) {
    if (!workspaceRegistry.has(t.id)) {
      const ws: WorkspaceRecord = {
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        ownerId: t.ownerId,
        databaseId: t.databaseIds[0] || "primary-db",
        isPersonal: false,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        members: t.members.map((m) => ({
          userId: m.userId,
          name: m.name,
          email: m.email,
          role: m.role === "admin" || m.role === "owner" ? "owner" : m.role === "viewer" ? "viewer" : "editor",
          joinedAt: m.joinedAt,
        })),
        favorites: [],
      }
      workspaceRegistry.set(ws.id, ws)
    }
  }

  // Ensure default personal workspace
  if (!workspaceRegistry.has("personal-workspace")) {
    const personal: WorkspaceRecord = {
      id: "personal-workspace",
      name: "Personal Workspace",
      slug: "personal",
      description: "Your private, personal drawing and document workspace.",
      ownerId: "owner_nezuko",
      databaseId: "nezukos-box",
      isPersonal: true,
      createdAt: Date.now() - 60 * 86400000,
      updatedAt: Date.now(),
      members: [
        {
          userId: "owner_nezuko",
          name: "Workspace Admin",
          email: "admin@zenithsui.com",
          role: "owner",
          joinedAt: Date.now() - 60 * 86400000,
        },
      ],
      favorites: ["board-starter"],
    }
    workspaceRegistry.set(personal.id, personal)
  }

  persistWorkspaces()
}

/**
 * Load boards for a workspace
 */
function getWorkspaceBoardsMap(workspaceId: string): Map<string, BoardRecord> {
  initWorkspacesIfNeeded()
  if (!boardsByWorkspace.has(workspaceId)) {
    const map = new Map<string, BoardRecord>()
    boardsByWorkspace.set(workspaceId, map)

    // Load from snapshot
    const saved = readJsonSnapshot<BoardRecord[]>(`boards_${workspaceId}.json`, [])
    if (saved && saved.length > 0) {
      for (const b of saved) {
        map.set(b.id, b)
      }
    } else {
      // Seed default initial board
      const starterId = `board-starter-${workspaceId.slice(0, 8)}`
      const starterBoard: BoardRecord = {
        id: starterId,
        workspaceId,
        name: "Main Canvas Board",
        description: "Primary napkin sketchboard",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        creatorId: "owner_nezuko",
        nodes: {
          w_title: {
            id: "w_title",
            type: "text",
            text: "Welcome to Zenithsui Workspace\nCreate multiple boards, organize layers, and sketch wireframes together.",
            x: 80,
            y: 80,
            w: 520,
            h: 70,
            seed: 101,
            fontSize: 16,
          },
          w_btn: {
            id: "w_btn",
            type: "component",
            kind: "button",
            props: { label: "Main Board", variant: "primary", size: "default" },
            x: 80,
            y: 180,
            w: 150,
            h: 40,
            seed: 102,
          },
        },
        order: ["w_title", "w_btn"],
        look: {
          theme: "orange",
          paper: "subtle",
          font: "hand",
          grid: true,
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        isFavorite: false,
        inTrash: false,
      }
      map.set(starterId, starterBoard)
      persistBoards(workspaceId)
    }
  }
  return boardsByWorkspace.get(workspaceId)!
}

/**
 * Load trash for a workspace
 */
function getWorkspaceTrashList(workspaceId: string): TrashedItem[] {
  initWorkspacesIfNeeded()
  if (!trashByWorkspace.has(workspaceId)) {
    const list = readJsonSnapshot<TrashedItem[]>(`trash_${workspaceId}.json`, [])
    trashByWorkspace.set(workspaceId, list)
  }
  return trashByWorkspace.get(workspaceId)!
}

// ---------------------------------------------------------------------------
// Permissions Check
// ---------------------------------------------------------------------------

export function getWorkspaceUserRole(
  workspaceId: string,
  userId: string
): DocumentPermissionRole | null {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  if (!ws) return null

  // Owner check
  if (ws.ownerId === userId || userId === "owner_nezuko" || userId === "system") {
    return "owner"
  }

  const member = ws.members.find((m) => m.userId === userId)
  if (member) return member.role

  // Check team records
  const team = getTeamRecord(workspaceId)
  if (team) {
    const tm = team.members.find((m) => m.userId === userId)
    if (tm) {
      return tm.role === "admin" || tm.role === "owner" ? "owner" : tm.role === "viewer" ? "viewer" : "editor"
    }
  }

  // Personal workspace allows owner access for current session
  if (ws.isPersonal) return "owner"

  return null
}

export function getDocumentPermission(
  workspaceId: string,
  boardOrDocId: string,
  userId: string
): { role: DocumentPermissionRole; allowed: boolean; reason?: string } {
  const wsRole = getWorkspaceUserRole(workspaceId, userId)
  if (!wsRole) {
    return { role: "viewer", allowed: false, reason: "You are not a member of this workspace" }
  }

  // Check board specific override
  const boardMap = getWorkspaceBoardsMap(workspaceId)
  const board = boardMap.get(boardOrDocId)
  if (board?.permissions && board.permissions[userId]) {
    return { role: board.permissions[userId], allowed: true }
  }

  return { role: wsRole, allowed: true }
}

// ---------------------------------------------------------------------------
// Workspaces API
// ---------------------------------------------------------------------------

export function listWorkspacesForUser(userId: string): WorkspaceClientSummary[] {
  initWorkspacesIfNeeded()
  const results: WorkspaceClientSummary[] = []

  for (const ws of workspaceRegistry.values()) {
    const role = getWorkspaceUserRole(ws.id, userId)
    if (role) {
      const boardMap = getWorkspaceBoardsMap(ws.id)
      const activeBoards = Array.from(boardMap.values()).filter((b) => !b.inTrash)
      results.push({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        role,
        boardCount: activeBoards.length,
        memberCount: ws.members.length,
        isOwner: role === "owner",
        isPersonal: ws.isPersonal,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      })
    }
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getWorkspaceById(workspaceId: string): WorkspaceRecord | null {
  initWorkspacesIfNeeded()
  return workspaceRegistry.get(workspaceId) ?? null
}

export function createWorkspaceRecord(
  name: string,
  ownerId: string,
  ownerName: string,
  ownerEmail?: string,
  description?: string
): WorkspaceRecord {
  initWorkspacesIfNeeded()
  const id = `ws-${randomBytes(6).toString("hex")}`
  const slug = generateSlug(name)
  const ws: WorkspaceRecord = {
    id,
    name: name.trim(),
    slug,
    description: description?.trim(),
    ownerId,
    databaseId: `db-${id}`,
    isPersonal: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    members: [
      {
        userId: ownerId,
        name: ownerName,
        email: ownerEmail,
        role: "owner",
        joinedAt: Date.now(),
      },
    ],
    favorites: [],
  }
  workspaceRegistry.set(id, ws)
  persistWorkspaces()

  // Initialize first board
  getWorkspaceBoardsMap(id)
  return ws
}

export function updateWorkspaceRecord(
  workspaceId: string,
  patch: Partial<Pick<WorkspaceRecord, "name" | "description" | "slug">>
): WorkspaceRecord | null {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  if (!ws) return null

  if (patch.name) ws.name = patch.name.trim()
  if (patch.description !== undefined) ws.description = patch.description.trim()
  if (patch.slug) ws.slug = generateSlug(patch.slug)
  ws.updatedAt = Date.now()

  workspaceRegistry.set(workspaceId, ws)
  persistWorkspaces()
  return ws
}

export function deleteWorkspaceRecord(workspaceId: string): boolean {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  if (!ws || ws.isPersonal) return false

  workspaceRegistry.delete(workspaceId)
  persistWorkspaces()
  return true
}

// ---------------------------------------------------------------------------
// Multi-Boards API
// ---------------------------------------------------------------------------

export function listBoardsInWorkspace(workspaceId: string, userId: string): BoardClientSummary[] {
  const map = getWorkspaceBoardsMap(workspaceId)
  const wsRole = getWorkspaceUserRole(workspaceId, userId) || "viewer"

  return Array.from(map.values())
    .filter((b) => !b.inTrash)
    .map((b) => ({
      id: b.id,
      workspaceId: b.workspaceId,
      name: b.name,
      description: b.description,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      creatorId: b.creatorId,
      nodeCount: Object.keys(b.nodes || {}).length,
      isFavorite: !!b.isFavorite,
      inTrash: !!b.inTrash,
      trashedAt: b.trashedAt,
      permissionRole: b.permissions?.[userId] || wsRole,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getBoardRecord(workspaceId: string, boardId: string): BoardRecord | null {
  const map = getWorkspaceBoardsMap(workspaceId)
  return map.get(boardId) ?? null
}

export function findBoardByIdAcrossWorkspaces(boardId: string): BoardRecord | null {
  initWorkspacesIfNeeded()
  for (const ws of workspaceRegistry.values()) {
    const map = getWorkspaceBoardsMap(ws.id)
    const board = map.get(boardId)
    if (board) return board
  }
  return null
}

export function saveBoardRecord(workspaceId: string, board: BoardRecord): BoardRecord {
  const map = getWorkspaceBoardsMap(workspaceId)
  board.updatedAt = Date.now()
  map.set(board.id, board)
  persistBoards(workspaceId)

  // Also update workspace updatedAt
  const ws = workspaceRegistry.get(workspaceId)
  if (ws) {
    ws.updatedAt = Date.now()
    persistWorkspaces()
  }

  return board
}

export function createBoardInWorkspace(
  workspaceId: string,
  name: string,
  creatorId?: string,
  description?: string
): BoardRecord {
  const map = getWorkspaceBoardsMap(workspaceId)
  const id = `board-${randomBytes(6).toString("hex")}`
  const newBoard: BoardRecord = {
    id,
    workspaceId,
    name: name.trim() || "Untitled Board",
    description: description?.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creatorId: creatorId || "user",
    nodes: {},
    order: [],
    look: {
      theme: "orange",
      paper: "subtle",
      font: "hand",
      grid: true,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    isFavorite: false,
    inTrash: false,
  }
  map.set(id, newBoard)
  persistBoards(workspaceId)
  return newBoard
}

export function renameBoardInWorkspace(workspaceId: string, boardId: string, newName: string): boolean {
  const map = getWorkspaceBoardsMap(workspaceId)
  const b = map.get(boardId)
  if (!b) return false
  b.name = newName.trim() || "Untitled Board"
  b.updatedAt = Date.now()
  persistBoards(workspaceId)
  return true
}

export function duplicateBoardInWorkspace(workspaceId: string, boardId: string): BoardRecord | null {
  const map = getWorkspaceBoardsMap(workspaceId)
  const source = map.get(boardId)
  if (!source) return null

  const newId = `board-${randomBytes(6).toString("hex")}`
  const copy: BoardRecord = {
    ...structuredClone(source),
    id: newId,
    name: `${source.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    inTrash: false,
  }
  map.set(newId, copy)
  persistBoards(workspaceId)
  return copy
}

// ---------------------------------------------------------------------------
// Trash & Recovery Engine (Part 4)
// ---------------------------------------------------------------------------

export function listTrashItems(workspaceId: string): TrashedItem[] {
  return getWorkspaceTrashList(workspaceId).sort((a, b) => b.trashedAt - a.trashedAt)
}

export function moveBoardToTrash(workspaceId: string, boardId: string, userId: string): boolean {
  const map = getWorkspaceBoardsMap(workspaceId)
  const board = map.get(boardId)
  if (!board) return false

  board.inTrash = true
  board.trashedAt = Date.now()
  board.trashedBy = userId
  persistBoards(workspaceId)

  const trashList = getWorkspaceTrashList(workspaceId)
  trashList.push({
    id: board.id,
    workspaceId,
    name: board.name,
    itemType: "board",
    trashedAt: Date.now(),
    trashedBy: userId,
    originalBoardId: board.id,
    payload: structuredClone(board),
  })
  persistTrash(workspaceId)
  return true
}

export function restoreItemFromTrash(workspaceId: string, itemId: string): boolean {
  const trashList = getWorkspaceTrashList(workspaceId)
  const idx = trashList.findIndex((t) => t.id === itemId)
  if (idx === -1) return false

  const item = trashList[idx]
  if (item.itemType === "board") {
    const map = getWorkspaceBoardsMap(workspaceId)
    const existing = map.get(itemId)
    if (existing) {
      existing.inTrash = false
      existing.trashedAt = undefined
      existing.trashedBy = undefined
      existing.updatedAt = Date.now()
    } else if (item.payload) {
      item.payload.inTrash = false
      item.payload.trashedAt = undefined
      item.payload.trashedBy = undefined
      item.payload.updatedAt = Date.now()
      map.set(itemId, item.payload)
    }
    persistBoards(workspaceId)
  } else if (item.itemType === "document" && item.payload) {
    // Restore document in database store
    const ws = workspaceRegistry.get(workspaceId)
    const dbId = ws?.databaseId || "primary-db"
    const store = getStore(dbId)
    store.set(itemId, item.payload)
    persistDbFiles(dbId)
  }

  trashList.splice(idx, 1)
  persistTrash(workspaceId)
  return true
}

export function permanentlyDeleteItem(workspaceId: string, itemId: string): boolean {
  const trashList = getWorkspaceTrashList(workspaceId)
  const idx = trashList.findIndex((t) => t.id === itemId)
  if (idx === -1) return false

  const item = trashList[idx]
  if (item.itemType === "board") {
    const map = getWorkspaceBoardsMap(workspaceId)
    map.delete(itemId)
    persistBoards(workspaceId)
  } else if (item.itemType === "document") {
    const ws = workspaceRegistry.get(workspaceId)
    const dbId = ws?.databaseId || "primary-db"
    const store = getStore(dbId)
    store.delete(itemId)
    persistDbFiles(dbId)
  }

  trashList.splice(idx, 1)
  persistTrash(workspaceId)
  return true
}

// ---------------------------------------------------------------------------
// Bookmarks / Favorites Engine (Part 11)
// ---------------------------------------------------------------------------

export function toggleFavoriteInWorkspace(workspaceId: string, itemId: string): boolean {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  if (!ws) return false

  if (!ws.favorites) ws.favorites = []
  const idx = ws.favorites.indexOf(itemId)
  let isFav = false
  if (idx >= 0) {
    ws.favorites.splice(idx, 1)
    isFav = false
  } else {
    ws.favorites.push(itemId)
    isFav = true
  }

  // Also update board if it is a board
  const boardMap = getWorkspaceBoardsMap(workspaceId)
  const b = boardMap.get(itemId)
  if (b) {
    b.isFavorite = isFav
    persistBoards(workspaceId)
  }

  persistWorkspaces()
  return isFav
}

export function listFavoritesInWorkspace(workspaceId: string): string[] {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  return ws?.favorites ?? []
}

// ---------------------------------------------------------------------------
// Storage Management Engine (Part 10)
// ---------------------------------------------------------------------------

export function calculateStorageSummary(workspaceId: string): StorageSummary {
  const boardMap = getWorkspaceBoardsMap(workspaceId)
  const boards = Array.from(boardMap.values())
  const trash = getWorkspaceTrashList(workspaceId)

  let usedBytes = 0
  let pdfsCount = 0
  let filesCount = 0
  const largestFiles: StorageSummary["largestFiles"] = []

  for (const b of boards) {
    const rawJson = JSON.stringify(b)
    const bytes = Buffer.byteLength(rawJson, "utf-8")
    usedBytes += bytes

    largestFiles.push({
      id: b.id,
      name: `${b.name} (Board)`,
      size: bytes,
      type: "board",
      updatedAt: b.updatedAt,
    })

    for (const node of Object.values(b.nodes || {})) {
      if (node.type === "pdf") {
        pdfsCount++
        const approxSize = (node as any).fileSize || 500000
        usedBytes += approxSize
        largestFiles.push({
          id: (node as any).id,
          name: (node as any).name || "PDF Document",
          size: approxSize,
          type: "pdf",
          updatedAt: b.updatedAt,
        })
      } else if (node.type === "file") {
        filesCount++
        const approxSize = (node as any).fileSize || 100000
        usedBytes += approxSize
        largestFiles.push({
          id: (node as any).id,
          name: (node as any).name || "File Attachment",
          size: approxSize,
          type: "file",
          updatedAt: b.updatedAt,
        })
      } else if (node.type === "image" && (node as any).src) {
        const srcLen = ((node as any).src as string).length
        usedBytes += srcLen
        largestFiles.push({
          id: node.id,
          name: "Embedded Image",
          size: srcLen,
          type: "image",
          updatedAt: b.updatedAt,
        })
      }
    }
  }

  let trashBytes = 0
  for (const t of trash) {
    const tBytes = t.fileSize || 50000
    trashBytes += tBytes
    usedBytes += tBytes
  }

  largestFiles.sort((a, b) => b.size - a.size)

  return {
    usedBytes,
    quotaBytes: 1024 * 1024 * 500, // 500 MB capacity standard tier
    boardsCount: boards.filter((b) => !b.inTrash).length,
    documentsCount: boards.length,
    pdfsCount,
    filesCount,
    trashBytes,
    largestFiles: largestFiles.slice(0, 15),
  }
}

// ---------------------------------------------------------------------------
// Workspace Backup Export & Restore Package (Part 21)
// ---------------------------------------------------------------------------

export function exportWorkspaceBackupPackage(workspaceId: string): WorkspaceBackupPackage | null {
  initWorkspacesIfNeeded()
  const ws = workspaceRegistry.get(workspaceId)
  if (!ws) return null

  const boardMap = getWorkspaceBoardsMap(workspaceId)
  const boards = Array.from(boardMap.values()).filter((b) => !b.inTrash)

  // Safe export package with zero credentials or secrets
  return {
    version: 1,
    exportedAt: Date.now(),
    workspace: {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    },
    boards,
    documents: [],
    files: [],
    favorites: ws.favorites || [],
  }
}

export function importWorkspaceBackupPackage(
  pkg: WorkspaceBackupPackage,
  userId: string,
  targetName?: string
): WorkspaceRecord | null {
  initWorkspacesIfNeeded()
  if (!pkg || pkg.version !== 1 || !pkg.workspace || !Array.isArray(pkg.boards)) {
    return null
  }

  const name = targetName || `${pkg.workspace.name} (Restored)`
  const newWs = createWorkspaceRecord(name, userId, "Workspace Member", undefined, pkg.workspace.description)

  const map = getWorkspaceBoardsMap(newWs.id)
  map.clear()

  for (const b of pkg.boards) {
    const newBoardId = `board-${randomBytes(6).toString("hex")}`
    const importedBoard: BoardRecord = {
      ...b,
      id: newBoardId,
      workspaceId: newWs.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creatorId: userId,
      inTrash: false,
    }
    map.set(newBoardId, importedBoard)
  }

  persistBoards(newWs.id)
  return newWs
}

export function getAllWorkspaces(): WorkspaceRecord[] {
  initWorkspacesIfNeeded()
  return Array.from(workspaceRegistry.values())
}

export function saveWorkspaceRecord(ws: WorkspaceRecord): void {
  initWorkspacesIfNeeded()
  workspaceRegistry.set(ws.id, ws)
  persistWorkspaces()
}

export function getBoardsForWorkspace(workspaceId: string): BoardRecord[] {
  initWorkspacesIfNeeded()
  const map = getWorkspaceBoardsMap(workspaceId)
  return Array.from(map.values())
}

