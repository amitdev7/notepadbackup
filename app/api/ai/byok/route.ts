// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/byok Endpoint (BYOK Credential Management)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { BYOKVault } from "@/lib/ai/byok-vault"
import type { AIProviderId } from "@/lib/ai/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const keys = BYOKVault.listConfiguredKeys()
    return NextResponse.json({ keys })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list keys." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { providerId, apiKey, customEndpoint } = body as {
      providerId: AIProviderId
      apiKey?: string
      customEndpoint?: string
    }

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    const res = await BYOKVault.saveKey(providerId, apiKey, customEndpoint)
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to save key." }, { status: 400 })
    }

    return NextResponse.json({ success: true, keys: BYOKVault.listConfiguredKeys() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save key." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const providerId = searchParams.get("providerId") as AIProviderId

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required." }, { status: 400 })
    }

    BYOKVault.deleteKey(providerId)
    return NextResponse.json({ success: true, keys: BYOKVault.listConfiguredKeys() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete key." }, { status: 500 })
  }
}
