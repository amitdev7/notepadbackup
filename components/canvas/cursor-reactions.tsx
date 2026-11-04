"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Live Collaboration: Cursor Reactions & Floating Sparks
//
// Features:
// 1. Quick reaction launcher bar with high-energy emojis (🔥, 💡, ❤️, 👏, 🎉, 🚀).
// 2. Physics-based floating particle engine with spring pop and organic drift.
// 3. Audio acoustic pop synthesis with pitch randomization.
// 4. Wi-Fi & LAN mesh broadcast integration for real-time peer reactions.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { useWifiSessionStore } from "@/lib/lan/session"
import { useCollabStore } from "@/lib/collaboration/collab-store"
import { audioFx } from "@/lib/canvas/audio-fx"
import { cn } from "@/lib/utils"
import { Sparkle, Smiley, X } from "@phosphor-icons/react"

export const REACTION_EMOJIS = ["🔥", "💡", "❤️", "👏", "🎉", "🚀"] as const

interface Particle {
  id: string
  emoji: string
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  opacity: number
  rot: number
  vRot: number
  createdAt: number
}

export function CursorReactions() {
  const reactionsBarOpen = useShellStore((s) => s.reactionsBarOpen)
  const setReactionsBarOpen = useShellStore((s) => s.setReactionsBarOpen)
  const uiHidden = useSquig((s) => s.uiHidden)

  const [particles, setParticles] = useState<Particle[]>([])
  const mousePosRef = useRef({ x: typeof window !== "undefined" ? window.innerWidth / 2 : 400, y: typeof window !== "undefined" ? window.innerHeight / 2 : 300 })
  const animRafRef = useRef<number | null>(null)

  // Track cursor position on screen
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMouseMove)
  }, [])

  // Spawn reaction particles at specific screen coordinates
  const triggerReaction = useCallback((emoji: string, atX?: number, atY?: number) => {
    const x = atX ?? mousePosRef.current.x
    const y = atY ?? mousePosRef.current.y

    audioFx.playReactionPop()

    const newParticles: Particle[] = []
    const count = 4 + Math.floor(Math.random() * 3)

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Math.random().toString(36).substring(2, 9),
        emoji,
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 2.8,
        vy: -2.8 - Math.random() * 3.5,
        scale: 0.6 + Math.random() * 0.6,
        opacity: 1,
        rot: (Math.random() - 0.5) * 20,
        vRot: (Math.random() - 0.5) * 3,
        createdAt: performance.now(),
      })
    }

    setParticles((prev) => [...prev, ...newParticles])

    // Broadcast reaction to peers over LAN Wi-Fi & Realtime Collab channels
    try {
      const wifiStore = useWifiSessionStore.getState()
      if (wifiStore.session && typeof wifiStore.broadcastReaction === "function") {
        wifiStore.broadcastReaction(emoji, x, y)
      }
      useCollabStore.getState().broadcastReaction(emoji, x, y)
    } catch {}
  }, [])

  // Listen for incoming peer reactions from LAN session
  useEffect(() => {
    const handleWindowReaction = (e: CustomEvent<{ emoji: string; x: number; y: number }>) => {
      if (e.detail?.emoji) {
        triggerReaction(e.detail.emoji, e.detail.x, e.detail.y)
      }
    }
    window.addEventListener("zenithsui:peer_reaction" as any, handleWindowReaction)
    return () => window.removeEventListener("zenithsui:peer_reaction" as any, handleWindowReaction)
  }, [triggerReaction])

  // Particle physics animation loop
  useEffect(() => {
    if (particles.length === 0) return

    const tick = () => {
      const now = performance.now()
      const maxAge = 1400 // ms

      setParticles((prev) => {
        const next: Particle[] = []
        for (const p of prev) {
          const age = now - p.createdAt
          if (age >= maxAge) continue

          const progress = age / maxAge
          // Upward drift with deceleration
          const nx = p.x + p.vx
          const ny = p.y + p.vy
          const nvy = p.vy * 0.985
          const nvx = p.vx * 0.98
          const nRot = p.rot + p.vRot
          // Spring scale pop at start, fade out at end
          const scale = progress < 0.2 ? 0.4 + (progress / 0.2) * (p.scale * 1.25) : p.scale
          const opacity = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

          next.push({
            ...p,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy,
            rot: nRot,
            scale,
            opacity,
          })
        }
        return next
      })

      animRafRef.current = requestAnimationFrame(tick)
    }

    animRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current)
    }
  }, [particles.length])

  return (
    <>
      {/* ── Active Floating Particles Layer ── */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}px`,
              top: `${p.y}px`,
              transform: `translate(-50%, -50%) scale(${p.scale}) rotate(${p.rot}deg)`,
              opacity: p.opacity,
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.18))",
              willChange: "transform, opacity",
            }}
            className="text-2xl leading-none select-none transition-none"
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* ── Floating Reaction Launcher Bar ── */}
      {reactionsBarOpen && !uiHidden && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 select-none animate-dock-enter">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl apple-glass-pill shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl">
            <span className="text-[11px] font-sans font-medium text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
              <Sparkle size={13} className="text-amber-500" /> React
            </span>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => triggerReaction(emoji)}
                className="size-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-125 transition-transform duration-100 text-lg cursor-pointer select-none"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <div className="h-4 w-px bg-white/20 dark:bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => {
                setReactionsBarOpen(false)
                audioFx.playToolSwitch()
              }}
              title="Close Reactions"
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
