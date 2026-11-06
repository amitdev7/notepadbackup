// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Unified Provider Registry & URL Parser
// ---------------------------------------------------------------------------

import type { MediaProviderAdapter, ParsedMediaUrl } from "./types"
import { isSafeMediaUrl } from "./media-validation"
import { youtubeAdapter } from "./providers/youtube"
import { vimeoAdapter } from "./providers/vimeo"
import { spotifyAdapter } from "./providers/spotify"
import { soundcloudAdapter } from "./providers/soundcloud"
import { instagramAdapter } from "./providers/instagram"
import { genericAdapter } from "./providers/generic"

const KNOWN_PROVIDERS: MediaProviderAdapter[] = [
  youtubeAdapter,
  vimeoAdapter,
  spotifyAdapter,
  soundcloudAdapter,
  instagramAdapter,
]

const DIRECT_VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "mkv"])
const DIRECT_AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "oga", "opus", "m4a", "aac", "flac", "weba"])

/**
 * Checks if a URL points directly to an audio or video file.
 */
function checkDirectMediaFile(url: URL): ParsedMediaUrl | null {
  const path = url.pathname.toLowerCase()
  const ext = path.split(".").pop() || ""

  if (DIRECT_VIDEO_EXTS.has(ext)) {
    const filename = path.split("/").pop() || "Direct Video"
    return {
      provider: "direct-video",
      mediaCategory: "video",
      originalUrl: url.toString(),
      normalizedUrl: url.toString(),
      embedUrl: url.toString(),
      title: decodeURIComponent(filename),
      aspectRatio: 16 / 9,
    }
  }

  if (DIRECT_AUDIO_EXTS.has(ext)) {
    const filename = path.split("/").pop() || "Direct Audio"
    return {
      provider: "direct-audio",
      mediaCategory: "audio",
      originalUrl: url.toString(),
      normalizedUrl: url.toString(),
      embedUrl: url.toString(),
      title: decodeURIComponent(filename),
      aspectRatio: 380 / 120,
    }
  }

  return null
}

/**
 * Automatically inspects, classifies, and parses any user-supplied media URL.
 */
export function parseMediaUrl(rawUrl: string): ParsedMediaUrl | null {
  if (!isSafeMediaUrl(rawUrl)) return null

  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return null
  }

  // 1. Direct audio/video files
  const direct = checkDirectMediaFile(url)
  if (direct) return direct

  // 2. Specialized media providers (YouTube, Vimeo, Spotify, SoundCloud)
  for (const provider of KNOWN_PROVIDERS) {
    if (provider.canHandle(url)) {
      const parsed = provider.parse(url)
      if (parsed) return parsed
    }
  }

  // 3. Fallback to generic web embed
  if (genericAdapter.canHandle(url)) {
    return genericAdapter.parse(url)
  }

  return null
}

/**
 * Gets a registered provider adapter by ID.
 */
export function getProviderAdapter(id: string): MediaProviderAdapter | undefined {
  if (id === "generic") return genericAdapter
  return KNOWN_PROVIDERS.find((p) => p.id === id)
}
