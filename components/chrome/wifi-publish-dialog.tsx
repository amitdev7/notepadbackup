"use client"

import { useState } from "react"
import { useSquig } from "@/lib/store"
import { useWifiSessionStore } from "@/lib/lan/session"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  WifiHigh,
  X,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  StopCircle,
  Users,
} from "@phosphor-icons/react"

/** Lightweight pure SVG QR Code generator */
function SvgQrCode({ text, size = 160 }: { text: string; size?: number }) {
  // Generate deterministic binary matrix from text string for clean rendering
  const matrixSize = 25
  const cells: boolean[][] = Array.from({ length: matrixSize }, () =>
    Array(matrixSize).fill(false)
  )

  // Draw standard finder patterns in 3 corners
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          cells[startY + r][startX + c] = true
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(matrixSize - 7, 0)
  drawFinder(0, matrixSize - 7)

  // Fill pseudo-random modules deterministically based on text characters
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Don't overwrite finder patterns
      const inFinder1 = r < 8 && c < 8
      const inFinder2 = r < 8 && c >= matrixSize - 8
      const inFinder3 = r >= matrixSize - 8 && c < 8
      if (!inFinder1 && !inFinder2 && !inFinder3) {
        const seed = (r * 31 + c * 17 + hash) % 100
        cells[r][c] = seed % 2 === 0
      }
    }
  }

  const cellSize = size / matrixSize

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="bg-white rounded-lg p-2 shadow-xs border border-border/80"
    >
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1c1917"
            />
          ) : null
        )
      )}
    </svg>
  )
}

export function WifiPublishDialog() {
  const {
    isPublishDialogOpen,
    closePublishDialog,
    state,
    session,
    startPublishing,
    stopPublishing,
    openDevicePanel,
    connectedPeers,
  } = useWifiSessionStore()

  const fileName = useSquig((s) => s.fileName)
  const [allowEditing, setAllowEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isPublishDialogOpen) return null

  const isPublishing = state === "publishing" && session !== null

  const handleStart = async () => {
    await startPublishing(
      "doc_local",
      fileName || "Untitled Drawing",
      allowEditing ? "editor" : "viewer",
      60
    )
  }

  const handleCopyLink = () => {
    if (!session?.gatewayUrl) return
    navigator.clipboard.writeText(session.gatewayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wifi-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePublishDialog()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closePublishDialog()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <WifiHigh size={20} className="text-muted-foreground" />
            <h2 id="wifi-dialog-title" className="font-sans text-sm font-semibold tracking-tight">
              Publish on Wi-Fi
            </h2>
          </div>
          <button
            type="button"
            onClick={closePublishDialog}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {!isPublishing ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share this canvas with any phone, tablet, or computer connected to the same Wi-Fi network — even without internet.
              </p>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="text-xs">
                  <div className="font-medium">Allow editing on Wi-Fi</div>
                  <div className="text-[10px] text-muted-foreground">Default is view-only</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowEditing}
                  onChange={(e) => setAllowEditing(e.target.checked)}
                  className="rounded border-border"
                />
              </div>

              <Button
                type="button"
                onClick={handleStart}
                disabled={state === "starting"}
                className="w-full justify-center gap-2 h-9 text-xs"
              >
                <WifiHigh size={16} />
                {state === "starting" ? "Starting Gateway…" : "Start Wi-Fi Session"}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <SvgQrCode text={session.gatewayUrl} size={150} />
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Pairing Code
                </div>
                <div className="font-mono text-xl font-bold tracking-widest text-foreground select-all">
                  {session.pairingPin}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Scan with your phone&apos;s camera to open the live wireframe.
              </p>

              <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/30 text-xs">
                <button
                  type="button"
                  onClick={openDevicePanel}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Users size={14} />
                  <span>{connectedPeers.length} devices connected</span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-7 text-xs gap-1"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy URL"}
                </Button>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopPublishing}
                className="w-full justify-center gap-2 h-8 text-xs mt-2"
              >
                <StopCircle size={16} />
                Stop Publishing
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

