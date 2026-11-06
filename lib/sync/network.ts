"use client"

// ---------------------------------------------------------------------------
// Zenithsui Intelligent Multi-Signal Connectivity Engine
//
// States:
// - online: Browser has network AND backend API is responsive.
// - offline: Browser network interface is down (navigator.onLine === false).
// - server-unavailable: Internet active, but Zenithsui backend is unreachable.
// - reconnecting: Transitioning from offline, verifying real API reachability.
// - unverified: Initial startup status.
//
// Signals Monitored:
// - window.ononline & window.onoffline
// - document.visibilitychange & window.onfocus
// - Background request failure telemetry
// - Debounced lightweight /api/db/status reachability checks (zero ping spam)
// ---------------------------------------------------------------------------

import { create } from "zustand"

export type NetworkConnectionState =
  | "online"
  | "offline"
  | "server-unavailable"
  | "reconnecting"
  | "unverified"

interface NetworkStoreState {
  state: NetworkConnectionState
  lastCheckedAt: number | null
  lastOnlineAt: number | null
  latencyMs: number | null
  checkReachability: (force?: boolean) => Promise<boolean>
  reportRequestFailure: (status?: number) => void
  reportRequestSuccess: () => void
}

let lastCheckTimestamp = 0
let inFlightCheck: Promise<boolean> | null = null

export const useNetworkStore = create<NetworkStoreState>((set, get) => ({
  state: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "unverified",
  lastCheckedAt: null,
  lastOnlineAt: typeof navigator !== "undefined" && navigator.onLine ? Date.now() : null,
  latencyMs: null,

  checkReachability: async (force = false): Promise<boolean> => {
    if (typeof window === "undefined") return true

    // 1. If browser reports offline, we know it's definitely offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ state: "offline" })
      return false
    }

    const now = Date.now()
    // Debounce checks within 8 seconds unless forced
    if (!force && now - lastCheckTimestamp < 8000 && get().state !== "unverified") {
      return get().state === "online"
    }

    if (inFlightCheck) {
      return inFlightCheck
    }

    inFlightCheck = (async () => {
      lastCheckTimestamp = Date.now()
      if (get().state === "offline") {
        set({ state: "reconnecting" })
      }

      const t0 = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      try {
        const res = await fetch("/api/db/status", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const latency = Math.round(performance.now() - t0)

        if (res.ok) {
          set({
            state: "online",
            lastCheckedAt: Date.now(),
            lastOnlineAt: Date.now(),
            latencyMs: latency,
          })
          return true
        } else {
          // If server returns 502/503/504 or error status
          set({
            state: "server-unavailable",
            lastCheckedAt: Date.now(),
            latencyMs: latency,
          })
          return false
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        // If navigator is now offline
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          set({ state: "offline", lastCheckedAt: Date.now() })
        } else {
          // Internet might be working but server is unreachable or timed out
          set({ state: "server-unavailable", lastCheckedAt: Date.now() })
        }
        return false
      } finally {
        inFlightCheck = null
      }
    })()

    return inFlightCheck
  },

  reportRequestFailure: (status?: number) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ state: "offline" })
      return
    }
    if (status && (status >= 500 || status === 408)) {
      set({ state: "server-unavailable" })
    }
  },

  reportRequestSuccess: () => {
    set({
      state: "online",
      lastOnlineAt: Date.now(),
    })
  },
}))

// Auto-initialize lifecycle event listeners once in browser runtime
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const store = useNetworkStore.getState()
    void store.checkReachability(true)
  })

  window.addEventListener("offline", () => {
    useNetworkStore.setState({ state: "offline" })
  })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const store = useNetworkStore.getState()
      void store.checkReachability(false)
    }
  })

  window.addEventListener("focus", () => {
    const store = useNetworkStore.getState()
    void store.checkReachability(false)
  })

  // Initial check on startup
  setTimeout(() => {
    void useNetworkStore.getState().checkReachability(false)
  }, 1000)
}
