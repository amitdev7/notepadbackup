"use client"

// ---------------------------------------------------------------------------
// Zenithsui Automatic Wi-Fi & LAN Network Sync Engine
//
// Automatically detects when devices are on the same Wi-Fi network (sharing
// the same Wi-Fi router / network identity).
// - Subscribes to real-time broadcasts
// - Syncs active canvas across all devices on the same Wi-Fi
// - Automatically pulls the latest canvas when opened on any phone, tablet, or laptop
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { SquigNode } from "@/lib/types"

interface WifiCanvasPayload {
  docId: string
  fileName: string
  nodes: Record<string, SquigNode>
  order: string[]
  version: number
  senderId: string
  timestamp: number
}

// Unique random client instance ID to avoid self-echoes
const CLIENT_INSTANCE_ID = `client_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`

let activeChannel: RealtimeChannel | null = null
let currentNetworkKey: string | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isApplyingRemoteUpdate = false

export function useWifiAutoSync() {
  const docId = useSquig((s) => s.docId)
  const fileName = useSquig((s) => s.fileName)
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const versionRef = useRef(1)

  // 1. Initial network discovery & room joining
  useEffect(() => {
    let isCancelled = false

    async function initWifiDiscovery() {
      try {
        const res = await fetch("/api/wifi-sync", { method: "GET" })
        if (!res.ok) return
        const data = await res.json()

        if (isCancelled || !data.ok || !data.networkKey) return

        currentNetworkKey = data.networkKey

        // If another device on this same Wi-Fi already has an active session
        if (data.session && data.session.nodes && Object.keys(data.session.nodes).length > 0) {
          const store = useSquig.getState()
          const currentNodesCount = Object.keys(store.nodes).length

          // If local canvas is brand new / empty, or remote has active content
          if (currentNodesCount === 0 || store.fileName === "untitled scribbles") {
            isApplyingRemoteUpdate = true
            store.setFileName(data.session.file_name || "Wi-Fi Canvas")
            useSquig.setState({
              docId: data.session.doc_id || store.docId,
              fileName: data.session.file_name || "Wi-Fi Canvas",
              nodes: data.session.nodes,
              order: Array.isArray(data.session.order_list) ? data.session.order_list : Object.keys(data.session.nodes),
            })
            versionRef.current = data.session.version || 1
            setTimeout(() => {
              isApplyingRemoteUpdate = false
            }, 100)
          }
        }

        // 2. Setup Realtime channel if Supabase is configured
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseBrowserClient()
          if (activeChannel) {
            supabase.removeChannel(activeChannel)
          }

          const channelName = `wifi-canvas-${currentNetworkKey}`
          const channel = supabase.channel(channelName, {
            config: {
              broadcast: { self: false },
            },
          })

          channel
            .on("broadcast", { event: "canvas-update" }, (response) => {
              const payload = response.payload as WifiCanvasPayload
              if (!payload || payload.senderId === CLIENT_INSTANCE_ID) return

              // Prevent infinite update loops
              isApplyingRemoteUpdate = true

              const store = useSquig.getState()
              useSquig.setState({
                docId: payload.docId || store.docId,
                fileName: payload.fileName || store.fileName,
                nodes: payload.nodes || {},
                order: payload.order || Object.keys(payload.nodes || {}),
              })
              versionRef.current = Math.max(versionRef.current, payload.version || 1)

              setTimeout(() => {
                isApplyingRemoteUpdate = false
              }, 150)
            })
            .subscribe()

          activeChannel = channel
        }
      } catch (err) {
        console.warn("Wi-Fi auto discovery error:", err)
      }
    }

    initWifiDiscovery()

    return () => {
      isCancelled = true
      if (activeChannel && isSupabaseConfigured()) {
        getSupabaseBrowserClient().removeChannel(activeChannel)
        activeChannel = null
      }
    }
  }, [])

  // 2. Broadcast local changes to same Wi-Fi devices (debounced)
  useEffect(() => {
    if (isApplyingRemoteUpdate) return

    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
      if (!currentNetworkKey) return

      versionRef.current += 1
      const payload: WifiCanvasPayload = {
        docId,
        fileName,
        nodes,
        order,
        version: versionRef.current,
        senderId: CLIENT_INSTANCE_ID,
        timestamp: Date.now(),
      }

      // 1. Broadcast via Realtime Channel
      if (activeChannel) {
        activeChannel.send({
          type: "broadcast",
          event: "canvas-update",
          payload,
        })
      }

      // 2. Persist to API so new devices opening on same Wi-Fi get latest canvas
      try {
        await fetch("/api/wifi-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId,
            fileName,
            nodes,
            order,
            version: versionRef.current,
          }),
        })
      } catch {
        // Network drop or offline - will sync on next edit
      }
    }, 500)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [docId, fileName, nodes, order])
}
