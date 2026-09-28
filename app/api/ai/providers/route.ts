// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/providers Endpoint (List & Create Provider Credentials)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import { getEffectiveUserId } from "@/lib/server-auth"
import type { AIProviderId } from "@/lib/ai/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { userId, isAuthenticated } = await getEffectiveUserId(req)
    const providers = ProviderCredentialService.getClientSafeProviders(userId)
    return NextResponse.json({ providers, authenticated: isAuthenticated })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list AI providers." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getEffectiveUserId(req)

    const body = await req.json()
    const {
      providerId,
      apiKey,
      customEndpoint,
      organizationId,
      defaultModel,
      enabled = true,
      isDefault = false,
      name,
    } = body as {
      providerId: AIProviderId
      apiKey?: string
      customEndpoint?: string
      organizationId?: string
      defaultModel?: string
      enabled?: boolean
      isDefault?: boolean
      name?: string
    }

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    const res = await ProviderCredentialService.saveCredential({
      userId,
      providerId,
      apiKey,
      customEndpoint,
      organizationId,
      defaultModel,
      enabled,
      isDefault,
      name,
    })

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to save credential." }, { status: 400 })
    }

    // Auto-verify connection immediately on connect to establish truthful READY state
    const verifyResult = await ProviderCredentialService.testConnection({
      providerId,
      apiKey,
      customEndpoint,
      modelId: defaultModel,
      userId,
    })

    // Return the refreshed client-safe providers list for this user
    const providers = ProviderCredentialService.getClientSafeProviders(userId)
    return NextResponse.json({
      success: true,
      providers,
      credentialId: res.credential?.id,
      verification: verifyResult,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save AI provider credential." },
      { status: 500 }
    )
  }
}
