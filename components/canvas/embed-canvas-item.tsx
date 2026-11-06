"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Embed Node Component
//
// Studio-Grade Clean Multimedia Players for YouTube, Vimeo, Spotify, SoundCloud, & Web:
// - Always-on highest quality playback (1080p / 4K / High-Res)
// - 100% Clean Video Mode: native YouTube controls, title, annotations, & clutter hidden
// - Shifted control buttons in the top Zenithsui header bar (Rewind, Play, FastForward, Mute, CC, Speed, Clean Mode, HD, Fullscreen)
// - Precision vertical viewport clipping that completely eliminates YouTube's native title & watermark
// - High-definition poster preview before playback starts
// - Pointer-events isolation so YouTube NEVER detects mouse hover or shows controls
// - Full keyboard shortcuts when selected (Space, K, M, F, C, Left/Right Arrows, J, L)
// - Native container fullscreen support
// - Real-time playback coordination (solos active player on canvas)
// - Secure sandboxing, reload, open-in-new-tab, and restricted fallback cards.
// ---------------------------------------------------------------------------

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import type { EmbedNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { playbackCoordinator } from "@/lib/media/playback-coordinator"
import { parseMediaUrl } from "@/lib/media/provider-registry"
import { useNetworkStore } from "@/lib/sync/network"
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
  WifiSlash,
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
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [iframeKey, setIframeKey] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.title || node.url)
  const [isBlocked, setIsBlocked] = useState(false)

  // Player control states
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [showVolumePopup, setShowVolumePopup] = useState(false)
  const [isCaptionsOn, setIsCaptionsOn] = useState(false)
  const [isCleanMode, setIsCleanMode] = useState(true) // 100% clean studio mode by default
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [qualityFeedback, setQualityFeedback] = useState<string | null>(null)
  const [posterError, setPosterError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const networkState = useNetworkStore((s) => s.state)

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

  const youtubeVideoId = useMemo(() => {
    if (provider !== "youtube") return null
    const raw = node.embedUrl || node.url || ""
    const match = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }, [provider, node.embedUrl, node.url])

  const highResPoster = useMemo(() => {
    if (node.thumbnailUrl) return node.thumbnailUrl
    if (youtubeVideoId) {
      return posterError
        ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
        : `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`
    }
    return null
  }, [node.thumbnailUrl, youtubeVideoId, posterError])

  const isVideoProvider = provider === "youtube" || provider === "vimeo"
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  // Precision viewport clipping math:
  // YouTube title bar is ~52px at top, bottom logo/shelf is ~44px
  // In a 16:9 container, scaling iframe vertically pushes native title & logo completely out of sight
  // without letterboxing or cutting off video content
  const nodeH = node.h || 315
  const topCrop = Math.max(48, Math.min(64, Math.round(nodeH * 0.16)))
  const bottomCrop = Math.max(44, Math.min(60, Math.round(nodeH * 0.14)))
  const totalCrop = topCrop + bottomCrop

  // 1. Computed embed URL enforcing High Quality & Clean Video Mode
  // Note: Dependencies strictly exclude isCaptionsOn and currentTime so toggling them NEVER reloads the iframe!
  const computedEmbedUrl = useMemo(() => {
    let raw = node.embedUrl || node.url
    if (provider === "youtube") {
      try {
        const ytMatch = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (ytMatch && ytMatch[1]) {
          raw = `https://www.youtube.com/embed/${ytMatch[1]}`
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
        u.searchParams.set("controls", "0")
        u.searchParams.set("fs", "0")
        // Always enforce highest quality (1080p / highres / hd)
        u.searchParams.set("vq", "hd1080")
        u.searchParams.set("highres", "1")
        u.searchParams.set("hd", "1")

        if (typeof window !== "undefined" && window.location.origin) {
          u.searchParams.set("origin", window.location.origin)
        }

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
        u.searchParams.set("controls", "0")
        return u.toString()
      } catch {
        return raw
      }
    }

    return raw
  }, [node.embedUrl, node.url, provider])

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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
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
            setHasStarted(true)
            playbackCoordinator.notifyPlay(node.id)
            // Reinforce 1080p HD quality whenever playing starts
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
              "*"
            )
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
              "*"
            )
          } else if (data.info === 2) {
            setIsPlaying(false)
            playbackCoordinator.notifyPause(node.id)
          } else if (data.info === 0) {
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
            if (data.info.playerState === 1) {
              setIsPlaying(true)
              setHasStarted(true)
            }
            if (data.info.playerState === 2 || data.info.playerState === 0) setIsPlaying(false)
          }
          if (typeof data.info.muted === "boolean") {
            setIsMuted(data.info.muted)
          }
          if (typeof data.info.volume === "number") {
            setVolume(data.info.volume)
          }
          if (typeof data.info.playbackRate === "number") {
            setPlaybackRate(data.info.playbackRate)
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
    setHasStarted(true)

    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: next ? "playVideo" : "pauseVideo",
          args: [],
        }),
        "*"
      )
      if (next) {
        // Ensure 1080p HD enforcement
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
          "*"
        )
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
          "*"
        )
      }
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
        JSON.stringify({ method: "setVolume", value: next ? 0 : volume / 100 }),
        "*"
      )
    }
  }, [isMuted, provider, volume])

  // Volume slider change
  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol)
    const muted = newVol === 0
    setIsMuted(muted)

    if (provider === "youtube") {
      if (muted) {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "mute", args: [] }),
          "*"
        )
      } else {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }),
          "*"
        )
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [newVol] }),
          "*"
        )
      }
    } else if (provider === "vimeo") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "setVolume", value: newVol / 100 }),
        "*"
      )
    }
  }, [provider])

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
      } else if (provider === "vimeo") {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ method: "setCurrentTime", value: nextTime }),
          "*"
        )
      }
    },
    [currentTime, duration, provider]
  )

  // Direct Seek to time ratio (0..1)
  const handleSeek = useCallback(
    (pos01: number) => {
      const target = Math.floor(pos01 * (duration || 100))
      setCurrentTime(target)
      if (provider === "youtube") {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
          "*"
        )
      } else if (provider === "vimeo") {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ method: "setCurrentTime", value: target }),
          "*"
        )
      }
    },
    [duration, provider]
  )

  // Captions (CC) toggle via postMessage (zero reload)
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
      if (!next) {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "unloadModule",
            args: ["captions"],
          }),
          "*"
        )
      }
    }
  }, [isCaptionsOn, provider])

  // Playback Speed Cycle (1x, 1.25x, 1.5x, 2x, 0.75x)
  const handleCycleSpeed = useCallback(() => {
    const speeds = [1, 1.25, 1.5, 2, 0.75]
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setPlaybackRate(nextSpeed)

    if (provider === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackRate", args: [nextSpeed] }),
        "*"
      )
    } else if (provider === "vimeo") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "setPlaybackRate", value: nextSpeed }),
        "*"
      )
    }
  }, [playbackRate, provider])

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
    setTimeout(() => setQualityFeedback(null), 1800)
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

  // Mouse move handler for smooth auto-hiding controls
  const handleMouseMove = useCallback(() => {
    setIsHovered(true)
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    if (isPlaying) {
      hoverTimerRef.current = setTimeout(() => {
        setIsHovered(false)
        setShowVolumePopup(false)
      }, 2500)
    }
  }, [isPlaying])

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      setIsHovered(false)
      setShowVolumePopup(false)
    }
  }, [isPlaying])

  // 7. Keyboard Hotkeys when Selected (Space, M, F, C, Left, Right, J, L)
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
      {/* 1. Header Bar with Drag Handle & Shifted Video Controls (Matches Image 2 exactly) */}
      <div
        data-node-drag-handle="true"
        className="h-8 px-2 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/75 text-xs cursor-grab active:cursor-grabbing shrink-0 z-30 gap-1.5 backdrop-blur-xs select-none"
      >
        {/* Left: Provider Icon + Title + Timestamp + Always-On HD Badge */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
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
              className="truncate font-bold text-[11px] text-[var(--sq-ink)] hover:underline cursor-text max-w-[140px] sm:max-w-[200px]"
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
            <span className="text-[10px] text-emerald-600 font-bold shrink-0 animate-in fade-in duration-150 hidden md:inline">
              {qualityFeedback}
            </span>
          )}
        </div>

        {/* Right: Shifted Video Controls (Rewind, Play, FastForward, Mute, CC, Speed, Clean Mode, Fullscreen) + Utilities */}
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
                title={isPlaying ? "Pause video (Space / K)" : "Play video (Space / K)"}
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

              {/* Mute / Unmute Toggle + Smooth Volume Slider Popup */}
              <div
                className="relative flex items-center"
                onMouseEnter={() => setShowVolumePopup(true)}
                onMouseLeave={() => setShowVolumePopup(false)}
              >
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors cursor-pointer"
                  title={isMuted ? "Unmute audio (M)" : `Mute audio (${volume}%) (M)`}
                >
                  {isMuted ? <SpeakerSimpleX size={13} /> : <SpeakerHigh size={13} />}
                </button>

                {showVolumePopup && (
                  <div className="absolute top-full right-0 mt-1 p-2 bg-[var(--sq-paper)] border border-[var(--sq-border)] rounded-lg shadow-lg z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-16 h-1.5 accent-red-500 bg-[var(--sq-shade)] rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-[var(--sq-ink)] w-6 text-right">
                      {isMuted ? "0%" : `${volume}%`}
                    </span>
                  </div>
                )}
              </div>

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

              {/* Playback Speed Switcher (1x, 1.25x, 1.5x, 2x, 0.75x) */}
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="px-1 py-0.5 rounded text-[9px] font-mono font-bold text-[var(--sq-ink)]/80 hover:text-[var(--sq-ink)] hover:bg-[var(--sq-shade)] transition-colors cursor-pointer hidden sm:inline"
                title={`Playback Speed: ${playbackRate}x (Click to cycle)`}
              >
                {playbackRate}x
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
                    ? "Clean Studio Mode Active (in-video clutter hidden) — click for native controls"
                    : "Native Controls Visible — click to enable Clean Studio Mode"
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

          {/* Standard Utilities (Lock, Reload, Open External, Delete) */}
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
            handleSeek(pos)
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

      {/* 3. Live Embed IFrame Container (Clean Mode Viewport Clipping & Zero-Hover Guard) */}
      <div className="relative flex-1 min-h-0 bg-neutral-950 w-full h-full overflow-hidden">
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
        ) : networkState === "offline" ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[var(--sq-paper)] text-[var(--sq-ink)] select-none">
            <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
              <WifiSlash size={24} weight="bold" />
            </div>
            <h4 className="font-semibold text-sm">Offline — Content Unavailable</h4>
            <p className="text-xs text-stone-500 max-w-xs mt-1.5 mb-4 leading-relaxed">
              External content from {node.provider || "the web"} cannot be streamed without an internet connection. Your canvas drawings, notes, and local audio memos remain completely safe.
            </p>
            <button
              type="button"
              onClick={() => {
                handleReload()
                useNetworkStore.getState().checkReachability()
              }}
              className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <ArrowsClockwise size={13} weight="bold" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <>
            {/* Embedded IFrame with Precision Vertical Viewport Crop */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={computedEmbedUrl}
              title={node.title || "Embedded Content"}
              className="border-0"
              style={
                isVideoProvider && isCleanMode
                  ? {
                      position: "absolute",
                      top: `-${topCrop}px`,
                      left: "0",
                      width: "100%",
                      height: `calc(100% + ${totalCrop}px)`,
                      pointerEvents: "none",
                    }
                  : {
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      pointerEvents: "auto",
                    }
              }
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleIframeLoad}
              onError={() => setIsBlocked(true)}
              {...iframeAttrs}
            />

            {/* Pristine High-Resolution Poster Image (Before first play) */}
            {isVideoProvider && isCleanMode && !hasStarted && !isPlaying && highResPoster && (
              <div
                onClick={handlePlayPause}
                className="absolute inset-0 z-10 cursor-pointer overflow-hidden bg-black flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={highResPoster}
                  alt={node.title || "Video Preview"}
                  onError={() => setPosterError(true)}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                {/* Big Center Glass Play Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-2xs transition-all hover:bg-black/35">
                  <div className="size-16 sm:size-20 rounded-full bg-black/60 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform">
                    <Play size={30} weight="fill" className="translate-x-0.5 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Clean Mode Hover & Click Guard: Completely prevents YouTube from detecting mouse hover! */}
            {isVideoProvider && isCleanMode && (
              <div
                onClick={handlePlayPause}
                onDoubleClick={handleFullscreen}
                className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                title={isPlaying ? "Click to Pause • Double-click for Fullscreen" : "Click to Play • Double-click for Fullscreen"}
              >
                {/* Center play icon when paused during active session */}
                {hasStarted && !isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity">
                    <div className="size-14 sm:size-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform">
                      <Play size={26} weight="fill" className="translate-x-0.5 text-white" />
                    </div>
                  </div>
                )}

                {/* Floating Bottom Frosted Glass Control Pill on Hover */}
                {hasStarted && (isHovered || !isPlaying) && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-20 cursor-default select-none pointer-events-auto"
                  >
                    {/* Play/Pause */}
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                    >
                      {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                    </button>

                    {/* Rewind */}
                    <button
                      type="button"
                      onClick={() => handleSkip(-10)}
                      className="opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 transition cursor-pointer"
                      title="Rewind 10s"
                    >
                      <Rewind size={13} weight="bold" />
                    </button>

                    {/* Mini Scrubber */}
                    <div
                      className="w-24 sm:w-32 h-1.5 bg-white/25 hover:h-2 rounded-full cursor-pointer relative flex items-center transition-all group/miniscrub"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                        handleSeek(pos)
                      }}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Forward */}
                    <button
                      type="button"
                      onClick={() => handleSkip(10)}
                      className="opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 transition cursor-pointer"
                      title="Forward 10s"
                    >
                      <FastForward size={13} weight="bold" />
                    </button>

                    {/* Timestamp */}
                    <span className="font-mono text-[10px] text-white/90">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* Volume */}
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 transition cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <SpeakerSimpleX size={13} /> : <SpeakerHigh size={13} />}
                    </button>

                    {/* Fullscreen */}
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      className="opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 transition cursor-pointer"
                      title="Fullscreen (F)"
                    >
                      {isFullscreen ? <CornersIn size={13} weight="bold" /> : <CornersOut size={13} weight="bold" />}
                    </button>
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
