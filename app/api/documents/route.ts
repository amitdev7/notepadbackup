import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
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
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Untitled Drawing"
    const projectId = typeof body.projectId === "string" ? body.projectId : null

    const defaultJson: CanvasDocumentJson = body.document_json || {
      nodes: {},
      order: [],
      look: { grid: false, theme: "paper" },
    }

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

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "INSERT_FAILED", message: error.message } },
        { status: 500 }
      )
    }

    // Assign owner in document_members
    await supabase.from("document_members").insert({
      document_id: data.id,
      user_id: user.id,
      role: "owner",
      created_by: user.id,
    })

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

