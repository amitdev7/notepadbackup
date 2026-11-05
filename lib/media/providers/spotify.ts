// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Spotify Provider Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"

export const spotifyAdapter: MediaProviderAdapter = {
  id: "spotify",
  name: "Spotify",

  canHandle(url: URL): boolean {
    const host = url.hostname.toLowerCase()
    return host === "open.spotify.com" || host === "spotify.com" || host === "www.spotify.com"
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const path = url.pathname.replace(/^\/+/, "")
    const segments = path.split("/").filter(Boolean)

    // Match /track/:id, /album/:id, /playlist/:id, /episode/:id, /show/:id, or /embed/:type/:id
    let type: string | null = null
    let id: string | null = null

    if (segments[0] === "embed" && segments.length >= 3) {
      type = segments[1]
      id = segments[2]
    } else if (segments.length >= 2) {
      type = segments[0]
      id = segments[1]
    }

    if (!type || !id) return null
    if (!["track", "album", "playlist", "episode", "show"].includes(type)) return null

    const normalizedUrl = `https://open.spotify.com/${type}/${id}`
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`

    const isCompact = type === "track"

    return {
      provider: "spotify",
      mediaCategory: "audio",
      originalUrl: url.toString(),
      normalizedUrl,
      embedUrl,
      id,
      title: `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      aspectRatio: isCompact ? 352 / 152 : 352 / 380,
      providerData: { type, id },
    }
  },

  buildEmbedUrl(parsed: ParsedMediaUrl): string | null {
    return parsed.embedUrl
  },

  capabilities: {
    canSeek: false,
    canChangeVolume: true,
    canChangeSpeed: false,
    canLoop: false,
    canFullscreen: false,
    canPictureInPicture: false,
    canExtractWaveform: false,
    canCustomControls: false,
  },
}
