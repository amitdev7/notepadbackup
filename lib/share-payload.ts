import { deflate, inflate } from "pako"

/**
 * Robust base64url encode and decode utilities that run in both browser and Node.js
 */
function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  if (typeof btoa === "function") {
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }
  return Buffer.from(binary, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlToUint8(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (b64.length % 4) {
    b64 += "="
  }
  if (typeof atob === "function") {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i)
    }
    return bytes
  }
  const buf = Buffer.from(b64, "base64")
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

/**
 * Compress a wireframe document snapshot into a compact URL-safe hash fragment.
 */
export function encodeSharePayload(doc: {
  id?: string
  name: string
  nodes: Record<string, unknown>
  order: string[]
  look?: unknown
  updatedAt?: number
}): string {
  try {
    const minimal = {
      id: doc.id,
      name: doc.name || "Shared Wireframe",
      nodes: doc.nodes || {},
      order: doc.order || [],
      look: doc.look,
      updatedAt: doc.updatedAt || Date.now(),
    }
    const json = JSON.stringify(minimal)
    const compressed = deflate(new TextEncoder().encode(json), { level: 6 })
    return uint8ToBase64Url(compressed)
  } catch (err) {
    console.warn("[SharePayload] Compression failed, falling back to base64:", err)
    return ""
  }
}

/**
 * Decompress a URL-safe hash fragment back into a wireframe document snapshot.
 */
export function decodeSharePayload(raw: string): {
  id?: string
  name: string
  nodes: Record<string, unknown>
  order: string[]
  look?: unknown
  updatedAt?: number
} | null {
  if (!raw || typeof raw !== "string") return null
  const cleaned = raw.trim().replace(/^[#?&]+/, "")
  const match = cleaned.match(/(?:^|[?&#])(?:d|w|data)=([^&]+)/)
  const target = match ? match[1] : cleaned

  try {
    const bytes = base64UrlToUint8(target)
    const decompressed = inflate(bytes)
    const json = new TextDecoder().decode(decompressed)
    const parsed = JSON.parse(json)
    if (parsed && typeof parsed === "object" && parsed.nodes && typeof parsed.nodes === "object") {
      return parsed
    }
    return null
  } catch (err) {
    // Attempt fallback to plain JSON base64 if not deflated
    try {
      const bytes = base64UrlToUint8(target)
      const json = new TextDecoder().decode(bytes)
      const parsed = JSON.parse(json)
      if (parsed && typeof parsed === "object" && parsed.nodes && typeof parsed.nodes === "object") {
        return parsed
      }
    } catch {
      // ignore
    }
    console.warn("[SharePayload] Decompression failed:", err)
    return null
  }
}

/**
 * Cache share snapshot locally so preview links in the same browser load immediately
 */
export function cacheLocalShare(publicId: string, doc: unknown): void {
  if (typeof window === "undefined" || !publicId) return
  try {
    const key = `zenithsui:share:${publicId}`
    localStorage.setItem(key, JSON.stringify(doc))
  } catch {
    // ignore quota errors
  }
}

export function getLocalShareCache(publicId: string): unknown | null {
  if (typeof window === "undefined" || !publicId) return null
  try {
    const key = `zenithsui:share:${publicId}`
    const val = localStorage.getItem(key)
    if (val) {
      return JSON.parse(val)
    }
  } catch {
    // ignore
  }
  return null
}
