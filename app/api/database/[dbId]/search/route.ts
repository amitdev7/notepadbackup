import { NextRequest, NextResponse } from "next/server"
import { listSupabaseFiles, getRawSupabaseDoc } from "@/lib/supabase-server"
import { getStore, getRawDoc, type ServerStoredDoc } from "@/lib/server-documents"
import { checkDatabaseAccess } from "@/lib/database-auth"

export const dynamic = "force-dynamic"

export interface SearchResultItem {
  id: string
  name: string
  dbId: string
  kind: "page" | "text" | "component" | "attachment"
  matchField: string
  snippet: string
  updatedAt: number
  hasPassword?: boolean
}

/**
 * Extract searchable strings from arbitrary node props
 */
function extractNodeText(node: Record<string, unknown>): { text: string; kind: "text" | "component" | "attachment"; label?: string }[] {
  const results: { text: string; kind: "text" | "component" | "attachment"; label?: string }[] = []
  if (!node || typeof node !== "object") return results

  const nodeType = node.type as string

  if (nodeType === "text" && typeof node.text === "string" && node.text.trim()) {
    results.push({ text: node.text, kind: "text", label: "Text Layer" })
  }

  if (nodeType === "component") {
    const kind = typeof node.kind === "string" ? node.kind : "component"
    const props = (node.props && typeof node.props === "object" ? node.props : {}) as Record<string, unknown>
    
    // Check common prop fields
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
  }

  if (nodeType === "image" && typeof node.src === "string") {
    results.push({ text: "Image Layer", kind: "component", label: "Image" })
  }

  return results
}

/**
 * Create a contextual snippet around a matched substring
 */
function createSnippet(content: string, query: string, maxLength = 100): string {
  const lower = content.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) {
    return content.length > maxLength ? content.slice(0, maxLength) + "…" : content
  }

  const start = Math.max(0, idx - 30)
  const end = Math.min(content.length, idx + query.length + 50)
  let snippet = content.slice(start, end).replace(/\r?\n/g, " ")
  if (start > 0) snippet = "…" + snippet
  if (end < content.length) snippet = snippet + "…"
  return snippet
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const url = new URL(req.url)
  const query = (url.searchParams.get("q") || "").trim().toLowerCase()
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  // Authorization check: User must have at least viewer access to search the database
  const access = checkDatabaseAccess(dbId, userId, "viewer")
  if (!access.allowed) {
    return NextResponse.json({ error: "Access denied to database." }, { status: 403 })
  }

  if (!query) {
    return NextResponse.json({ dbId, query: "", results: [] })
  }

  const results: SearchResultItem[] = []

  // Load all documents in dbId
  let docs: ServerStoredDoc[] = []

  if (dbId === "nezukos-box") {
    const fileMetas = await listSupabaseFiles()
    // Bounded concurrency — sequential awaits blow past the serverless budget.
    const CONCURRENCY = 10
    for (let i = 0; i < fileMetas.length; i += CONCURRENCY) {
      const batch = await Promise.all(
        fileMetas.slice(i, i + CONCURRENCY).map((meta) => getRawSupabaseDoc(meta.id).catch(() => null))
      )
      for (const raw of batch) if (raw) docs.push(raw)
    }
  } else {
    const store = getStore(dbId)
    docs = Array.from(store.values())
  }

  for (const doc of docs) {
    const docName = doc.name || "Untitled"
    const docNameLower = docName.toLowerCase()
    let matchedDoc = false

    // 1. Check Document / Page Name match
    if (docNameLower.includes(query)) {
      results.push({
        id: doc.id,
        name: docName,
        dbId,
        kind: "page",
        matchField: "Page Title",
        snippet: docName,
        updatedAt: doc.updatedAt || Date.now(),
        hasPassword: !!doc.passwordHash || !!doc.hasPassword,
      })
      matchedDoc = true
    }

    // 2. Check Nodes (Text, Component props, Attachments)
    const nodes = (doc.nodes || {}) as Record<string, Record<string, unknown>>
    for (const node of Object.values(nodes)) {
      const items = extractNodeText(node)
      for (const item of items) {
        if (item.text.toLowerCase().includes(query)) {
          results.push({
            id: doc.id,
            name: docName,
            dbId,
            kind: item.kind,
            matchField: item.label || "Document Content",
            snippet: createSnippet(item.text, query),
            updatedAt: doc.updatedAt || Date.now(),
            hasPassword: !!doc.passwordHash || !!doc.hasPassword,
          })
          // Limit matches per document to avoid flooding
          if (results.length > 50) break
        }
      }
      if (results.length > 50) break
    }
  }

  // Deduplicate and rank: exact page title match first, then content matches
  const ranked = results.sort((a, b) => {
    if (a.kind === "page" && b.kind !== "page") return -1
    if (a.kind !== "page" && b.kind === "page") return 1
    return b.updatedAt - a.updatedAt
  })

  return NextResponse.json({
    dbId,
    query,
    results: ranked.slice(0, 30),
  })
}
