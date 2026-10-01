// ---------------------------------------------------------------------------
// Zenithsui Asset Engine: Large Asset Management & Dual-Tier Resolution
// ---------------------------------------------------------------------------

import { openZenithsuiDb, STORES, withTransaction } from "../storage/db"
import type { SquigNode, ImageNode } from "../types"

export interface AssetBlobRecord {
  hash: string
  assetId?: string
  blob: Blob
  mimeType: string
  createdAt: number
}

/** Binary magic byte validation */
export async function validateImageMagicBytes(blob: Blob): Promise<{ valid: boolean; mimeType: string }> {
  const buffer = await blob.slice(0, 16).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png" }
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg" }
  }

  // GIF: 47 49 46 38 (GIF87a or GIF89a)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { valid: true, mimeType: "image/gif" }
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp" }
  }

  // PDF: 25 50 44 46 2D (%PDF-)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { valid: true, mimeType: "application/pdf" }
  }

  return { valid: false, mimeType: "application/octet-stream" }
}

/** Compute SHA-256 hash of a Blob */
export async function computeBlobHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/** In-memory blob cache for active session fast path */
const inMemoryBlobCache = new Map<string, Blob>()

/** Cache a binary asset blob in local IndexedDB and fast in-memory map */
export async function cacheAssetBlob(blob: Blob, assetId?: string): Promise<string> {
  const hash = await computeBlobHash(blob)
  const validation = await validateImageMagicBytes(blob)

  const normalizedAssetId = assetId || `asset_${hash}`

  // 1. Instant in-memory cache
  inMemoryBlobCache.set(hash, blob)
  inMemoryBlobCache.set(`asset://${hash}`, blob)
  inMemoryBlobCache.set(normalizedAssetId, blob)
  const stripped = normalizedAssetId.replace(/^asset_/, "")
  inMemoryBlobCache.set(stripped, blob)

  const record: AssetBlobRecord = {
    hash,
    assetId: normalizedAssetId,
    blob,
    mimeType: validation.valid ? validation.mimeType : blob.type,
    createdAt: Date.now(),
  }

  // 2. Persistent IndexedDB cache
  if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
    try {
      await withTransaction(STORES.ASSET_BLOBS, "readwrite", (tx) => {
        tx.objectStore(STORES.ASSET_BLOBS).put(record)
      })
    } catch (err) {
      console.warn("Failed to persist asset to IndexedDB:", err)
    }
  }

  return hash
}

/** Retrieve a cached binary asset blob from Memory or IndexedDB */
export async function getAssetBlob(key: string): Promise<Blob | null> {
  if (!key) return null

  // Fast path: memory cache
  if (inMemoryBlobCache.has(key)) {
    return inMemoryBlobCache.get(key)!
  }

  const cleanKey = key.replace(/^asset:\/\//, "").replace(/^asset_/, "")
  if (inMemoryBlobCache.has(cleanKey)) {
    return inMemoryBlobCache.get(cleanKey)!
  }

  // Prefix match in memory cache (supports truncated/legacy 16-char hashes)
  for (const [k, v] of inMemoryBlobCache.entries()) {
    const cleanK = k.replace(/^asset:\/\//, "").replace(/^asset_/, "")
    if (cleanK.startsWith(cleanKey) || cleanKey.startsWith(cleanK)) {
      return v
    }
  }

  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return null
  }

  const db = await openZenithsuiDb()

  // 1. Direct primary key lookup using cleanKey
  const directBlob = await new Promise<Blob | null>((resolve) => {
    try {
      const tx = db.transaction(STORES.ASSET_BLOBS, "readonly")
      const store = tx.objectStore(STORES.ASSET_BLOBS)
      const req = store.get(cleanKey)
      req.onsuccess = () => {
        const record = req.result as AssetBlobRecord | undefined
        resolve(record?.blob || null)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

  if (directBlob) {
    inMemoryBlobCache.set(key, directBlob)
    inMemoryBlobCache.set(cleanKey, directBlob)
    return directBlob
  }

  // 2. Direct lookup using key as-is (e.g. if key was stored with prefix)
  const asIsBlob = await new Promise<Blob | null>((resolve) => {
    try {
      const tx = db.transaction(STORES.ASSET_BLOBS, "readonly")
      const store = tx.objectStore(STORES.ASSET_BLOBS)
      const req = store.get(key)
      req.onsuccess = () => {
        const record = req.result as AssetBlobRecord | undefined
        resolve(record?.blob || null)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

  if (asIsBlob) {
    inMemoryBlobCache.set(key, asIsBlob)
    inMemoryBlobCache.set(cleanKey, asIsBlob)
    return asIsBlob
  }

  // 3. Robust fallback: scan records by prefix (for truncated 16-char hashes) or assetId property
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.ASSET_BLOBS, "readonly")
      const store = tx.objectStore(STORES.ASSET_BLOBS)
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) {
          resolve(null)
          return
        }
        const record = cursor.value as AssetBlobRecord
        const recordStripped = record.assetId ? record.assetId.replace(/^asset_/, "") : ""
        if (
          record.hash === cleanKey ||
          record.hash.startsWith(cleanKey) ||
          record.assetId === key ||
          record.assetId === `asset_${cleanKey}` ||
          recordStripped === cleanKey
        ) {
          if (record.blob) {
            inMemoryBlobCache.set(key, record.blob)
            inMemoryBlobCache.set(cleanKey, record.blob)
            resolve(record.blob)
            return
          }
        }
        cursor.continue()
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Resolves all asset:// image sources in nodes into local base64/blob URLs.
 * Crucial invariant: prevents canvas tainting (SecurityError) when exporting
 * canvas to PNG/SVG via canvas.toBlob() / toDataURL().
 */
export async function resolveAssetsForExport(
  nodes: Record<string, SquigNode>
): Promise<Record<string, SquigNode>> {
  const cloned: Record<string, SquigNode> = { ...nodes }

  for (const [id, node] of Object.entries(cloned)) {
    if (node.type === "image" && node.src.startsWith("asset://")) {
      const hash = node.src.replace("asset://", "")
      const blob = await getAssetBlob(hash)
      if (blob) {
        // Convert blob to local Data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        cloned[id] = {
          ...node,
          src: dataUrl,
        } as ImageNode
      }
    }
    if (node.type === "document" && node.thumbnailUrl?.startsWith("asset://")) {
      const hash = node.thumbnailUrl.replace("asset://", "")
      const blob = await getAssetBlob(hash)
      if (blob) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        cloned[id] = {
          ...node,
          thumbnailUrl: dataUrl,
        }
      }
    }
  }

  return cloned
}

