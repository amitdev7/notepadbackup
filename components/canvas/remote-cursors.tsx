"use client"

// ---------------------------------------------------------------------------
// Zenithsui Interactive Live Cursors, Selection Highlights & Cursor Chat
// ---------------------------------------------------------------------------

import { memo, useEffect, useRef, useState } from "react"
import { useCollabStore } from "@/lib/collaboration/collab-store"
import { useSquig } from "@/lib/store"
import { unionBounds } from "@/lib/selection"
import { ChatTeardropText, X } from "@phosphor-icons/react"

export const RemoteCursors = memo(function RemoteCursors() {
  const peers = useCollabStore((s) => s.peers)
  const isCursorChatActive = useCollabStore((s) => s.isCursorChatActive)
  const cursorChatDraft = useCollabStore((s) => s.cursorChatDraft)
  const updateCursorChatDraft = useCollabStore((s) => s.updateCursorChatDraft)
  const commitCursorChat = useCollabStore((s) => s.commitCursorChat)
  const cancelCursorChat = useCollabStore((s) => s.cancelCursorChat)
  const startCursorChat = useCollabStore((s) => s.startCursorChat)

  const viewport = useSquig((s) => s.viewport)
  const nodes = useSquig((s) => s.nodes)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localMousePos, setLocalMousePos] = useState<{ x: number; y: number } | null>(null)

  const { x: vpX, y: vpY, zoom } = viewport

  // Track local client mouse position for cursor chat anchor
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setLocalMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("pointermove", handlePointerMove)
    return () => window.removeEventListener("pointermove", handlePointerMove)
  }, [])

  // Focus input when cursor chat opens
  useEffect(() => {
    if (isCursorChatActive) {
      inputRef.current?.focus()
    }
  }, [isCursorChatActive])

  // Keybinding: "/" triggers Cursor Chat anywhere on canvas (unless typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isCursorChatActive) {
        const target = e.target as HTMLElement
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return
        }
        e.preventDefault()
        startCursorChat()
      } else if (e.key === "Escape" && isCursorChatActive) {
        e.preventDefault()
        cancelCursorChat()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isCursorChatActive, startCursorChat, cancelCursorChat])

  const peerList = Object.values(peers).filter((p) => p.cursor !== null)

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      {/* 1. Remote Selections Outlines */}
      {peerList.map((peer) => {
        if (!peer.selectedNodeIds || peer.selectedNodeIds.length === 0) return null

        const selectedNodes = peer.selectedNodeIds
          .map((id) => nodes[id])
          .filter(Boolean)

        if (selectedNodes.length === 0) return null
        const b = unionBounds(selectedNodes)
        if (!b) return null

        const screenX = b.x * zoom + vpX
        const screenY = b.y * zoom + vpY
        const screenW = b.w * zoom
        const screenH = b.h * zoom

        return (
          <div
            key={`sel-${peer.id}`}
            style={{
              position: "absolute",
              left: screenX - 4,
              top: screenY - 4,
              width: screenW + 8,
              height: screenH + 8,
              borderColor: peer.color,
              boxShadow: `0 0 0 1px ${peer.color}40`,
            }}
            className="rounded-lg border-2 border-dashed transition-all duration-75 pointer-events-none"
          >
            {/* Peer selection name tag */}
            <span
              style={{ backgroundColor: peer.color }}
              className="absolute -top-6 left-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-md shadow-xs truncate max-w-[140px]"
            >
              {peer.name}&apos;s selection
            </span>
          </div>
        )
      })}

      {/* 2. Remote Cursors with Name Tag & Speech Bubbles */}
      {peerList.map((peer) => {
        if (!peer.cursor) return null
        const screenX = peer.cursor.x * zoom + vpX
        const screenY = peer.cursor.y * zoom + vpY

        // Hide off-screen cursors
        if (
          typeof window !== "undefined" &&
          (screenX < -60 || screenX > window.innerWidth + 60 || screenY < -60 || screenY > window.innerHeight + 60)
        ) {
          return null
        }

        return (
          <div
            key={`cursor-${peer.id}`}
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              opacity: peer.isIdle ? 0.38 : 1,
              transition: "transform 75ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease",
            }}
            className="absolute top-0 left-0 pointer-events-none will-change-transform"
          >
            {/* Vector Arrow Cursor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] filter"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={peer.color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name Badge */}
            <div
              style={{
                backgroundColor: peer.color,
              }}
              className="absolute left-4 top-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-md whitespace-nowrap select-none"
            >
              <span className="truncate max-w-[120px]">{peer.name}</span>
            </div>

            {/* Floating Cursor Chat Speech Bubble */}
            {peer.cursorChat?.text && (
              <div
                style={{
                  borderColor: `${peer.color}60`,
                }}
                className="absolute left-4 -top-9 flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-white/95 dark:bg-stone-900/95 border shadow-xl backdrop-blur-md animate-popover-enter select-none whitespace-nowrap"
              >
                <ChatTeardropText size={12} weight="bold" style={{ color: peer.color }} className="shrink-0" />
                <span className="text-xs font-medium text-stone-900 dark:text-stone-100 max-w-[240px] truncate">
                  {peer.cursorChat.text}
                </span>
                {/* Speech tail */}
                <div
                  style={{
                    borderTopColor: "rgba(255, 255, 255, 0.95)",
                  }}
                  className="absolute -bottom-1.5 left-4 w-0 h-0 border-x-4 border-x-transparent border-t-6 dark:border-t-stone-900"
                />
              </div>
            )}
          </div>
        )
      })}

      {/* 3. Local Cursor Chat Input Box */}
      {isCursorChatActive && localMousePos && (
        <div
          style={{
            position: "absolute",
            left: localMousePos.x + 12,
            top: localMousePos.y - 42,
          }}
          className="pointer-events-auto z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-stone-900/95 border border-[var(--ui-accent,#007AFF)]/50 shadow-2xl backdrop-blur-xl animate-popover-enter"
        >
          <ChatTeardropText size={14} weight="bold" className="text-[var(--ui-accent,#007AFF)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={cursorChatDraft}
            onChange={(e) => updateCursorChatDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitCursorChat()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancelCursorChat()
              }
            }}
            placeholder="Type a message… (Enter to send, Esc to close)"
            className="w-56 text-xs bg-transparent border-none outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
            autoFocus
          />
          <button
            type="button"
            onClick={cancelCursorChat}
            className="p-0.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
})
