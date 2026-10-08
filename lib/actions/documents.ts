"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { CanvasDocumentJson } from "@/lib/db/types"

export async function createDocumentAction(name: string, projectId?: string, workspaceId?: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  let targetWorkspaceId = workspaceId
  if (!targetWorkspaceId) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle()
    targetWorkspaceId = ws?.id
  }

  const defaultDoc: CanvasDocumentJson = {
    nodes: {},
    order: [],
    look: { grid: false, theme: "paper" },
  }

  const payload: any = {
    name: name || "Untitled Drawing",
    project_id: projectId || null,
    document_json: defaultDoc,
    schema_version: 1,
    revision: 1,
    created_by: user.id,
    updated_by: user.id,
  }
  if (targetWorkspaceId) {
    payload.workspace_id = targetWorkspaceId
  }

  const { data, error } = await supabase
    .from("documents")
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from("document_members").insert({
    document_id: data.id,
    user_id: user.id,
    role: "owner",
    created_by: user.id,
  })

  revalidatePath("/dashboard")
  return data
}

export async function renameDocumentAction(id: string, newName: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const { error } = await supabase
    .from("documents")
    .update({
      name: newName.trim().slice(0, 120),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  return { ok: true }
}

export async function deleteDocumentAction(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard")
  return { ok: true }
}

export async function duplicateDocumentAction(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Authentication required")

  const { data: original, error: fetchErr } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchErr || !original) throw new Error("Original document not found")

  const payload: any = {
    name: `${original.name} (Copy)`,
    project_id: original.project_id,
    document_json: original.document_json,
    schema_version: original.schema_version,
    revision: 1,
    created_by: user.id,
    updated_by: user.id,
  }
  if (original.workspace_id) {
    payload.workspace_id = original.workspace_id
  }

  const { data: copy, error: createErr } = await supabase
    .from("documents")
    .insert(payload)
    .select()
    .single()

  if (createErr) throw new Error(createErr.message)

  await supabase.from("document_members").insert({
    document_id: copy.id,
    user_id: user.id,
    role: "owner",
    created_by: user.id,
  })

  revalidatePath("/dashboard")
  return copy
}

