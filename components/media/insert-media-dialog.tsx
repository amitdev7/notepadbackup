"use client"

// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Insert Media Dialog
//
// Apple-glass modal with Video, Audio, and Embed tabs, instant URL provider
// auto-detection, drag-and-drop file upload, live preview, and canvas placement.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from "react"
import { useSquig } from "@/lib/store"
import { parseMediaUrl } from "@/lib/media/provider-registry"
import { saveMediaAsset } from "@/lib/media/media-assets"
import type { ParsedMediaUrl } from "@/lib/media/types"
import type { MediaNode, EmbedNode, SquigNode } from "@/lib/types"
import {
  VideoCamera,
  MusicNotes,
  Globe,
  UploadSimple,
  Link,
  YoutubeLogo,
  SpotifyLogo,
  X,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  Play,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function InsertMediaDialog() {
  const dialog = useSquig((s) => s.insertMediaDialog)
  const setDialog = useSquig((s) => s.setInsertMediaDialog)

  const [activeTab, setActiveTab] = useState<"video" | "audio" | "embed">("video")
  const [urlInput, setUrlInput] = useState("")
  const [parsedMedia, setParsedMedia] = useState<ParsedMediaUrl | null>(null)
  const [isUrlValidating, setIsUrlValidating] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialog?.initialTab) {
      setActiveTab(dialog.initialTab)
    }
  }, [dialog?.initialTab])

  // Reset when dialog opens/closes
  useEffect(() => {
    if (dialog?.open) {
      setUrlInput("")
      setParsedMedia(null)
      setUrlError(null)
      setUploadError(null)
      setIsUploading(false)
    }
  }, [dialog?.open])

  // Instant URL parsing on change
  useEffect(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setParsedMedia(null)
      setUrlError(null)
      return
    }

    setIsUrlValidating(true)
    setUrlError(null)

    const timer = setTimeout(() => {
      const result = parseMediaUrl(trimmed)
      setIsUrlValidating(false)
      if (result) {
        setParsedMedia(result)
        setUrlError(null)
        // Auto-switch tab if user pasted audio into video tab or vice versa
        if (result.mediaCategory === "audio" && activeTab === "video") {
          setActiveTab("audio")
        } else if (result.mediaCategory === "video" && activeTab === "audio") {
          setActiveTab("video")
        }
      } else {
        setParsedMedia(null)
        setUrlError("Please enter a valid HTTP/HTTPS video, audio, or embed URL.")
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [urlInput, activeTab])

  const closeDialog = useCallback(() => {
    setDialog(null)
  }, [setDialog])

  // Close on Escape key
  useEffect(() => {
    if (!dialog?.open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [dialog?.open, closeDialog])

  const getPlacementCoordinates = (): [number, number] => {
    if (dialog?.at) return dialog.at
    const v = useSquig.getState().viewport
    const cx = (window.innerWidth / 2 - v.x) / v.zoom
    const cy = (window.innerHeight / 2 - v.y) / v.zoom
    return [Math.round(cx), Math.round(cy)]
  }

  // Handle URL insertion
  const handleInsertUrl = () => {
    if (!parsedMedia) return
    const s = useSquig.getState()

    if (dialog?.replaceNodeId) {
      if (parsedMedia.provider === "direct-video" || parsedMedia.provider === "direct-audio") {
        const isVid = parsedMedia.provider === "direct-video"
        s.updateNodes({
          [dialog.replaceNodeId]: {
            type: "media",
            mediaKind: isVid ? "video" : "audio",
            source: { kind: "direct-url", url: parsedMedia.normalizedUrl },
            name: parsedMedia.title || (isVid ? "Direct Video" : "Direct Audio"),
            mimeType: isVid ? "video/mp4" : "audio/mpeg",
          },
        })
        s.setNotice(`Replaced media with "${parsedMedia.title}"`)
      } else {
        s.updateNodes({
          [dialog.replaceNodeId]: {
            type: "embed",
            url: parsedMedia.originalUrl,
            embedUrl: parsedMedia.embedUrl,
            title: parsedMedia.title,
            provider: parsedMedia.provider as EmbedNode["provider"],
            mediaCategory: parsedMedia.mediaCategory,
            aspectRatio: parsedMedia.aspectRatio,
            thumbnailUrl: parsedMedia.thumbnailUrl,
            authorName: parsedMedia.authorName,
            providerData: parsedMedia.providerData,
          },
        })
        s.setNotice(`Updated embed link to "${parsedMedia.title || parsedMedia.originalUrl}"`)
      }
      closeDialog()
      return
    }

    const [cx, cy] = getPlacementCoordinates()

    if (parsedMedia.provider === "direct-video" || parsedMedia.provider === "direct-audio") {
      const isVid = parsedMedia.provider === "direct-video"
      const w = isVid ? 560 : 380
      const h = isVid ? 315 : 120
      const node: Omit<MediaNode, "id" | "seed"> = {
        type: "media",
        mediaKind: isVid ? "video" : "audio",
        source: { kind: "direct-url", url: parsedMedia.normalizedUrl },
        name: parsedMedia.title || (isVid ? "Direct Video" : "Direct Audio"),
        mimeType: isVid ? "video/mp4" : "audio/mpeg",
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        controls: true,
        playbackRate: 1,
      }
      const id = s.addNode(node as Omit<SquigNode, "id" | "seed">)
      s.setSelection([id])
      s.setNotice(`Inserted ${isVid ? "video" : "audio"} on canvas`)
    } else {
      // Third-party embed (YouTube, Vimeo, Spotify, SoundCloud, or Generic)
      let w = 560
      let h = 315
      if (parsedMedia.provider === "spotify") {
        w = 380
        h = parsedMedia.aspectRatio && parsedMedia.aspectRatio < 1 ? 380 : 152
      } else if (parsedMedia.provider === "soundcloud") {
        w = 400
        h = 166
      } else if (parsedMedia.provider === "instagram") {
        w = 420
        h = 440
      }

      const node: Omit<EmbedNode, "id" | "seed"> = {
        type: "embed",
        url: parsedMedia.originalUrl,
        embedUrl: parsedMedia.embedUrl,
        title: parsedMedia.title,
        provider: parsedMedia.provider as EmbedNode["provider"],
        mediaCategory: parsedMedia.mediaCategory,
        aspectRatio: parsedMedia.aspectRatio,
        thumbnailUrl: parsedMedia.thumbnailUrl,
        authorName: parsedMedia.authorName,
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        allowFullscreen: true,
        providerData: parsedMedia.providerData,
      }
      const id = s.addNode(node as Omit<SquigNode, "id" | "seed">)
      s.setSelection([id])
      s.setNotice(`Embedded ${parsedMedia.title || "media"} on canvas`)
    }

    closeDialog()
  }

  // Handle local file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const res = await saveMediaAsset(file, file.name)
      const s = useSquig.getState()

      if (dialog?.replaceNodeId) {
        s.updateNodes({
          [dialog.replaceNodeId]: {
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
        s.setNotice(`Replaced media with "${res.name}"`)
        closeDialog()
        return
      }

      const [cx, cy] = getPlacementCoordinates()

      const isVid = res.mediaKind === "video"
      const w = isVid ? 560 : 380
      const h = isVid ? (res.naturalW && res.naturalH ? Math.round((560 * res.naturalH) / res.naturalW) : 315) : 120

      const node: Omit<MediaNode, "id" | "seed"> = {
        type: "media",
        mediaKind: res.mediaKind,
        source: { kind: "local", assetId: res.assetId },
        name: res.name,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
        duration: res.duration,
        naturalW: res.naturalW,
        naturalH: res.naturalH,
        posterUrl: res.posterUrl,
        waveform: res.waveform,
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        controls: true,
        playbackRate: 1,
      }

      const id = s.addNode(node as Omit<SquigNode, "id" | "seed">)
      s.setSelection([id])
      s.setNotice(`Placed ${isVid ? "video" : "audio"} "${res.name}" on canvas`)
      closeDialog()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUploading(false)
    }
  }

  if (!dialog?.open) return null

  return (
    <div
      onClick={closeDialog}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[var(--sq-paper)] border border-[var(--sq-border)] shadow-2xl overflow-hidden flex flex-col text-[var(--sq-ink)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--sq-border)] flex items-center justify-between bg-[var(--sq-shade)]/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--sq-ink)] text-[var(--sq-paper)]">
              {activeTab === "video" && <VideoCamera size={18} weight="bold" />}
              {activeTab === "audio" && <MusicNotes size={18} weight="bold" />}
              {activeTab === "embed" && <Globe size={18} weight="bold" />}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Insert Media</h3>
              <p className="text-[11px] text-stone-500">Add video, audio, or interactive embeds to canvas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="p-1 rounded-full hover:bg-[var(--sq-shade)] text-stone-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-[var(--sq-border)]/50 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-all",
              activeTab === "video"
                ? "border-orange-500 text-orange-500 bg-[var(--sq-shade)]/20"
                : "border-transparent text-stone-500 hover:text-[var(--sq-ink)]"
            )}
          >
            <VideoCamera size={14} />
            <span>Video</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-all",
              activeTab === "audio"
                ? "border-orange-500 text-orange-500 bg-[var(--sq-shade)]/20"
                : "border-transparent text-stone-500 hover:text-[var(--sq-ink)]"
            )}
          >
            <MusicNotes size={14} />
            <span>Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("embed")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-all",
              activeTab === "embed"
                ? "border-orange-500 text-orange-500 bg-[var(--sq-shade)]/20"
                : "border-transparent text-stone-500 hover:text-[var(--sq-ink)]"
            )}
          >
            <Globe size={14} />
            <span>General Embed</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Section A: URL Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
              <Link size={14} />
              <span>
                {activeTab === "video" && "YouTube, Vimeo, or Video URL"}
                {activeTab === "audio" && "Spotify, SoundCloud, or Audio URL"}
                {activeTab === "embed" && "Website or Embed URL"}
              </span>
            </label>
            <div className="relative flex items-center">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && parsedMedia) {
                    e.preventDefault()
                    handleInsertUrl()
                  }
                }}
                placeholder={
                  activeTab === "video"
                    ? "https://www.youtube.com/watch?v=... or .mp4 link"
                    : activeTab === "audio"
                    ? "https://open.spotify.com/... or soundcloud.com/..."
                    : "https://example.com/..."
                }
                className="w-full pl-3 pr-9 py-2 rounded-lg border border-[var(--sq-border)] bg-[var(--sq-shade)]/30 text-xs text-[var(--sq-ink)] placeholder:text-stone-400 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              {isUrlValidating && (
                <div className="absolute right-2.5">
                  <CircleNotch size={14} className="animate-spin text-stone-400" />
                </div>
              )}
            </div>

            {urlError && <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">{urlError}</p>}

            {/* Provider Detected Preview Badge */}
            {parsedMedia && (
              <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 flex items-center justify-between mt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  {parsedMedia.provider === "youtube" && <YoutubeLogo size={22} weight="fill" className="text-red-500 shrink-0" />}
                  {parsedMedia.provider === "spotify" && <SpotifyLogo size={22} weight="fill" className="text-emerald-500 shrink-0" />}
                  {parsedMedia.provider === "vimeo" && <Play size={20} weight="fill" className="text-sky-400 shrink-0" />}
                  {parsedMedia.provider === "soundcloud" && <Play size={20} weight="fill" className="text-orange-500 shrink-0" />}
                  {(parsedMedia.provider === "direct-video" || parsedMedia.provider === "direct-audio") && (
                    <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" />
                  )}
                  {parsedMedia.provider === "generic" && <Globe size={20} weight="bold" className="text-stone-500 shrink-0" />}

                  <div className="min-w-0">
                    <span className="font-bold text-xs block truncate">{parsedMedia.title || "Media detected"}</span>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                      {parsedMedia.provider.replace("-", " ")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInsertUrl}
                  className="px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
                >
                  Insert
                </button>
              </div>
            )}
          </div>

          {/* Section B: Local File Upload (Video & Audio tabs only) */}
          {activeTab !== "embed" && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--sq-border)]/50">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                <UploadSimple size={14} />
                <span>Upload Local {activeTab === "video" ? "Video (MP4, WebM)" : "Audio (MP3, WAV, OGG, M4A)"}</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFileUpload(f)
                }}
                accept={activeTab === "video" ? "video/mp4,video/webm,video/quicktime" : "audio/*"}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) void handleFileUpload(f)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center",
                  isDragOver
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-[var(--sq-border)] hover:border-stone-400 bg-[var(--sq-shade)]/20 hover:bg-[var(--sq-shade)]/40"
                )}
              >
                {isUploading ? (
                  <>
                    <CircleNotch size={26} className="animate-spin text-orange-500" />
                    <span className="text-xs font-semibold">Processing & caching media asset…</span>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 rounded-full bg-[var(--sq-shade)]/80 text-[var(--sq-ink)]">
                      <UploadSimple size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">
                        Click to browse or drop {activeTab === "video" ? "video" : "audio"} file here
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {activeTab === "video"
                          ? "Supports MP4, WebM, MOV up to 250MB"
                          : "Supports MP3, WAV, M4A, OGG, FLAC up to 100MB"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                  <WarningCircle size={16} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
