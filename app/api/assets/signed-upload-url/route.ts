import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// POST /api/assets/signed-upload-url
//
// Hands an authenticated client a one-shot signed URL to upload an attachment
// straight into the private `zenithsui-assets` bucket, and registers the
// matching `assets` row. Bytes never pass through this function.
//
// Object keys are content addressed: "<userId>/<sha256>/<safe-name>". The same
// file attached twice (or a duplicated canvas node) resolves to the existing
// object and is not uploaded again.
// ---------------------------------------------------------------------------

const BUCKET = "zenithsui-assets"
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 // 50 MB — matches the bucket limit
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream",
])

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status })
}

/** A storage-safe, still human-readable file name. Never a path. */
function safeObjectName(raw: unknown): string {
  const base = String(raw ?? "")
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180)
  return base || "file"
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return fail(503, "CLOUD_DISABLED", "Cloud storage is not configured")
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return fail(401, "UNAUTHORIZED", "Authentication required")

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return fail(400, "BAD_REQUEST", "Invalid JSON")
  }

  const { filename, mimeType, sizeBytes, sha256, documentId, workspaceId } = body as {
    filename?: unknown
    mimeType?: unknown
    sizeBytes?: unknown
    sha256?: unknown
    documentId?: unknown
    workspaceId?: unknown
  }

  if (typeof filename !== "string" || typeof mimeType !== "string" || typeof sizeBytes !== "number") {
    return fail(400, "BAD_REQUEST", "Missing required metadata")
  }
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) {
    return fail(400, "BAD_REQUEST", "A SHA-256 content hash is required")
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return fail(400, "BAD_REQUEST", "Invalid file size")
  }
  if (sizeBytes > MAX_UPLOAD_SIZE) {
    return fail(413, "PAYLOAD_TOO_LARGE", "File exceeds the 50 MB cloud limit")
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return fail(415, "UNSUPPORTED_MEDIA_TYPE", "This file type can't be stored in the cloud")
  }
  const uuid = /^[0-9a-f-]{36}$/i
  if (documentId !== undefined && documentId !== null && (typeof documentId !== "string" || !uuid.test(documentId))) {
    return fail(400, "BAD_REQUEST", "Invalid document id")
  }
  if (workspaceId !== undefined && workspaceId !== null && (typeof workspaceId !== "string" || !uuid.test(workspaceId))) {
    return fail(400, "BAD_REQUEST", "Invalid workspace id")
  }

  const name = safeObjectName(filename)
  const storagePath = `${user.id}/${sha256}/${name}`

  // Already uploaded by this user? Reuse the object — no second upload.
  const { data: existing } = await supabase
    .from("assets")
    .select("id, storage_key")
    .eq("uploaded_by", user.id)
    .eq("sha256_hash", sha256)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const probe = await supabase.storage.from(BUCKET).createSignedUrl(existing.storage_key, 60)
    if (!probe.error && probe.data) {
      return NextResponse.json({
        ok: true,
        data: { assetId: existing.id, storagePath: existing.storage_key, alreadyUploaded: true },
      })
    }
  }

  // Resolve the workspace the row belongs to (RLS re-checks membership).
  let targetWorkspace = typeof workspaceId === "string" ? workspaceId : null
  if (!targetWorkspace) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    targetWorkspace = (ws as { id: string } | null)?.id ?? null
  }
  if (!targetWorkspace) return fail(409, "NO_WORKSPACE", "No workspace available for this account")

  const { data: signedData, error: storageError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true })
  if (storageError || !signedData) {
    return fail(502, "STORAGE_ERROR", "Cloud storage refused the upload")
  }

  let assetRowId = existing?.id ?? null
  if (!assetRowId) {
    const { data: assetRecord, error: dbError } = await supabase
      .from("assets")
      .insert({
        workspace_id: targetWorkspace,
        document_id: typeof documentId === "string" ? documentId : null,
        uploaded_by: user.id,
        file_name: name,
        file_size_bytes: sizeBytes,
        mime_type: mimeType,
        storage_key: storagePath,
        public_url: null,
        sha256_hash: sha256,
      })
      .select("id")
      .single()

    if (dbError || !assetRecord) {
      // unique storage_key: a concurrent request already registered it
      const { data: raced } = await supabase.from("assets").select("id").eq("storage_key", storagePath).maybeSingle()
      if (!raced) return fail(500, "DB_ERROR", "Could not register the attachment")
      assetRowId = (raced as { id: string }).id
    } else {
      assetRowId = (assetRecord as { id: string }).id
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      assetId: assetRowId,
      storagePath,
      token: signedData.token,
      alreadyUploaded: false,
    },
  })
}
