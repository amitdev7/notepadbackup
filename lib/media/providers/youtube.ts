// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — YouTube Provider Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"

function parseYouTubeTimestamp(raw: string | null): number | undefined {
  if (!raw) return undefined
  const num = Number(raw)
  if (!Number.isNaN(num) && num > 0) return Math.floor(num)

  // Parse time formats like "1h30m15s", "2m30s", "45s"
  let total = 0
  const hours = /(\d+)\s*h/i.exec(raw)
  const minutes = /(\d+)\s*m/i.exec(raw)
  const seconds = /(\d+)\s*s/i.exec(raw)

  if (hours) total += parseInt(hours[1], 10) * 3600
  if (minutes) total += parseInt(minutes[1], 10) * 60
  if (seconds) total += parseInt(seconds[1], 10)

  return total > 0 ? total : undefined
}

export const youtubeAdapter: MediaProviderAdapter = {
  id: "youtube",
  name: "YouTube",

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase()
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com" ||
      host === "www.youtube-nocookie.com"
    )
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const host = url.hostname.toLowerCase()
    const path = url.pathname
    const search = url.searchParams

    let videoId: string | null = null
    let listId: string | null = search.get("list")

    if (host === "youtu.be") {
      videoId = path.slice(1).split("/")[0] || null
    } else if (path.startsWith("/shorts/")) {
      videoId = path.replace("/shorts/", "").split("/")[0] || null
    } else if (path.startsWith("/embed/")) {
      videoId = path.replace("/embed/", "").split("/")[0] || null
    } else if (path.startsWith("/watch")) {
      videoId = search.get("v")
    } else if (path.startsWith("/playlist")) {
      listId = search.get("list")
    }

    if (!videoId && !listId) return null

    const startTime = parseYouTubeTimestamp(search.get("t") || search.get("start"))

    const normalizedUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}${startTime ? `&t=${startTime}s` : ""}`
      : `https://www.youtube.com/playlist?list=${listId}`

    const embedUrl = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1${startTime ? `&start=${startTime}` : ""}${listId ? `&list=${listId}` : ""}`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&enablejsapi=1&rel=0`

    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined

    return {
      provider: "youtube",
      mediaCategory: "video",
      originalUrl: url.toString(),
      normalizedUrl,
      embedUrl,
      id: videoId || listId || undefined,
      title: videoId ? "YouTube Video" : "YouTube Playlist",
      thumbnailUrl,
      aspectRatio: 16 / 9,
      startTimeSeconds: startTime,
      providerData: { videoId, listId },
    }
  },

  buildEmbedUrl(parsed: ParsedMediaUrl): string | null {
    return parsed.embedUrl
  },

  capabilities: {
    canSeek: true,
    canChangeVolume: true,
    canChangeSpeed: true,
    canLoop: true,
    canFullscreen: true,
    canPictureInPicture: true,
    canExtractWaveform: false,
    canCustomControls: false, // Provider iframe handles controls
  },
}
