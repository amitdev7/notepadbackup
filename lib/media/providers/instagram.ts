// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Instagram Provider Adapter
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "../types"
import { isSafeMediaUrl } from "../media-validation"

export const instagramAdapter: MediaProviderAdapter = {
  id: "instagram",
  name: "Instagram",

  canHandle(url: URL): boolean {
    if (!isSafeMediaUrl(url.toString())) return false
    const host = url.hostname.toLowerCase()
    return host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am"
  },

  parse(url: URL): ParsedMediaUrl | null {
    if (!this.canHandle(url)) return null

    const path = url.pathname
    // Check for post, reel, or tv: /p/:id, /reel/:id, /tv/:id
    const postMatch = path.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/)

    if (postMatch && postMatch[1]) {
      const code = postMatch[1]
      return {
        provider: "instagram",
        mediaCategory: "web",
        originalUrl: url.toString(),
        normalizedUrl: `https://www.instagram.com/p/${code}/`,
        embedUrl: `https://www.instagram.com/p/${code}/embed/`,
        id: code,
        title: `Instagram Post (${code})`,
        aspectRatio: 1, // Standard Instagram 1:1 or 4:5
        providerData: { postCode: code, canEmbedPost: true },
      }
    }

    // Root Instagram, profile, or other non-embeddable page
    const cleanHost = url.hostname.replace(/^www\./, "")
    const pathParts = path.split("/").filter(Boolean)
    const username = pathParts.length > 0 && !["explore", "accounts", "direct", "stories"].includes(pathParts[0])
      ? `@${pathParts[0]}`
      : "Instagram"

    return {
      provider: "instagram",
      mediaCategory: "web",
      originalUrl: url.toString(),
      normalizedUrl: url.toString(),
      embedUrl: url.toString(),
      title: username === "Instagram" ? "Instagram" : `${username} on Instagram`,
      aspectRatio: 16 / 10,
      providerData: { hostname: cleanHost, isRestricted: true, username },
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
