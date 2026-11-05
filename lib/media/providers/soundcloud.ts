// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — SoundCloud Provider Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"

export const soundcloudAdapter: MediaProviderAdapter = {
  id: "soundcloud",
  name: "SoundCloud",

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase()
    return host === "soundcloud.com" || host === "www.soundcloud.com" || host === "m.soundcloud.com"
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const path = url.pathname.replace(/^\/+/, "")
    const segments = path.split("/").filter(Boolean)

    if (segments.length < 2) return null

    // Ignore soundcloud internal pages like /search, /upload, /you, etc.
    const reserved = ["search", "upload", "you", "discover", "stream", "charts", "messages", "settings"]
    if (reserved.includes(segments[0])) return null

    const isPlaylist = segments.includes("sets")
    const normalizedUrl = `https://soundcloud.com/${segments.join("/")}`
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      normalizedUrl
    )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`

    return {
      provider: "soundcloud",
      mediaCategory: "audio",
      originalUrl: url.toString(),
      normalizedUrl,
      embedUrl,
      title: isPlaylist ? "SoundCloud Playlist" : "SoundCloud Track",
      authorName: segments[0],
      aspectRatio: isPlaylist ? 380 / 380 : 380 / 166,
      providerData: { user: segments[0], isPlaylist },
    }
  },

  buildEmbedUrl(parsed: ParsedMediaUrl): string | null {
    return parsed.embedUrl
  },

  capabilities: {
    canSeek: true,
    canChangeVolume: true,
    canChangeSpeed: false,
    canLoop: true,
    canFullscreen: false,
    canPictureInPicture: false,
    canExtractWaveform: false,
    canCustomControls: false,
  },
}
