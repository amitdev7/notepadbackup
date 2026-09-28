"use client"

import { useSquig } from "./store"
import { getClientSessionId, getStoredEditToken } from "./database"
import type {
  CollaborationOp,
  Collaborator,
  CollabStatus,
  ServerInitMessage,
  ServerPatchMessage,
  ServerPresenceMessage,
} from "./collaboration-types"
import { applyCollaborationOps } from "./collaboration-types"
import type { SquigNode } from "./types"
import type { Look } from "./theme"
import { applyLook } from "./theme"
import {
  enqueueOfflineOp,
  getOfflineQueue,
  clearOfflineQueue,
} from "./offline-queue"

// ---------------------------------------------------------------------------
// Client Collaboration Controller
// ---------------------------------------------------------------------------

class CollaborationClient {
  private activeDbId: string | null = null
  private activeFileId: string | null = null
  private serverRevision = 0
  private status: CollabStatus = "offline"
  private collaborators: Collaborator[] = []
  private isApplyingRemote = false
  private pendingOps: CollaborationOp[] = []
  private offlineQueue: CollaborationOp[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private eventSource: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private isDestroyed = false

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkOnline())
      window.addEventListener("offline", () => this.handleNetworkOffline())
    }
  }

  get isApplyingRemoteUpdate(): boolean {
    return this.isApplyingRemote
  }

  getStatus(): CollabStatus {
    return this.status
  }

  getCollaborators(): Collaborator[] {
    return this.collaborators
  }

  getRevision(): number {
    return this.serverRevision
  }

  private setStatus(status: CollabStatus): void {
    this.status = status
    useSquig.setState({ collabStatus: status })
  }

  private setCollaborators(collaborators: Collaborator[]): void {
    this.collaborators = collaborators
    useSquig.setState({ collaborators })
  }

  /**
   * Connect to real-time room for database + file
   */
  joinRoom(dbId: string, fileId: string): void {
    if (this.activeDbId === dbId && this.activeFileId === fileId && this.eventSource) {
      return
    }

    this.leaveRoom()
    this.activeDbId = dbId
    this.activeFileId = fileId
    this.serverRevision = 0
    this.reconnectAttempts = 0
    this.isDestroyed = false

    this.connectSSE()
  }

  /**
   * Leave active real-time room
   */
  leaveRoom(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.pendingOps = []
    this.offlineQueue = []
    this.activeDbId = null
    this.activeFileId = null
    this.serverRevision = 0
    this.setStatus("offline")
    this.setCollaborators([])
  }

  private connectSSE(): void {
    if (!this.activeDbId || !this.activeFileId || typeof window === "undefined") {
      return
    }

    const dbId = this.activeDbId
    const fileId = this.activeFileId
    const clientId = getClientSessionId()
    const token = getStoredEditToken(dbId, fileId) || ""

    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "syncing")

    const url = `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/realtime?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(token)}`

    try {
      if (this.eventSource) {
        this.eventSource.close()
      }

      const es = new EventSource(url)
      this.eventSource = es

      es.addEventListener("init", (e) => {
        try {
          const data = JSON.parse(e.data) as ServerInitMessage
          this.handleInit(data)
        } catch (err) {
          console.error("[Collab] Error parsing init message:", err)
        }
      })

      es.addEventListener("patch", (e) => {
        try {
          const data = JSON.parse(e.data) as ServerPatchMessage
          this.handleRemotePatch(data)
        } catch (err) {
          console.error("[Collab] Error parsing patch message:", err)
        }
      })

      es.addEventListener("presence", (e) => {
        try {
          const data = JSON.parse(e.data) as ServerPresenceMessage
          this.setCollaborators(data.collaborators || [])
        } catch (err) {
          console.error("[Collab] Error parsing presence message:", err)
        }
      })

      es.addEventListener("restore", (e) => {
        try {
          const data = JSON.parse(e.data) as {
            type: "restore"
            dbId: string
            fileId: string
            revision: number
            version: number
            restoredFromVersion: number
            doc: {
              id: string
              name: string
              nodes: Record<string, SquigNode>
              order: string[]
              look?: Look
              updatedAt: number
            }
          }
          if (this.activeDbId === data.dbId && this.activeFileId === data.fileId) {
            this.serverRevision = data.revision
            const st = useSquig.getState()
            if (st.docId === data.fileId) {
              this.isApplyingRemote = true
              try {
                useSquig.setState({
                  fileName: data.doc.name || st.fileName,
                  nodes: data.doc.nodes || {},
                  order: data.doc.order || [],
                  collabRevision: data.revision,
                  selection: [],
                  previewVersion: null,
                })
                if (data.doc.look) {
                  useSquig.setState(data.doc.look)
                  applyLook(data.doc.look)
                }
                st.setNotice(`Page restored to version ${data.restoredFromVersion}`)
              } finally {
                this.isApplyingRemote = false
              }
            }
          }
        } catch (err) {
          console.error("[Collab] Error parsing restore message:", err)
        }
      })

      es.onopen = () => {
        this.reconnectAttempts = 0
        if (this.status === "reconnecting" || this.status === "offline") {
          this.setStatus("synced")
        }
      }

      es.onerror = () => {
        es.close()
        this.eventSource = null
        this.handleConnectionDrop()
      }
    } catch (err) {
      console.warn("[Collab] SSE connection error:", err)
      this.handleConnectionDrop()
    }
  }

  private handleInit(msg: ServerInitMessage): void {
    if (this.activeDbId !== msg.dbId || this.activeFileId !== msg.fileId) return

    this.serverRevision = msg.revision
    this.setCollaborators(msg.collaborators || [])
    this.setStatus("synced")

    const st = useSquig.getState()
    // Hydrate document if it came from server and local canvas is current file
    if (st.docId === msg.fileId) {
      this.isApplyingRemote = true
      try {
        const doc = msg.doc
        const nodes = (doc.nodes || {}) as Record<string, SquigNode>
        const order = doc.order || []
        useSquig.setState({
          fileName: doc.name || st.fileName,
          nodes,
          order,
          hasPassword: !!msg.hasPassword,
          isReadOnly: msg.role === "viewer",
          permissionRole: msg.role,
          collabRevision: msg.revision,
        })
        if (doc.look) {
          useSquig.setState(doc.look)
          applyLook(doc.look as Look)
        }
      } finally {
        this.isApplyingRemote = false
      }
    }
  }

  private handleRemotePatch(msg: ServerPatchMessage): void {
    if (this.activeDbId !== msg.dbId || this.activeFileId !== msg.fileId) return

    const myClientId = getClientSessionId()
    if (msg.clientId === myClientId) {
      // Local echo of our own change, just record the server revision
      this.serverRevision = Math.max(this.serverRevision, msg.revision)
      useSquig.setState({ collabRevision: this.serverRevision })
      return
    }

    // Detect revision sequence gap
    if (msg.revision > this.serverRevision + 1 && this.serverRevision > 0) {
      console.warn(`[Collab] Detected revision gap: expected ${this.serverRevision + 1}, got ${msg.revision}. Catching up...`)
      void this.catchUpMissedPatches()
      return
    }

    this.serverRevision = msg.revision
    useSquig.setState({ collabRevision: this.serverRevision })

    // Apply remote patch to local store without adding to local undo stack
    this.applyOpsToStore(msg.ops)
  }

  private applyOpsToStore(ops: CollaborationOp[]): void {
    this.isApplyingRemote = true
    try {
      const st = useSquig.getState()
      const currentDoc = {
        id: st.docId ?? "local",
        name: st.fileName,
        nodes: st.nodes,
        order: st.order,
        updatedAt: Date.now(),
        look: {
          theme: st.theme,
          paper: st.paper,
          font: st.font,
          grid: st.grid,
        } as Look,
        hasPassword: st.hasPassword,
      }

      const updated = applyCollaborationOps(currentDoc, ops)

      // Reconcile selection: filter out any nodes that were deleted remotely
      const validSelection = st.selection.filter((id) => !!updated.nodes[id])

      useSquig.setState({
        nodes: updated.nodes,
        order: updated.order,
        fileName: updated.name,
        selection: validSelection,
        hasPassword: updated.hasPassword,
      })

      if (updated.look) {
        useSquig.setState(updated.look)
        applyLook(updated.look)
      }
    } finally {
      this.isApplyingRemote = false
    }
  }

  /**
   * Queue a local mutation to be synchronized to the server
   */
  queueOp(op: CollaborationOp, immediate = false): void {
    if (!this.activeDbId || !this.activeFileId) return
    if (this.isApplyingRemote) return
    const isReadOnly = useSquig.getState().isReadOnly
    if (isReadOnly) return

    this.pendingOps.push(op)

    // Persist to durable offline queue in case browser is closed or refreshed before network flushes
    enqueueOfflineOp(this.activeDbId, this.activeFileId, op, this.serverRevision)

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline")
      return
    }

    if (immediate) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer)
        this.flushTimer = null
      }
      void this.flush()
    } else {
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null
          void this.flush()
        }, 50)
      }
    }
  }

  /**
   * Flush pending mutations to server
   */
  async flush(): Promise<void> {
    if (!this.pendingOps.length || !this.activeDbId || !this.activeFileId) return

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline")
      return
    }

    const opsToSend = [...this.pendingOps]
    this.pendingOps = []

    const dbId = this.activeDbId
    const fileId = this.activeFileId
    const clientId = getClientSessionId()
    const token = getStoredEditToken(dbId, fileId) || ""

    this.setStatus("syncing")

    try {
      const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/realtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": clientId,
          "x-zenithsui-edit-token": token,
        },
        body: JSON.stringify({
          type: "mutate",
          dbId,
          fileId,
          clientId,
          baseRevision: this.serverRevision,
          ops: opsToSend,
          timestamp: Date.now(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        this.serverRevision = data.revision
        useSquig.setState({ collabRevision: this.serverRevision })
        clearOfflineQueue(dbId, fileId)
        this.setStatus("synced")
      } else if (res.status === 403) {
        useSquig.setState({ isReadOnly: true, isLocked: true })
        useSquig.getState().setNotice("Document is locked. Enter password to edit.")
        this.setStatus("error")
      } else {
        // Re-queue failed ops
        this.pendingOps.unshift(...opsToSend)
        this.setStatus("reconnecting")
      }
    } catch (err) {
      console.warn("[Collab] Failed to push mutation to server:", err)
      this.pendingOps.unshift(...opsToSend)
      this.setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting")
    }
  }

  /**
   * Fetch missed patches after reconnection or gap detection
   */
  async catchUpMissedPatches(): Promise<void> {
    if (!this.activeDbId || !this.activeFileId) return

    try {
      const dbId = this.activeDbId
      const fileId = this.activeFileId
      const token = getStoredEditToken(dbId, fileId) || ""
      const res = await fetch(
        `/api/database/${encodeURIComponent(dbId)}/files/${encodeURIComponent(fileId)}/realtime?since=${this.serverRevision}`,
        {
          headers: {
            "x-session-id": getClientSessionId(),
            "x-zenithsui-edit-token": token,
          },
          cache: "no-store",
        }
      )

      if (!res.ok) return
      const data = await res.json()

      if (data.fullSync && data.doc) {
        this.serverRevision = data.revision
        this.handleInit({
          type: "init",
          dbId,
          fileId,
          revision: data.revision,
          doc: data.doc,
          collaborators: this.collaborators,
          role: useSquig.getState().permissionRole ?? "viewer",
          hasPassword: data.doc.hasPassword,
        })
      } else if (Array.isArray(data.patches) && data.patches.length) {
        for (const patch of data.patches) {
          if (patch.clientId !== getClientSessionId()) {
            this.applyOpsToStore(patch.ops)
          }
          this.serverRevision = Math.max(this.serverRevision, patch.revision)
        }
        useSquig.setState({ collabRevision: this.serverRevision })
      }

      // Reconcile and flush durable offline queue
      const queuedItems = getOfflineQueue(dbId, fileId)
      if (queuedItems.length > 0) {
        const queuedOps = queuedItems.map((q) => q.op)
        this.pendingOps.unshift(...queuedOps)
        void this.flush()
      } else {
        this.setStatus("synced")
      }
    } catch (err) {
      console.warn("[Collab] Catchup request failed:", err)
    }
  }

  private handleConnectionDrop(): void {
    if (this.isDestroyed || !this.activeDbId) return
    this.setStatus("reconnecting")

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    // Exponential backoff with jitter: 1s, 2s, 4s, max 10s
    this.reconnectAttempts++
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 500)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      await this.catchUpMissedPatches()
      this.connectSSE()
    }, delay)
  }

  private handleNetworkOnline(): void {
    if (this.activeDbId && this.activeFileId) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      void this.catchUpMissedPatches()
      this.connectSSE()
    }
  }

  private handleNetworkOffline(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.setStatus("offline")
  }
}

export const collabClient = new CollaborationClient()
