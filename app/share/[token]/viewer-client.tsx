"use client"

import { useState, useEffect } from "react"
import { SharePasswordModal } from "@/components/chrome/share-password-modal"
import { Canvas } from "@/components/canvas/canvas"
import { Button } from "@/components/ui/button"
import { Lock, Eye, DownloadSimple, ArrowSquareOut, MagnifyingGlassPlus, MagnifyingGlassMinus, FrameCorners } from "@phosphor-icons/react"
import { exportCanvasAsPng } from "@/lib/export-image"
import { useSquig } from "@/lib/store"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"

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

  useEffect(() => {
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
    const targetRole = permission === "edit" ? "editor" : "viewer"
    useSquig.getState().setEffectiveRole(targetRole)

    if (doc?.document_json) {
      const jsonStr = typeof doc.document_json === "string"
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
    // Re-fetch resolved document now that session cookie is set
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

  if (!unlocked) {
    return <SharePasswordModal token={token} onSuccess={handlePasswordSuccess} />
  }

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] overflow-hidden select-none">
      {/* Lightweight Viewer Header */}
      <header className="z-20 flex h-12 items-center justify-between border-b border-[#e4e0d4] dark:border-stone-800 bg-[#f8f6f0]/90 dark:bg-[#121316]/90 px-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold tracking-widest text-[#2563eb] dark:text-blue-400">
            ZENITHSUI
          </span>
          <span className="text-[#a1a1aa] dark:text-stone-500 font-mono">/</span>
          <span className="font-sans text-xs font-semibold tracking-tight truncate max-w-[200px] md:max-w-md">
            {doc?.name || "Shared Wireframe"}
          </span>
          <span className="flex items-center gap-1 rounded bg-[#e4e0d4] dark:bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-[#52525b] dark:text-stone-300">
            <Eye size={12} /> {permission === "edit" ? "Shared Editor" : "View Only"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Zoom Controls */}
          <div className="flex items-center border border-[#e4e0d4] dark:border-stone-800 rounded-lg overflow-hidden bg-white/60 dark:bg-stone-900/60 p-0.5">
            <button
              type="button"
              onClick={() => useSquig.getState().zoomBy(0.85)}
              className="p-1 text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded transition-colors"
              title="Zoom Out"
            >
              <MagnifyingGlassMinus size={14} />
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomTo100()}
              className="px-1.5 py-0.5 text-[11px] font-mono text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded transition-colors"
              title="Zoom to 100%"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomBy(1.15)}
              className="p-1 text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded transition-colors"
              title="Zoom In"
            >
              <MagnifyingGlassPlus size={14} />
            </button>
            <button
              type="button"
              onClick={() => useSquig.getState().zoomToFit()}
              className="p-1 text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded transition-colors"
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

      {/* Canvas Viewport */}
      <main className="relative flex-1 w-full h-full">
        <Canvas />
      </main>
    </div>
  )
}
