"use client"

import { useEffect, useState } from "react"
import { useSquig } from "@/lib/store"
import { Canvas } from "@/components/canvas/canvas"
import { Button } from "@/components/ui/button"
import { WifiHigh, DownloadSimple, ArrowSquareOut } from "@phosphor-icons/react"
import { exportPng } from "@/lib/export-image"

interface LanViewerClientProps {
  sessionId: string
  pin: string
}

export default function LanViewerClient({ sessionId, pin }: LanViewerClientProps) {
  const [status, setStatus] = useState<"connecting" | "connected" | "offline">("connecting")
  const [docName, setDocName] = useState("Wi-Fi Wireframe")
  const loadDoc = useSquig((s) => s.loadDoc)

  useEffect(() => {
    // Attempt WebSocket connection to Mode A local gateway
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.hostname}:8787/ws?session=${sessionId}&pin=${pin}&role=viewer`

    let socket: WebSocket | null = null
    try {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => setStatus("connected")
      socket.onclose = () => setStatus("offline")
      socket.onerror = () => setStatus("offline")

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "doc_snapshot") {
            setDocName(msg.doc.fileName || "Wi-Fi Wireframe")
            loadDoc(msg.doc)
          }
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      setStatus("offline")
    }

    return () => {
      socket?.close()
    }
  }, [sessionId, pin, loadDoc])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--sq-bg)] select-none">
      {/* Mobile-friendly Top Banner */}
      <header className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-card/90 backdrop-blur-xs border border-border/70 shadow-sm px-3 py-1.5 rounded-lg text-xs">
          <span className="font-serif font-medium text-foreground">{docName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <WifiHigh size={12} className={status === "connected" ? "text-emerald-500" : "text-amber-500"} />
            <span className="capitalize">{status}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPng()}
            className="h-8 gap-1.5 text-xs bg-card/90 backdrop-blur-xs border-border/70"
          >
            <DownloadSimple size={14} />
            Export
          </Button>

          <Button
            size="sm"
            onClick={() => {
              window.open("/", "_blank")
            }}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowSquareOut size={14} />
            Open Editor
          </Button>
        </div>
      </header>

      {/* Canvas View */}
      <Canvas />
    </main>
  )
}

