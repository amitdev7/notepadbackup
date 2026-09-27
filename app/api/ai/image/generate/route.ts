import { NextRequest, NextResponse } from "next/server"
import { AIImageService } from "@/lib/ai/image-service"
import { ProviderCredentialService } from "@/lib/ai/credential-service"
import { getEffectiveUserId } from "@/lib/server-auth"
import { AIUsageTracker } from "@/lib/ai/usage-tracker"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { userId: effectiveUserId } = await getEffectiveUserId(req)

    // Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || effectiveUserId
    const rateCheck = AIUsageTracker.checkRateLimit(ip, 30)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before generating another image." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { prompt, aspectRatio = "1:1", width, height } = body

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    }

    // Retrieve active Gemini API key if available
    const creds = ProviderCredentialService.getEffectiveCredentials("gemini", effectiveUserId)
    const apiKey = creds.apiKey || process.env.GEMINI_API_KEY

    const result = await AIImageService.generateImage({
      prompt: prompt.trim(),
      aspectRatio,
      apiKey,
      width,
      height,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[API/AI/IMAGE/GENERATE] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate image" },
      { status: 500 }
    )
  }
}
