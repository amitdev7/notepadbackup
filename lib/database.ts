"use client"

// ---------------------------------------------------------------------------
// Database definitions and client interface for shared files.
//
// Model:
//   Select Database -> Database 1 -> Shared Files -> Everyone connected
//
// Easily extensible: To add Database 2, Database 3, etc. later, simply add
// another entry to AVAILABLE_DATABASES or call registerDatabase.
// ---------------------------------------------------------------------------

import type { FileMeta, StoredDoc } from "./files"
import type { PageVersion, PageVersionMeta } from "./version-types"

export interface Database {
  id: string
  name: string
  description: string
  badge?: string
  status?: "connected" | "available" | "syncing" | "offline"
  endpoint?: string
  isDefault?: boolean
}

/**
 * Registry of available databases. Currently starts with 1 database,
 * architected to support multiple databases in the future.
 */
export const AVAILABLE_DATABASES: Database[] = [
  {
    id: "nezukos-box",
    name: "Nezuko's Box",
    description: "Nezuko's Box serves as the central database and asset storage of the website.",
    badge: "Supabase",
    status: "available",
    endpoint: "/api/database/nezukos-box",
    isDefault: true,
  },
  {
    id: "primary-db",
    name: "Zenithsui Community Cloud",
    description: "Shared workspace database for collaborative wireframes and community files.",
    badge: "Shared",
    status: "available",
    endpoint: "/api/database/primary-db",
  },
]

export function getDatabase(id: string): Database | undefined {
  return AVAILABLE_DATABASES.find((db) => db.id === id)
}

export function getDefaultDatabase(): Database {
  return AVAILABLE_DATABASES.find((db) => db.isDefault) ?? AVAILABLE_DATABASES[0]
}

// ---------------------------------------------------------------------------
// Database Cache Keys (in-browser replica / cache for the connected DB)
// ---------------------------------------------------------------------------
export const dbIndexKey = (dbId: string) => `zenithsui:db:${dbId}:files:v1`
export const dbFileKey = (dbId: string, fileId: string) => `zenithsui:db:${dbId}:file:${fileId}`

export function getStoredEditToken(dbId: string, fileId: string): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(`zenithsui:token:${dbId}:${fileId}`)
}

export function storeEditToken(dbId: string, fileId: string, token: string): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(`zenithsui:token:${dbId}:${fileId}`, token)
}

export function clearStoredEditToken(dbId: string, fileId: string): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(`zenithsui:token:${dbId}:${fileId}`)
}

export function getClientSessionId(): string {
  if (typeof window === "undefined") return "session-server"
  let id = sessionStorage.getItem("zenithsui:session-id")
  if (!id) {
    id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem("zenithsui:session-id", id)
  }
  return id
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function dropJSON(key: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Verify document password on the server.
 */
export async function verifyFilePassword(
  dbId: string,
  fileId: string,
  password: string
): Promise<{
  success: boolean
  token?: string
  error?: string
  attemptsLeft?: number
  locked?: boolean
}> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok && data.token) {
      storeEditToken(dbId, fileId, data.token)
      return { success: true, token: data.token }
    }
    return {
      success: false,
      error: data.error || "Incorrect password",
      attemptsLeft: data.attemptsLeft,
      locked: data.locked,
    }
  } catch {
    return { success: false, error: "Network error verifying password" }
  }
}

/**
 * Set or update password for a database document.
 */
export async function setDatabaseFilePassword(
  dbId: string,
  fileId: string,
  newPassword: string,
  oldPassword?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/auth`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      body: JSON.stringify({ newPassword, oldPassword }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      if (data.token) {
        storeEditToken(dbId, fileId, data.token)
      }
      return { success: true, token: data.token }
    }
    return { success: false, error: data.error || "Failed to set password" }
  } catch {
    return { success: false, error: "Network error setting password" }
  }
}

/**
 * Remove password protection from a database document.
 */
export async function removeDatabaseFilePassword(
  dbId: string,
  fileId: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/auth`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      clearStoredEditToken(dbId, fileId)
      return { success: true }
    }
    return { success: false, error: data.error || "Failed to remove password" }
  } catch {
    return { success: false, error: "Network error removing password" }
  }
}

/**
 * Fetch the shared file list for a specific database from the backend.
 * Falls back to local cached replica if the server is unreachable or offline.
 */
export async function listDatabaseFiles(dbId: string): Promise<FileMeta[]> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.files)) {
        // Sync local cache for this database
        writeJSON(dbIndexKey(dbId), data.files)
        return data.files
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed to fetch remote files for ${dbId}, falling back to cache:`, err)
  }

  // Fallback to cached index for this database
  const cached = readJSON<FileMeta[]>(dbIndexKey(dbId))
  return Array.isArray(cached) ? cached : []
}

/**
 * Read a specific document from a database.
 */
export async function readDatabaseFile(dbId: string, fileId: string): Promise<StoredDoc | null> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      if (data.doc) {
        writeJSON(dbFileKey(dbId, fileId), data.doc)
        return data.doc
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed to fetch remote doc ${fileId} for ${dbId}, checking cache:`, err)
  }

  return readJSON<StoredDoc>(dbFileKey(dbId, fileId))
}

/**
 * Save/update a document to the selected database.
 */
export async function saveDatabaseFile(
  dbId: string,
  doc: StoredDoc
): Promise<{ success: boolean; files: FileMeta[]; error?: string; locked?: boolean }> {
  // Update local cache immediately for fast UI
  const currentCached = readJSON<FileMeta[]>(dbIndexKey(dbId)) ?? []
  const newMeta: FileMeta = {
    id: doc.id,
    name: doc.name,
    updatedAt: doc.updatedAt,
    dbId,
    hasPassword: doc.hasPassword,
  }
  const updatedCache = [newMeta, ...currentCached.filter((f) => f.id !== doc.id)]
  writeJSON(dbIndexKey(dbId), updatedCache)
  writeJSON(dbFileKey(dbId, doc.id), { ...doc, dbId })

  try {
    const token = getStoredEditToken(dbId, doc.id) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      body: JSON.stringify({ doc: { ...doc, dbId } }),
    })
    const data = await res.json()
    if (res.ok && Array.isArray(data.files)) {
      writeJSON(dbIndexKey(dbId), data.files)
      return { success: true, files: data.files }
    }
    if (res.status === 403) {
      return {
        success: false,
        files: currentCached,
        error: data.error || "Document is protected. Enter password to edit.",
        locked: true,
      }
    }
  } catch (err) {
    console.warn(`[Database] Remote save failed for ${doc.id} on ${dbId}, cached locally:`, err)
  }

  return { success: true, files: updatedCache }
}

/**
 * Delete a document from a database.
 */
export async function deleteDatabaseFile(
  dbId: string,
  fileId: string
): Promise<{ success: boolean; files: FileMeta[]; error?: string }> {
  dropJSON(dbFileKey(dbId, fileId))
  const currentCached = readJSON<FileMeta[]>(dbIndexKey(dbId)) ?? []
  const updatedCache = currentCached.filter((f) => f.id !== fileId)
  writeJSON(dbIndexKey(dbId), updatedCache)

  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.files)) {
        writeJSON(dbIndexKey(dbId), data.files)
        return { success: true, files: data.files }
      }
    }
  } catch (err) {
    console.warn(`[Database] Remote delete failed for ${fileId} on ${dbId}:`, err)
  }

  return { success: true, files: updatedCache }
}

/**
 * List all saved versions for a database document.
 */
export async function listDatabaseFileVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/versions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.versions)) {
        return data.versions
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed to fetch versions for ${fileId}:`, err)
  }
  return []
}

/**
 * Fetch a specific version snapshot of a database document.
 */
export async function getDatabaseFileVersion(
  dbId: string,
  fileId: string,
  versionNumber: number
): Promise<PageVersion | null> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(
      `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/versions?version=${versionNumber}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": getClientSessionId(),
          "x-zenithsui-edit-token": token,
        },
        cache: "no-store",
      }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.version) {
        return data.version
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed to get version ${versionNumber} for ${fileId}:`, err)
  }
  return null
}

/**
 * Restore a specific version of a database document.
 */
export async function restoreDatabaseFileVersion(
  dbId: string,
  fileId: string,
  versionNumber: number
): Promise<{ success: boolean; doc?: StoredDoc; newVersion?: PageVersion; error?: string }> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
        "x-zenithsui-edit-token": token,
      },
      body: JSON.stringify({ action: "restore", versionNumber }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      if (data.doc) {
        writeJSON(dbFileKey(dbId, fileId), data.doc)
      }
      return { success: true, doc: data.doc, newVersion: data.newVersion }
    }
    return { success: false, error: data.error || "Failed to restore version" }
  } catch {
    return { success: false, error: "Network error restoring version" }
  }
}

// ---------------------------------------------------------------------------
// Database Membership & Secure Access Management
// ---------------------------------------------------------------------------

export interface DatabaseMemberClient {
  userId: string
  name: string
  email?: string
  role: "owner" | "editor" | "viewer"
  addedAt: number
}

export interface DatabaseAccessInfo {
  dbId: string
  name: string
  description: string
  members: DatabaseMemberClient[]
  myRole: "owner" | "editor" | "viewer"
  isOwner: boolean
}

/**
 * Fetch member list and access permissions for a database
 */
export async function getDatabaseAccessInfo(dbId: string): Promise<DatabaseAccessInfo | null> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/members`, {
      method: "GET",
      headers: {
        "x-session-id": getClientSessionId(),
      },
      cache: "no-store",
    })
    if (res.ok) {
      return (await res.json()) as DatabaseAccessInfo
    }
  } catch (err) {
    console.warn(`[Database] Failed to get members for ${dbId}:`, err)
  }
  return null
}

/**
 * Add a team member to a database (Requires owner role)
 */
export async function addDatabaseMember(
  dbId: string,
  member: { name: string; email?: string; role: "owner" | "editor" | "viewer" }
): Promise<{ success: boolean; members?: DatabaseMemberClient[]; error?: string }> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify(member),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to add member" }
  } catch {
    return { success: false, error: "Network error adding member" }
  }
}

/**
 * Update a member's role in a database (Requires owner role)
 */
export async function updateDatabaseMemberRole(
  dbId: string,
  targetUserId: string,
  role: "owner" | "editor" | "viewer"
): Promise<{ success: boolean; members?: DatabaseMemberClient[]; error?: string }> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/members`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ targetUserId, role }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to update role" }
  } catch {
    return { success: false, error: "Network error updating role" }
  }
}

/**
 * Remove a member from a database (Requires owner role)
 */
export async function removeDatabaseMember(
  dbId: string,
  targetUserId: string
): Promise<{ success: boolean; members?: DatabaseMemberClient[]; error?: string }> {
  try {
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/members`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ targetUserId }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to remove member" }
  } catch {
    return { success: false, error: "Network error removing member" }
  }
}

// ---------------------------------------------------------------------------
// Share Page Client Methods (/p/<publicId> & settings)
// ---------------------------------------------------------------------------

export type ShareMode = "public-view" | "password-edit" | "private"

export interface ClientSafeShareConfig {
  id: string
  dbId: string
  fileId: string
  publicId: string
  mode: ShareMode
  enabled: boolean
  hasPassword: boolean
  createdAt: number
  updatedAt: number
}

/**
 * Fetch share configuration for a document (requires editor/owner).
 */
export async function getDatabaseFileShare(
  dbId: string,
  fileId: string
): Promise<ClientSafeShareConfig | null> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(
      `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/share`,
      {
        method: "GET",
        headers: {
          "x-session-id": getClientSessionId(),
          "x-zenithsui-edit-token": token,
        },
        cache: "no-store",
      }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.share) {
        return data.share as ClientSafeShareConfig
      }
    }
  } catch (err) {
    console.warn(`[Database] Failed to get share config for ${fileId}:`, err)
  }
  return null
}

/**
 * Update share settings (mode, enabled, password, regenerateId).
 */
export async function updateDatabaseFileShare(
  dbId: string,
  fileId: string,
  settings: {
    mode?: ShareMode
    enabled?: boolean
    password?: string
    clearPassword?: boolean
    regenerateId?: boolean
    docSnapshot?: any
  }
): Promise<{ success: boolean; share?: ClientSafeShareConfig; error?: string }> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(
      `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/share`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": getClientSessionId(),
          "x-zenithsui-edit-token": token,
        },
        body: JSON.stringify(settings),
      }
    )
    const data = await res.json()
    if (res.ok && data.success && data.share) {
      return { success: true, share: data.share }
    }
    return { success: false, error: data.error || "Failed to update share settings" }
  } catch {
    return { success: false, error: "Network error updating share settings" }
  }
}

/**
 * Revoke public sharing for a document.
 */
export async function revokeDatabaseFileShare(
  dbId: string,
  fileId: string
): Promise<{ success: boolean; share?: ClientSafeShareConfig; error?: string }> {
  try {
    const token = getStoredEditToken(dbId, fileId) || ""
    const res = await fetch(
      `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/share`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": getClientSessionId(),
          "x-zenithsui-edit-token": token,
        },
      }
    )
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, share: data.share }
    }
    return { success: false, error: data.error || "Failed to revoke share" }
  } catch {
    return { success: false, error: "Network error revoking share" }
  }
}

/**
 * Resolve a shared page by publicId from the viewer endpoint.
 */
export async function resolvePublicShareClient(publicId: string): Promise<{
  success: boolean
  status?: number
  publicId?: string
  dbId?: string
  fileId?: string
  mode?: ShareMode
  hasPassword?: boolean
  doc?: StoredDoc
  error?: string
}> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(publicId)}`, {
      method: "GET",
      headers: {
        "x-session-id": getClientSessionId(),
      },
      cache: "no-store",
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return {
        success: true,
        status: res.status,
        publicId: data.publicId,
        dbId: data.dbId,
        fileId: data.fileId,
        mode: data.mode,
        hasPassword: data.hasPassword,
        doc: data.doc,
      }
    }
    return { success: false, status: res.status, error: data.error || "Failed to resolve share link" }
  } catch {
    return { success: false, status: 500, error: "Network error loading shared document" }
  }
}

/**
 * Verify edit password for password-edit mode on a public link.
 */
export async function verifySharePasswordClient(
  publicId: string,
  password: string
): Promise<{
  success: boolean
  token?: string
  role?: string
  locked?: boolean
  attemptsLeft?: number
  error?: string
}> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(publicId)}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok && data.success && data.token) {
      return { success: true, token: data.token, role: data.role }
    }
    return {
      success: false,
      error: data.error || "Incorrect password",
      locked: data.locked,
      attemptsLeft: data.attemptsLeft,
    }
  } catch {
    return { success: false, error: "Network error verifying password" }
  }
}


