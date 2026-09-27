"use client"

// ---------------------------------------------------------------------------
// Search across pages and files (local + server-indexed database search).
//
// Matches:
//   - Page / File titles
//   - Text node strings
//   - Component properties (labels, titles, descriptions, buttons, etc.)
//   - Attachments (PDF document names, image labels)
// ---------------------------------------------------------------------------

import { listFiles, readFile } from "./files"
import { getClientSessionId } from "./database"
import type { SquigNode } from "./types"

export interface PageSearchResult {
  id: string
  name: string
  dbId: string | null
  kind: "page" | "text" | "component" | "attachment"
  matchField: string
  snippet: string
  updatedAt: number
  hasPassword?: boolean
}

/**
 * Extract searchable strings from arbitrary local node
 */
function extractLocalNodeContent(node: SquigNode): { text: string; kind: "text" | "component" | "attachment"; label: string }[] {
  const results: { text: string; kind: "text" | "component" | "attachment"; label: string }[] = []
  if (!node) return results

  if (node.type === "text" && typeof node.text === "string" && node.text.trim()) {
    results.push({ text: node.text, kind: "text", label: "Text Layer" })
  } else if (node.type === "component") {
    const kind = node.kind || "component"
    const props = node.props || {}
    for (const [key, val] of Object.entries(props)) {
      if (typeof val === "string" && val.trim()) {
        const isAttachment = key === "fileName" || key === "pdfSrc" || key === "src" || kind === "pdf"
        results.push({
          text: val,
          kind: isAttachment ? "attachment" : "component",
          label: `${kind} (${key})`,
        })
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string" && item.trim()) {
            results.push({ text: item, kind: "component", label: `${kind} item` })
          } else if (item && typeof item === "object") {
            for (const [subKey, subVal] of Object.entries(item as Record<string, unknown>)) {
              if (typeof subVal === "string" && subVal.trim()) {
                results.push({ text: subVal, kind: "component", label: `${kind} (${subKey})` })
              }
            }
          }
        }
      }
    }
  } else if (node.type === "image") {
    results.push({ text: "Image Layer", kind: "component", label: "Image" })
  }

  return results
}

function makeSnippet(content: string, query: string, maxLength = 80): string {
  const lower = content.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) {
    return content.length > maxLength ? content.slice(0, maxLength) + "…" : content
  }
  const start = Math.max(0, idx - 20)
  const end = Math.min(content.length, idx + query.length + 40)
  let snippet = content.slice(start, end).replace(/\r?\n/g, " ")
  if (start > 0) snippet = "…" + snippet
  if (end < content.length) snippet = snippet + "…"
  return snippet
}

/**
 * Search local files stored in browser storage
 */
export function searchLocalPages(query: string): PageSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const files = listFiles()
  const results: PageSearchResult[] = []

  for (const meta of files) {
    const nameLower = meta.name.toLowerCase()

    // 1. Page Title match
    if (nameLower.includes(q)) {
      results.push({
        id: meta.id,
        name: meta.name,
        dbId: null,
        kind: "page",
        matchField: "Page Title",
        snippet: meta.name,
        updatedAt: meta.updatedAt,
      })
    }

    // 2. Inspect document content in localStorage
    const doc = readFile(meta.id)
    if (doc && doc.nodes) {
      for (const node of Object.values(doc.nodes)) {
        const items = extractLocalNodeContent(node)
        for (const item of items) {
          if (item.text.toLowerCase().includes(q)) {
            results.push({
              id: meta.id,
              name: meta.name,
              dbId: null,
              kind: item.kind,
              matchField: item.label,
              snippet: makeSnippet(item.text, q),
              updatedAt: meta.updatedAt,
            })
            if (results.length > 40) break
          }
        }
        if (results.length > 40) break
      }
    }
  }

  return results.sort((a, b) => {
    if (a.kind === "page" && b.kind !== "page") return -1
    if (a.kind !== "page" && b.kind === "page") return 1
    return b.updatedAt - a.updatedAt
  })
}

/**
 * Search pages across connected server database
 */
export async function searchDatabasePages(dbId: string, query: string): Promise<PageSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  try {
    const clientId = getClientSessionId()
    const res = await fetch(`/api/database/${encodeURIComponent(dbId)}/search?q=${encodeURIComponent(q)}`, {
      headers: {
        "x-session-id": clientId,
      },
    })
    if (!res.ok) {
      return []
    }
    const data = await res.json()
    return (data.results || []) as PageSearchResult[]
  } catch (err) {
    console.warn("[Search] Error querying database:", err)
    return []
  }
}

/**
 * Unified search dispatcher for current active database, workspaces, boards, and local storage
 */
export async function searchAcrossPages(
  selectedDbId: string | null,
  query: string,
  category = "all"
): Promise<PageSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  try {
    const local = searchLocalPages(q)
    const res = await fetch(`/api/search/universal?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`, {
      headers: { "x-session-id": getClientSessionId() },
    })
    const universalData = res.ok ? await res.json() : { results: [] }
    const universal: PageSearchResult[] = universalData.results || []

    const combined = [...universal, ...local]
    const seen = new Set<string>()
    return combined.filter((item) => {
      const key = `${item.id}-${item.matchField}-${item.snippet}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch {
    return searchLocalPages(q)
  }
}
