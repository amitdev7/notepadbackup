"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Handwriting & Equation Recognition Modal
// Powered by Gemini Vision OCR with safe ink preservation
// ---------------------------------------------------------------------------

import { useState } from "react"
import { nanoid } from "nanoid"
import { useSquig } from "@/lib/store"
import type { DrawNode, TextNode } from "@/lib/types"
import {
  TextT as TextIcon,
  Check as CheckIcon,
  X as XIcon,
  Copy as CopyIcon,
  Sparkle as SparkleIcon,
  Function as MathIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface HandwritingModalProps {
  open: boolean
  onClose: () => void
  drawNodes?: DrawNode[]
}

export function HandwritingModal({ open, onClose, drawNodes = [] }: HandwritingModalProps) {
  const [mode, setMode] = useState<"text" | "math">("text")
  const [recognizing, setRecognizing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const st = useSquig.getState

  const handleRecognize = async () => {
    if (!drawNodes.length) return
    setRecognizing(true)
    setError(null)
    setRecognizedText("")

    try {
      // 1. Calculate bounding box of all strokes
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const node of drawNodes) {
        if (!node || !Array.isArray(node.points)) continue
        for (const pt of node.points) {
          if (!Array.isArray(pt) || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue
          const px = (node.x || 0) + pt[0]
          const py = (node.y || 0) + pt[1]
          minX = Math.min(minX, px)
          minY = Math.min(minY, py)
          maxX = Math.max(maxX, px)
          maxY = Math.max(maxY, py)
        }
      }

      const pad = 30
      const w = Math.max(100, Math.ceil(maxX - minX + pad * 2))
      const h = Math.max(60, Math.ceil(maxY - minY + pad * 2))

      // 2. Render strokes to offscreen canvas
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not create canvas context")

      // Fill white background for maximum OCR accuracy
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = "#111111"
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      for (const node of drawNodes) {
        if (node.points.length < 2) continue
        ctx.lineWidth = node.strokeWidth || 3
        ctx.beginPath()
        for (let i = 0; i < node.points.length; i++) {
          const px = node.x + node.points[i][0] - minX + pad
          const py = node.y + node.points[i][1] - minY + pad
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      const imageBase64 = canvas.toDataURL("image/png")

      // 3. Call server-side OCR API
      const res = await fetch("/api/ai/handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mode }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to recognize handwriting")
      }

      setRecognizedText(data.text || "")
    } catch (err: any) {
      setError(err.message || "Recognition failed")
    } finally {
      setRecognizing(false)
    }
  }

  const handleApply = (replace: boolean) => {
    if (!recognizedText.trim() || !drawNodes.length) return

    // Calculate position
    const first = drawNodes[0]
    const textNode: TextNode = {
      id: nanoid(),
      seed: Math.random(),
      type: "text",
      text: recognizedText,
      x: replace ? first.x : first.x,
      y: replace ? first.y : first.y + first.h + 20,
      w: Math.max(160, first.w),
      h: Math.max(40, first.h),
      fontSize: 16,
      align: "left",
    }

    if (replace) {
      st().removeNodes(drawNodes.map((n) => n.id))
    }

    st().addNode(textNode, { select: true })
    st().setNotice(replace ? "Replaced ink with recognized text" : "Inserted recognized text alongside ink")
    onClose()
  }

  const handleCopy = () => {
    if (!recognizedText) return
    navigator.clipboard.writeText(recognizedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    st().setNotice("Copied text to clipboard")
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recognize Handwriting & Math"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={onClose}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[var(--sq-ink)] shadow-popup duration-150 p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sq-border)]">
          <div className="flex items-center gap-2 text-base font-semibold">
            <SparkleIcon className="size-4 text-[var(--sq-accent)]" />
            <span>Recognize Handwriting & Math</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-chrome-sm text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)] transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="space-y-4 pt-3">
          <div className="flex items-center gap-2 bg-[var(--sq-bg)] p-1 rounded-chrome-sm border border-[var(--sq-border)]">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-chrome-sm transition-colors ${
                mode === "text"
                  ? "bg-[var(--sq-paper)] shadow-sm font-medium text-[var(--sq-ink)]"
                  : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
              }`}
            >
              <TextIcon className="size-3.5" />
              Handwritten Text
            </button>
            <button
              type="button"
              onClick={() => setMode("math")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-chrome-sm transition-colors ${
                mode === "math"
                  ? "bg-[var(--sq-paper)] shadow-sm font-medium text-[var(--sq-ink)]"
                  : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
              }`}
            >
              <MathIcon className="size-3.5" />
              Math Equation (LaTeX)
            </button>
          </div>

          <div className="text-xs text-[var(--sq-muted)]">
            {drawNodes.length} stroke layer{drawNodes.length > 1 ? "s" : ""} selected. Your original ink will never be deleted without your choice.
          </div>

          {!recognizedText && (
            <Button
              onClick={handleRecognize}
              disabled={recognizing}
              className="w-full bg-[var(--sq-ink)] text-[var(--sq-bg)] hover:opacity-90 rounded-chrome-sm text-xs h-9"
            >
              {recognizing ? "Recognizing with Gemini…" : "Start Recognition"}
            </Button>
          )}

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2.5 rounded-chrome-sm border border-red-500/20">
              {error}
            </div>
          )}

          {recognizedText && (
            <div className="space-y-3">
              <div className="text-xs font-medium">Recognized Content:</div>
              <div className="relative">
                <textarea
                  value={recognizedText}
                  onChange={(e) => setRecognizedText(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 text-sm bg-[var(--sq-bg)] border border-[var(--sq-border)] rounded-chrome-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--sq-ink)] text-[var(--sq-ink)]"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  className="absolute top-2 right-2 p-1 text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
                >
                  {copied ? <CheckIcon className="size-3.5 text-green-600" /> : <CopyIcon className="size-3.5" />}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => handleApply(false)}
                  variant="outline"
                  className="flex-1 text-xs h-8 rounded-chrome-sm border-[var(--sq-border)]"
                >
                  Keep Ink & Insert Below
                </Button>
                <Button
                  onClick={() => handleApply(true)}
                  className="flex-1 text-xs h-8 bg-[var(--sq-ink)] text-[var(--sq-bg)] hover:opacity-90 rounded-chrome-sm"
                >
                  Replace Ink with Text
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
