"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Embed Node Component
//
// Real embedded players for YouTube, Vimeo, Spotify, SoundCloud, and Web embeds
// with secure sandboxing, provider-specific iframe permissions, drag handles,
// iframe reload, open in new tab, and fallback cards for restricted sites.
// ---------------------------------------------------------------------------

import { useState, useRef, useMemo, useCallback } from "react"
import type { EmbedNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import {
  YoutubeLogo,
  SpotifyLogo,
  Globe,
  ArrowSquareOut,
  ArrowsClockwise,
  Trash,
  Play,
  Lock,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

function getProviderIcon(provider?: string) {
  switch (provider) {
    case "youtube":
      return <YoutubeLogo size={15} weight="fill" className="text-red-500 shrink-0" />
    case "spotify":
      return <SpotifyLogo size={15} weight="fill" className="text-emerald-500 shrink-0" />
    case "vimeo":
      return <Play size={14} weight="fill" className="text-sky-400 shrink-0" />
    case "soundcloud":
      return <Play size={14} weight="fill" className="text-orange-500 shrink-0" />
    default:
      return <Globe size={14} weight="bold" className="text-[var(--sq-ink)] shrink-0" />
  }
}

export function EmbedCanvasItem({
  node,
  selected,
  zoom,
}: {
  node: EmbedNode
  selected: boolean
  zoom: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.title || node.url)
  const [isBlocked, setIsBlocked] = useState(false)

  const provider = node.provider || "generic"
  const embedUrl = node.embedUrl || node.url

  const handleReload = useCallback(() => {
    setIframeKey((k) => k + 1)
    setIsBlocked(false)
  }, [])

  const handleOpenExternal = useCallback(() => {
    window.open(node.url, "_blank", "noopener,noreferrer")
  }, [node.url])

  const commitTitle = () => {
    setIsEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== node.title) {
      useSquig.getState().updateNodes({ [node.id]: { title: trimmed } })
    } else {
      setTitleDraft(node.title || node.url)
    }
  }

  // Provider-specific iframe permissions & sandbox policies
  const iframeAttrs = useMemo(() => {
    if (provider === "youtube" || provider === "vimeo") {
      return {
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowFullScreen: true,
      }
    }
    if (provider === "spotify") {
      return {
        allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        allowFullScreen: true,
      }
    }
    if (provider === "soundcloud") {
      return {
        allow: "autoplay",
        allowFullScreen: false,
      }
    }
    // Generic website sandbox
    return {
      sandbox: "allow-scripts allow-same-origin allow-forms allow-popups",
      allowFullScreen: true,
    }
  }, [provider])

  return (
    <div
      className={cn(
        "group relative flex flex-col w-full h-full select-none rounded-lg overflow-hidden border border-[var(--sq-border)] bg-[var(--sq-paper)] shadow-md transition-shadow",
        selected && "ring-2 ring-[var(--sq-ink)] ring-offset-1 shadow-lg"
      )}
      style={{
        boxShadow: selected
          ? "0 0 0 1px var(--sq-ink), 4px 4px 0px rgba(0,0,0,0.08)"
          : "2px 2px 0px rgba(0,0,0,0.06)",
      }}
    >
      {/* 1. Header Bar with Drag Handle */}
      <div
        data-node-drag-handle="true"
        className="h-8 px-2.5 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/60 text-xs cursor-grab active:cursor-grabbing shrink-0 z-10"
      >
        <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
          {getProviderIcon(provider)}

          {isEditingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") {
                  setTitleDraft(node.title || node.url)
                  setIsEditingTitle(false)
                }
              }}
              autoFocus
              className="bg-[var(--sq-paper)] border border-[var(--sq-border)] px-1.5 py-0.5 rounded text-[11px] font-bold outline-none text-[var(--sq-ink)] w-full"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
              className="truncate font-bold text-[11px] text-[var(--sq-ink)] hover:underline cursor-text"
              title="Double click to rename"
            >
              {node.title || node.url}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Reload embed"
          >
            <ArrowsClockwise size={12} />
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Open original link in new tab"
          >
            <ArrowSquareOut size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              useSquig.getState().removeNodes([node.id])
            }}
            className="p-1 rounded hover:bg-red-500/20 text-red-500"
            title="Delete from canvas"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>

      {/* 2. Live Embed IFrame Container */}
      <div className="relative flex-1 min-h-0 bg-neutral-900 w-full h-full overflow-hidden">
        {isBlocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--sq-paper)] text-[var(--sq-ink)] z-10">
            <Lock size={32} className="text-amber-500 mb-2" />
            <h4 className="font-bold text-sm">Embedding Restricted by Site</h4>
            <p className="text-xs text-stone-500 max-w-xs mt-1 mb-3">
              This website restricts embedded iframe playback due to its security headers (X-Frame-Options or CSP).
            </p>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="px-4 py-1.5 bg-[var(--sq-ink)] text-[var(--sq-paper)] rounded-full text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition"
            >
              <span>Open in New Tab</span>
              <ArrowSquareOut size={13} />
            </button>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={embedUrl}
            title={node.title || "Embedded Content"}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            {...iframeAttrs}
          />
        )}
      </div>
    </div>
  )
}
