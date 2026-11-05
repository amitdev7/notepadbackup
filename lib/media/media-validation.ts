// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Security Validation & File Inspection
// ---------------------------------------------------------------------------

import type { MediaKind } from "../types"

export const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024 // 250MB
export const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

/**
 * Sanitizes user-supplied filenames for media items:
 * Removes path traversal, control chars, null bytes, trims whitespace.
 */
export function sanitizeMediaFilename(rawName: string, fallback = "untitled_media"): string {
  if (!rawName || typeof rawName !== "string") return fallback
  let clean = rawName.replace(/[\x00-\x1f\x7f]/g, "").trim()
  clean = clean.replace(/^[./\\]+/, "").replace(/[/\\:]+/g, "_").trim()
  if (!clean || clean === "." || clean === "..") return fallback
  if (clean.length > 180) {
    const ext = clean.split(".").pop() || ""
    const base = clean.slice(0, 170)
    clean = ext ? `${base}.${ext}` : base
  }
  return clean
}

/**
 * Strict URL security validator:
 * Rejects javascript:, file:, data:, blob:, loopback, private IP ranges, and cloud metadata endpoints.
 */
export function isSafeMediaUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false
  const trimmed = rawUrl.trim()
  if (!trimmed) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  // Only allow HTTP/HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false
  }

  const hostname = parsed.hostname.toLowerCase().trim()

  // Loopback and internal addresses
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false
  }

  // Cloud metadata services
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal" ||
    hostname === "metadata" ||
    hostname === "instance-data"
  ) {
    return false
  }

  // Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (a === 10) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 127) return false
    if (a === 0) return false
  }

  return true
}

/**
 * Detects whether a file or MIME type belongs to video or audio.
 */
export function inferMediaCategory(
  filename: string,
  declaredType?: string
): { mediaKind: MediaKind; mimeType: string; extension: string } {
  const parts = filename.split(".")
  const ext = (parts.length > 1 ? parts.pop() || "" : "").toLowerCase()

  const VIDEO_MIME: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    ogv: "video/ogg",
    mkv: "video/x-matroska",
  }

  const AUDIO_MIME: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    opus: "audio/opus",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    weba: "audio/webm",
  }

  if (VIDEO_MIME[ext] || declaredType?.startsWith("video/")) {
    return {
      mediaKind: "video",
      mimeType: declaredType || VIDEO_MIME[ext] || "video/mp4",
      extension: ext || "mp4",
    }
  }

  if (AUDIO_MIME[ext] || declaredType?.startsWith("audio/")) {
    return {
      mediaKind: "audio",
      mimeType: declaredType || AUDIO_MIME[ext] || "audio/mpeg",
      extension: ext || "mp3",
    }
  }

  return {
    mediaKind: "video",
    mimeType: declaredType || "video/mp4",
    extension: ext || "mp4",
  }
}

/**
 * Inspects binary magic bytes for genuine video and audio files:
 * Prevents disguised executable binaries or corrupted payloads.
 */
export async function validateMediaMagicBytes(
  blob: Blob
): Promise<{ valid: boolean; detectedMime?: string; kind?: MediaKind }> {
  // Read first 64 bytes
  const buffer = await blob.slice(0, 64).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (bytes.length < 4) {
    return { valid: false }
  }

  // Reject known executable, script, and HTML signatures immediately
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    // Windows PE / EXE / DLL ("MZ")
    return { valid: false }
  }
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    // Linux ELF binary
    return { valid: false }
  }
  if (bytes[0] === 0x23 && bytes[1] === 0x21) {
    // Shebang script ("#!")
    return { valid: false }
  }
  if (
    (bytes[0] === 0x3c && bytes[1] === 0x21) || // "<!" (<!DOCTYPE / <!--)
    (bytes[0] === 0x3c && bytes[1] === 0x3f) || // "<?" (<?xml / <?php)
    (bytes[0] === 0x3c && (bytes[1] === 0x68 || bytes[1] === 0x48)) // "<h" / "<H" (<html)
  ) {
    return { valid: false }
  }

  // 1. EBML / WebM / MKV (1A 45 DF A3)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const str = new TextDecoder().decode(bytes)
    const isAudio = str.includes("webm") && blob.type.includes("audio")
    return {
      valid: true,
      detectedMime: isAudio ? "audio/webm" : "video/webm",
      kind: isAudio ? "audio" : "video",
    }
  }

  // 2. MP4 / MOV / M4A (contains 'ftyp' at offset 4..12)
  for (let i = 0; i <= 16; i++) {
    if (
      bytes[i] === 0x66 && // 'f'
      bytes[i + 1] === 0x74 && // 't'
      bytes[i + 2] === 0x79 && // 'y'
      bytes[i + 3] === 0x70 // 'p'
    ) {
      // Check brand (mp42, isom, M4A , qt  )
      const brand = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7])
      const isM4A = brand.includes("M4A") || blob.type.includes("audio")
      return {
        valid: true,
        detectedMime: isM4A ? "audio/mp4" : "video/mp4",
        kind: isM4A ? "audio" : "video",
      }
    }
  }

  // 3. RIFF / WAV (52 49 46 46 .... 57 41 56 45)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return { valid: true, detectedMime: "audio/wav", kind: "audio" }
  }

  // 4. OggS (4F 67 67 53)
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    const isVideo = blob.type.includes("video")
    return {
      valid: true,
      detectedMime: isVideo ? "video/ogg" : "audio/ogg",
      kind: isVideo ? "video" : "audio",
    }
  }

  // 5. MP3 with ID3v2 tag ('ID3' = 49 44 33)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { valid: true, detectedMime: "audio/mpeg", kind: "audio" }
  }

  // 6. MP3 raw frame sync (FF FB, FF F3, FF F2, FF E3)
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { valid: true, detectedMime: "audio/mpeg", kind: "audio" }
  }

  // 7. FLAC ('fLaC' = 66 4C 61 43)
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { valid: true, detectedMime: "audio/flac", kind: "audio" }
  }

  // If declared as standard media type (mp4, webm, wav, mp3, ogg, flac) but didn't match signatures above, reject as spoofed
  if (
    blob.type === "video/mp4" ||
    blob.type === "video/webm" ||
    blob.type === "audio/wav" ||
    blob.type === "audio/x-wav" ||
    blob.type === "audio/mpeg" ||
    blob.type === "audio/mp3" ||
    blob.type === "audio/ogg" ||
    blob.type === "audio/flac"
  ) {
    return { valid: false }
  }

  // Fallback only for uncommon browser-supported audio/video streams (e.g. m4a/aac without ftyp, amr)
  if (blob.type.startsWith("video/")) {
    return { valid: true, detectedMime: blob.type, kind: "video" }
  }
  if (blob.type.startsWith("audio/")) {
    return { valid: true, detectedMime: blob.type, kind: "audio" }
  }

  return { valid: false }
}
