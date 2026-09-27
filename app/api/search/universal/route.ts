import { NextRequest, NextResponse } from "next/server"
import { listWorkspacesForUser, listBoardsInWorkspace, getBoardRecord } from "@/lib/server-workspaces"
import type { PageSearchResult } from "@/lib/search"

export const dynamic = "force-dynamic"

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const category = searchParams.get("category") || "all"
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const qLower = q.toLowerCase()
  const results: (PageSearchResult & { workspaceId?: string; boardId?: string })[] = []

  const workspaces = listWorkspacesForUser(userId)

  for (const ws of workspaces) {
    // 1. Workspace match
    if (category === "all" || category === "workspaces") {
      if (ws.name.toLowerCase().includes(qLower) || ws.description?.toLowerCase().includes(qLower)) {
        results.push({
          id: ws.id,
          name: ws.name,
          dbId: null,
          workspaceId: ws.id,
          kind: "page",
          matchField: "Workspace",
          snippet: ws.description || "Workspace",
          updatedAt: ws.updatedAt,
        })
      }
    }

    // 2. Boards match
    const boards = listBoardsInWorkspace(ws.id, userId)
    for (const b of boards) {
      if (category === "all" || category === "boards" || (category === "favorites" && b.isFavorite)) {
        if (b.name.toLowerCase().includes(qLower) || b.description?.toLowerCase().includes(qLower)) {
          results.push({
            id: b.id,
            name: b.name,
            dbId: null,
            workspaceId: ws.id,
            boardId: b.id,
            kind: "page",
            matchField: `${ws.name} • Board`,
            snippet: b.description || b.name,
            updatedAt: b.updatedAt,
          })
        }
      }

      // 3. Inspect board content (nodes, text, attachments)
      if (category === "all" || category === "text" || category === "attachments") {
        const fullBoard = getBoardRecord(ws.id, b.id)
        if (fullBoard?.nodes) {
          for (const node of Object.values(fullBoard.nodes)) {
            if (node.type === "text" && typeof node.text === "string" && node.text.toLowerCase().includes(qLower)) {
              results.push({
                id: b.id,
                name: b.name,
                dbId: null,
                workspaceId: ws.id,
                boardId: b.id,
                kind: "text",
                matchField: "Canvas Text",
                snippet: makeSnippet(node.text, q),
                updatedAt: b.updatedAt,
              })
              if (results.length > 50) break
            } else if (node.type === "pdf" && ((node as any).name?.toLowerCase().includes(qLower))) {
              results.push({
                id: b.id,
                name: (node as any).name || "PDF Document",
                dbId: null,
                workspaceId: ws.id,
                boardId: b.id,
                kind: "attachment",
                matchField: "PDF Document",
                snippet: (node as any).name,
                updatedAt: b.updatedAt,
              })
              if (results.length > 50) break
            } else if (node.type === "file" && (node.name?.toLowerCase().includes(qLower))) {
              results.push({
                id: b.id,
                name: node.name,
                dbId: null,
                workspaceId: ws.id,
                boardId: b.id,
                kind: "attachment",
                matchField: "File Attachment",
                snippet: node.name,
                updatedAt: b.updatedAt,
              })
              if (results.length > 50) break
            } else if (node.type === "component" && node.props) {
              for (const [k, v] of Object.entries(node.props)) {
                if (typeof v === "string" && v.toLowerCase().includes(qLower)) {
                  results.push({
                    id: b.id,
                    name: b.name,
                    dbId: null,
                    workspaceId: ws.id,
                    boardId: b.id,
                    kind: "component",
                    matchField: `${node.kind} (${k})`,
                    snippet: makeSnippet(v, q),
                    updatedAt: b.updatedAt,
                  })
                  break
                }
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 40) })
}
