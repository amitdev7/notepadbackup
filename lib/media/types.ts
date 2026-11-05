// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Core Media Types & Interfaces
// ---------------------------------------------------------------------------

import type { MediaKind, MediaSource, EmbedProvider, EmbedMediaCategory } from "../types"

export interface MediaCapabilities {
  canSeek: boolean
  canChangeVolume: boolean
  canChangeSpeed: boolean
  canLoop: boolean
  canFullscreen: boolean
  canPictureInPicture: boolean
  canExtractWaveform: boolean
  canCustomControls: boolean
}

export interface ParsedMediaUrl {
  provider: EmbedProvider | "direct-video" | "direct-audio"
  mediaCategory: EmbedMediaCategory
  originalUrl: string
  normalizedUrl: string
  embedUrl: string
  id?: string
  title?: string
  authorName?: string
  thumbnailUrl?: string
  aspectRatio?: number
  startTimeSeconds?: number
  providerData?: Record<string, unknown>
}

export interface MediaProviderAdapter {
  id: EmbedProvider
  name: string
  canHandle(url: URL): boolean
  parse(url: URL): ParsedMediaUrl | null
  buildEmbedUrl(parsed: ParsedMediaUrl): string | null
  capabilities: MediaCapabilities
}

export interface MediaAssetResult {
  assetId: string
  hash: string
  name: string
  mediaKind: MediaKind
  mimeType: string
  sizeBytes: number
  duration?: number
  naturalW?: number
  naturalH?: number
  posterUrl?: string
  posterAssetId?: string
  waveform?: number[]
  localUrl: string
}

export interface ActivePlayerState {
  nodeId: string
  mediaKind: MediaKind
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  playbackRate: number
  isBuffering: boolean
  hasError: boolean
  errorMessage?: string
}
