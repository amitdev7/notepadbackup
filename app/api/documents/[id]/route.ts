import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { validateIncomingDocumentPayload } from "@/lib/security/sanitize"
import type { CanvasDocumentJson } from "@/lib/db/types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Document not found or access denied" } },
        { status: 404 }
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

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_BODY", message: "Invalid JSON payload" } },
        { status: 400 }
      )
    }

    // 1. Fetch current document for OCC verification
    const { data: currentDoc, error: fetchErr } = await supabase
      .from("documents")
      .select("id, revision, schema_version, name, deleted_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (fetchErr || !currentDoc) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      )
    }

    // 2. OCC Check: If caller provided expected baseRevision, verify match
    if (typeof body.baseRevision === "number" && body.baseRevision !== currentDoc.revision) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "CONFLICT",
            message: `Conflict: Expected revision ${body.baseRevision}, but cloud revision is ${currentDoc.revision}`,
            cloudRevision: currentDoc.revision,
          },
        },
        { status: 409 }
      )
    }

    // 3. Build update fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
      revision: currentDoc.revision + 1,
    }

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim().slice(0, 120)
    }

    if (body.document_json) {
      const sanitized = validateIncomingDocumentPayload(body.document_json)
      if (!sanitized) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_DOCUMENT_PAYLOAD", message: "Malformed canvas payload" } },
          { status: 400 }
        )
      }
      const fullDocJson: CanvasDocumentJson = {
        nodes: sanitized.nodes,
        order: sanitized.order,
        look: body.document_json.look,
      }
      updates.document_json = fullDocJson
    }

    const { data: updatedDoc, error: updateErr } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: { code: "UPDATE_FAILED", message: updateErr.message } },
        { status: 500 }
      )
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

