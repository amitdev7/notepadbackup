"use client"

// ---------------------------------------------------------------------------
// PDF Attachment Store — manages storage, caching, and downloading of PDF files.
// Handles local IndexedDB storage and remote database sync.
// ---------------------------------------------------------------------------

const DB_NAME = "zenithsui_attachments"
const STORE_NAME = "pdfs"
const DB_VERSION = 1

let idbPromise: Promise<IDBDatabase | null> | null = null

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null)
  }
  if (idbPromise) return idbPromise

  idbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        console.warn("Failed to open IndexedDB for attachments")
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
  return idbPromise
}

/** Store a PDF data URL or Blob locally and sync to server */
export async function storePdfAttachment(id: string, dataUrl: string, filename?: string): Promise<boolean> {
  // Sync to server storage for cross-device and persistent availability
  try {
    fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        dataUrl,
        filename: filename || `${id}.pdf`,
        contentType: "application/pdf",
      }),
    }).catch((err) => console.warn("[Attachments] Server sync warning:", err))
  } catch {
    // ignore
  }

  const db = await openIdb()
  if (!db) return true

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(dataUrl, id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

/** Retrieve a stored PDF attachment (from IndexedDB or server fallback) */
export async function getStoredPdfAttachment(id: string): Promise<string | null> {
  const db = await openIdb()
  if (db) {
    const local = await new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly")
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(id)
        req.onsuccess = () => resolve((req.result as string) || null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
    if (local) return local
  }

  // Fallback: fetch from server attachments endpoint
  try {
    const res = await fetch(`/api/attachments/${encodeURIComponent(id)}`)
    if (res.ok) {
      const blob = await res.blob()
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // Cache in IndexedDB for subsequent rapid loads
          if (db) {
            try {
              const tx = db.transaction(STORE_NAME, "readwrite")
              tx.objectStore(STORE_NAME).put(result, id)
            } catch {
              // ignore
            }
          }
          resolve(result)
        }
        reader.onerror = () => resolve(`/api/attachments/${encodeURIComponent(id)}`)
        reader.readAsDataURL(blob)
      })
    }
  } catch (err) {
    console.warn(`[Attachments] Failed to fetch attachment ${id} from server:`, err)
  }

  return null
}

/** Trigger download of the original attached PDF file */
export async function downloadOriginalPdf(src: string, attachmentId?: string, filename = "document.pdf"): Promise<void> {
  let downloadUrl = src

  if (attachmentId && !src.startsWith("data:")) {
    const cached = await getStoredPdfAttachment(attachmentId)
    if (cached) downloadUrl = cached
  }

  if (downloadUrl.startsWith("data:")) {
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    return
  }

  // Handle remote URL
  try {
    const res = await fetch(downloadUrl)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error("Failed to download PDF", err)
  }
}

/** Open original PDF in a new browser tab */
export async function openPdfInNewTab(src: string, attachmentId?: string): Promise<void> {
  let viewUrl = src

  if (attachmentId && !src.startsWith("data:")) {
    const cached = await getStoredPdfAttachment(attachmentId)
    if (cached) viewUrl = cached
  }

  if (viewUrl.startsWith("data:")) {
    const base64Index = viewUrl.indexOf(";base64,")
    if (base64Index !== -1) {
      const base64 = viewUrl.slice(base64Index + 8)
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: "application/pdf" })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank")
      return
    }
  }

  window.open(viewUrl, "_blank")
}
