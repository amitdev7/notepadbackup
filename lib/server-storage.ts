// ---------------------------------------------------------------------------
// Zenithsui — Durable Server-Side File-System Storage Persistence Layer
// ---------------------------------------------------------------------------

import fs from "node:fs"
import path from "node:path"

const CWD_DATA_DIR = path.join(process.cwd(), ".zenithsui_data")
const TMP_DATA_DIR = path.join("/tmp", ".zenithsui_data")

// Determine the preferred writable directory (use /tmp on Vercel or read-only serverless runtimes)
function getWritableDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return TMP_DATA_DIR
  }
  return CWD_DATA_DIR
}

function ensureDataDir(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  } catch (err) {
    console.warn(`[Storage] Warning: Failed to ensure directory ${dirPath}:`, err)
  }
}

/**
 * Read persistent JSON snapshot from disk with error safety and Vercel fallback.
 */
export function readJsonSnapshot<T>(filename: string, defaultValue: T): T {
  try {
    const preferredDir = getWritableDataDir()
    ensureDataDir(preferredDir)
    const filePath = path.join(preferredDir, filename)

    // Check preferred directory first
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8")
      if (raw.trim()) {
        return JSON.parse(raw) as T
      }
    }

    // Check project root storage (.zenithsui_data) if not preferred
    if (preferredDir !== CWD_DATA_DIR) {
      const seedPath = path.join(CWD_DATA_DIR, filename)
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, "utf-8")
        if (raw.trim()) {
          return JSON.parse(raw) as T
        }
      }
    }

    // Check tmp directory (/tmp/.zenithsui_data) as secondary fallback
    if (preferredDir !== TMP_DATA_DIR) {
      const tmpPath = path.join(TMP_DATA_DIR, filename)
      if (fs.existsSync(tmpPath)) {
        const raw = fs.readFileSync(tmpPath, "utf-8")
        if (raw.trim()) {
          return JSON.parse(raw) as T
        }
      }
    }

    return defaultValue
  } catch (err) {
    console.warn(`[Storage] Warning: Failed to read ${filename}:`, err)
    return defaultValue
  }
}

/**
 * Write persistent JSON snapshot to disk with atomic write behavior and read-only fallback.
 */
export function writeJsonSnapshot<T>(filename: string, data: T): void {
  const preferredDir = getWritableDataDir()
  try {
    ensureDataDir(preferredDir)
    const filePath = path.join(preferredDir, filename)
    const tempPath = `${filePath}.${Date.now()}.tmp`
    const content = JSON.stringify(data, null, 2)
    fs.writeFileSync(tempPath, content, "utf-8")
    fs.renameSync(tempPath, filePath)
  } catch (err: any) {
    // If writing to process.cwd() fails (e.g. EROFS on Vercel), fall back to /tmp
    if (preferredDir !== TMP_DATA_DIR) {
      try {
        ensureDataDir(TMP_DATA_DIR)
        const fallbackPath = path.join(TMP_DATA_DIR, filename)
        const tempFallback = `${fallbackPath}.${Date.now()}.tmp`
        fs.writeFileSync(tempFallback, JSON.stringify(data, null, 2), "utf-8")
        fs.renameSync(tempFallback, fallbackPath)
        return
      } catch (fallbackErr) {
        console.warn(`[Storage] Warning: Fallback write to /tmp failed for ${filename}:`, fallbackErr)
      }
    }
    console.warn(`[Storage] Warning: Failed to persist ${filename}:`, err)
  }
}
