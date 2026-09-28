// ---------------------------------------------------------------------------
// Zenithsui Workspaces, Boards, Trash, Favorites & Storage Types
// ---------------------------------------------------------------------------

import type { SquigNode, Viewport } from "./types"
import type { Look } from "./theme"
import type { StoredDoc } from "./files"

export type DocumentPermissionRole = "owner" | "editor" | "viewer"

export interface BoardRecord {
  id: string
  workspaceId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  creatorId?: string
  nodes: Record<string, SquigNode>
  order: string[]
  look?: Look
  viewport?: Viewport
  isFavorite?: boolean
  inTrash?: boolean
  trashedAt?: number
  trashedBy?: string
  permissions?: Record<string, DocumentPermissionRole>
}

export interface BoardClientSummary {
  id: string
  workspaceId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  creatorId?: string
  nodeCount: number
  isFavorite: boolean
  inTrash: boolean
  trashedAt?: number
  permissionRole: DocumentPermissionRole
}

export interface TrashedItem {
  id: string
  workspaceId: string
  name: string
  itemType: "board" | "document" | "pdf" | "file"
  fileSize?: number
  trashedAt: number
  trashedBy: string
  originalBoardId?: string
  payload?: any
}

export interface WorkspaceRecord {
  id: string
  name: string
  slug: string
  description?: string
  ownerId: string
  databaseId: string
  isPersonal?: boolean
  createdAt: number
  updatedAt: number
  members: WorkspaceMember[]
  favorites: string[] // IDs of favorite boards, documents, files
  storageQuotaBytes?: number // undefined or capacity
}

export interface WorkspaceMember {
  userId: string
  name: string
  email?: string
  role: DocumentPermissionRole
  joinedAt: number
}

export interface WorkspaceClientSummary {
  id: string
  name: string
  slug: string
  description?: string
  role: DocumentPermissionRole
  boardCount: number
  memberCount: number
  isOwner: boolean
  isPersonal?: boolean
  createdAt: number
  updatedAt: number
}

export interface StorageSummary {
  usedBytes: number
  quotaBytes?: number
  boardsCount: number
  documentsCount: number
  pdfsCount: number
  filesCount: number
  trashBytes: number
  largestFiles: {
    id: string
    name: string
    size: number
    type: "pdf" | "image" | "file" | "board"
    updatedAt: number
  }[]
}

export interface WorkspaceBackupPackage {
  version: 1
  exportedAt: number
  workspace: {
    id: string
    name: string
    slug: string
    description?: string
    createdAt: number
    updatedAt: number
  }
  boards: BoardRecord[]
  documents: StoredDoc[]
  files: {
    id: string
    name: string
    fileSize: number
    mimeType: string
    attachmentId?: string
    dataUrl?: string
  }[]
  favorites: string[]
}
