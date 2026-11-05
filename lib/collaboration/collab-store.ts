"use client"

// ---------------------------------------------------------------------------
// Zenithsui Unified Collaboration & Real-Time Presence Store
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { useAuthStore } from "../auth-store"
import { useSquig } from "../store"
import { useShellStore } from "../shell-store"
import {
  type CollabPeer,
  type CollabMessage,
  type DatabaseTelemetry,
  COLLAB_PALETTE,
} from "./types"
import type { SquigNode } from "../types"

// Generate a random stable client session ID
const SELF_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? `peer_${crypto.randomUUID().slice(0, 8)}`
  : `peer_${Math.random().toString(36).slice(2, 9)}`

function getPlatform(): CollabPeer["platform"] {
  if (typeof window === "undefined") return "web"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet"
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile"
  if ((window as any).zenithsuiDesktop) return "desktop"
  return "web"
}

// Deterministically pick a color based on client ID hash
function pickColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % COLLAB_PALETTE.length
  return COLLAB_PALETTE[index]
}

interface CollabStore {
  selfId: string
  selfName: string
  selfColor: string
  peers: Record<string, CollabPeer>
  followingPeerId: string | null
  isCursorChatActive: boolean
  cursorChatDraft: string
  cursorChatExpiryTimer: ReturnType<typeof setTimeout> | null

  // Database Connection Telemetry
  databaseStatus: DatabaseTelemetry | null
  isDatabaseChecking: boolean
  isSyncingToDatabase: boolean
  lastSavedToDatabaseAt: number | null

  // Actions
  setSelfName: (name: string) => void
  setSelfColor: (color: string) => void
  setSelfProfile: (name: string, color?: string) => void
  setPeer: (peer: CollabPeer) => void
  removePeer: (peerId: string) => void
  updatePeerCursor: (peerId: string, x: number, y: number) => void
  updatePeerSelection: (peerId: string, nodeIds: string[]) => void
  updatePeerCursorChat: (peerId: string, text: string) => void
  broadcastCursor: (x: number, y: number) => void
  broadcastSelection: (nodeIds: string[]) => void
  broadcastReaction: (emoji: string, x: number, y: number) => void
  broadcastNodes: (nodes: Record<string, any>, order: string[]) => void
  startCursorChat: (initialChar?: string) => void
  updateCursorChatDraft: (text: string) => void
  commitCursorChat: (text?: string) => void
  cancelCursorChat: () => void
  followPeer: (peerId: string | null) => void
  checkDatabaseHealth: () => Promise<DatabaseTelemetry>
  saveActiveDocumentToDatabase: () => Promise<boolean>
  cleanupStalePeers: () => void
}

let lastBroadcastCursorTime = 0
let transportSender: ((msg: CollabMessage) => void) | null = null

export function registerTransportSender(sender: ((msg: CollabMessage) => void) | null) {
  transportSender = sender
}

export const useCollabStore = create<CollabStore>((set, get) => ({
  selfId: SELF_ID,
  selfName: "You",
  selfColor: pickColor(SELF_ID),
  peers: {},
  followingPeerId: null,
  isCursorChatActive: false,
  cursorChatDraft: "",
  cursorChatExpiryTimer: null,

  databaseStatus: null,
  isDatabaseChecking: false,
  isSyncingToDatabase: false,
  lastSavedToDatabaseAt: null,

  setSelfName: (name: string) => {
    set({ selfName: name })
  },

  setSelfColor: (color: string) => {
    set({ selfColor: color })
  },

  setSelfProfile: (name: string, color?: string) => {
    set((state) => ({
      selfName: name || state.selfName,
      selfColor: color || state.selfColor,
    }))
  },

  setPeer: (peer: CollabPeer) => {
    if (peer.id === get().selfId) return
    set((state) => ({
      peers: {
        ...state.peers,
        [peer.id]: {
          ...peer,
          lastActive: Date.now(),
        },
      },
    }))
  },

  removePeer: (peerId: string) => {
    set((state) => {
      const next = { ...state.peers }
      delete next[peerId]
      return {
        peers: next,
        followingPeerId: state.followingPeerId === peerId ? null : state.followingPeerId,
      }
    })
  },

  updatePeerCursor: (peerId: string, x: number, y: number) => {
    if (peerId === get().selfId) return
    const now = Date.now()
    set((state) => {
      const existing = state.peers[peerId]
      if (!existing) {
        return {
          peers: {
            ...state.peers,
            [peerId]: {
              id: peerId,
              name: `Peer ${peerId.slice(-4)}`,
              color: pickColor(peerId),
              cursor: { x, y },
              selectedNodeIds: [],
              cursorChat: null,
              platform: "web",
              lastActive: now,
              joinedAt: now,
            },
          },
        }
      }
      return {
        peers: {
          ...state.peers,
          [peerId]: {
            ...existing,
            cursor: { x, y },
            lastActive: now,
            isIdle: false,
          },
        },
      }
    })

    // If currently following this peer, track camera viewport smoothly
    if (get().followingPeerId === peerId) {
      const squig = useSquig.getState()
      const { zoom, x: currentX, y: currentY } = squig.viewport
      if (typeof window !== "undefined") {
        const targetX = window.innerWidth / 2 - x * zoom
        const targetY = window.innerHeight / 2 - y * zoom
        // Smooth linear interpolation towards target
        squig.setViewport({
          x: currentX + (targetX - currentX) * 0.25,
          y: currentY + (targetY - currentY) * 0.25,
          zoom,
        })
      }
    }
  },

  updatePeerSelection: (peerId: string, nodeIds: string[]) => {
    if (peerId === get().selfId) return
    set((state) => {
      const existing = state.peers[peerId]
      if (!existing) return state
      return {
        peers: {
          ...state.peers,
          [peerId]: {
            ...existing,
            selectedNodeIds: nodeIds,
            lastActive: Date.now(),
          },
        },
      }
    })
  },

  updatePeerCursorChat: (peerId: string, text: string) => {
    if (peerId === get().selfId) return
    const now = Date.now()
    set((state) => {
      const existing = state.peers[peerId]
      if (!existing) return state
      return {
        peers: {
          ...state.peers,
          [peerId]: {
            ...existing,
            cursorChat: text ? { text, timestamp: now } : null,
            lastActive: now,
          },
        },
      }
    })
  },

  broadcastCursor: (x: number, y: number) => {
    if (useShellStore.getState().preferences.liveCollaborationEnabled === false) return
    const now = Date.now()
    if (now - lastBroadcastCursorTime < 35) return // 30Hz throttle to conserve bandwidth
    lastBroadcastCursorTime = now

    if (transportSender) {
      transportSender({
        type: "cursor_move",
        peerId: get().selfId,
        x,
        y,
        timestamp: now,
      })
    }
  },

  broadcastSelection: (nodeIds: string[]) => {
    if (useShellStore.getState().preferences.liveCollaborationEnabled === false) return
    if (transportSender) {
      transportSender({
        type: "selection_change",
        peerId: get().selfId,
        nodeIds,
        timestamp: Date.now(),
      })
    }
  },

  broadcastReaction: (emoji: string, x: number, y: number) => {
    if (useShellStore.getState().preferences.liveCollaborationEnabled === false) return
    if (transportSender) {
      transportSender({
        type: "peer_reaction",
        peerId: get().selfId,
        emoji,
        x,
        y,
        timestamp: Date.now(),
      })
    }
  },

  broadcastNodes: (nodes: Record<string, any>, order: string[]) => {
    if (useShellStore.getState().preferences.liveCollaborationEnabled === false) return
    if (transportSender) {
      const docId = useSquig.getState().cloudDocId || useSquig.getState().docId
      transportSender({
        type: "node_mutation",
        peerId: get().selfId,
        docId,
        nodes,
        order,
        version: Date.now(),
        timestamp: Date.now(),
      })
    }
  },

  startCursorChat: (initialChar = "") => {
    set({
      isCursorChatActive: true,
      cursorChatDraft: initialChar,
    })
  },

  updateCursorChatDraft: (text: string) => {
    set({ cursorChatDraft: text })
    // Real-time broadcast while typing for live interactive feel
    if (transportSender) {
      transportSender({
        type: "cursor_chat",
        peerId: get().selfId,
        text,
        timestamp: Date.now(),
      })
    }
  },

  commitCursorChat: (text?: string) => {
    const chatText = typeof text === "string" ? text : get().cursorChatDraft
    set({
      isCursorChatActive: false,
      cursorChatDraft: "",
    })

    if (transportSender) {
      transportSender({
        type: "cursor_chat",
        peerId: get().selfId,
        text: chatText,
        timestamp: Date.now(),
      })
    }

    // Auto fade-out after 4 seconds
    const timer = setTimeout(() => {
      if (transportSender) {
        transportSender({
          type: "cursor_chat",
          peerId: get().selfId,
          text: "",
          timestamp: Date.now(),
        })
      }
    }, 4000)

    set({ cursorChatExpiryTimer: timer })
  },

  cancelCursorChat: () => {
    set({
      isCursorChatActive: false,
      cursorChatDraft: "",
    })
    if (transportSender) {
      transportSender({
        type: "cursor_chat",
        peerId: get().selfId,
        text: "",
        timestamp: Date.now(),
      })
    }
  },

  followPeer: (peerId: string | null) => {
    set({ followingPeerId: peerId })
  },

  checkDatabaseHealth: async () => {
    set({ isDatabaseChecking: true })
    const startTime = Date.now()
    try {
      const res = await fetch("/api/db/status", { method: "GET" })
      const data = await res.json()
      const telemetry: DatabaseTelemetry = {
        ok: Boolean(data.ok),
        connected: Boolean(data.connected),
        host: data.host,
        database: data.database,
        engine: data.engine || "PostgreSQL 17",
        provider: data.provider || "Supabase Cloud Database",
        region: data.region || "Cloud Region",
        latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : Date.now() - startTime,
        documentsCount: data.documentsCount ?? 0,
        tablesCount: data.tablesCount ?? 16,
        lastCheckedAt: Date.now(),
      }
      set({ databaseStatus: telemetry, isDatabaseChecking: false })
      return telemetry
    } catch (err: any) {
      const fallback: DatabaseTelemetry = {
        ok: false,
        connected: false,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: Date.now(),
        error: err?.message || "Failed to reach database status endpoint",
      }
      set({ databaseStatus: fallback, isDatabaseChecking: false })
      return fallback
    }
  },

  saveActiveDocumentToDatabase: async () => {
    const squig = useSquig.getState()
    const { docId, fileName, nodes, order } = squig
    set({ isSyncingToDatabase: true })

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          documentJson: {
            nodes,
            order,
            look: { grid: false, theme: "paper" },
          },
        }),
      })

      const ok = res.ok
      set({
        isSyncingToDatabase: false,
        lastSavedToDatabaseAt: ok ? Date.now() : get().lastSavedToDatabaseAt,
      })

      // Also notify peers of active mutation
      if (ok && transportSender) {
        transportSender({
          type: "node_mutation",
          peerId: get().selfId,
          docId,
          nodes,
          order,
          version: Date.now(),
          timestamp: Date.now(),
        })
      }

      return ok
    } catch {
      set({ isSyncingToDatabase: false })
      return false
    }
  },

  cleanupStalePeers: () => {
    const now = Date.now()
    set((state) => {
      let changed = false
      const nextPeers: Record<string, CollabPeer> = {}

      for (const [id, peer] of Object.entries(state.peers)) {
        const elapsed = now - peer.lastActive
        // Peer disconnected (> 25s no heartbeat)
        if (elapsed > 25000) {
          changed = true
          continue
        }
        // Peer idle (> 6s no motion)
        const isIdle = elapsed > 6000
        if (peer.isIdle !== isIdle) {
          changed = true
          nextPeers[id] = { ...peer, isIdle }
        } else {
          nextPeers[id] = peer
        }
      }

      if (!changed) return state
      return { peers: nextPeers }
    })
  },
}))
