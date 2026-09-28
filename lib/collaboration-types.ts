// ---------------------------------------------------------------------------
// Real-time Collaboration Protocol & Types for Zenithsui
// ---------------------------------------------------------------------------

import type { Look } from "./theme"
import type { SquigNode } from "./types"
import type { StoredDoc } from "./files"

export type CollabRole = "owner" | "editor" | "viewer"

export type CollabStatus =
  | "synced"
  | "syncing"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error"

export interface Collaborator {
  id: string // Client session ID
  name?: string
  color?: string
  connectedAt: number
  lastActive: number
  role: CollabRole
}

export type CollaborationOp =
  | { type: "add-nodes"; nodes: SquigNode[] }
  | { type: "update-nodes"; patches: Record<string, Partial<SquigNode>> }
  | { type: "remove-nodes"; ids: string[] }
  | { type: "reorder-nodes"; order: string[] }
  | { type: "set-look"; look: Look }
  | { type: "set-filename"; name: string }
  | { type: "set-security"; hasPassword?: boolean }

export interface ClientMutatePayload {
  type: "mutate"
  dbId: string
  fileId: string
  clientId: string
  baseRevision: number
  ops: CollaborationOp[]
  timestamp: number
}

export interface ServerInitMessage {
  type: "init"
  dbId: string
  fileId: string
  revision: number
  doc: StoredDoc
  collaborators: Collaborator[]
  role: CollabRole
  hasPassword: boolean
}

export interface ServerPatchMessage {
  type: "patch"
  dbId: string
  fileId: string
  revision: number
  clientId: string
  ops: CollaborationOp[]
  timestamp: number
}

export interface ServerPresenceMessage {
  type: "presence"
  dbId: string
  fileId: string
  collaborators: Collaborator[]
}

export interface ServerAckMessage {
  type: "ack"
  revision: number
  opsCount: number
}

export interface ServerErrorMessage {
  type: "error"
  code: "UNAUTHORIZED" | "STALE_REVISION" | "LOCKED" | "NOT_FOUND" | "RATE_LIMITED" | "INVALID_OP"
  message: string
}

export type ServerRealtimeMessage =
  | ServerInitMessage
  | ServerPatchMessage
  | ServerPresenceMessage
  | ServerAckMessage
  | ServerErrorMessage

/**
 * Apply a list of collaboration operations to a document in-place or returning a new document.
 * Defensive throughout: ops arrive over the network and must never throw, and
 * remote nodes are shape-checked before they join the canvas.
 */
export function applyCollaborationOps(doc: StoredDoc, ops: CollaborationOp[]): StoredDoc {
  if (!doc || typeof doc !== "object") return doc
  if (!Array.isArray(ops)) {
    return { ...doc, updatedAt: Date.now() }
  }
  const seed = (doc.nodes && typeof doc.nodes === "object" ? doc.nodes : {}) as Record<string, SquigNode>
  const nodes = { ...seed }
  let order = Array.isArray(doc.order) ? [...doc.order] : Object.keys(nodes)
  let look = doc.look ? { ...doc.look } : undefined
  let name = doc.name
  let hasPassword = doc.hasPassword

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v)

  /** Minimum shape for a node the canvas can hold without crashing. */
  const cleanRemoteNode = (n: unknown): SquigNode | null => {
    if (!isPlainObject(n)) return null
    const c = n as Record<string, unknown>
    if (typeof c.id !== "string" || !c.id) return null
    if (typeof c.type !== "string") return null
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.w) || !Number.isFinite(c.h)) {
      return null
    }
    return c as unknown as SquigNode
  }

  for (const op of ops) {
    if (!op || typeof (op as any).type !== "string") continue
    switch (op.type) {
      case "add-nodes": {
        if (!Array.isArray((op as any).nodes)) break
        for (const n of (op as any).nodes) {
          const clean = cleanRemoteNode(n)
          if (!clean) continue
          nodes[clean.id] = clean
          if (!order.includes(clean.id)) {
            order.push(clean.id)
          }
        }
        break
      }
      case "update-nodes": {
        if (!isPlainObject((op as any).patches)) break
        for (const [id, patch] of Object.entries((op as any).patches as Record<string, unknown>)) {
          const cur = nodes[id]
          if (cur && isPlainObject(patch)) {
            // If patch modifies nested component props, merge cleanly
            if (cur.type === "component" && (patch as { props?: Record<string, unknown> }).props) {
              const prevProps = (cur as { props: Record<string, unknown> }).props || {}
              const rawNew = (patch as { props: Record<string, unknown> }).props
              const newProps = isPlainObject(rawNew) ? rawNew : {}
              nodes[id] = {
                ...cur,
                ...patch,
                props: { ...prevProps, ...newProps },
              } as SquigNode
            } else {
              nodes[id] = { ...cur, ...patch } as SquigNode
            }
          }
        }
        break
      }
      case "remove-nodes": {
        if (!Array.isArray((op as any).ids)) break
        const toRemove = new Set((op as any).ids as string[])
        for (const id of toRemove) {
          delete nodes[id]
        }
        order = order.filter((id) => !toRemove.has(id))
        break
      }
      case "reorder-nodes": {
        if (!Array.isArray((op as any).order)) break
        const seen = new Set<string>()
        const validOrder: string[] = []
        for (const id of (op as any).order as string[]) {
          if (nodes[id] && !seen.has(id)) {
            validOrder.push(id)
            seen.add(id)
          }
        }
        // Append any unlisted nodes
        for (const id of Object.keys(nodes)) {
          if (!seen.has(id)) {
            validOrder.push(id)
          }
        }
        order = validOrder
        break
      }
      case "set-look": {
        if (isPlainObject((op as any).look)) look = { ...(op as any).look }
        break
      }
      case "set-filename": {
        if (typeof (op as any).name === "string" && (op as any).name.trim()) {
          name = (op as any).name.trim()
        }
        break
      }
      case "set-security": {
        hasPassword = !!(op as any).hasPassword
        break
      }
    }
  }

  return {
    ...doc,
    name,
    nodes,
    order,
    look,
    hasPassword,
    updatedAt: Date.now(),
  }
}
