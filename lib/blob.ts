import {
  put,
  del,
  list,
  head,
  type PutCommandOptions,
  type PutBlobResult,
  type ListBlobResult,
  type HeadBlobResult,
} from "@vercel/blob"

export { put, del, list, head }
export type { PutCommandOptions, PutBlobResult, ListBlobResult, HeadBlobResult }

/**
 * Uploads a file or string content directly to Vercel Blob Storage.
 *
 * @param pathname Target path inside the blob store (e.g. 'articles/blob.txt' or 'uploads/image.png')
 * @param body Content to upload (string, Buffer, Blob, or ReadableStream)
 * @param options Additional options (access defaults to 'public')
 * @returns Result object containing `url`, `downloadUrl`, `pathname`, and `contentType`
 */
export async function uploadToBlob(
  pathname: string,
  body: Parameters<typeof put>[1],
  options: Partial<PutCommandOptions> & { allowOverwrite?: boolean } = {}
): Promise<PutBlobResult> {
  const token = options.token || process.env.BLOB_READ_WRITE_TOKEN

  return await put(pathname, body, {
    access: "public",
    token,
    allowOverwrite: options.allowOverwrite ?? true,
    ...options,
  })
}

/**
 * Deletes one or more files from Vercel Blob Storage by URL.
 */
export async function deleteFromBlob(
  urlOrUrls: string | string[],
  options?: { token?: string }
): Promise<void> {
  const token = options?.token || process.env.BLOB_READ_WRITE_TOKEN
  await del(urlOrUrls, { token })
}

/**
 * Lists blobs in the Vercel Blob store.
 */
export async function listStoredBlobs(options?: {
  limit?: number
  prefix?: string
  cursor?: string
  token?: string
}): Promise<ListBlobResult> {
  const token = options?.token || process.env.BLOB_READ_WRITE_TOKEN
  return await list({
    token,
    ...options,
  })
}
