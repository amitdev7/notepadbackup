// ---------------------------------------------------------------------------
// Zenithsui — Durable Server-Side File & PDF Attachment Store
//
// Persists binary/dataUrl PDF files to disk (.zenithsui_data/attachments)
// with metadata, caching, and fallback support.
// ---------------------------------------------------------------------------

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"

const CWD_ATTACHMENTS_DIR = path.join(process.cwd(), ".zenithsui_data", "attachments")
const TMP_ATTACHMENTS_DIR = path.join(os.tmpdir(), ".zenithsui_data", "attachments")

function getWritableAttachmentsDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return TMP_ATTACHMENTS_DIR
  }
  return CWD_ATTACHMENTS_DIR
}

function ensureAttachmentsDir(): string {
  const dir = getWritableAttachmentsDir()
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (err) {
    console.warn("[Attachments] Failed to ensure directory:", err)
  }
  return dir
}

export interface StoredAttachmentMeta {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  uploadedAt: number
  dbId?: string
  fileId?: string
}

const memoryFallback = new Map<string, { buffer: Buffer; meta: StoredAttachmentMeta }>()

/**
 * Store an attachment (Buffer or base64 dataUrl) durably.
 */
export async function saveAttachment(
  id: string,
  data: Buffer | string,
  meta: Partial<StoredAttachmentMeta> = {}
): Promise<StoredAttachmentMeta> {
  const dir = ensureAttachmentsDir()
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_")
  const filePath = path.join(dir, `${safeId}.bin`)

  let buffer: Buffer
  let contentType = meta.contentType || "application/pdf"

  if (typeof data === "string") {
    if (data.startsWith("data:")) {
      const commaIdx = data.indexOf(",")
      const header = data.slice(0, commaIdx)
      const mimeMatch = header.match(/data:([^;]+)/)
      if (mimeMatch) contentType = mimeMatch[1]
      const base64Data = data.slice(commaIdx + 1)
      buffer = Buffer.from(base64Data, "base64")
    } else {
      buffer = Buffer.from(data, "base64")
    }
  } else {
    buffer = data
  }

  const completeMeta: StoredAttachmentMeta = {
    id: safeId,
    filename: meta.filename || `${safeId}.pdf`,
    contentType,
    sizeBytes: buffer.length,
    uploadedAt: Date.now(),
    dbId: meta.dbId,
    fileId: meta.fileId,
  }

  try {
    const tempPath = `${filePath}.${Date.now()}.tmp`
    fs.writeFileSync(tempPath, buffer)
    fs.renameSync(tempPath, filePath)
  } catch (err) {
    console.warn(`[Attachments] Write to ${filePath} failed, caching in memory fallback:`, err)
    memoryFallback.set(safeId, { buffer, meta: completeMeta })
  }

  // Update attachments registry
  try {
    const registry = readJsonSnapshot<Record<string, StoredAttachmentMeta>>("attachments_meta.json", {})
    registry[safeId] = completeMeta
    writeJsonSnapshot("attachments_meta.json", registry)
  } catch (err) {
    console.warn("[Attachments] Failed to update meta registry:", err)
  }

  return completeMeta
}

/**
 * Retrieve an attachment's buffer and metadata.
 */
export async function getAttachment(id: string): Promise<{ buffer: Buffer; meta: StoredAttachmentMeta } | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_")
  const dir = ensureAttachmentsDir()
  const filePath = path.join(dir, `${safeId}.bin`)

  // Check disk
  if (fs.existsSync(filePath)) {
    try {
      const buffer = fs.readFileSync(filePath)
      const registry = readJsonSnapshot<Record<string, StoredAttachmentMeta>>("attachments_meta.json", {})
      const meta = registry[safeId] || {
        id: safeId,
        filename: `${safeId}.pdf`,
        contentType: "application/pdf",
        sizeBytes: buffer.length,
        uploadedAt: Date.now(),
      }
      return { buffer, meta }
    } catch (err) {
      console.warn(`[Attachments] Failed to read ${filePath}:`, err)
    }
  }

  // Check memory fallback
  if (memoryFallback.has(safeId)) {
    return memoryFallback.get(safeId)!
  }

  return null
}

/**
 * Retrieve an attachment's dataUrl string.
 */
export async function getAttachmentDataUrl(id: string): Promise<string | null> {
  const att = await getAttachment(id)
  if (!att) return null
  const base64 = att.buffer.toString("base64")
  return `data:${att.meta.contentType || "application/pdf"};base64,${base64}`
}

/**
 * Retrieve an attachment's metadata only.
 */
export async function getAttachmentMeta(id: string): Promise<StoredAttachmentMeta | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_")
  try {
    const registry = readJsonSnapshot<Record<string, StoredAttachmentMeta>>("attachments_meta.json", {})
    if (registry[safeId]) {
      return registry[safeId]
    }
  } catch {
    // ignore
  }
  const att = await getAttachment(id)
  return att?.meta || null
}

/**
 * Delete one attachment by id — removes the .bin file, the memory fallback
 * entry, and the registry row. Safe to call when absent.
 */
export async function deleteAttachment(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_")
  let removed = false
  const dir = ensureAttachmentsDir()
  const filePath = path.join(dir, `${safeId}.bin`)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      removed = true
    }
  } catch (err) {
    console.warn(`[Attachments] Failed to unlink ${filePath}:`, err)
  }
  if (memoryFallback.delete(safeId)) removed = true
  try {
    const registry = readJsonSnapshot<Record<string, StoredAttachmentMeta>>("attachments_meta.json", {})
    if (registry[safeId]) {
      delete registry[safeId]
      writeJsonSnapshot("attachments_meta.json", registry)
      removed = true
    }
  } catch (err) {
    console.warn("[Attachments] Failed to prune meta registry:", err)
  }
  return removed
}

/**
 * Delete every attachment belonging to a deleted file: registry rows whose
 * dbId+fileId match, plus the legacy fallback entry keyed by the file id.
 */
export async function deleteAttachmentsForFile(dbId: string, fileId: string): Promise<number> {
  let count = 0
  try {
    const registry = readJsonSnapshot<Record<string, StoredAttachmentMeta>>("attachments_meta.json", {})
    const victims = Object.keys(registry).filter(
      (key) => registry[key]?.fileId === fileId && (!dbId || !registry[key]?.dbId || registry[key].dbId === dbId)
    )
    for (const key of victims) {
      if (await deleteAttachment(key)) count++
    }
  } catch (err) {
    console.warn("[Attachments] Failed to enumerate registry for cleanup:", err)
  }
  if (await deleteAttachment(fileId)) count++
  return count
}
