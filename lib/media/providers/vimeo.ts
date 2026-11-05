// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Vimeo Provider Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"

export const vimeoAdapter: MediaProviderAdapter = {
  id: "vimeo",
  name: "Vimeo",

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase()
    return host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com"
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const path = url.pathname.replace(/^\/+/, "")
    const segments = path.split("/").filter(Boolean)

    let videoId: string | null = null
    let unlistedHash: string | null = null

    if (segments[0] === "video" && segments[1]) {
      videoId = segments[1]
    } else if (/^\d+$/.test(segments[0])) {
      videoId = segments[0]
      if (segments[1]) {
        unlistedHash = segments[1]
      }
    }

    if (!videoId) return null

    const hashParam = unlistedHash || url.searchParams.get("h")
    const normalizedUrl = `https://vimeo.com/${videoId}${hashParam ? `/${hashParam}` : ""}`
    const embedUrl = `https://player.vimeo.com/video/${videoId}?dnt=1&title=0&byline=0&portrait=0&quality=1080p${hashParam ? `&h=${hashParam}` : ""}`

    return {
      provider: "vimeo",
      mediaCategory: "video",
      originalUrl: url.toString(),
      normalizedUrl,
      embedUrl,
      id: videoId,
      title: "Vimeo Video",
      aspectRatio: 16 / 9,
      providerData: { videoId, hash: hashParam },
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
    canCustomControls: false,
  },
}
