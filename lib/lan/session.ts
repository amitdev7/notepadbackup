"use client"

// ---------------------------------------------------------------------------
// Zenithsui Wi-Fi Publish Session Manager
// ---------------------------------------------------------------------------

import { create } from "zustand"
import {
  generatePairingPin,
  generatePairingToken,
  computeNetworkId,
} from "./identity"
import { probeLocalGateway, type GatewayStatus } from "./discovery"
import type { LocalPublishSession, ConnectedPeer, PeerRole } from "./types"

export type PublishState = "idle" | "starting" | "publishing" | "stopping"

interface WifiSessionStore {
  state: PublishState
  session: LocalPublishSession | null
  gateway: GatewayStatus | null
  connectedPeers: ConnectedPeer[]
  isPublishDialogOpen: boolean
  isDevicePanelOpen: boolean

  // Actions
  openPublishDialog: () => void
  closePublishDialog: () => void
  openDevicePanel: () => void
  closeDevicePanel: () => void
  startPublishing: (
    documentId: string,
    documentName: string,
    permission?: PeerRole,
    durationMinutes?: number
  ) => Promise<LocalPublishSession | null>
  stopPublishing: () => Promise<void>
  setPeerRole: (peerId: string, role: PeerRole) => void
  kickPeer: (peerId: string) => void
}

let activeSocket: WebSocket | null = null
let expirationTimer: ReturnType<typeof setTimeout> | null = null

export const useWifiSessionStore = create<WifiSessionStore>((set, get) => ({
  state: "idle",
  session: null,
  gateway: null,
  connectedPeers: [],
  isPublishDialogOpen: false,
  isDevicePanelOpen: false,

  openPublishDialog: () => set({ isPublishDialogOpen: true }),
  closePublishDialog: () => set({ isPublishDialogOpen: false }),
  openDevicePanel: () => set({ isDevicePanelOpen: true }),
  closeDevicePanel: () => set({ isDevicePanelOpen: false }),

  startPublishing: async (
    documentId: string,
    documentName: string,
    permission: PeerRole = "viewer",
    durationMinutes = 60
  ) => {
    set({ state: "starting" })

    // 1. Probe local gateway (Mode A)
    const gateway = await probeLocalGateway()
    const gatewayFingerprint = gateway.gatewayId || "browser_host"
    const networkId = await computeNetworkId(gatewayFingerprint)

    // Check if publication was cancelled while probing
    if (get().state !== "starting") {
      return null
    }

    const sessionId = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const pairingPin = generatePairingPin()
    const pairingToken = generatePairingToken()
    const expiresAt = Date.now() + durationMinutes * 60 * 1000

    // Construct join URL
    const host = gateway.lanIp || (typeof window !== "undefined" ? window.location.hostname : "localhost")
    const port = gateway.port || 8787
    const gatewayUrl = gateway.online
      ? `http://${host}:${port}/view?session=${sessionId}&pin=${pairingPin}#${pairingToken}`
      : `${typeof window !== "undefined" ? window.location.origin : ""}/lan/view/${sessionId}?pin=${pairingPin}#${pairingToken}`

    const session: LocalPublishSession = {
      sessionId,
      documentId,
      documentName,
      networkId,
      gatewayId: gatewayFingerprint,
      pairingPin,
      pairingToken,
      permission,
      createdAt: Date.now(),
      expiresAt,
      gatewayUrl,
      connectedPeers: [],
    }

    // Set auto-expiration timer
    if (expirationTimer) clearTimeout(expirationTimer)
    expirationTimer = setTimeout(() => {
      get().stopPublishing()
    }, durationMinutes * 60 * 1000)

    // Cleanup any prior active socket before connecting new one
    if (activeSocket) {
      try {
        activeSocket.close()
      } catch { }
      activeSocket = null
    }

    // Connect to local gateway if available
    if (gateway.online && gateway.wsEndpoint) {
      try {
        const ws = new WebSocket(`${gateway.wsEndpoint}?session=${sessionId}&role=host`)
        activeSocket = ws

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "peer_joined" && msg.peer) {
              const safePeer = {
                ...msg.peer,
                platform: msg.peer.platform || "browser",
              }
              set((state) => ({
                connectedPeers: [...state.connectedPeers.filter((p) => p.id !== safePeer.id), safePeer],
              }))
            } else if (msg.type === "peer_left") {
              set((state) => ({
                connectedPeers: state.connectedPeers.filter((p) => p.id !== msg.peerId),
              }))
            }
          } catch {
            // Ignore malformed messages
          }
        }
      } catch {
        // Fallback to in-browser
      }
    }

    if (get().state !== "starting") {
      return null
    }

    set({
      state: "publishing",
      session,
      gateway,
      connectedPeers: [],
    })

    return session
  },

  stopPublishing: async () => {
    set({ state: "stopping" })

    if (expirationTimer) {
      clearTimeout(expirationTimer)
      expirationTimer = null
    }

    if (activeSocket) {
      try {
        activeSocket.send(JSON.stringify({ type: "session_terminated", reason: "Host stopped publishing" }))
        activeSocket.close(4001, "Host terminated session")
      } catch {
        // Ignore close errors
      }
      activeSocket = null
    }

    set({
      state: "idle",
      session: null,
      connectedPeers: [],
      isPublishDialogOpen: false,
    })
  },

  setPeerRole: (peerId: string, role: PeerRole) => {
    set((state) => ({
      connectedPeers: state.connectedPeers.map((p) => (p.id === peerId ? { ...p, role } : p)),
    }))
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type: "role_change", peerId, role }))
    }
  },

  kickPeer: (peerId: string) => {
    set((state) => ({
      connectedPeers: state.connectedPeers.filter((p) => p.id !== peerId),
    }))
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type: "kick_peer", peerId }))
    }
  },
}))

