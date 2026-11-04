// ---------------------------------------------------------------------------
// Zenithsui Interactive Live Collaboration & Database Sync Types
// ---------------------------------------------------------------------------

import type { SquigNode } from "../types"

export type CollabPlatform = "desktop" | "web" | "mobile" | "tablet"

export const COLLAB_PALETTE = [
  "#007AFF", // Apple System Blue
  "#34C759", // Apple System Green
  "#FF9500", // Apple System Orange
  "#AF52DE", // Apple System Purple
  "#FF2D55", // Apple System Pink
  "#5856D6", // Apple System Indigo
  "#00C7BE", // Apple System Teal
  "#FF3B30", // Apple System Coral Red
  "#EAB308", // Golden Yellow
  "#14B8A6", // Turquoise
] as const

export interface CollabPeer {
  id: string
  name: string
  color: string
  avatarUrl?: string | null
  cursor: {
    x: number
    y: number
  } | null
  selectedNodeIds: string[]
  cursorChat: {
    text: string
    timestamp: number
  } | null
  platform: CollabPlatform
  lastActive: number
  joinedAt: number
  isSelf?: boolean
  isIdle?: boolean
}

export type CollabMessage =
  | {
      type: "peer_presence"
      peer: CollabPeer
    }
  | {
      type: "cursor_move"
      peerId: string
      x: number
      y: number
      timestamp: number
    }
  | {
      type: "selection_change"
      peerId: string
      nodeIds: string[]
      timestamp: number
    }
  | {
      type: "cursor_chat"
      peerId: string
      text: string
      timestamp: number
    }
  | {
      type: "peer_reaction"
      peerId: string
      emoji: string
      x: number
      y: number
      timestamp: number
    }
  | {
      type: "node_mutation"
      peerId: string
      docId: string
      nodes: Record<string, SquigNode>
      order: string[]
      version: number
      timestamp: number
    }
  | {
      type: "peer_leave"
      peerId: string
    }

export interface DatabaseTelemetry {
  ok: boolean
  connected: boolean
  host?: string
  database?: string
  engine?: string
  provider?: string
  region?: string
  latencyMs?: number
  documentsCount?: number
  tablesCount?: number
  lastCheckedAt?: number
  error?: string
}
