"use client"

import { useWifiSessionStore } from "@/lib/lan/session"
import { Button } from "@/components/ui/button"
import { Users, X, DeviceMobile, Laptop, UserMinus } from "@phosphor-icons/react"

export function WifiDevicePanel() {
  const { isDevicePanelOpen, closeDevicePanel, connectedPeers, setPeerRole, kickPeer } =
    useWifiSessionStore()

  if (!isDevicePanelOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-panel-title"
      className="fixed inset-y-0 right-0 z-40 w-80 border-l border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl flex flex-col font-sans"
    >
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-muted-foreground" />
          <h2 id="device-panel-title" className="font-sans text-xs font-semibold tracking-tight">
            Nearby Devices ({connectedPeers.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={closeDevicePanel}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          aria-label="Close devices"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {connectedPeers.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No devices connected yet. Scan the QR code or share the link to invite nearby collaborators.
          </div>
        ) : (
          connectedPeers.map((peer) => {
            const isMobile = peer.platform.toLowerCase().includes("mobile") || peer.platform.toLowerCase().includes("iphone")

            return (
              <div
                key={peer.id}
                className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="rounded p-1.5 bg-muted text-muted-foreground">
                    {isMobile ? <DeviceMobile size={16} /> : <Laptop size={16} />}
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-foreground truncate">{peer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{peer.platform}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={peer.role}
                    onChange={(e) => setPeerRole(peer.id, e.target.value as "viewer" | "editor")}
                    className="text-[11px] bg-card border border-border rounded px-1.5 py-0.5"
                    aria-label={`Role for ${peer.name}`}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => kickPeer(peer.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Disconnect device"
                    aria-label={`Disconnect ${peer.name}`}
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

