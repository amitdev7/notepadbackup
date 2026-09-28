// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/models Endpoint (Model Catalog & Capabilities)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { AI_PROVIDERS, getAllModels } from "@/lib/ai/model-registry"
import { BYOKVault } from "@/lib/ai/byok-vault"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const configuredKeys = BYOKVault.listConfiguredKeys()
    const configuredSet = new Set(configuredKeys.map((k) => k.providerId))

    // Always mark gemini as configured if server has GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
      configuredSet.add("gemini")
    }

    const providers = Object.values(AI_PROVIDERS).map((p) => ({
      ...p,
      isConfigured: configuredSet.has(p.id),
    }))

    const models = getAllModels().map((m) => ({
      ...m,
      isConfigured: configuredSet.has(m.providerId),
    }))

    return NextResponse.json({ providers, models })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list models." }, { status: 500 })
  }
}
