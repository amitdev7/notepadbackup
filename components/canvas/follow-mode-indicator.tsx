"use client"

// ---------------------------------------------------------------------------
// Zenithsui Follow Collaborator Indicator Pill
// ---------------------------------------------------------------------------

import { useEffect } from "react"
import { useCollabStore } from "@/lib/collaboration/collab-store"
import { Eye, X } from "@phosphor-icons/react"

export function FollowModeIndicator() {
  const followingPeerId = useCollabStore((s) => s.followingPeerId)
  const peers = useCollabStore((s) => s.peers)
  const followPeer = useCollabStore((s) => s.followPeer)

  const followedPeer = followingPeerId ? peers[followingPeerId] : null

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && followingPeerId) {
        followPeer(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [followingPeerId, followPeer])

  if (!followedPeer) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-stone-900/90 border border-stone-200/70 dark:border-stone-800/70 shadow-xl backdrop-blur-xl animate-popover-enter select-none max-w-[calc(100vw-2rem)]"
    >
      <span
        style={{ backgroundColor: followedPeer.color }}
        className="size-2 rounded-full animate-ping"
      />
      <Eye size={14} weight="bold" style={{ color: followedPeer.color }} />
      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
        Following <span style={{ color: followedPeer.color }}>{followedPeer.name}</span>
      </span>
      <span className="text-stone-300 dark:text-stone-700">|</span>
      <button
        type="button"
        onClick={() => followPeer(null)}
        className="text-[11px] font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 flex items-center gap-1 transition-colors cursor-pointer"
        title="Stop following (Esc)"
      >
        <span>Stop</span>
        <kbd className="font-mono text-[9px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded border border-stone-200 dark:border-stone-700">
          Esc
        </kbd>
        <X size={11} weight="bold" />
      </button>
    </div>
  )
}
