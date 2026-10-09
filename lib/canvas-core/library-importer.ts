// ---------------------------------------------------------------------------
// Excalidraw Library (.excalidrawlib) Importer
// Parses Excalidraw library files and translates them into ready-to-insert items
// ---------------------------------------------------------------------------

import type { ExcalidrawLibraryDoc, ExcalidrawLibraryItem } from "./types"
import { excalidrawToSquigNodes } from "./convert"
import type { SquigNode } from "@/lib/types"

export interface ImportedLibraryAsset {
  id: string
  name: string
  nodes: SquigNode[]
  width: number
  height: number
}

/** Check if unknown JSON is an Excalidraw Library document */
export function isExcalidrawLibrary(data: unknown): data is ExcalidrawLibraryDoc {
  if (!data || typeof data !== "object") return false
  const doc = data as Record<string, unknown>
  return (
    doc.type === "excalidrawlib" ||
    Array.isArray(doc.libraryItems) ||
    (Array.isArray(doc.library) && doc.library.length > 0)
  )
}

/**
 * Parses an .excalidrawlib JSON string into an array of insertable library assets.
 */
export function parseExcalidrawLibrary(jsonText: string): ImportedLibraryAsset[] {
  try {
    const raw = JSON.parse(jsonText)
    const items: ExcalidrawLibraryItem[] =
      raw.libraryItems ||
      (Array.isArray(raw.library)
        ? raw.library.map((elements: any, idx: number) => ({
          id: `lib_${idx}`,
          status: "published",
          elements: Array.isArray(elements) ? elements : [elements],
        }))
        : [])

    const results: ImportedLibraryAsset[] = []

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      if (!item.elements || !item.elements.length) continue

      const { nodes, order } = excalidrawToSquigNodes(item.elements)
      const nodeList = order.map((id) => nodes[id]).filter(Boolean)
      if (!nodeList.length) continue

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const n of nodeList) {
        minX = Math.min(minX, n.x)
        minY = Math.min(minY, n.y)
        maxX = Math.max(maxX, n.x + n.w)
        maxY = Math.max(maxY, n.y + n.h)
      }

      // Normalize coordinates so top-left is 0,0
      const width = Math.max(10, maxX - minX)
      const height = Math.max(10, maxY - minY)

      const normalizedNodes = nodeList.map((n) => ({
        ...n,
        x: n.x - minX,
        y: n.y - minY,
      }))

      results.push({
        id: item.id || `lib_item_${idx}`,
        name: item.name || `Library Item ${idx + 1}`,
        nodes: normalizedNodes,
        width,
        height,
      })
    }

    return results
  } catch (err) {
    console.error("[excalidraw-library] Parse error:", err)
    return []
  }
}
