// ---------------------------------------------------------------------------
// Zenithsui Library Preview & Primitives Cache
//
// Eliminates opening lag and main-thread freezes by memoizing computed sketch
// primitives for all 168 library definitions. Once rendered, preview geometry
// is retained in memory for instant 0ms retrieval on subsequent opens.
// ---------------------------------------------------------------------------

import type { Prim } from "@/lib/sketch/kit"
import type { ComponentDef } from "./registry"

const PRIMS_CACHE = new Map<string, Prim[]>()

/**
 * Returns cached sketch primitives for a component definition using its default props,
 * generating and caching them on first call.
 */
export function getCachedComponentPrims(def: ComponentDef): Prim[] {
  let prims = PRIMS_CACHE.get(def.kind)
  if (!prims) {
    try {
      prims = def.render(def.defaults || {}, def.size.w, def.size.h)
    } catch (err) {
      console.warn(`[library-cache] Failed to render prims for ${def.kind}:`, err)
      prims = []
    }
    PRIMS_CACHE.set(def.kind, prims)
  }
  return prims
}

/**
 * Clears the preview cache (useful for hot reload or testing).
 */
export function clearComponentPrimsCache(): void {
  PRIMS_CACHE.clear()
}

/**
 * Returns cache size for diagnostics.
 */
export function getComponentPrimsCacheSize(): number {
  return PRIMS_CACHE.size
}

/**
 * Pre-warms the cache for a subset or all component definitions in chunks
 * during browser idle time so initial clicks on the Library icon are sub-millisecond.
 */
export function prewarmComponentPrims(defs: ComponentDef[], batchSize = 16): void {
  if (typeof window === "undefined") return

  let index = 0
  function processBatch() {
    const end = Math.min(index + batchSize, defs.length)
    for (let i = index; i < end; i++) {
      const def = defs[i]
      if (def && !PRIMS_CACHE.has(def.kind)) {
        getCachedComponentPrims(def)
      }
    }
    index = end
    if (index < defs.length) {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => processBatch())
      } else {
        setTimeout(processBatch, 16)
      }
    }
  }

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => processBatch())
  } else {
    setTimeout(processBatch, 32)
  }
}
