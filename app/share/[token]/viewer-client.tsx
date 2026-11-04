"use client"

import { useState, useEffect } from "react"
import { SharePasswordModal } from "@/components/chrome/share-password-modal"
import { Canvas } from "@/components/canvas/canvas"
import { BottomDock } from "@/components/shell/bottom-dock"
import { RemoteCursors } from "@/components/canvas/remote-cursors"
import { CursorReactions } from "@/components/canvas/cursor-reactions"
import { FollowModeIndicator } from "@/components/canvas/follow-mode-indicator"
import { PresenceAvatars } from "@/components/chrome/presence-avatars"
import { Button } from "@/components/ui/button"
import {
  Eye,
  DownloadSimple,
  ArrowSquareOut,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  FrameCorners,
  User,
  Clock,
  PencilSimple,
  Check,
  Users,
} from "@phosphor-icons/react"
import { exportCanvasAsPng } from "@/lib/export-image"
import { useSquig } from "@/lib/store"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"
import { useCollabTransport } from "@/lib/collaboration/collab-transport"
import { useCollabStore } from "@/lib/collaboration/collab-store"
import { COLLAB_PALETTE } from "@/lib/collaboration/types"

interface ViewerClientProps {
  token: string
  initialRequiresPassword: boolean
  initialDoc: any
  permission: "view" | "edit"
  allowExport: boolean
  allowDuplicate: boolean
}

export function ViewerClient({
  token,
  initialRequiresPassword,
  initialDoc,
  permission,
  allowExport,
  allowDuplicate,
}: ViewerClientProps) {
  const [unlocked, setUnlocked] = useState(!initialRequiresPassword)
  const [doc, setDoc] = useState(initialDoc)

  // Visitor join name prompt state
  const [hasJoined, setHasJoined] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLLAB_PALETTE[0])

  // Real-time collaborative transport engine across any network
  useCollabTransport()

  // Initialize self identity & check for stored collaborator name
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("zenithsui:collab:name")
      const storedColor = localStorage.getItem("zenithsui:collab:color")
      if (storedName && storedName.trim()) {
        setNameInput(storedName)
        const activeColor = storedColor || COLLAB_PALETTE[0]
        setSelectedColor(activeColor)
        useCollabStore.getState().setSelfProfile(storedName, activeColor)
        setHasJoined(true)
      } else {
        const defaultName = `Guest ${Math.floor(100 + Math.random() * 900)}`
        setNameInput(defaultName)
        const randomColor = COLLAB_PALETTE[Math.floor(Math.random() * COLLAB_PALETTE.length)]
        setSelectedColor(randomColor)
      }
    }
  }, [])

  useEffect(() => {
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
    const targetRole = permission === "edit" ? "editor" : "viewer"
    useSquig.getState().setEffectiveRole(targetRole)

    if (doc?.id) {
      useSquig.setState({
        docId: doc.id,
        cloudDocId: doc.id,
      })
    }

    if (doc?.document_json) {
      const jsonStr =
        typeof doc.document_json === "string"
          ? doc.document_json
          : JSON.stringify(doc.document_json)
      useSquig.getState().loadDoc(jsonStr)
      if (doc.name) {
        useSquig.getState().setFileName(doc.name)
      }
    }

    return () => {
      useSquig.getState().setEffectiveRole("owner")
    }
  }, [doc, permission])

  const handlePasswordSuccess = async () => {
    try {
      const res = await fetch(`/api/share/${token}`)
      const data = await res.json()
      if (data.ok && data.document) {
        setDoc(data.document)
        setUnlocked(true)
      }
    } catch {
      window.location.reload()
    }
  }

  const handleJoinCanvas = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanName = nameInput.trim() || `Guest ${Math.floor(100 + Math.random() * 900)}`
    if (typeof window !== "undefined") {
      localStorage.setItem("zenithsui:collab:name", cleanName)
      localStorage.setItem("zenithsui:collab:color", selectedColor)
    }
    useCollabStore.getState().setSelfProfile(cleanName, selectedColor)
    setHasJoined(true)
  }

  if (!unlocked) {
    return <SharePasswordModal token={token} onSuccess={handlePasswordSuccess} />
  }

  return (
    <div className="relative flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Visitor Name & Avatar Setup Modal (First Visit) */}
      {!hasJoined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl apple-glass-panel border border-border/80 shadow-2xl p-6 space-y-5 animate-popover-enter bg-background/95">
            <div className="text-center space-y-1.5">
              <div
                style={{ backgroundColor: selectedColor }}
                className="size-14 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold text-white shadow-md ring-4 ring-background transition-colors"
              >
                {nameInput.trim() ? nameInput.trim().charAt(0).toUpperCase() : "G"}
              </div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Join Live Collaboration
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You&apos;ve been invited to collaborate on{" "}
                <span className="font-semibold text-foreground">
                  {doc?.name || "Shared Wireframe"}
                </span>
                . Enter your name to appear with live remote cursors.
              </p>
            </div>

            <form onSubmit={handleJoinCanvas} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1">
                  <User size={13} /> Your Name
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={30}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent,#007AFF)]"
                />
              </div>

              {/* Avatar Color Swatches */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground">
                  Cursor & Avatar Color
                </label>
                <div className="flex items-center justify-between gap-1">
                  {COLLAB_PALETTE.slice(0, 8).map((color) => {
                    const isSelected = selectedColor === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color }}
                        className={`size-7 rounded-full flex items-center justify-center text-white transition-transform cursor-pointer ${
                          isSelected
                            ? "scale-115 ring-2 ring-foreground ring-offset-2 ring-offset-background shadow-md"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        title={color}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  className="w-full h-9 rounded-xl text-xs font-semibold tracking-wide bg-[var(--ui-accent,#007AFF)] text-white hover:opacity-95 cursor-pointer shadow-sm"
                >
                  Join Live Canvas
                </Button>
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Clock size={11} /> Link auto-expires in 7 days to conserve storage
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightweight Viewer Header */}
      <header className="z-20 flex h-12 items-center justify-between border-b border-border/80 apple-glass-panel px-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold tracking-widest text-[var(--ui-accent,#007AFF)]">
            ZENITHSUI
          </span>
          <span className="text-muted-foreground font-mono">/</span>
          <span className="font-sans text-xs font-semibold tracking-tight truncate max-w-[160px] md:max-w-xs text-foreground">
            {doc?.name || "Shared Wireframe"}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
              permission === "edit"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-muted text-muted-foreground border border-border/60"
            }`}
          >
            {permission === "edit" ? <PencilSimple size={12} /> : <Eye size={12} />}
            {permission === "edit" ? "Editor" : "Viewer"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Online Presence Avatars & Member Counter */}
          <PresenceAvatars />

          {/* Quick Zoom Controls */}
          <div className="hidden sm:flex items-center border border-border/80 rounded-xl overflow-hidden bg-background/60 p-0.5">
            <button
              type="button"
              onClick={() => useSquig.getState().zoomBy(0.85)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <MagnifyingGlassMinus size={14} />
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomTo100()}
              className="px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
              title="Zoom to 100%"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomBy(1.15)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <MagnifyingGlassPlus size={14} />
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomToFit()}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
              title="Fit to Content"
            >
              <FrameCorners size={14} />
            </button>
          </div>

          {allowExport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const nodes = doc?.document_json?.nodes || {}
                const order = doc?.document_json?.order || []
                exportCanvasAsPng(nodes, order, `${doc?.name || "wireframe"}.png`)
              }}
              className="h-7 text-xs font-mono"
            >
              <DownloadSimple size={14} className="mr-1" /> Export
            </Button>
          )}

          <a href="/" target="_blank" rel="noreferrer">
            <Button size="sm" className="h-7 text-xs font-mono">
              Open in Zenithsui <ArrowSquareOut size={14} className="ml-1" />
            </Button>
          </a>
        </div>
      </header>

      {/* Canvas Viewport with Live Collaborative Overlays */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <Canvas />
        <RemoteCursors />
        <CursorReactions />
        <FollowModeIndicator />
      </main>

      {/* Editor Tool Dock for Collaborators with Edit Permissions */}
      {permission === "edit" && (
        <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-30 flex justify-center">
          <div className="pointer-events-auto">
            <BottomDock />
          </div>
        </div>
      )}
    </div>
  )
}
