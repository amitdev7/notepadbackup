import { getSupabaseBrowserClient } from "../supabase/client"

export async function getAssetSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.storage
    .from("zenithsui-assets")
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data) return null
  return data.signedUrl
}

export async function uploadThumbnail(documentId: string, blob: Blob): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const storagePath = `thumbnails/${documentId}.png`

  const { error } = await supabase.storage
    .from("zenithsui-thumbnails")
    .upload(storagePath, blob, {
      upsert: true,
      contentType: "image/png",
    })

  if (error) return null

  const { data } = supabase.storage
    .from("zenithsui-thumbnails")
    .getPublicUrl(storagePath)

  return data.publicUrl
}

