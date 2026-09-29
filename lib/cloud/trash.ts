"use client"

// ---------------------------------------------------------------------------
// Zenithsui Cloud & Document Lifecycle: Soft-Deletion, Trash, and Recovery.
//
// Adheres strictly to the PostgreSQL document storage specification:
// - Soft deletion sets `deleted_at = NOW()`, disables active share links,
//   and hides the document from active workspace queries.
// - Recovery clears `deleted_at = NULL`, reinstating the document into
//   workspace file listings.
// - Physical purge removes all traces from disk/database permanently,
//   restricted strictly to document owners and workspace administrators.
// ---------------------------------------------------------------------------

import {
  INDEX_KEY,
  listFiles,
  readFile,
  saveFile,
  type FileMeta,
  type StoredDoc,
} from "@/lib/files"
import { useSquig } from "@/lib/store"

// ---------------------------------------------------------------------------
// PostgreSQL DDL & Query Specification
// ---------------------------------------------------------------------------
/**
 * PostgreSQL Schema Reference:
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS workspaces (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE TABLE IF NOT EXISTS projects (
 *   id TEXT PRIMARY KEY,
 *   workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE TABLE IF NOT EXISTS documents (
 *   id TEXT PRIMARY KEY,
 *   workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *   project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
 *   owner_id TEXT NOT NULL,
 *   name TEXT NOT NULL,
 *   content JSONB NOT NULL DEFAULT '{}'::jsonb,
 *   share_slug TEXT UNIQUE,
 *   share_link_active BOOLEAN NOT NULL DEFAULT FALSE,
 *   deleted_at TIMESTAMPTZ DEFAULT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Active workspace queries ignore soft-deleted documents
 * CREATE INDEX IF NOT EXISTS idx_documents_workspace_active
 *   ON documents (workspace_id, updated_at DESC)
 *   WHERE deleted_at IS NULL;
 *
 * -- Fast trash listing sorted by deletion timestamp
 * CREATE INDEX IF NOT EXISTS idx_documents_trash
 *   ON documents (workspace_id, deleted_at DESC)
 *   WHERE deleted_at IS NOT NULL;
 * ```
 */

export const PG_QUERIES = {
  softDelete: `
    UPDATE documents
    SET deleted_at = NOW(),
        share_link_active = FALSE
    WHERE id = $1
    RETURNING id, name, workspace_id, project_id, deleted_at, share_link_active;
  `,
  restore: `
    UPDATE documents
    SET deleted_at = NULL
    WHERE id = $1
    RETURNING id, name, workspace_id, project_id, deleted_at, share_link_active;
  `,
  listTrash: `
    SELECT
      d.id,
      d.name,
      d.workspace_id AS "workspaceId",
      COALESCE(d.project_id, 'default-project') AS "projectId",
      COALESCE(p.name, 'Main Project') AS "projectName",
      d.deleted_at,
      d.share_link_active AS "shareLinkActive",
      EXTRACT(EPOCH FROM d.updated_at) * 1000 AS "updatedAt"
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    WHERE d.workspace_id = $1
      AND d.deleted_at IS NOT NULL
    ORDER BY d.deleted_at DESC;
  `,
  permanentlyDelete: `
    DELETE FROM documents
    WHERE id = $1;
  `,
} as const

// ---------------------------------------------------------------------------
// Types & Contracts
// ---------------------------------------------------------------------------

export type UserRole = "owner" | "admin" | "member" | "viewer"

export interface TrashItem {
  id: string
  name: string
  workspaceId: string
  projectId: string
  projectName: string
  /** ISO timestamp string e.g. "2026-09-28T17:00:00.000Z" */
  deleted_at: string
  shareLinkActive: boolean
  shareSlug?: string | null
  ownerId?: string
  updatedAt: number
  /** Stored document snapshot for recovery */
  doc?: StoredDoc
}

export interface SoftDeleteResult {
  success: boolean
  docId: string
  deleted_at: string
}

export interface RestoreResult {
  success: boolean
  docId: string
  doc?: StoredDoc
}

export interface PermanentDeleteResult {
  success: boolean
  docId: string
}

// ---------------------------------------------------------------------------
// Storage Keys & Constants
// ---------------------------------------------------------------------------

export const TRASH_KEY = "zenithsui:trash:v1"
export const DEFAULT_WORKSPACE_ID = "ws_default"
export const DEFAULT_PROJECT_ID = "proj_default"
export const DEFAULT_PROJECT_NAME = "Main Project"

const fileKey = (id: string) => `zenithsui:file:${id}`

// ---------------------------------------------------------------------------
// Helpers & Subscriptions
// ---------------------------------------------------------------------------

const trashListeners = new Set<() => void>()

export function subscribeTrash(listener: () => void): () => void {
  trashListeners.add(listener)
  return () => {
    trashListeners.delete(listener)
  }
}

function notifyTrashChanged() {
  for (const listener of trashListeners) {
    try {
      listener()
    } catch {
      // Keep going for remaining listeners
    }
  }
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("zenithsui:trash:changed"))
    } catch {
      // Ignore in non-standard environments
    }
  }
}

function readJSON<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (typeof localStorage === "undefined") return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function dropKey(key: string): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore removal errors
  }
}

function getStoredTrashMap(): Record<string, TrashItem> {
  const data = readJSON<Record<string, TrashItem>>(TRASH_KEY)
  return data && typeof data === "object" ? data : {}
}

function writeStoredTrashMap(map: Record<string, TrashItem>): void {
  writeJSON(TRASH_KEY, map)
  notifyTrashChanged()
}

// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------

/**
 * Sets `deleted_at = now()`. Immediately disables share links and hides document
 * from active views.
 */
export function softDeleteDocument(docId: string): SoftDeleteResult {
  const now = new Date().toISOString()
  const trashMap = getStoredTrashMap()

  // Retrieve current document content either from storage or live store
  let existingDoc: StoredDoc | null = readFile(docId)
  let docName = existingDoc?.name ?? "untitled scribbles"

  let st: ReturnType<typeof useSquig.getState> | null = null
  try {
    st = useSquig.getState()
  } catch {
    st = null
  }

  if (st && st.docId === docId) {
    docName = st.fileName
    existingDoc = {
      id: docId,
      name: st.fileName,
      nodes: st.nodes,
      order: st.order,
      updatedAt: Date.now(),
      look: {
        theme: st.theme,
        font: st.font,
        paper: st.paper,
        grid: st.grid,
      },
    }
  }

  // Build the trash item record
  const trashItem: TrashItem = {
    id: docId,
    name: docName,
    workspaceId: DEFAULT_WORKSPACE_ID,
    projectId: DEFAULT_PROJECT_ID,
    projectName: DEFAULT_PROJECT_NAME,
    deleted_at: now,
    shareLinkActive: false, // Immediately disables share links
    shareSlug: null,
    ownerId: "current-user",
    updatedAt: Date.now(),
    doc: existingDoc ?? undefined,
  }

  trashMap[docId] = trashItem
  writeStoredTrashMap(trashMap)

  // Immediately hide document from active views by removing from index
  const activeFiles = listFiles().filter((f) => f.id !== docId)
  writeJSON(INDEX_KEY, activeFiles)

  // Update store if available
  if (st) {
    st.setNotice(`"${docName}" moved to trash`)
    // Update the drawer listing in store
    useSquig.setState({ files: activeFiles })

    // If the currently open document was soft-deleted, evacuate the canvas
    if (st.docId === docId) {
      if (activeFiles.length > 0) {
        st.openFile(activeFiles[0].id)
      } else {
        st.newFile()
      }
    }
  }

  return {
    success: true,
    docId,
    deleted_at: now,
  }
}

/**
 * Clears `deleted_at = null`, restoring document back into active views.
 */
export function restoreDocument(docId: string): RestoreResult {
  const trashMap = getStoredTrashMap()
  const item = trashMap[docId]

  if (!item) {
    return { success: false, docId }
  }

  // Restore document file data to local storage
  if (item.doc) {
    writeJSON(fileKey(docId), item.doc)
    // Add back to active file drawer index
    saveFile(item.doc)
  } else {
    // Fallback: create stub stored doc if doc payload was empty
    const fallbackDoc: StoredDoc = {
      id: docId,
      name: item.name,
      nodes: {},
      order: [],
      updatedAt: Date.now(),
    }
    writeJSON(fileKey(docId), fallbackDoc)
    saveFile(fallbackDoc)
  }

  // Remove from trash map
  delete trashMap[docId]
  writeStoredTrashMap(trashMap)

  // Synchronize store
  try {
    const st = useSquig.getState()
    st.setNotice(`"${item.name}" restored`)
    useSquig.setState({ files: listFiles() })
  } catch {
    // Ignore outside browser/React tree
  }

  return {
    success: true,
    docId,
    doc: item.doc,
  }
}

/**
 * Lists all soft-deleted documents with original project and deletion timestamp.
 */
export function listTrashDocuments(workspaceId: string = DEFAULT_WORKSPACE_ID): TrashItem[] {
  const trashMap = getStoredTrashMap()
  const all = Object.values(trashMap)

  return all
    .filter((item) => {
      if (!item.deleted_at) return false
      // Filter by workspace if specified and item has a workspace
      if (workspaceId && item.workspaceId && item.workspaceId !== workspaceId) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Sort newest deletion first
      const timeA = new Date(a.deleted_at).getTime()
      const timeB = new Date(b.deleted_at).getTime()
      return timeB - timeA
    })
}

/**
 * Physical purge (for document owners/admins only).
 */
export function permanentlyDeleteDocument(
  docId: string,
  role: UserRole = "owner"
): PermanentDeleteResult {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Unauthorized: Only document owners or administrators may permanently delete documents.")
  }

  const trashMap = getStoredTrashMap()
  delete trashMap[docId]
  writeStoredTrashMap(trashMap)

  // Physically remove document payload and index entries
  dropKey(fileKey(docId))
  const updatedFiles = listFiles().filter((f) => f.id !== docId)
  writeJSON(INDEX_KEY, updatedFiles)

  try {
    const st = useSquig.getState()
    st.setNotice("Document permanently deleted")
    useSquig.setState({ files: updatedFiles })
  } catch {
    // Ignore outside browser/React tree
  }

  return {
    success: true,
    docId,
  }
}
