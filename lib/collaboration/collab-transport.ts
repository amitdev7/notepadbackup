"use client"

// ---------------------------------------------------------------------------
// Zenithsui Dual-Mode Real-Time Collaboration & Database Transport Engine
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "../store"
import { useAuthStore } from "../auth-store"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../supabase/client"
import { useCollabStore, registerTransportSender } from "./collab-store"
import type { CollabMessage, CollabPeer } from "./types"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useCollabTransport() {
  const docId = useSquig((s) => s.cloudDocId || s.docId)
  const user = useAuthStore((s) => s.user)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null)
  const isApplyingRemoteRef = useRef(false)
  const lastPolledAtRef = useRef<number>(0)

  // 1. Initialize Transport & Self Identity
  useEffect(() => {
    const store = useCollabStore.getState()

    // Message dispatcher defined first to satisfy immutability rules
    function handleIncomingMessage(msg: CollabMessage) {
      if (!msg) return
      const currentStore = useCollabStore.getState()
      if ("peerId" in msg && msg.peerId === currentStore.selfId) return
      if (msg.type === "peer_presence" && msg.peer.id === currentStore.selfId) return

      switch (msg.type) {
        case "cursor_move":
          currentStore.updatePeerCursor(msg.peerId, msg.x, msg.y)
          break

        case "selection_change":
          currentStore.updatePeerSelection(msg.peerId, msg.nodeIds)
          break

        case "cursor_chat":
          currentStore.updatePeerCursorChat(msg.peerId, msg.text)
          break

        case "peer_presence":
          currentStore.setPeer(msg.peer)
          break

        case "peer_leave":
          currentStore.removePeer(msg.peerId)
          break

        case "peer_reaction":
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("zenithsui:peer_reaction", {
                detail: { emoji: msg.emoji, x: msg.x, y: msg.y },
              })
            )
          }
          break

        case "node_mutation": {
          const currentDocId = useSquig.getState().cloudDocId || useSquig.getState().docId
          if (msg.docId === currentDocId && !isApplyingRemoteRef.current) {
            isApplyingRemoteRef.current = true
            useSquig.setState({
              nodes: msg.nodes,
              order: msg.order,
            })
            setTimeout(() => {
              isApplyingRemoteRef.current = false
            }, 80)
          }
          break
        }
      }
    }

    // Sync auth user name if signed in
    if (user?.email) {
      const displayName = user.user_metadata?.name || user.email.split("@")[0]
      store.setSelfName(displayName)
    }

    // Connect BroadcastChannel for zero-config multi-tab & multi-window sync
    const channelName = `zenithsui-collab-${docId}`
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(channelName)
        broadcastChannelRef.current = bc

        bc.onmessage = (event: MessageEvent<CollabMessage>) => {
          handleIncomingMessage(event.data)
        }
      }
    } catch (e) {
      console.warn("[Collab] BroadcastChannel unavailable:", e)
    }

    // Connect Supabase Realtime Channel if configured
    let sc: RealtimeChannel | null = null
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseBrowserClient()
        sc = supabase.channel(`canvas-collab-${docId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: store.selfId },
          },
        })
        supabaseChannelRef.current = sc

        sc.on("broadcast", { event: "collab-msg" }, (response) => {
          const msg = response.payload as CollabMessage
          handleIncomingMessage(msg)
        })

        sc.on("presence", { event: "sync" }, () => {
          const presenceState = (sc?.presenceState() || {}) as Record<string, Array<{ peer?: CollabPeer }>>
          for (const key of Object.keys(presenceState)) {
            const list = presenceState[key]
            if (list && list[0]?.peer) {
              store.setPeer(list[0].peer)
            }
          }
        })

        sc.on("presence", { event: "join" }, ({ newPresences }) => {
          const presences = newPresences as unknown as Array<{ peer?: CollabPeer }>
          for (const presence of presences) {
            if (presence.peer) store.setPeer(presence.peer)
          }
        })

        sc.on("presence", { event: "leave" }, ({ leftPresences }) => {
          const presences = leftPresences as unknown as Array<{ peer?: CollabPeer }>
          for (const presence of presences) {
            if (presence.peer?.id) store.removePeer(presence.peer.id)
          }
        })

        sc.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const selfPeer: CollabPeer = {
              id: store.selfId,
              name: store.selfName,
              color: store.selfColor,
              avatarUrl: user?.user_metadata?.avatar_url || null,
              cursor: null,
              selectedNodeIds: [],
              cursorChat: null,
              platform: "web",
              lastActive: Date.now(),
              joinedAt: Date.now(),
            }
            await sc?.track({ peer: selfPeer })
          }
        })
      } catch (e) {
        console.warn("[Collab] Supabase Realtime failed to subscribe:", e)
      }
    }

    // Register active transport sender
    const sendMessage = (msg: CollabMessage) => {
      // 1. Broadcast locally (same machine / multi-tab)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(msg)
        } catch { }
      }

      // 2. Broadcast via Supabase if configured
      if (supabaseChannelRef.current) {
        try {
          supabaseChannelRef.current.send({
            type: "broadcast",
            event: "collab-msg",
            payload: msg,
          })
        } catch { }
      } else if (typeof window !== "undefined") {
        // 3. Fallback: Broadcast via HTTP route across remote networks
        if (msg.type !== "cursor_move") {
          fetch(`/api/collab/${docId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
          }).catch(() => {})
        }
      }
    }

    registerTransportSender(sendMessage)

    // Announce presence on mount
    const selfPeer: CollabPeer = {
      id: store.selfId,
      name: store.selfName,
      color: store.selfColor,
      avatarUrl: user?.user_metadata?.avatar_url || null,
      cursor: null,
      selectedNodeIds: [],
      cursorChat: null,
      platform: "web",
      lastActive: Date.now(),
      joinedAt: Date.now(),
    }
    sendMessage({ type: "peer_presence", peer: selfPeer })

    // Periodic heartbeat & stale peer cleanup (every 4 seconds)
    const heartbeatTimer = setInterval(() => {
      const currentName = useCollabStore.getState().selfName
      const currentColor = useCollabStore.getState().selfColor
      const activePeer: CollabPeer = {
        ...selfPeer,
        name: currentName,
        color: currentColor,
        lastActive: Date.now(),
      }
      sendMessage({
        type: "peer_presence",
        peer: activePeer,
      })
      if (!isSupabaseConfigured() && typeof window !== "undefined") {
        fetch(`/api/collab/${docId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peer: activePeer }),
        }).catch(() => {})
      }
      useCollabStore.getState().cleanupStalePeers()
    }, 4000)

    // HTTP polling fallback for cross-network collaboration when Supabase Realtime is absent
    let httpPollTimer: ReturnType<typeof setInterval> | null = null
    if (!isSupabaseConfigured() && typeof window !== "undefined") {
      const pollCollab = async () => {
        try {
          const currentSelf = useCollabStore.getState()
          const res = await fetch(
            `/api/collab/${docId}?since=${lastPolledAtRef.current}&peerId=${currentSelf.selfId}`
          )
          if (res.ok) {
            const data = await res.json()
            lastPolledAtRef.current = data.timestamp || Date.now()
            if (Array.isArray(data.peers)) {
              for (const p of data.peers) {
                if (p.id !== currentSelf.selfId) {
                  store.setPeer(p)
                }
              }
            }
            if (Array.isArray(data.messages)) {
              for (const m of data.messages) {
                handleIncomingMessage(m)
              }
            }
          }
        } catch { }
      }
      void pollCollab()
      httpPollTimer = setInterval(pollCollab, 2000)
    }

    // Check database health on mount & every 45s
    void store.checkDatabaseHealth()
    const dbPollTimer = setInterval(() => {
      void useCollabStore.getState().checkDatabaseHealth()
    }, 45000)

    // Teardown
    return () => {
      clearInterval(heartbeatTimer)
      clearInterval(dbPollTimer)
      if (httpPollTimer) clearInterval(httpPollTimer)
      sendMessage({ type: "peer_leave", peerId: store.selfId })

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
        broadcastChannelRef.current = null
      }
      if (supabaseChannelRef.current && isSupabaseConfigured()) {
        getSupabaseBrowserClient().removeChannel(supabaseChannelRef.current)
        supabaseChannelRef.current = null
      }
      registerTransportSender(null)
    }
  }, [docId, user])
}
