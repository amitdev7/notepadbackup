import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { saveSharedDocumentMemory } from "@/lib/cloud/sharing"
import type { CanvasDocumentJson } from "@/lib/db/types"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get("projectId")

    let query = supabase
      .from("documents")
      .select("id, project_id, name, schema_version, revision, created_by, updated_by, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })

    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "QUERY_FAILED", message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Untitled Drawing"
    const projectId = typeof body.projectId === "string" ? body.projectId : null
    const providedId = typeof body.id === "string" ? body.id : (typeof body.docId === "string" ? body.docId : null)
    const docId = providedId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const defaultJson: CanvasDocumentJson = body.document_json || body.documentJson || {
      nodes: {},
      order: [],
      look: { grid: false, theme: "paper" },
    }

    let user: any = null
    try {
      const supabase = await getSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Offline / guest mode
    }

    const userId = user ? user.id : `guest_${docId.slice(0, 8)}`

    const docRecord = {
      id: docId,
      name,
      project_id: projectId,
      document_json: defaultJson,
      schema_version: 1,
      revision: 1,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Always register in cross-request memory store
    saveSharedDocumentMemory(docRecord)

    // If authenticated and Supabase is configured, also persist to Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient()
        const { data, error } = await supabase
          .from("documents")
          .insert({
            name,
            project_id: projectId,
            document_json: defaultJson,
            schema_version: 1,
            revision: 1,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single()

        if (data && !error) {
          saveSharedDocumentMemory(data)
          await supabase.from("document_members").insert({
            document_id: data.id,
            user_id: user.id,
            role: "owner",
            created_by: user.id,
          })

          return NextResponse.json({ ok: true, data }, { status: 201 })
        }
      } catch {
        // Fallback to docRecord
      }
    }

    return NextResponse.json({ ok: true, data: docRecord }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

