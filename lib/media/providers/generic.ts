// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Generic Website Embed Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"
import { isSafeMediaUrl } from "../media-validation"

export const genericAdapter: MediaProviderAdapter = {
  id: "generic",
  name: "Web Embed",

  canHandle(url: URL): boolean {
    return isSafeMediaUrl(url.toString())
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const host = url.hostname
    const displayTitle = host.replace(/^www\./, "")

    return {
      provider: "generic",
      mediaCategory: "web",
      originalUrl: url.toString(),
      normalizedUrl: url.toString(),
      embedUrl: url.toString(),
      title: displayTitle,
      thumbnailUrl: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
      aspectRatio: 16 / 10,
      providerData: { hostname: host },
    }
  },

  buildEmbedUrl(parsed: ParsedMediaUrl): string | null {
    return parsed.embedUrl
  },

  capabilities: {
    canSeek: false,
    canChangeVolume: false,
    canChangeSpeed: false,
    canLoop: false,
    canFullscreen: true,
    canPictureInPicture: false,
    canExtractWaveform: false,
    canCustomControls: false,
  },
}
