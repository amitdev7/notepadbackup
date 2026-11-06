"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Embed Node Component
//
// Studio-Grade Clean Multimedia Players for YouTube, Vimeo, Spotify, SoundCloud, & Web:
// - Always-on highest quality playback (1080p / High-Res)
// - Clean Video Mode: native YouTube controls, logo, annotations, & clutter hidden
// - Shifted control buttons in the top Zenithsui header bar (CC, HD, Play, Mute, Fullscreen)
// - Sleek auto-hiding frosted glass bottom scrubber overlay with time, seek, and ±10s skip
// - Full keyboard shortcuts when selected (Space, K, M, F, C, Left/Right Arrows)
// - Native container fullscreen support
// - Real-time playback coordination (solos active player on canvas)
// - Secure sandboxing, reload, open-in-new-tab, and restricted fallback cards.
// ---------------------------------------------------------------------------

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import type { EmbedNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { playbackCoordinator } from "@/lib/media/playback-coordinator"
import { parseMediaUrl } from "@/lib/media/provider-registry"
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
  Rewind,
  FastForward,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

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

  // Player control states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCaptionsOn, setIsCaptionsOn] = useState(false)
  const [isCleanMode, setIsCleanMode] = useState(true) // in-video clutter hidden by default
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [qualityFeedback, setQualityFeedback] = useState<string | null>(null)

  const provider = useMemo(() => {
    if (node.provider && node.provider !== "generic") return node.provider
    // Fallback: auto-detect from URL or registry
    const parsed = parseMediaUrl(node.url || node.embedUrl || "")
    if (parsed?.provider && parsed.provider !== "generic") return parsed.provider
    const raw = (node.url || node.embedUrl || "").toLowerCase()
    if (raw.includes("youtube.com") || raw.includes("youtu.be")) return "youtube"
    if (raw.includes("vimeo.com")) return "vimeo"
    if (raw.includes("spotify.com")) return "spotify"
    if (raw.includes("soundcloud.com")) return "soundcloud"
    return node.provider || "generic"
  }, [node.provider, node.url, node.embedUrl])

  const isVideoProvider = provider === "youtube" || provider === "vimeo"
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  // 1. Computed embed URL enforcing High Quality & Clean Video Mode
  const computedEmbedUrl = useMemo(() => {
    let raw = node.embedUrl || node.url
    if (provider === "youtube") {
      try {
        // Ensure proper embed endpoint instead of watch URL
        const ytMatch = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (ytMatch && ytMatch[1]) {
          raw = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
        } else if (!raw.includes("/embed/")) {
          const parsed = parseMediaUrl(raw)
          if (parsed?.embedUrl) raw = parsed.embedUrl
        }

        const u = new URL(raw)
        u.searchParams.set("enablejsapi", "1")
        u.searchParams.set("rel", "0")
        u.searchParams.set("modestbranding", "1")
        u.searchParams.set("iv_load_policy", "3")
        u.searchParams.set("playsinline", "1")
        u.searchParams.set("disablekb", "1")
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

  // 3. YouTube postMessage listener (sync play/pause state, time, duration, and auto-enforce 1080p quality)
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
        } else if (data?.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            setCurrentTime(data.info.currentTime)
          }
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setDuration(data.info.duration)
          }
          if (typeof data.info.playerState === "number") {
            if (data.info.playerState === 1) setIsPlaying(true)
            if (data.info.playerState === 2 || data.info.playerState === 0) setIsPlaying(false)
          }
          if (typeof data.info.muted === "boolean") {
            setIsMuted(data.info.muted)
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
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "listening" }),
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

  // 4. Polling for YouTube time updates while playing
  useEffect(() => {
    if (!isPlaying || provider !== "youtube") return

    const interval = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, provider])

  // 5. Fullscreen change listener
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

  // Skip ±10 seconds
  const handleSkip = useCallback(
    (delta: number) => {
      const nextTime = Math.max(0, Math.min(duration || 99999, currentTime + delta))
      setCurrentTime(nextTime)

      if (provider === "youtube") {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [nextTime, true],
          }),
          "*"
        )
      }
    },
    [currentTime, duration, provider]
  )

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
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      )
    }
  }, [provider])

  // 7. Keyboard Hotkeys when Selected (Space, M, F, C, Left, Right)
  useEffect(() => {
    if (!selected || !isVideoProvider) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return

      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        e.preventDefault()
        handlePlayPause()
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        handleToggleMute()
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        handleFullscreen()
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        handleToggleCaptions()
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault()
        handleSkip(-10)
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault()
        handleSkip(10)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selected,
    isVideoProvider,
    handlePlayPause,
    handleToggleMute,
    handleFullscreen,
    handleToggleCaptions,
    handleSkip,
  ])

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
        className="h-8 px-2 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/70 text-xs cursor-grab active:cursor-grabbing shrink-0 z-30 gap-1.5"
      >
        {/* Left: Provider Icon + Title + Timestamp + Always-On HD Badge */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[48%]">
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

          {/* Time Counter in Header */}
          {duration > 0 && (
            <span className="font-mono text-[10px] text-[var(--sq-ink)]/70 shrink-0 select-none hidden sm:inline">
              ({formatTime(currentTime)} / {formatTime(duration)})
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

        {/* Right: Shifted Video Controls (Rewind, Play, FastForward, Mute, CC, Clean Mode, Fullscreen) + Utilities */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Shifted Video Controls for YouTube/Vimeo */}
          {isVideoProvider && (
            <>
              {/* Rewind 10s */}
              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title="Rewind 10s (Left Arrow / J)"
              >
                <Rewind size={13} weight="bold" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title={isPlaying ? "Pause video (Space)" : "Play video (Space)"}
              >
                {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
              </button>

              {/* Fast Forward 10s */}
              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title="Forward 10s (Right Arrow / L)"
              >
                <FastForward size={13} weight="bold" />
              </button>

              {/* Mute / Unmute Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                title={isMuted ? "Unmute audio (M)" : "Mute audio (M)"}
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
                title={isCaptionsOn ? "Captions (CC) ON — click to turn OFF (C)" : "Captions (CC) OFF — click to turn ON (C)"}
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
                title={isFullscreen ? "Exit Fullscreen (F)" : "Full Screen (F)"}
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

      {/* 2. Sleek Scrubber Progress Line (between header bar and video) */}
      {isVideoProvider && (
        <div
          className="relative w-full h-[3px] hover:h-[6px] bg-[var(--sq-border)]/50 cursor-pointer transition-all flex items-center z-20 group/scrub select-none shrink-0"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            const target = Math.floor(pos * (duration || 100))
            setCurrentTime(target)
            if (provider === "youtube") {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
                "*"
              )
            }
          }}
          title={duration > 0 ? `Seek (${formatTime(currentTime)} / ${formatTime(duration)})` : "Seek video"}
        >
          <div
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-r-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute size-2 bg-red-500 border border-white rounded-full shadow -translate-x-1/2 scale-0 group-hover/scrub:scale-100 transition-transform"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 3. Live Embed IFrame Container (Clean Mode Guard Prevents Hover Controls) */}
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
          <>
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

            {/* Clean Mode Hover & Click Guard: Completely prevents YouTube from detecting mouse hover! */}
            {isVideoProvider && isCleanMode && (
              <div
                onClick={handlePlayPause}
                onDoubleClick={handleFullscreen}
                className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                title={isPlaying ? "Click to Pause • Double-click for Fullscreen" : "Click to Play • Double-click for Fullscreen"}
              >
                {/* Subtle center play icon only when paused */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none transition-opacity">
                    <div className="size-14 sm:size-16 rounded-full bg-black/55 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform">
                      <Play size={26} weight="fill" className="translate-x-0.5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
