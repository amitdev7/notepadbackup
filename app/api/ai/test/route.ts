// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/test Endpoint (Live Connection Health Check)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import type { AIProviderId } from "@/lib/ai/types"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { providerId, apiKey, customEndpoint, modelId } = body as {
      providerId: AIProviderId
      apiKey?: string
      customEndpoint?: string
      modelId?: string
    }

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    const testRes = await ProviderCredentialService.testConnection({
      providerId,
      apiKey,
      customEndpoint,
      modelId,
    })

    return NextResponse.json(testRes)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to test connection." },
      { status: 500 }
    )
  }
}
