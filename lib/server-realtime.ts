import type { ServerStoredDoc } from "@/lib/server-documents"
import { getRawDoc, getStore, persistDbFiles } from "@/lib/server-documents"
import { saveSupabaseDoc } from "@/lib/supabase-server"
import { verifyEditToken } from "@/lib/security"
import { createPageVersion } from "@/lib/server-versions"
import type {
  CollaborationOp,
  Collaborator,
  ServerPatchMessage,
  ServerPresenceMessage,
} from "./collaboration-types"
import { applyCollaborationOps } from "./collaboration-types"
import type { StoredDoc } from "./files"

// ---------------------------------------------------------------------------
// Server-Authoritative Realtime Room Hub
// ---------------------------------------------------------------------------

export interface RoomSubscriber {
  clientId: string
  collaborator: Collaborator
  editToken?: string
  send: (event: string, data: unknown) => void
  close: () => void
}

export interface PatchHistoryItem {
  revision: number
  clientId: string
  ops: CollaborationOp[]
  timestamp: number
}

export class RealtimeRoom {
  dbId: string
  fileId: string
  doc: ServerStoredDoc
  revision: number = 1
  history: PatchHistoryItem[] = []
  subscribers = new Map<string, RoomSubscriber>()
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(dbId: string, fileId: string, initialDoc: ServerStoredDoc) {
    this.dbId = dbId
    this.fileId = fileId
    this.doc = initialDoc
    this.revision = 1
  }

  getCollaborators(): Collaborator[] {
    return Array.from(this.subscribers.values()).map((s) => s.collaborator)
  }

  addSubscriber(sub: RoomSubscriber): void {
    this.subscribers.set(sub.clientId, sub)
    this.broadcastPresence()
  }

  removeSubscriber(clientId: string): void {
    if (this.subscribers.has(clientId)) {
      this.subscribers.delete(clientId)
      this.broadcastPresence()
    }
  }

  broadcastPresence(): void {
    const collaborators = this.getCollaborators()
    const msg: ServerPresenceMessage = {
      type: "presence",
      dbId: this.dbId,
      fileId: this.fileId,
      collaborators,
    }
    this.broadcast("presence", msg)
  }

  broadcast(event: string, data: unknown, excludeClientId?: string): void {
    const deadClientIds: string[] = []
    for (const [cid, sub] of this.subscribers.entries()) {
      if (excludeClientId && cid === excludeClientId) continue
      try {
        sub.send(event, data)
      } catch (err) {
        console.warn(`[RealtimeRoom] Failed to send to client ${cid}:`, err)
        deadClientIds.push(cid)
      }
    }
    if (deadClientIds.length > 0) {
      for (const deadId of deadClientIds) {
        const deadSub = this.subscribers.get(deadId)
        if (deadSub) {
          try {
            deadSub.close()
          } catch {
            // ignore
          }
          this.subscribers.delete(deadId)
        }
      }
      this.broadcastPresence()
    }
  }

  checkCanEdit(editToken?: string): { allowed: boolean; reason?: string } {
    if (!this.doc.hasPassword && !this.doc.passwordHash) {
      return { allowed: true }
    }
    const token = editToken || ""
    const verification = verifyEditToken(token, this.dbId, this.fileId)
    if (!verification.valid) {
      return { allowed: false, reason: "Document is password-protected. Valid edit token required." }
    }
    return { allowed: true }
  }

  applyOps(
    clientId: string,
    ops: CollaborationOp[],
    editToken?: string
  ): { success: boolean; revision: number; error?: string } {
    const auth = this.checkCanEdit(editToken)
    if (!auth.allowed) {
      return { success: false, revision: this.revision, error: auth.reason }
    }

    if (!ops || !ops.length) {
      return { success: true, revision: this.revision }
    }

    // Apply ops to doc
    const currentStoredDoc: StoredDoc = {
      id: this.doc.id,
      name: this.doc.name,
      nodes: (this.doc.nodes || {}) as StoredDoc["nodes"],
      order: this.doc.order || [],
      updatedAt: this.doc.updatedAt || Date.now(),
      look: this.doc.look as StoredDoc["look"],
      dbId: this.dbId,
      hasPassword: this.doc.hasPassword,
    }

    const updated = applyCollaborationOps(currentStoredDoc, ops)

    this.doc = {
      ...this.doc,
      name: updated.name,
      nodes: updated.nodes,
      order: updated.order,
      look: updated.look,
      hasPassword: updated.hasPassword,
      updatedAt: updated.updatedAt,
    }

    this.revision += 1
    const timestamp = Date.now()

    // Add to history ring buffer (keep last 200 patches)
    const historyItem: PatchHistoryItem = {
      revision: this.revision,
      clientId,
      ops,
      timestamp,
    }
    this.history.push(historyItem)
    if (this.history.length > 200) {
      this.history.shift()
    }

    // Schedule debounced save to backend storage
    this.scheduleSave()

    // Broadcast patch to other connected clients
    const patchMsg: ServerPatchMessage = {
      type: "patch",
      dbId: this.dbId,
      fileId: this.fileId,
      revision: this.revision,
      clientId,
      ops,
      timestamp,
    }
    this.broadcast("patch", patchMsg, clientId)

    return { success: true, revision: this.revision }
  }

  getMissedPatches(sinceRevision: number): PatchHistoryItem[] | null {
    if (sinceRevision >= this.revision) {
      return []
    }
    if (this.history.length === 0) {
      return null
    }
    const oldest = this.history[0].revision
    if (sinceRevision < oldest - 1) {
      // Gap too large, history was pruned
      return null
    }
    return this.history.filter((h) => h.revision > sinceRevision)
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => {
      this.flushSave()
    }, 500)
  }

  private async flushSave(): Promise<void> {
    try {
      if (this.dbId === "nezukos-box") {
        const saved = {
          ...this.doc,
          dbId: "nezukos-box",
          updatedAt: Date.now(),
        }
        await saveSupabaseDoc(saved)
        void createPageVersion("nezukos-box", this.fileId, saved, "Collaborative edit").catch(() => {})
      } else {
        const store = getStore(this.dbId)
        const saved = {
          ...this.doc,
          dbId: this.dbId,
          updatedAt: Date.now(),
        }
        store.set(this.fileId, saved)
        persistDbFiles(this.dbId)
        void createPageVersion(this.dbId, this.fileId, saved, "Collaborative edit").catch(() => {})
      }
    } catch (err) {
      console.warn(`[RealtimeRoom] Background persistence error for ${this.fileId}:`, err)
    }
  }
}

// Global Rooms map: `${dbId}:${fileId}` -> RealtimeRoom
const globalRooms = new Map<string, RealtimeRoom>()

export function getRoomKey(dbId: string, fileId: string): string {
  return `${dbId}:${fileId}`
}

export async function getOrCreateRoom(dbId: string, fileId: string): Promise<RealtimeRoom> {
  const key = getRoomKey(dbId, fileId)
  let room = globalRooms.get(key)
  if (room) {
    return room
  }

  // Load doc from backend
  const existingDoc = await getRawDoc(dbId, fileId)
  const doc: ServerStoredDoc = existingDoc || {
    id: fileId,
    name: "untitled scribbles",
    nodes: {},
    order: [],
    updatedAt: Date.now(),
    dbId,
  }

  room = new RealtimeRoom(dbId, fileId, doc)
  globalRooms.set(key, room)
  return room
}

export function getExistingRoom(dbId: string, fileId: string): RealtimeRoom | null {
  const key = getRoomKey(dbId, fileId)
  return globalRooms.get(key) || null
}

