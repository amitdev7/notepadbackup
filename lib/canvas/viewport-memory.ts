"use client"

// ---------------------------------------------------------------------------
// Zenithsui Viewport Memory & Custom Canvas Home View Engine
//
// Persistent, per-document viewport memory architecture:
// - Remembers last visited position & zoom level independently per document
// - Manages permanent custom Home View starting positions
// - Supports "Remember Last View", "Custom Home View", and "Fit All Content"
// - Decoupled from document artwork mutations, undo/redo history, and cloud sync
// - Debounced high-performance writes (500ms) with flush on gesture finish,
//   document switch, visibility change, and beforeunload
// - Local-first IndexedDB persistence with localStorage instant hydration
// ---------------------------------------------------------------------------

import type { CanvasOpenMode, CanvasViewport, DocumentViewState, SquigNode } from "../types"
import { isValidViewport, sanitizeViewport, sanitizeViewState, unionBox, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM } from "../types"
import { openZenithsuiDb, STORES, withTransaction } from "../storage/db"
import { getLocalDocument, saveLocalDocument } from "../storage/documents"

export const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 }
export const FIT_PADDING = 96
export const VIEWPORT_SAVE_DEBOUNCE_MS = 500
export const STORAGE_KEY_PREFIX = "zenithsui:viewport:"

const viewStateCache = new Map<string, DocumentViewState>()

let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null
let pendingDocId: string | null = null
let pendingViewport: CanvasViewport | null = null

export function getDefaultViewState(): DocumentViewState {
  return {
    lastView: null,
    homeView: null,
    openMode: "last-view",
    updatedAt: Date.now(),
  }
}

/** Check if two viewports match within close floating-point visual tolerance */
export function areViewportsEqual(
  a: CanvasViewport | null | undefined,
  b: CanvasViewport | null | undefined,
  posTolerance = 2,
  zoomTolerance = 0.01
): boolean {
  if (!a || !b) return false
  return (
    Math.abs(a.x - b.x) <= posTolerance &&
    Math.abs(a.y - b.y) <= posTolerance &&
    Math.abs(a.zoom - b.zoom) <= zoomTolerance
  )
}

/** Synchronous local storage read */
function readLocalStorageViewState(docId: string): DocumentViewState | null {
  if (typeof window === "undefined" || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${docId}`)
    if (!raw) return null
    return sanitizeViewState(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Synchronous local storage write */
function writeLocalStorageViewState(docId: string, state: DocumentViewState): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${docId}`, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** Remove from local storage */
function dropLocalStorageViewState(docId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${docId}`)
  } catch {
    // ignore
  }
}

/**
 * Synchronous get: reads from in-memory cache, then localStorage, or returns default.
 * Provides 0ms instant startup without layout flash.
 */
export function getViewState(docId: string): DocumentViewState {
  if (!docId) return getDefaultViewState()

  const cached = viewStateCache.get(docId)
  if (cached) return cached

  const fromStorage = readLocalStorageViewState(docId)
  if (fromStorage) {
    viewStateCache.set(docId, fromStorage)
    return fromStorage
  }

  const def = getDefaultViewState()
  viewStateCache.set(docId, def)
  return def
}

/**
 * Asynchronously loads viewState from IndexedDB (zenithsui-db v1) and reconciles with cache.
 */
export async function loadViewStateAsync(docId: string): Promise<DocumentViewState> {
  const current = getViewState(docId)
  if (typeof window === "undefined" || !docId) return current

  try {
    const db = await openZenithsuiDb()
    const fromIdb = await new Promise<DocumentViewState | null>((resolve) => {
      try {
        const tx = db.transaction(STORES.APP_STATE, "readonly")
        const store = tx.objectStore(STORES.APP_STATE)
        const req = store.get(`viewport:${docId}`)
        req.onsuccess = () => {
          if (req.result?.value) {
            resolve(sanitizeViewState(req.result.value))
          } else {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })

    if (fromIdb) {
      if (!current.updatedAt || fromIdb.updatedAt >= current.updatedAt) {
        viewStateCache.set(docId, fromIdb)
        writeLocalStorageViewState(docId, fromIdb)
        return fromIdb
      }
    } else {
      // Check document store as fallback
      const storedLocal = await getLocalDocument(docId)
      if (storedLocal?.viewState) {
        const docVs = sanitizeViewState(storedLocal.viewState)
        viewStateCache.set(docId, docVs)
        writeLocalStorageViewState(docId, docVs)
        return docVs
      }
    }
  } catch (err) {
    console.warn("[viewport-memory] IndexedDB load error:", err)
  }

  return current
}

/**
 * Persists viewState to memory cache, localStorage, and IndexedDB immediately.
 * Does not mutate canvas elements, undo history, or trigger cloud sync.
 */
export async function saveViewState(docId: string, state: DocumentViewState): Promise<void> {
  if (!docId) return
  const clean = sanitizeViewState(state)
  viewStateCache.set(docId, clean)
  writeLocalStorageViewState(docId, clean)

  if (typeof window === "undefined") return

  try {
    await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
      tx.objectStore(STORES.APP_STATE).put({
        key: `viewport:${docId}`,
        value: clean,
        updatedAt: clean.updatedAt,
      })
    })

    // Also update StoredLocalDoc.viewState in IndexedDB if document exists
    const localDoc = await getLocalDocument(docId)
    if (localDoc) {
      localDoc.viewState = clean
      await saveLocalDocument(localDoc)
    }
  } catch (err) {
    console.warn("[viewport-memory] IndexedDB save error:", err)
  }
}

/**
 * Schedules a debounced save of the Last View for the given document.
 * Avoids disk I/O on every raw mouse event or frame during pan/zoom gestures.
 */
export function scheduleSaveViewport(docId: string, viewport: CanvasViewport): void {
  if (!docId || !isValidViewport(viewport)) return

  const cleanVp = sanitizeViewport(viewport)
  if (!cleanVp) return

  // Update in-memory cache immediately for responsiveness
  const current = getViewState(docId)
  current.lastView = cleanVp
  current.updatedAt = Date.now()
  viewStateCache.set(docId, current)

  pendingDocId = docId
  pendingViewport = cleanVp

  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
  }

  pendingSaveTimer = setTimeout(() => {
    flushPendingViewportSave()
  }, VIEWPORT_SAVE_DEBOUNCE_MS)
}

/**
 * Flushes any pending debounced viewport save immediately.
 * Called on gesture finish, beforeunload, pagehide, and document switch.
 */
export function flushPendingViewportSave(): void {
  if (pendingSaveTimer) {
    clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
  }

  if (pendingDocId && pendingViewport) {
    const id = pendingDocId
    const vp = pendingViewport
    pendingDocId = null
    pendingViewport = null

    const current = getViewState(id)
    current.lastView = vp
    current.updatedAt = Date.now()
    saveViewState(id, current).catch(() => {})
  }
}

/** Save currently active viewport as Home View */
export async function setHomeView(docId: string, viewport: CanvasViewport): Promise<DocumentViewState> {
  flushPendingViewportSave()
  const current = getViewState(docId)
  const cleanVp = sanitizeViewport(viewport)
  const updated: DocumentViewState = {
    ...current,
    homeView: cleanVp,
    updatedAt: Date.now(),
  }
  await saveViewState(docId, updated)
  return updated
}

/** Remove saved Home View */
export async function clearHomeView(docId: string): Promise<DocumentViewState> {
  flushPendingViewportSave()
  const current = getViewState(docId)
  const updated: DocumentViewState = {
    ...current,
    homeView: null,
    // Gracefully fall back to last-view if home-view was active
    openMode: current.openMode === "home-view" ? "last-view" : current.openMode,
    updatedAt: Date.now(),
  }
  await saveViewState(docId, updated)
  return updated
}

/** Update document opening mode */
export async function setOpenMode(docId: string, mode: CanvasOpenMode): Promise<DocumentViewState> {
  flushPendingViewportSave()
  const current = getViewState(docId)
  const updated: DocumentViewState = {
    ...current,
    openMode: mode,
    updatedAt: Date.now(),
  }
  await saveViewState(docId, updated)
  return updated
}

/** Permanently remove viewport state when a document is permanently deleted */
export async function deleteViewState(docId: string): Promise<void> {
  if (pendingDocId === docId) {
    if (pendingSaveTimer) clearTimeout(pendingSaveTimer)
    pendingSaveTimer = null
    pendingDocId = null
    pendingViewport = null
  }
  viewStateCache.delete(docId)
  dropLocalStorageViewState(docId)

  if (typeof window !== "undefined") {
    try {
      await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
        tx.objectStore(STORES.APP_STATE).delete(`viewport:${docId}`)
      })
    } catch {
      // ignore
    }
  }
}

/**
 * Computes a fit-to-content viewport framing all elements with padding.
 * Pure and testable across node and browser environments.
 */
export function computeFitViewport(
  nodes: SquigNode[],
  vw?: number,
  vh?: number,
  cap = 1,
  padding = FIT_PADDING
): CanvasViewport | null {
  const box = unionBox(nodes)
  if (!box) return null

  const width = vw ?? (typeof window !== "undefined" ? window.innerWidth : 1920)
  const height = vh ?? (typeof window !== "undefined" ? window.innerHeight : 1080)

  const bw = Math.max(box.maxX - box.minX, 1)
  const bh = Math.max(box.maxY - box.minY, 1)

  const rawZoom = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh)
  const zoom = Math.min(cap, Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, rawZoom)))

  return {
    zoom: Number(zoom.toFixed(4)),
    x: Number((width / 2 - (box.minX + bw / 2) * zoom).toFixed(2)),
    y: Number((height / 2 - (box.minY + bh / 2) * zoom).toFixed(2)),
  }
}

export interface ResolvedViewport {
  viewport: CanvasViewport
  resolvedFrom: CanvasOpenMode | "default"
  isFirstOpenFit?: boolean
}

/**
 * Resolves the starting viewport for a document based on its configured opening mode,
 * saved Home View, saved Last View, and fallback fit logic.
 */
export function resolveOpeningViewport(
  docId: string,
  nodes: SquigNode[],
  vw?: number,
  vh?: number
): ResolvedViewport {
  const state = getViewState(docId)
  const mode = state.openMode || "last-view"

  // 1. Custom Home View Mode
  if (mode === "home-view") {
    if (state.homeView && isValidViewport(state.homeView)) {
      return {
        viewport: sanitizeViewport(state.homeView)!,
        resolvedFrom: "home-view",
      }
    }
    // Graceful fallback to Last View
    if (state.lastView && isValidViewport(state.lastView)) {
      return {
        viewport: sanitizeViewport(state.lastView)!,
        resolvedFrom: "last-view",
      }
    }
    // Graceful fallback to Fit Content
    if (nodes.length > 0) {
      const fitted = computeFitViewport(nodes, vw, vh, 1)
      if (fitted) {
        return { viewport: fitted, resolvedFrom: "fit-content" }
      }
    }
    return { viewport: DEFAULT_VIEWPORT, resolvedFrom: "default" }
  }

  // 2. Remember Last View Mode (Default)
  if (mode === "last-view") {
    if (state.lastView && isValidViewport(state.lastView)) {
      return {
        viewport: sanitizeViewport(state.lastView)!,
        resolvedFrom: "last-view",
      }
    }
    // First time opening a legacy document or new document with existing content
    if (nodes.length > 0) {
      const fitted = computeFitViewport(nodes, vw, vh, 1)
      if (fitted) {
        return {
          viewport: fitted,
          resolvedFrom: "fit-content",
          isFirstOpenFit: true,
        }
      }
    }
    return { viewport: DEFAULT_VIEWPORT, resolvedFrom: "default" }
  }

  // 3. Fit All Content Mode
  if (mode === "fit-content") {
    if (nodes.length > 0) {
      const fitted = computeFitViewport(nodes, vw, vh, 1)
      if (fitted) {
        return { viewport: fitted, resolvedFrom: "fit-content" }
      }
    }
    return { viewport: DEFAULT_VIEWPORT, resolvedFrom: "default" }
  }

  return { viewport: DEFAULT_VIEWPORT, resolvedFrom: "default" }
}
