// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/byok Endpoint (BYOK Credential Management)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { BYOKVault } from "@/lib/ai/byok-vault"
import { getEffectiveUserId } from "@/lib/server-auth"
import type { AIProviderId } from "@/lib/ai/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getEffectiveUserId(req)
    const keys = BYOKVault.listConfiguredKeys(userId)
    return NextResponse.json({ keys })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list keys." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getEffectiveUserId(req)
    const body = (await req.json().catch(() => ({}))) as {
      providerId?: AIProviderId
      apiKey?: string
      customEndpoint?: string
      defaultModel?: string
      isDefault?: boolean
      name?: string
    }
    const { providerId, apiKey, customEndpoint, defaultModel, isDefault, name } = body

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    const res = await BYOKVault.saveKey(providerId, apiKey, customEndpoint, defaultModel, isDefault, userId, name)
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to save key." }, { status: 400 })
    }

    return NextResponse.json({ success: true, keys: BYOKVault.listConfiguredKeys(userId) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save key." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await getEffectiveUserId(req)
    const { searchParams } = new URL(req.url)
    const providerId = searchParams.get("providerId") as AIProviderId

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    BYOKVault.deleteKey(providerId, userId)
    return NextResponse.json({ success: true, keys: BYOKVault.listConfiguredKeys(userId) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete key." }, { status: 500 })
  }
}
