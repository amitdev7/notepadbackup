"use client"

import { useState } from "react"
import { SharePasswordModal } from "@/components/chrome/share-password-modal"
import { Canvas } from "@/components/canvas/canvas"
import { Button } from "@/components/ui/button"
import { Lock, Eye, DownloadSimple, ArrowSquareOut, MagnifyingGlassPlus, MagnifyingGlassMinus, FrameCorners } from "@phosphor-icons/react"
import { exportCanvasAsPng } from "@/lib/export-image"
import { useSquig } from "@/lib/store"

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
    <div className="relative flex h-screen w-screen flex-col bg-[#f8f6f0] text-[#18181b] overflow-hidden select-none">
      {/* Lightweight Viewer Header */}
      <header className="z-20 flex h-12 items-center justify-between border-b border-[#e4e0d4] bg-[#f8f6f0]/90 px-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold tracking-widest text-[#2563eb]">
            ZENITHSUI
          </span>
          <span className="text-[#a1a1aa] font-mono">/</span>
          <span className="font-serif text-sm font-semibold truncate max-w-[200px] md:max-w-md">
            {doc?.name || "Shared Wireframe"}
          </span>
          <span className="flex items-center gap-1 rounded bg-[#e4e0d4] px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-[#52525b]">
            <Eye size={12} /> {permission === "edit" ? "Shared Editor" : "View Only"}
          </span>
        </div>

        <div className="flex items-center gap-2">
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
