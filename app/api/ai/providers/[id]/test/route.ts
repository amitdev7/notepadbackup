// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/providers/[id]/test Endpoint (Live Provider Health Check)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import { getEffectiveUserId } from "@/lib/server-auth"
import type { AIProviderId } from "@/lib/ai/types"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getEffectiveUserId(req)

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { apiKey, customEndpoint, modelId } = body

    // id might be a credential ID (e.g. `cred_gemini_xyz`) or a provider ID (e.g. `gemini` or `prov_gemini`)
    let providerId: AIProviderId | undefined
    if (id.startsWith("prov_")) {
      providerId = id.replace("prov_", "") as AIProviderId
    } else if (id.startsWith("cred_")) {
      const cred = ProviderCredentialService.getCredentialById(id, userId)
      if (cred) providerId = cred.providerId
    } else {
      providerId = id as AIProviderId
    }

    if (!providerId) {
      return NextResponse.json({ error: "Invalid provider identifier." }, { status: 400 })
    }

    const testRes = await ProviderCredentialService.testConnection({
      providerId,
      apiKey,
      customEndpoint,
      modelId,
      userId,
    })

    return NextResponse.json(testRes)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to test connection." },
      { status: 500 }
    )
  }
}
