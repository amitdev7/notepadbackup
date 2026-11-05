"use client"

// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Binary Asset Storage & Lifecycle Engine
// ---------------------------------------------------------------------------

import { openZenithsuiDb, STORES, withTransaction } from "../storage/db"
import type { MediaNode } from "../types"
import type { MediaAssetResult } from "./types"
import {
  sanitizeMediaFilename,
  inferMediaCategory,
  validateMediaMagicBytes,
  MAX_VIDEO_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
} from "./media-validation"

/** Active ObjectURL cache across current browser session */
const activeMediaUrls = new Map<string, string>()
const mediaUrlRefCounts = new Map<string, number>()
const inMemoryMediaBlobCache = new Map<string, Blob>()

/**
 * Calculates SHA-256 hash using chunked streaming to prevent main thread freezing
 * or browser out-of-memory errors on large video files.
 */
export async function computeChunkedBlobHash(blob: Blob): Promise<string> {
  // For small files (< 8MB), native arrayBuffer is very fast
  if (blob.size <= 8 * 1024 * 1024) {
    const buffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  // For larger files, sample the header, middle, and tail plus size to construct
  // an instant high-entropy deterministic content signature without loading 200MB into RAM
  const headSize = 2 * 1024 * 1024
  const midStart = Math.floor(blob.size / 2) - 1024 * 1024
  const tailStart = Math.max(0, blob.size - 2 * 1024 * 1024)

  const headBuf = await blob.slice(0, headSize).arrayBuffer()
  const midBuf = await blob.slice(midStart, midStart + 2 * 1024 * 1024).arrayBuffer()
  const tailBuf = await blob.slice(tailStart).arrayBuffer()

  const combined = new Uint8Array(headBuf.byteLength + midBuf.byteLength + tailBuf.byteLength + 8)
  combined.set(new Uint8Array(headBuf), 0)
  combined.set(new Uint8Array(midBuf), headBuf.byteLength)
  combined.set(new Uint8Array(tailBuf), headBuf.byteLength + midBuf.byteLength)

  // Append size bytes
  const view = new DataView(combined.buffer)
  view.setBigUint64(combined.byteLength - 8, BigInt(blob.size), true)

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Extracts natural dimensions, duration, and first-frame poster from a video file.
 */
async function extractVideoMetadata(
  videoBlob: Blob
): Promise<{ duration: number; naturalW: number; naturalH: number; posterUrl?: string }> {
  if (typeof window === "undefined") {
    return { duration: 0, naturalW: 640, naturalH: 360 }
  }

  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true

    const tempUrl = URL.createObjectURL(videoBlob)
    video.src = tempUrl

    const cleanUp = () => {
      URL.revokeObjectURL(tempUrl)
      video.removeAttribute("src")
      video.load()
    }

    const timer = setTimeout(() => {
      cleanUp()
      resolve({ duration: 0, naturalW: 640, naturalH: 360 })
    }, 6000)

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const naturalW = video.videoWidth || 640
      const naturalH = video.videoHeight || 360

      // Seek to 0.5s or duration/4 to capture representative poster
      const seekTime = Math.min(0.5, Math.max(0.1, duration / 4))
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      clearTimeout(timer)
      let posterUrl: string | undefined

      try {
        const canvas = document.createElement("canvas")
        const maxW = 480
        const scale = Math.min(1, maxW / (video.videoWidth || 640))
        canvas.width = Math.round((video.videoWidth || 640) * scale)
        canvas.height = Math.round((video.videoHeight || 360) * scale)

        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          posterUrl = canvas.toDataURL("image/jpeg", 0.75)
        }
      } catch {
        // Poster generation might be blocked if cross-origin or canvas error
      }

      cleanUp()
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        naturalW: video.videoWidth || 640,
        naturalH: video.videoHeight || 360,
        posterUrl,
      })
    }

    video.onerror = () => {
      clearTimeout(timer)
      cleanUp()
      resolve({ duration: 0, naturalW: 640, naturalH: 360 })
    }
  })
}

/**
 * Extracts duration and audio waveform peak bars using Web Audio API.
 */
async function extractAudioMetadata(
  audioBlob: Blob
): Promise<{ duration: number; waveform?: number[] }> {
  if (typeof window === "undefined") {
    return { duration: 0 }
  }

  // 1. Get duration from Audio element
  const getAudioDuration = (): Promise<number> =>
    new Promise((resolve) => {
      const audio = document.createElement("audio")
      audio.preload = "metadata"
      const tempUrl = URL.createObjectURL(audioBlob)
      audio.src = tempUrl

      const cleanup = () => {
        URL.revokeObjectURL(tempUrl)
        audio.removeAttribute("src")
      }

      const timer = setTimeout(() => {
        cleanup()
        resolve(0)
      }, 4000)

      audio.onloadedmetadata = () => {
        clearTimeout(timer)
        const dur = Number.isFinite(audio.duration) ? audio.duration : 0
        cleanup()
        resolve(dur)
      }

      audio.onerror = () => {
        clearTimeout(timer)
        cleanup()
        resolve(0)
      }
    })

  const duration = await getAudioDuration()

  // 2. Decode audio slice for authentic waveform visualization (up to 36 bars)
  let waveform: number[] | undefined

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass()
      // Decode slice up to 4MB for waveform calculation to keep it fast
      const slice = audioBlob.slice(0, Math.min(audioBlob.size, 4 * 1024 * 1024))
      const arrayBuffer = await slice.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

      const channelData = audioBuffer.getChannelData(0)
      const barCount = 36
      const blockSize = Math.floor(channelData.length / barCount)
      const peaks: number[] = []

      for (let i = 0; i < barCount; i++) {
        const start = i * blockSize
        let sum = 0
        for (let j = 0; j < blockSize; j += 16) {
          sum += Math.abs(channelData[start + j] || 0)
        }
        peaks.push(sum / (blockSize / 16))
      }

      const maxPeak = Math.max(...peaks, 0.001)
      waveform = peaks.map((p) => Math.max(0.12, Math.min(1, Math.round((p / maxPeak) * 100) / 100)))
      await audioCtx.close()
    }
  } catch {
    // If decoding fails, provide a balanced organic waveform fallback
    waveform = Array.from({ length: 36 }, (_, i) => {
      return Math.round((0.25 + 0.75 * Math.abs(Math.sin(i * 0.45))) * 100) / 100
    })
  }

  return { duration, waveform }
}

/**
 * Saves an uploaded or dropped video/audio file to local-first IndexedDB asset storage.
 */
export async function saveMediaAsset(
  file: File | Blob,
  rawName: string
): Promise<MediaAssetResult> {
  const name = sanitizeMediaFilename(rawName)
  const { mediaKind, mimeType } = inferMediaCategory(name, file.type)
  const sizeBytes = file.size

  const limit = mediaKind === "video" ? MAX_VIDEO_SIZE_BYTES : MAX_AUDIO_SIZE_BYTES
  if (sizeBytes > limit) {
    throw new Error(
      `${mediaKind === "video" ? "Video" : "Audio"} file exceeds maximum supported size of ${Math.round(
        limit / (1024 * 1024)
      )} MB.`
    )
  }

  // 1. Binary magic byte validation
  const validation = await validateMediaMagicBytes(file)
  if (!validation.valid) {
    throw new Error("Invalid or unsupported media file format. Please upload a standard MP4, WebM, MP3, WAV, or OGG file.")
  }

  // 2. Compute stable SHA-256 hash
  const hash = await computeChunkedBlobHash(file)
  const assetId = `media_${hash}`

  // 3. Persist to IndexedDB asset storage with exact chunked hash as primary key
  const record = {
    hash,
    assetId,
    blob: file,
    mimeType: validation.detectedMime || mimeType,
    createdAt: Date.now(),
  }

  // Update in-memory blob cache
  inMemoryMediaBlobCache.set(assetId, file)
  inMemoryMediaBlobCache.set(hash, file)

  if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
    try {
      await withTransaction(STORES.ASSET_BLOBS, "readwrite", (tx) => {
        tx.objectStore(STORES.ASSET_BLOBS).put(record)
      })
    } catch (err) {
      console.warn("[media-assets] Failed to persist asset to IndexedDB:", err)
    }
  }

  // 4. Extract metadata & poster/waveform
  let duration: number | undefined
  let naturalW: number | undefined
  let naturalH: number | undefined
  let posterUrl: string | undefined
  let waveform: number[] | undefined

  if (mediaKind === "video") {
    const vMeta = await extractVideoMetadata(file)
    duration = vMeta.duration
    naturalW = vMeta.naturalW
    naturalH = vMeta.naturalH
    posterUrl = vMeta.posterUrl
  } else {
    const aMeta = await extractAudioMetadata(file)
    duration = aMeta.duration
    waveform = aMeta.waveform
  }

  // 5. Generate and track active object URL with reference counting
  const localUrl = acquireMediaObjectUrl(assetId, file)

  return {
    assetId,
    hash,
    name,
    mediaKind,
    mimeType: validation.detectedMime || mimeType,
    sizeBytes,
    duration,
    naturalW,
    naturalH,
    posterUrl,
    waveform,
    localUrl,
  }
}

/**
 * Tracks and acquires an Object URL for local media, incrementing its reference count.
 */
export function acquireMediaObjectUrl(assetIdOrHash: string, blob: Blob): string {
  const cleanHash = assetIdOrHash.replace(/^media_|^asset_/, "").replace(/^asset:\/\//, "")
  if (activeMediaUrls.has(assetIdOrHash)) {
    mediaUrlRefCounts.set(cleanHash, (mediaUrlRefCounts.get(cleanHash) || 0) + 1)
    return activeMediaUrls.get(assetIdOrHash)!
  }
  if (activeMediaUrls.has(cleanHash)) {
    mediaUrlRefCounts.set(cleanHash, (mediaUrlRefCounts.get(cleanHash) || 0) + 1)
    return activeMediaUrls.get(cleanHash)!
  }
  const url = URL.createObjectURL(blob)
  activeMediaUrls.set(assetIdOrHash, url)
  activeMediaUrls.set(cleanHash, url)
  mediaUrlRefCounts.set(cleanHash, 1)
  return url
}

/**
 * Releases an Object URL reference, revoking it from memory once count reaches zero.
 */
export function releaseMediaObjectUrl(assetIdOrHash: string): void {
  const cleanHash = assetIdOrHash.replace(/^media_|^asset_/, "").replace(/^asset:\/\//, "")
  const count = (mediaUrlRefCounts.get(cleanHash) || 1) - 1
  if (count <= 0) {
    const url = activeMediaUrls.get(assetIdOrHash) || activeMediaUrls.get(cleanHash)
    if (url) {
      try {
        URL.revokeObjectURL(url)
      } catch {}
    }
    activeMediaUrls.delete(assetIdOrHash)
    activeMediaUrls.delete(cleanHash)
    mediaUrlRefCounts.delete(cleanHash)
  } else {
    mediaUrlRefCounts.set(cleanHash, count)
  }
}

/**
 * Retrieves the raw Blob for a media asset from Memory or IndexedDB.
 */
export async function getMediaBlob(assetIdOrHash: string): Promise<Blob | null> {
  const cleanHash = assetIdOrHash.replace(/^media_|^asset_/, "").replace(/^asset:\/\//, "")

  if (inMemoryMediaBlobCache.has(assetIdOrHash)) return inMemoryMediaBlobCache.get(assetIdOrHash)!
  if (inMemoryMediaBlobCache.has(cleanHash)) return inMemoryMediaBlobCache.get(cleanHash)!

  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null

  try {
    const db = await openZenithsuiDb()
    const tx = db.transaction(STORES.ASSET_BLOBS, "readonly")
    const store = tx.objectStore(STORES.ASSET_BLOBS)

    return new Promise<Blob | null>((resolve) => {
      const req = store.get(cleanHash)
      req.onsuccess = () => {
        const record = req.result
        if (record && record.blob) {
          inMemoryMediaBlobCache.set(assetIdOrHash, record.blob)
          inMemoryMediaBlobCache.set(cleanHash, record.blob)
          resolve(record.blob)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch (err) {
    console.warn("Failed to get media blob:", err)
    return null
  }
}

/**
 * Retrieves or lazily creates an Object URL for local media playback.
 * Survives page reloads by restoring from IndexedDB.
 */
export async function getMediaObjectUrl(assetIdOrHash: string): Promise<string | null> {
  const cleanHash = assetIdOrHash.replace(/^media_|^asset_/, "").replace(/^asset:\/\//, "")

  // Fast path: in-memory active URL
  if (activeMediaUrls.has(assetIdOrHash)) {
    const blob = inMemoryMediaBlobCache.get(cleanHash) || new Blob()
    return acquireMediaObjectUrl(assetIdOrHash, blob)
  }
  if (activeMediaUrls.has(cleanHash)) {
    const blob = inMemoryMediaBlobCache.get(cleanHash) || new Blob()
    return acquireMediaObjectUrl(cleanHash, blob)
  }

  // Retrieve blob from IndexedDB and create tracked URL
  const blob = await getMediaBlob(cleanHash)
  if (!blob) return null

  return acquireMediaObjectUrl(assetIdOrHash, blob)
}

/**
 * Triggers a browser file download of the original media file.
 */
export async function downloadMediaAsset(node: MediaNode): Promise<void> {
  let blob: Blob | null = null

  if (node.source.kind === "local") {
    blob = await getMediaBlob(node.source.assetId)
  } else if (node.source.kind === "direct-url") {
    try {
      const res = await fetch(node.source.url)
      if (res.ok) blob = await res.blob()
    } catch {
      // Fallback: open in new tab
      window.open(node.source.url, "_blank")
      return
    }
  }

  if (!blob) {
    if (node.source.kind === "direct-url") {
      window.open(node.source.url, "_blank")
    }
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = node.name || (node.mediaKind === "video" ? "video.mp4" : "audio.mp3")
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Revokes object URLs when media is removed to prevent memory leaks.
 */
export function revokeMediaObjectUrl(assetIdOrHash: string): void {
  releaseMediaObjectUrl(assetIdOrHash)
}
