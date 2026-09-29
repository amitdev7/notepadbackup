// ---------------------------------------------------------------------------
// Zenithsui Local Network & Wi-Fi Publishing Protocol Specification
// ---------------------------------------------------------------------------

import type { SquigDoc, SquigNode } from "../types"

export type PeerRole = "viewer" | "editor"

export interface ConnectedPeer {
  id: string
  name: string
  platform: string
  role: PeerRole
  joinedAt: number
  lastSeenAt: number
  latencyMs?: number
}

export interface LocalPublishSession {
  sessionId: string
  documentId: string
  documentName: string
  networkId: string
  gatewayId: string
  pairingPin: string
  pairingToken: string
  permission: PeerRole
  createdAt: number
  expiresAt: number
  gatewayUrl: string
  connectedPeers: ConnectedPeer[]
}

// Protocol Message Envelope
export type ZenithsuiNetworkMessage =
  | {
      type: "client_hello"
      peerId: string
      peerName: string
      platform: string
      pairingToken: string
      pairingPin?: string
    }
  | {
      type: "server_hello"
      sessionId: string
      accepted: boolean
      assignedRole: PeerRole
      reason?: string
    }
  | {
      type: "doc_snapshot"
      doc: SquigDoc
      version: number
    }
  | {
      type: "doc_op"
      nodeId: string
      op: "upsert" | "delete"
      node?: SquigNode
      order?: string[]
      senderPeerId: string
    }
  | {
      type: "presence_update"
      peerId: string
      cursor?: { x: number; y: number }
      selectedNodeIds?: string[]
    }
  | {
      type: "peer_joined"
      peer: ConnectedPeer
    }
  | {
      type: "peer_left"
      peerId: string
    }
  | {
      type: "session_terminated"
      reason: string
    }

