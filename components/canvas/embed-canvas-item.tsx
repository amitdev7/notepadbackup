"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Embed Node Component
//
// Real embedded players for YouTube, Vimeo, Spotify, SoundCloud, and Web embeds
// with:
// - Always-on highest quality playback (1080p / High-Res)
// - Clean video mode: in-video controls, captions, fullscreen, and YouTube logo hidden
// - Shifted control buttons right in the Zenithsui header bar (CC, Fullscreen, HD, Play, Mute)
// - Native container fullscreen support
// - Secure sandboxing, reload, open-in-new-tab, and restricted fallback cards.
// ---------------------------------------------------------------------------

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import type { EmbedNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { playbackCoordinator } from "@/lib/media/playback-coordinator"
import {
  YoutubeLogo,
  SpotifyLogo,
  Globe,
  ArrowSquareOut,
  ArrowsClockwise,
  Trash,
  Play,
  Pause,
  Lock,
  CornersOut,
  CornersIn,
  SpeakerHigh,
  SpeakerSimpleX,
  Sparkle,
  ClosedCaptioning,
  EyeSlash,
  Eye,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [iframeKey, setIframeKey] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.title || node.url)
  const [isBlocked, setIsBlocked] = useState(false)

  // Player control states shifted to Zenithsui header bar
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCaptionsOn, setIsCaptionsOn] = useState(false)
  const [isCleanMode, setIsCleanMode] = useState(true) // in-video buttons hidden by default
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [qualityFeedback, setQualityFeedback] = useState<string | null>(null)

  const provider = node.provider || "generic"
  const isVideoProvider = provider === "youtube" || provider === "vimeo"

  // 1. Computed embed URL enforcing High Quality & Clean Video Mode
  const computedEmbedUrl = useMemo(() => {
    const raw = node.embedUrl || node.url
    if (provider === "youtube") {
      try {
        const u = new URL(raw)
        u.searchParams.set("enablejsapi", "1")
        u.searchParams.set("rel", "0")
        u.searchParams.set("modestbranding", "1")
        u.searchParams.set("iv_load_policy", "3")
        u.searchParams.set("playsinline", "1")
        // Always force highest quality (1080p / highres)
        u.searchParams.set("vq", "hd1080")
        u.searchParams.set("highres", "1")
        u.searchParams.set("hd", "1")

        // Clean mode: hide in-video buttons
        if (isCleanMode) {
          u.searchParams.set("controls", "0")
          u.searchParams.set("fs", "0")
        } else {
          u.searchParams.set("controls", "1")
          u.searchParams.set("fs", "1")
        }

        // Closed captions
        u.searchParams.set("cc_load_policy", isCaptionsOn ? "1" : "0")

        return u.toString()
      } catch {
        return raw
      }
    }

    if (provider === "vimeo") {
      try {
        const u = new URL(raw)
        u.searchParams.set("dnt", "1")
        u.searchParams.set("title", "0")
        u.searchParams.set("byline", "0")
        u.searchParams.set("portrait", "0")
        u.searchParams.set("quality", "1080p")
        if (isCleanMode) {
          u.searchParams.set("controls", "0")
        } else {
          u.searchParams.set("controls", "1")
        }
        return u.toString()
      } catch {
        return raw
      }
    }

    return raw
  }, [node.embedUrl, node.url, provider, isCleanMode, isCaptionsOn])

  // 2. Playback coordinator listener (pause if another canvas player starts playing)
  useEffect(() => {
    return playbackCoordinator.subscribe((activeId) => {
      if (activeId !== node.id && isPlaying) {
        if (provider === "youtube") {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          )
        } else if (provider === "vimeo") {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ method: "pause" }),
            "*"
          )
        }
        setIsPlaying(false)
      }
    })
  }, [node.id, isPlaying, provider])

  // Notify coordinator on unmount
  useEffect(() => {
    return () => {
      playbackCoordinator.notifyPause(node.id)
    }
  }, [node.id])

  // 3. YouTube postMessage listener (sync play/pause state and auto-enforce 1080p quality)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data
        if (data?.event === "onStateChange") {
          // 1: playing, 2: paused, 0: ended
          if (data.info === 1) {
            setIsPlaying(true)
            playbackCoordinator.notifyPlay(node.id)
          } else if (data.info === 2 || data.info === 0) {
            setIsPlaying(false)
            playbackCoordinator.notifyPause(node.id)
          }
        } else if (data?.event === "initialDelivery") {
          // Video ready: always enforce highest quality
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
            "*"
          )
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
            "*"
          )
        }
      } catch {
        // Ignore non-JSON postMessages
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [node.id])

  // 4. Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
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

  // Play / Pause toggle
  const handlePlayPause = useCallback(() => {
    const next = !isPlaying
    setIsPlaying(next)

    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: next ? "playVideo" : "pauseVideo",
          args: [],
        }),
        "*"
      )
    } else if (provider === "vimeo") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: next ? "play" : "pause" }),
        "*"
      )
    }

    if (next) {
      playbackCoordinator.notifyPlay(node.id)
    } else {
      playbackCoordinator.notifyPause(node.id)
    }
  }, [isPlaying, node.id, provider])

  // Mute toggle
  const handleToggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)

    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: next ? "mute" : "unMute",
          args: [],
        }),
        "*"
      )
    } else if (provider === "vimeo") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "setVolume", value: next ? 0 : 1 }),
        "*"
      )
    }
  }, [isMuted, provider])

  // Captions (CC) toggle
  const handleToggleCaptions = useCallback(() => {
    const next = !isCaptionsOn
    setIsCaptionsOn(next)

    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "loadModule",
          args: ["captions"],
        }),
        "*"
      )
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setOption",
          args: ["captions", "track", next ? { languageCode: "en" } : {}],
        }),
        "*"
      )
    }
  }, [isCaptionsOn, provider])

  // Enforce Highest Quality (1080p / High-Res)
  const handleEnforceHighQuality = useCallback(() => {
    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setPlaybackQuality",
          args: ["hd1080"],
        }),
        "*"
      )
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setPlaybackQuality",
          args: ["highres"],
        }),
        "*"
      )
    } else if (provider === "vimeo") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "setQuality", value: "1080p" }),
        "*"
      )
    }

    setQualityFeedback("1080p HD Enforced! ✨")
    setTimeout(() => setQualityFeedback(null), 1500)
  }, [provider])

  // Clean Mode toggle (show/hide in-video buttons)
  const handleToggleCleanMode = useCallback(() => {
    setIsCleanMode((c) => !c)
  }, [])

  // Native Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    } else {
      el.requestFullscreen?.().catch(() => {})
    }
  }, [])

  // Auto-enforce 1080p on iframe load
  const handleIframeLoad = useCallback(() => {
    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
        "*"
      )
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
        "*"
      )
    }
  }, [provider])

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
      ref={containerRef}
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
      {/* 1. Header Bar with Drag Handle & Shifted Video Controls */}
      <div
        data-node-drag-handle="true"
        className="h-8 px-2 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/70 text-xs cursor-grab active:cursor-grabbing shrink-0 z-10 gap-1.5"
      >
        {/* Left: Provider Icon + Title + Always-On HD Badge */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
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

          {/* Always On: Highest Quality Badge (1080p HD) */}
          {isVideoProvider && (
            <button
              type="button"
              onClick={handleEnforceHighQuality}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shrink-0 transition-all cursor-pointer shadow-2xs"
              title="Always On: Highest Quality (1080p / 4K) — Click to re-enforce"
            >
              <Sparkle size={10} weight="fill" className="text-emerald-500 shrink-0" />
              <span>HD 1080p</span>
            </button>
          )}

          {qualityFeedback && (
            <span className="text-[10px] text-emerald-600 font-bold shrink-0 animate-in fade-in duration-150">
              {qualityFeedback}
            </span>
          )}
        </div>

        {/* Right: Shifted Video Controls (Play, Mute, CC, Clean Mode, Fullscreen) + Utilities */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Shifted Video Controls for YouTube/Vimeo */}
          {isVideoProvider && (
            <>
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
              </button>

              {/* Mute / Unmute Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <SpeakerSimpleX size={13} /> : <SpeakerHigh size={13} />}
              </button>

              {/* Closed Captions (CC) Toggle */}
              <button
                type="button"
                onClick={handleToggleCaptions}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold border transition-all cursor-pointer shadow-2xs flex items-center gap-0.5",
                  isCaptionsOn
                    ? "bg-red-500 text-white border-red-500 shadow-xs"
                    : "border-[var(--sq-border)] text-[var(--sq-ink)] opacity-70 hover:opacity-100 hover:bg-[var(--sq-shade)]"
                )}
                title={isCaptionsOn ? "Captions (CC) ON — click to turn OFF" : "Captions (CC) OFF — click to turn ON"}
              >
                <ClosedCaptioning size={11} weight={isCaptionsOn ? "fill" : "bold"} />
                <span>CC</span>
              </button>

              {/* Clean Video Mode Toggle (Hides all in-video buttons) */}
              <button
                type="button"
                onClick={handleToggleCleanMode}
                className={cn(
                  "p-1 rounded hover:bg-[var(--sq-shade)] transition-colors cursor-pointer",
                  isCleanMode ? "text-blue-500" : "text-[var(--sq-ink)] opacity-60"
                )}
                title={
                  isCleanMode
                    ? "Clean Mode Active (in-video buttons hidden) — click to show native controls"
                    : "Native Controls Visible — click to hide in-video buttons (Clean Mode)"
                }
              >
                {isCleanMode ? <EyeSlash size={13} weight="bold" /> : <Eye size={13} />}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleFullscreen}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? <CornersIn size={13} weight="bold" /> : <CornersOut size={13} weight="bold" />}
              </button>

              {/* Subtle Divider */}
              <div className="h-3.5 w-px bg-[var(--sq-border)] mx-0.5" />
            </>
          )}

          {/* Standard Utilities */}
          <button
            type="button"
            onClick={() => setIsBlocked((b) => !b)}
            className={cn("p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]", isBlocked && "text-amber-500")}
            title={isBlocked ? "Show embedded iframe" : "Switch to fallback preview card"}
          >
            <Lock size={12} weight={isBlocked ? "bold" : "regular"} />
          </button>
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
            src={computedEmbedUrl}
            title={node.title || "Embedded Content"}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleIframeLoad}
            onError={() => setIsBlocked(true)}
            {...iframeAttrs}
          />
        )}
      </div>
    </div>
  )
}
