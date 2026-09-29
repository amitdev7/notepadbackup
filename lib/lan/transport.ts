// ---------------------------------------------------------------------------
// Zenithsui Real-Time Wi-Fi Transport & Throttled Broadcast Engine
// ---------------------------------------------------------------------------

import type { ZenithsuiNetworkMessage, PeerRole } from "./types"
import type { SquigNode } from "../types"

export class LanTransportManager {
  private socket: WebSocket | null = null
  private throttleIntervalMs = 33 // ~30Hz max broadcast frequency
  private pendingBroadcast: Record<string, unknown> | null = null
  private throttleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(socket: WebSocket | null) {
    this.socket = socket
  }

  setSocket(socket: WebSocket | null) {
    this.socket = socket
  }

  /**
   * Broadcast canvas node update throttled to 30Hz to prevent
   * saturating local Wi-Fi router bandwidth.
   */
  broadcastNodeUpdate(
    nodeId: string,
    op: "upsert" | "delete",
    node?: SquigNode,
    order?: string[],
    senderPeerId = "host"
  ) {
    this.pendingBroadcast = {
      type: "doc_op",
      nodeId,
      op,
      node,
      order,
      senderPeerId,
    }

    if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => {
        this.flushPendingBroadcast()
      }, this.throttleIntervalMs)
    }
  }

  private flushPendingBroadcast() {
    this.throttleTimer = null
    if (!this.pendingBroadcast || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      this.socket.send(JSON.stringify(this.pendingBroadcast))
    } catch {
      // Ignore network transport errors
    } finally {
      this.pendingBroadcast = null
    }
  }

  /**
   * Role enforcement: Drop any doc_op if sender has role 'viewer'
   */
  static validateIncomingMessage(
    msg: ZenithsuiNetworkMessage,
    senderRole: PeerRole
  ): boolean {
    if (msg.type === "doc_op" && senderRole === "viewer") {
      console.warn(`[zenithsui-lan] Dropped unauthorized doc_op from viewer: ${msg.senderPeerId}`)
      return false
    }
    return true
  }
}

