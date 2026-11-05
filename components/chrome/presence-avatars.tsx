"use client"

// ---------------------------------------------------------------------------
// Zenithsui TopBar Presence Avatars & Live Database Status Capsule
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useCollabStore } from "@/lib/collaboration/collab-store"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import {
  Users,
  Database,
  Eye,
  Check,
  ShareNetwork,
  ArrowClockwise,
  Broadcast,
  DeviceMobile,
  Desktop,
  Globe,
  PauseCircle,
  PlayCircle,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function PresenceAvatars() {
  const [isOpen, setIsOpen] = useState(false)
  const peers = useCollabStore((s) => s.peers)
  const selfName = useCollabStore((s) => s.selfName)
  const selfColor = useCollabStore((s) => s.selfColor)
  const followingPeerId = useCollabStore((s) => s.followingPeerId)
  const followPeer = useCollabStore((s) => s.followPeer)
  const databaseStatus = useCollabStore((s) => s.databaseStatus)
  const isDatabaseChecking = useCollabStore((s) => s.isDatabaseChecking)
  const isSyncingToDatabase = useCollabStore((s) => s.isSyncingToDatabase)
  const lastSavedToDatabaseAt = useCollabStore((s) => s.lastSavedToDatabaseAt)
  const checkDatabaseHealth = useCollabStore((s) => s.checkDatabaseHealth)
  const saveActiveDocumentToDatabase = useCollabStore((s) => s.saveActiveDocumentToDatabase)

  const setShareOpen = useSquig((s) => s.setShareOpen)

  const peerList = Object.values(peers)
  const totalUsersCount = peerList.length + 1 // peers + self

  const isDbConnected = Boolean(databaseStatus?.connected)
  const liveCollaborationEnabled = useShellStore((s) => s.preferences.liveCollaborationEnabled ?? true)
  const toggleLiveCollaboration = useShellStore((s) => s.toggleLiveCollaboration)

  if (!liveCollaborationEnabled) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          aria-label="Live Collaboration is Stopped"
          className="group tactile-press flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-300/60 dark:hover:bg-stone-700/60 transition-all select-none cursor-pointer outline-none"
        >
          <PauseCircle size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
            Collab Off
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className="w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 p-3.5 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border border-stone-200/70 dark:border-stone-800/70 shadow-2xl space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
            <PauseCircle size={16} className="text-amber-500" />
            <span>Live Collaboration Paused</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Remote cursors and live peer synchronization are currently stopped. Your edits are saved locally.
          </p>
          <Button
            size="sm"
            onClick={() => {
              toggleLiveCollaboration()
              setIsOpen(false)
            }}
            className="w-full h-8 text-xs font-semibold gap-1.5 rounded-xl bg-[var(--ui-accent,#007AFF)] text-white"
          >
            <PlayCircle size={15} weight="bold" />
            Start Live Collaboration
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        aria-label={`Live Collaboration: ${totalUsersCount} active`}
        className="group tactile-press flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-all select-none cursor-pointer outline-none"
      >
        {/* Overlapping Avatar Stack */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {/* Self Avatar */}
          <div
            style={{ backgroundColor: selfColor }}
            className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-background shadow-xs shrink-0"
            title={`${selfName} (You)`}
          >
            {selfName.charAt(0).toUpperCase()}
          </div>

          {/* Peer Avatars (up to 3 visible) */}
          {peerList.slice(0, 3).map((peer) => (
            <div
              key={peer.id}
              style={{ backgroundColor: peer.color }}
              className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-background shadow-xs shrink-0 relative"
              title={peer.name}
            >
              {peer.name.charAt(0).toUpperCase()}
              {!peer.isIdle && (
                <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
              )}
            </div>
          ))}
        </div>

        {/* Live Members Online Count */}
        <span className="flex items-center gap-1 text-[11px] font-medium font-sans text-stone-700 dark:text-stone-300 ml-0.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="hidden sm:inline font-sans">
            {totalUsersCount} {totalUsersCount === 1 ? "Member Online" : "Members Online"}
          </span>
          <span className="sm:hidden font-mono text-[10px] font-bold">
            {totalUsersCount}
          </span>
        </span>

        {/* Database indicator dot */}
        <div
          className="flex items-center gap-1 text-[10px] text-muted-foreground ml-0.5"
          title={isDbConnected ? `PostgreSQL Database Connected (${databaseStatus?.latencyMs || 0}ms)` : "Database: Local / Offline"}
        >
          <Database
            size={12}
            weight={isDbConnected ? "fill" : "regular"}
            className={isDbConnected ? "text-emerald-500" : "text-stone-400"}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 p-3 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border border-stone-200/70 dark:border-stone-800/70 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <Users size={16} weight="bold" className="text-[var(--ui-accent,#007AFF)]" />
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Live Collaboration ({totalUsersCount})
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Mesh
          </span>
        </div>

        {/* Collaborators List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {/* Self */}
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-stone-100/60 dark:bg-stone-800/50">
            <div className="flex items-center gap-2">
              <div
                style={{ backgroundColor: selfColor }}
                className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
              >
                {selfName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  {selfName} <span className="text-[10px] text-muted-foreground font-normal">(You)</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Broadcast size={10} /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Peers */}
          {peerList.map((peer) => {
            const isFollowing = followingPeerId === peer.id
            return (
              <div
                key={peer.id}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: peer.color }}
                    className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs relative"
                  >
                    {peer.name.charAt(0).toUpperCase()}
                    {!peer.isIdle && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {peer.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {peer.platform === "desktop" ? (
                        <Desktop size={10} />
                      ) : peer.platform === "mobile" || peer.platform === "tablet" ? (
                        <DeviceMobile size={10} />
                      ) : (
                        <Globe size={10} />
                      )}
                      {peer.isIdle ? "Idle" : "Drawing"}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isFollowing ? "default" : "outline"}
                  onClick={() => followPeer(isFollowing ? null : peer.id)}
                  className="h-6 px-2 text-[10px] rounded-lg gap-1"
                >
                  <Eye size={12} weight="bold" />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Database Telemetry & Sync Card */}
        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/60 dark:border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Database size={14} className={isDbConnected ? "text-emerald-500" : "text-stone-400"} />
              PostgreSQL Cloud Database
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                isDbConnected
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isDbConnected ? "Connected" : "Local Mode"}
            </span>
          </div>

          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <div className="flex justify-between">
              <span>Engine:</span>
              <span className="font-mono text-stone-700 dark:text-stone-300">
                {databaseStatus?.engine || "PostgreSQL 17"}
              </span>
            </div>
            {databaseStatus?.latencyMs !== undefined && (
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {databaseStatus.latencyMs} ms
                </span>
              </div>
            )}
            {lastSavedToDatabaseAt && (
              <div className="flex justify-between">
                <span>Last Cloud Sync:</span>
                <span className="font-mono text-stone-600 dark:text-stone-400">
                  {new Date(lastSavedToDatabaseAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isSyncingToDatabase}
              onClick={() => void saveActiveDocumentToDatabase()}
              className="flex-1 h-7 text-[11px] gap-1 rounded-lg"
            >
              <ArrowClockwise size={12} className={isSyncingToDatabase ? "animate-spin" : ""} />
              {isSyncingToDatabase ? "Syncing..." : "Sync to Database"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isDatabaseChecking}
              onClick={() => void checkDatabaseHealth()}
              className="h-7 px-2 text-[11px] rounded-lg"
              title="Ping Database"
            >
              <ArrowClockwise size={12} className={isDatabaseChecking ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          size="sm"
          onClick={() => {
            setIsOpen(false)
            setShareOpen(true)
          }}
          className="w-full h-8 text-xs font-semibold gap-1.5 rounded-xl bg-[var(--ui-accent,#007AFF)] hover:bg-[var(--ui-accent,#007AFF)]/90 text-white"
        >
          <ShareNetwork size={14} weight="bold" />
          Invite & Share Canvas
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
