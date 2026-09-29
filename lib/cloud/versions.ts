// ---------------------------------------------------------------------------
// Zenithsui Document Version History Engine
// ---------------------------------------------------------------------------

import { getSupabaseBrowserClient } from "../supabase/client"
import type { DocumentVersionRecord, CanvasDocumentJson } from "../db/types"

export async function createVersionSnapshot(
  documentId: string,
  snapshot: CanvasDocumentJson,
  label?: string
): Promise<DocumentVersionRecord> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required to create version snapshot")

  // Count existing versions to increment version_number
  const { count } = await supabase
    .from("document_versions")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId)

  const nextVersionNumber = (count || 0) + 1

  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      version_number: nextVersionNumber,
      snapshot,
      label: label || `Version ${nextVersionNumber}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create snapshot")
  return data as unknown as DocumentVersionRecord
}

export async function listVersionSnapshots(documentId: string): Promise<DocumentVersionRecord[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })

  if (error || !data) return []
  return data as unknown as DocumentVersionRecord[]
}

export async function restoreVersionSnapshot(
  documentId: string,
  versionId: string
): Promise<CanvasDocumentJson> {
  const supabase = getSupabaseBrowserClient()
  const { data: version, error: versionErr } = await supabase
    .from("document_versions")
    .select("snapshot")
    .eq("id", versionId)
    .single()

  if (versionErr || !version) throw new Error("Version snapshot not found")

  const snapshot = version.snapshot as unknown as CanvasDocumentJson

  // Update current document to snapshot forward-stepping
  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      document_json: snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (updateErr) throw new Error(updateErr.message)

  return snapshot
}

