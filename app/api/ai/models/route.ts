// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/models Endpoint (Model Catalog & Capabilities)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { AI_PROVIDERS, getAllModels } from "@/lib/ai/model-registry"
import { BYOKVault } from "@/lib/ai/byok-vault"

export const dynamic = "force-dynamic"

/** Server env keys that unlock a provider without any vault row. */
const ENV_KEY_BY_PROVIDER: Record<string, string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
}

export async function GET() {
  try {
    const configuredKeys = BYOKVault.listConfiguredKeys()
    const configuredSet = new Set<string>(configuredKeys.map((k) => k.providerId as string))

    // Any provider with a server env key counts as configured.
    for (const [providerId, key] of Object.entries(ENV_KEY_BY_PROVIDER)) {
      if (key) configuredSet.add(providerId)
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
