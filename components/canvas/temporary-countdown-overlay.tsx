"use client"

// ---------------------------------------------------------------------------
// Zenithsui Temporary Countdown Overlay
//
// Screen-space floating badges showing real-time remaining lifetime for
// temporary canvas elements:
// - Isolated 1s clock ticker (zero rerenders on the canvas drawing layer)
// - Dynamic urgency color coding (normal -> amber warning -> red pulse)
// - Interactive quick-action popover (+5m, +1h, make permanent, expire now)
// - Subtle smooth disappearing animation before archival
// ---------------------------------------------------------------------------

import { useEffect, useState, memo } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import type { SquigNode, Viewport } from "@/lib/types"
import {
  formatRemainingTime,
  getExpirationUrgency,
  extendNodeExpiration,
  makeNodePermanent,
  expireNodeNow,
} from "@/lib/canvas/expiration-manager"
import {
  Timer,
  ClockAfternoon,
  Plus,
  Infinity as InfinityIcon,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface TemporaryCountdownOverlayProps {
  viewport: Viewport
}

export const TemporaryCountdownOverlay = memo(function TemporaryCountdownOverlay({
  viewport,
}: TemporaryCountdownOverlayProps) {
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const selection = useSquig((s) => s.selection)
  const globalShowCountdown = useShellStore(
    (s) => s.preferences.temporarySettings?.showCountdown ?? true
  )

  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null)
  const [, setTick] = useState(0)

  // Find all active nodes with expiration
  const temporaryNodes: SquigNode[] = []
  for (const id of order) {
    const node = nodes[id]
    if (node && node.expiration && Number.isFinite(node.expiration.expiresAt)) {
      temporaryNodes.push(node)
    }
  }

  // Isolated 1-second tick interval ONLY when temporary nodes exist
  useEffect(() => {
    if (temporaryNodes.length === 0) return
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [temporaryNodes.length])

  // Close interactive popover on outside click
  useEffect(() => {
    if (!activeMenuNodeId) return
    const handleDown = () => setActiveMenuNodeId(null)
    window.addEventListener("pointerdown", handleDown)
    return () => window.removeEventListener("pointerdown", handleDown)
  }, [activeMenuNodeId])

  if (temporaryNodes.length === 0) return null

  const now = Date.now()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {temporaryNodes.map((node) => {
        const exp = node.expiration!
        // Show if node has showCountdown !== false and globalShowCountdown is true
        // Or if node is currently selected
        const isSelected = selection.includes(node.id)
        const showBadge = (exp.showCountdown ?? true) && (globalShowCountdown || isSelected)

        if (!showBadge) return null

        const urgency = getExpirationUrgency(exp.expiresAt, now)
        const label = formatRemainingTime(exp.expiresAt, now)

        // Calculate screen-space position (pinned to top-right of element)
        const screenX = (node.x + node.w) * viewport.zoom + viewport.x
        const screenY = node.y * viewport.zoom + viewport.y

        const isMenuOpen = activeMenuNodeId === node.id

        return (
          <div
            key={node.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: "translate(-100%, -120%)",
            }}
          >
            <div className="relative group">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMenuNodeId(isMenuOpen ? null : node.id)
                }}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium shadow-md transition-all duration-200 cursor-pointer select-none backdrop-blur-md outline-none",
                  urgency === "imminent"
                    ? "bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/40 animate-pulse ring-1 ring-red-500/30"
                    : urgency === "soon"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    : "bg-white/80 dark:bg-stone-900/85 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-stone-900",
                  isSelected && "ring-1 ring-blue-500/50"
                )}
                title={`Temporary element: ${label} remaining. Click for options.`}
                aria-label={`Temporary element expires in ${label}`}
              >
                <Timer
                  size={11}
                  weight={urgency === "normal" ? "regular" : "bold"}
                  className={cn(
                    urgency === "imminent" && "text-red-500",
                    urgency === "soon" && "text-amber-500",
                    urgency === "normal" && "text-stone-400 dark:text-stone-500"
                  )}
                />
                <span className="tabular-nums tracking-tight">{label}</span>
              </button>

              {/* Quick Action Popover */}
              {isMenuOpen && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] p-1.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 shadow-xl backdrop-blur-xl animate-popover-enter font-sans text-xs flex flex-col gap-0.5"
                >
                  <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 mb-0.5">
                    <span>Temporary Element</span>
                    <span className="font-mono text-stone-600 dark:text-stone-400 font-normal">
                      {label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      extendNodeExpiration(node.id, 5 * 60 * 1000)
                      setActiveMenuNodeId(null)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <Plus size={13} className="text-blue-500" />
                    <span>Extend +5 minutes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      extendNodeExpiration(node.id, 60 * 60 * 1000)
                      setActiveMenuNodeId(null)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <ClockAfternoon size={13} className="text-indigo-500" />
                    <span>Extend +1 hour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      makeNodePermanent(node.id)
                      setActiveMenuNodeId(null)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <InfinityIcon size={13} className="text-emerald-500" />
                    <span>Make Permanent</span>
                  </button>

                  <div className="my-0.5 h-px bg-stone-100 dark:bg-stone-800/80" />

                  <button
                    type="button"
                    onClick={() => {
                      void expireNodeNow(node.id)
                      setActiveMenuNodeId(null)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                  >
                    <Trash size={13} />
                    <span>Expire Now (Archive)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})
