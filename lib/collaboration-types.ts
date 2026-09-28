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
 */
export function applyCollaborationOps(doc: StoredDoc, ops: CollaborationOp[]): StoredDoc {
  const nodes = { ...doc.nodes }
  let order = [...doc.order]
  let look = doc.look ? { ...doc.look } : undefined
  let name = doc.name
  let hasPassword = doc.hasPassword

  for (const op of ops) {
    switch (op.type) {
      case "add-nodes": {
        for (const n of op.nodes) {
          if (!n || !n.id) continue
          nodes[n.id] = n
          if (!order.includes(n.id)) {
            order.push(n.id)
          }
        }
        break
      }
      case "update-nodes": {
        for (const [id, patch] of Object.entries(op.patches)) {
          const cur = nodes[id]
          if (cur) {
            // If patch modifies nested component props, merge cleanly
            if (cur.type === "component" && (patch as { props?: Record<string, unknown> }).props) {
              const prevProps = (cur as { props: Record<string, unknown> }).props || {}
              const newProps = (patch as { props: Record<string, unknown> }).props || {}
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
        const toRemove = new Set(op.ids)
        for (const id of op.ids) {
          delete nodes[id]
        }
        order = order.filter((id) => !toRemove.has(id))
        break
      }
      case "reorder-nodes": {
        const seen = new Set<string>()
        const validOrder: string[] = []
        for (const id of op.order) {
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
        look = { ...op.look }
        break
      }
      case "set-filename": {
        if (typeof op.name === "string" && op.name.trim()) {
          name = op.name.trim()
        }
        break
      }
      case "set-security": {
        hasPassword = !!op.hasPassword
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
