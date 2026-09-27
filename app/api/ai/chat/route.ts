// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/chat Endpoint
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { AIRouter } from "@/lib/ai/router"
import { AIUsageTracker } from "@/lib/ai/usage-tracker"
import { sanitizeOutput } from "@/lib/ai/security-audit"
import { getEffectiveUserId } from "@/lib/server-auth"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import { AI_PROVIDERS } from "@/lib/ai/model-registry"
import type { AIProviderId, RoutingMode, StudentModeAction } from "@/lib/ai/types"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve user ID — supports authenticated users and guest canvas sessions
    const { userId } = await getEffectiveUserId(req)

    // 2. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || userId
    const rateCheck = AIUsageTracker.checkRateLimit(ip, 60)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending more AI requests." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const {
      providerId = "gemini",
      modelId = "gemini-3.8-flash",
      routingMode = "manual",
      studentAction,
      canvasContext,
      messages = [],
    } = body as {
      providerId?: AIProviderId
      modelId?: string
      routingMode?: RoutingMode
      studentAction?: StudentModeAction
      canvasContext?: string
      messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required." }, { status: 400 })
    }

    // 3. Select effective model based on routing mode and registry metadata
    let effective = AIRouter.selectEffectiveModel(providerId, modelId, routingMode)

    // 4. Validate that this user actually has this provider configured and ready
    let creds = ProviderCredentialService.getEffectiveCredentials(effective.providerId, userId)
    const requiresKey = AI_PROVIDERS[effective.providerId]?.requiresApiKey ?? true
    const isReady = creds.enabled && creds.source !== "none" && (!requiresKey || !!creds.apiKey)

    if (!isReady) {
      // Graceful fallback: check if another provider is ready and configured for this user (e.g. Gemini with server key)
      const safeProviders = ProviderCredentialService.getClientSafeProviders(userId)
      const fallbackProv = safeProviders.find(
        (p) =>
          p.enabled &&
          (p.normalizedStatus === "READY" || p.lastStatus === "READY" || p.lastStatus === "connected") &&
          p.isConfigured
      )

      if (fallbackProv) {
        console.warn(
          `[Zenith AI Chat] Provider '${effective.providerId}' is not connected. Gracefully routing to ready provider '${fallbackProv.providerId}' (${fallbackProv.defaultModel})`
        )
        effective = AIRouter.selectEffectiveModel(fallbackProv.providerId, fallbackProv.defaultModel, routingMode)
        creds = ProviderCredentialService.getEffectiveCredentials(effective.providerId, userId)
      } else {
        return NextResponse.json(
          {
            error: `The selected AI provider (${effective.providerId}) is not connected. Please connect an AI provider in Settings to start chatting.`,
          },
          { status: 400 }
        )
      }
    }

    // 5. Execute request through provider router with user isolation
    const result = await AIRouter.executeChat({
      providerId: effective.providerId,
      modelId: effective.modelId,
      messages,
      studentAction,
      canvasContext,
      userId,
    })

    // 6. Sanitize response output
    const cleanOutput = sanitizeOutput(result.text)

    return NextResponse.json({
      text: cleanOutput,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
    })
  } catch (err: any) {
    console.error("[Zenith AI Chat Error]:", err.message || err)
    return NextResponse.json(
      { error: err.message || "Failed to process AI chat request." },
      { status: 500 }
    )
  }
}
