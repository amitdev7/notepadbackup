// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/providers/[id] Endpoint (Update & Delete Credentials)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import { getEffectiveUserId } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getEffectiveUserId(req)

    const { id } = await params
    const body = await req.json()
    const { enabled, isDefault, defaultModel, name, customEndpoint } = body

    if (!id) {
      return NextResponse.json({ error: "Credential ID is required." }, { status: 400 })
    }

    const res = ProviderCredentialService.updateCredential(
      id,
      {
        enabled,
        isDefault,
        defaultModel,
        name,
        customEndpoint,
      },
      userId
    )

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to update credential." }, { status: 400 })
    }

    const providers = ProviderCredentialService.getClientSafeProviders(userId)
    return NextResponse.json({ success: true, providers })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update provider credential." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getEffectiveUserId(req)

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Credential ID is required." }, { status: 400 })
    }

    const success = ProviderCredentialService.deleteCredential(id, userId)
    if (!success) {
      return NextResponse.json({ error: "Credential not found or already deleted." }, { status: 404 })
    }

    const providers = ProviderCredentialService.getClientSafeProviders(userId)
    return NextResponse.json({ success: true, providers })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete provider credential." },
      { status: 500 }
    )
  }
}
