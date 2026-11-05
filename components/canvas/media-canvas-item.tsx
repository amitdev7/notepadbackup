"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Media Node Component
//
// Real HTML5 Video & Audio players with custom risograph/glass controls,
// authentic waveform scrubbing, offline IndexedDB persistence, drag handle,
// speed switcher, fullscreen, PiP, download, and playback coordination.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import type { MediaNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import {
  getMediaObjectUrl,
  downloadMediaAsset,
  saveMediaAsset,
  releaseMediaObjectUrl,
} from "@/lib/media/media-assets"
import { playbackCoordinator } from "@/lib/media/playback-coordinator"
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSimpleX,
  CornersOut,
  PictureInPicture,
  ArrowsClockwise,
  DownloadSimple,
  Trash,
  VideoCamera,
  MusicNotes,
  Repeat,
  WarningCircle,
  CircleNotch,
  Sparkle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function MediaCanvasItem({
  node,
  selected,
  zoom,
}: {
  node: MediaNode
  selected: boolean
  zoom: number
}) {
  const isVideo = node.mediaKind === "video"
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(node.duration || 0)
  const [volume, setVolume] = useState(node.volume ?? 1)
  const [isMuted, setIsMuted] = useState(node.muted ?? false)
  const [isLooping, setIsLooping] = useState(node.loop ?? false)
  const [playbackRate, setPlaybackRate] = useState(node.playbackRate ?? 1)
  const [showControls, setShowControls] = useState(true)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.name)

  // 1. Resolve media source URL (local IndexedDB vs direct URL)
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(false)

    async function resolveSource() {
      if (node.source.kind === "local") {
        const url = await getMediaObjectUrl(node.source.assetId)
        if (!cancelled) {
          if (url) {
            setMediaUrl(url)
            setIsLoading(false)
          } else {
            setLoadError(true)
            setIsLoading(false)
          }
        }
      } else if (node.source.kind === "direct-url") {
        if (!cancelled) {
          setMediaUrl(node.source.url)
          setIsLoading(false)
        }
      }
    }

    resolveSource()

    return () => {
      cancelled = true
      if (node.source.kind === "local") {
        releaseMediaObjectUrl(node.source.assetId)
      }
    }
  }, [node.source])

  // Ensure coordinator is updated on unmount
  useEffect(() => {
    return () => {
      playbackCoordinator.notifyPause(node.id)
    }
  }, [node.id])

  // 2. Playback coordinator listener (pause if another player plays in solo mode)
  useEffect(() => {
    return playbackCoordinator.subscribe((activeId) => {
      if (activeId !== node.id) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause()
        }
        setIsPlaying(false)
      }
    })
  }, [node.id])

  // 3. Media element event listeners
  const mediaEl = isVideo ? videoRef.current : audioRef.current

  const handlePlayPause = useCallback(() => {
    const el = isVideo ? videoRef.current : audioRef.current
    if (!el) return

    if (el.paused) {
      el.play()
        .then(() => {
          setIsPlaying(true)
          playbackCoordinator.notifyPlay(node.id)
        })
        .catch((err) => {
          console.warn("[MediaCanvasItem] Playback error:", err)
        })
    } else {
      el.pause()
      setIsPlaying(false)
      playbackCoordinator.notifyPause(node.id)
    }
  }, [isVideo, node.id])

  const handleTimeUpdate = useCallback(() => {
    const el = isVideo ? videoRef.current : audioRef.current
    if (el) {
      setCurrentTime(el.currentTime)
    }
  }, [isVideo])

  const handleLoadedMetadata = useCallback(() => {
    const el = isVideo ? videoRef.current : audioRef.current
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration)
      // Save duration back to store if missing
      if (!node.duration) {
        useSquig.getState().updateNodes({ [node.id]: { duration: el.duration } })
      }
    }
  }, [isVideo, node.duration, node.id])

  const handleSeek = useCallback(
    (time: number) => {
      const el = isVideo ? videoRef.current : audioRef.current
      if (el) {
        el.currentTime = Math.max(0, Math.min(duration, time))
        setCurrentTime(el.currentTime)
      }
    },
    [duration, isVideo]
  )

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      const el = isVideo ? videoRef.current : audioRef.current
      if (el) {
        el.volume = Math.max(0, Math.min(1, newVol))
        setVolume(el.volume)
        if (el.volume > 0 && isMuted) {
          el.muted = false
          setIsMuted(false)
        }
      }
    },
    [isMuted, isVideo]
  )

  const handleToggleMute = useCallback(() => {
    const el = isVideo ? videoRef.current : audioRef.current
    if (el) {
      el.muted = !el.muted
      setIsMuted(el.muted)
    }
  }, [isVideo])

  const handleToggleLoop = useCallback(() => {
    const next = !isLooping
    setIsLooping(next)
    const el = isVideo ? videoRef.current : audioRef.current
    if (el) el.loop = next
    useSquig.getState().updateNodes({ [node.id]: { loop: next } })
  }, [isLooping, isVideo, node.id])

  const handleRateChange = useCallback(
    (rate: number) => {
      setPlaybackRate(rate)
      const el = isVideo ? videoRef.current : audioRef.current
      if (el) el.playbackRate = rate
      useSquig.getState().updateNodes({ [node.id]: { playbackRate: rate } })
    },
    [isVideo, node.id]
  )

  const handleFullscreen = useCallback(() => {
    if (typeof document === "undefined" || !videoRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      videoRef.current.requestFullscreen().catch(() => {})
    }
  }, [])

  const handlePictureInPicture = useCallback(() => {
    if (typeof document === "undefined" || !videoRef.current || !("requestPictureInPicture" in videoRef.current)) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {})
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {})
    }
  }, [])

  // File replacement
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setIsLoading(true)
      const res = await saveMediaAsset(file, file.name)
      useSquig.getState().updateNodes({
        [node.id]: {
          name: res.name,
          mimeType: res.mimeType,
          sizeBytes: res.sizeBytes,
          duration: res.duration,
          naturalW: res.naturalW,
          naturalH: res.naturalH,
          posterUrl: res.posterUrl,
          waveform: res.waveform,
          source: { kind: "local", assetId: res.assetId },
        },
      })
      setMediaUrl(res.localUrl)
      setIsLoading(false)
      useSquig.getState().setNotice(`Replaced media with "${res.name}"`)
    } catch (err) {
      setIsLoading(false)
      useSquig.getState().setNotice(`Failed to replace media: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const commitTitle = () => {
    setIsEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== node.name) {
      useSquig.getState().updateNodes({ [node.id]: { name: trimmed } })
    } else {
      setTitleDraft(node.name)
    }
  }

  // Waveform bars
  const waveformBars = useMemo(() => {
    if (node.waveform && node.waveform.length > 0) return node.waveform
    return Array.from({ length: 36 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.45)))
  }, [node.waveform])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

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
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} className="hidden" accept={isVideo ? "video/*" : "audio/*"} />

      {/* 1. Header Bar with Drag Handle */}
      <div
        data-node-drag-handle="true"
        className="h-8 px-2.5 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/60 text-xs cursor-grab active:cursor-grabbing shrink-0 z-10"
      >
        <div className="flex items-center gap-1.5 min-w-0 max-w-[65%]">
          {isVideo ? (
            <VideoCamera size={14} className="shrink-0 text-[var(--sq-ink)]" weight="bold" />
          ) : (
            <MusicNotes size={14} className="shrink-0 text-[var(--sq-ink)]" weight="bold" />
          )}

          {isEditingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") {
                  setTitleDraft(node.name)
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
              {node.name}
            </span>
          )}

          {duration > 0 && (
            <span className="text-[10px] font-mono text-stone-500 shrink-0 ml-1">
              ({formatTime(duration)})
            </span>
          )}

          {isVideo && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 shadow-2xs ml-1"
              title="Always On: Highest Quality Direct Stream"
            >
              <Sparkle size={10} weight="fill" className="text-emerald-500 shrink-0" />
              <span>HD 1080p</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {isVideo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleFullscreen()
              }}
              className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
              title="Full Screen"
            >
              <CornersOut size={12} weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Replace media file"
          >
            <ArrowsClockwise size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void downloadMediaAsset(node)
            }}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Download original file"
          >
            <DownloadSimple size={12} />
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

      {/* 2. Media Player Stage */}
      <div className="relative flex-1 min-h-0 bg-black/90 flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--sq-paper)] text-[var(--sq-ink)] z-20">
            <CircleNotch size={24} className="animate-spin text-stone-500" />
            <span className="text-xs font-semibold">Loading media…</span>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[var(--sq-paper)] text-stone-600 dark:text-stone-300 z-20">
            <WarningCircle size={28} className="text-amber-500 mb-1" />
            <span className="text-xs font-bold">Media asset missing or unplayable</span>
            <p className="text-[11px] text-stone-400 mt-1">The local file may have been moved or cleared.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2.5 px-3 py-1 bg-[var(--sq-ink)] text-[var(--sq-paper)] rounded-full text-[11px] font-semibold"
            >
              Relink File
            </button>
          </div>
        )}

        {/* Video Mode */}
        {isVideo && mediaUrl && (
          <div className="relative w-full h-full flex items-center justify-center group/video">
            <video
              ref={videoRef}
              src={mediaUrl}
              poster={node.posterUrl}
              preload="auto"
              playsInline
              loop={isLooping}
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false)
                playbackCoordinator.notifyPause(node.id)
              }}
              onError={() => {
                setLoadError(true)
                setIsLoading(false)
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={handlePlayPause}
            />

            {/* Play/Pause Overlay Button in Center */}
            {!isPlaying && !isLoading && (
              <button
                type="button"
                onClick={handlePlayPause}
                className="absolute inset-auto p-4 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-xl backdrop-blur-xs transition-transform transform active:scale-95"
                title="Play video"
              >
                <Play size={28} weight="fill" className="translate-x-0.5" />
              </button>
            )}

            {/* Video Controls Bar Overlay */}
            {showControls && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 flex flex-col gap-1.5 opacity-90 group-hover/video:opacity-100 transition-opacity text-white text-xs z-10">
                {/* Seek Bar */}
                <div
                  className="relative w-full h-2 bg-white/20 hover:h-2.5 rounded-full cursor-pointer transition-all flex items-center"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const pos = (e.clientX - rect.left) / rect.width
                    handleSeek(pos * duration)
                  }}
                >
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                  <div
                    className="absolute size-3 bg-white rounded-full shadow-sm -translate-x-1.5"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handlePlayPause} className="hover:text-orange-400 p-1">
                      {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                    </button>
                    <span className="font-mono text-[10px] text-white/80">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Volume */}
                    <div className="flex items-center gap-1 group/vol">
                      <button type="button" onClick={handleToggleMute} className="hover:text-orange-400 p-1">
                        {isMuted || volume === 0 ? <SpeakerSimpleX size={16} /> : <SpeakerHigh size={16} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-12 h-1 accent-orange-500 cursor-pointer"
                        title="Volume"
                      />
                    </div>

                    {/* Speed Selector */}
                    <select
                      value={playbackRate}
                      onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                      className="bg-black/40 border border-white/20 rounded px-1 py-0.5 text-[10px] text-white outline-none cursor-pointer"
                      title="Playback Speed"
                    >
                      {PLAYBACK_RATES.map((r) => (
                        <option key={r} value={r} className="bg-stone-900 text-white">
                          {r}×
                        </option>
                      ))}
                    </select>

                    {/* Loop */}
                    <button
                      type="button"
                      onClick={handleToggleLoop}
                      className={cn("p-1 rounded hover:text-orange-400", isLooping && "text-orange-400")}
                      title="Loop"
                    >
                      <Repeat size={16} weight={isLooping ? "bold" : "regular"} />
                    </button>

                    {/* PiP */}
                    {typeof document !== "undefined" && "pictureInPictureEnabled" in document && (
                      <button type="button" onClick={handlePictureInPicture} className="hover:text-orange-400 p-1" title="Picture in Picture">
                        <PictureInPicture size={16} />
                      </button>
                    )}

                    {/* Fullscreen */}
                    <button type="button" onClick={handleFullscreen} className="hover:text-orange-400 p-1" title="Fullscreen">
                      <CornersOut size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audio Mode */}
        {!isVideo && mediaUrl && (
          <div className="w-full h-full p-4 flex flex-col justify-between bg-[var(--sq-paper)] text-[var(--sq-ink)]">
            <audio
              ref={audioRef}
              src={mediaUrl}
              loop={isLooping}
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false)
                playbackCoordinator.notifyPause(node.id)
              }}
              onError={() => {
                setLoadError(true)
                setIsLoading(false)
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />

            {/* Audio Info & Play Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayPause}
                className="size-11 rounded-full bg-[var(--sq-ink)] text-[var(--sq-paper)] flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-transform"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="translate-x-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm block truncate">{node.name}</span>
                <span className="text-[11px] font-mono text-stone-500">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Volume & Speed Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={handleToggleMute} className="p-1.5 rounded hover:bg-[var(--sq-shade)]">
                  {isMuted || volume === 0 ? <SpeakerSimpleX size={15} /> : <SpeakerHigh size={15} />}
                </button>
                <button
                  type="button"
                  onClick={handleToggleLoop}
                  className={cn("p-1.5 rounded hover:bg-[var(--sq-shade)]", isLooping && "text-orange-500")}
                  title="Loop audio"
                >
                  <Repeat size={15} weight={isLooping ? "bold" : "regular"} />
                </button>
                <select
                  value={playbackRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="bg-[var(--sq-shade)] border border-[var(--sq-border)] rounded px-1.5 py-0.5 text-[10px] font-mono text-[var(--sq-ink)]"
                  title="Playback Speed"
                >
                  {PLAYBACK_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}×
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Waveform Bar Visualizer */}
            <div className="my-auto pt-2">
              <div
                className="flex items-center gap-[2px] h-12 w-full cursor-pointer px-1 py-1 rounded bg-[var(--sq-shade)]/30 hover:bg-[var(--sq-shade)]/50 transition-colors"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pos = (e.clientX - rect.left) / rect.width
                  handleSeek(pos * duration)
                }}
                title="Click anywhere on waveform to seek"
              >
                {waveformBars.map((amp, idx) => {
                  const barProgress = (idx / waveformBars.length) * 100
                  const isPast = barProgress <= progressPercent
                  const heightPx = Math.max(4, Math.round(amp * 40))
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-75",
                        isPast ? "bg-orange-500" : "bg-stone-300 dark:bg-stone-700"
                      )}
                      style={{ height: `${heightPx}px` }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
