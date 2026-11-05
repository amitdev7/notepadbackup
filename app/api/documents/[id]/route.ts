import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { validateIncomingDocumentPayload } from "@/lib/security/sanitize"
import { getSharedDocumentMemory, saveSharedDocumentMemory } from "@/lib/cloud/sharing"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { CanvasDocumentJson, Database } from "@/lib/db/types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // 1. Check memory store first
    const mem = getSharedDocumentMemory(id)
    if (mem) {
      return NextResponse.json({ ok: true, data: mem })
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient()
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("id", id)
          .is("deleted_at", null)
          .single()

        if (data && !error) {
          saveSharedDocumentMemory(data)
          return NextResponse.json({ ok: true, data })
        }
      } catch {
        // Fallback
      }
    }

    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_BODY", message: "Invalid JSON payload" } },
        { status: 400 }
      )
    }

    // Always update cross-request memory record
    const existing = getSharedDocumentMemory(id) || {
      id,
      name: body.name || "Untitled Canvas",
      document_json: { nodes: {}, order: [] },
      schema_version: 1,
      revision: 1,
    }

    const updatedDoc = {
      ...existing,
      name: body.name ?? existing.name,
      document_json: body.documentJson || body.document_json || existing.document_json,
      revision: (existing.revision || 1) + 1,
      updated_at: new Date().toISOString(),
    }
    saveSharedDocumentMemory(updatedDoc)

    let user: any = null
    try {
      const supabase = await getSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {}

    if (user && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient()
        const updates: Database["public"]["Tables"]["documents"]["Update"] = {
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }
        if (body.name) updates.name = body.name
        if (body.documentJson) updates.document_json = body.documentJson

        const { data: updatedRows } = await supabase
          .from("documents")
          .update(updates)
          .eq("id", id)
          .select("id")

        if (!updatedRows || updatedRows.length === 0) {
          // Document does not exist in Supabase yet — create it and assign ownership
          await supabase.from("documents").upsert({
            id,
            name: body.name || "Untitled Drawing",
            document_json: body.documentJson || body.document_json || { nodes: {}, order: [] },
            schema_version: 1,
            revision: 1,
            created_by: user.id,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" })

          await supabase.from("document_members").upsert({
            document_id: id,
            user_id: user.id,
            role: "owner",
            created_by: user.id,
          }, { onConflict: "document_id,user_id" })
        }
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ ok: true, data: updatedDoc })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    // Soft delete
    const { data, error } = await supabase
      .from("documents")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "DELETE_FAILED", message: error.message } },
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

