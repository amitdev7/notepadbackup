import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    )
  }

  try {
    const { filename, mimeType, sizeBytes, documentId, workspaceId } = await request.json()

    if (!filename || !mimeType || typeof sizeBytes !== "number") {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Missing required metadata" } },
        { status: 400 }
      )
    }

    if (sizeBytes > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "File exceeds 10MB limit" } },
        { status: 413 }
      )
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Allowed formats: PNG, JPEG, WebP, GIF, SVG" } },
        { status: 415 }
      )
    }

    const ext = filename.split(".").pop() || "bin"
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    // Create signed upload URL from Supabase Storage
    const { data: signedData, error: storageError } = await supabase.storage
      .from("zenithsui-assets")
      .createSignedUploadUrl(storagePath)

    if (storageError) {
      return NextResponse.json(
        { ok: false, error: { code: "STORAGE_ERROR", message: storageError.message } },
        { status: 500 }
      )
    }

    // Insert database record
    const { data: assetRecord, error: dbError } = await supabase
      .from("assets")
      .insert({
        workspace_id: workspaceId || null,
        document_id: documentId || null,
        uploaded_by: user.id,
        filename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { ok: false, error: { code: "DB_ERROR", message: dbError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: {
        assetId: assetRecord.id,
        storagePath,
        signedUrl: signedData.signedUrl,
        token: signedData.token,
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }
}

