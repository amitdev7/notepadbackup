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

    const body = (await req.json().catch(() => ({}))) as {
      prompt?: unknown
      aspectRatio?: unknown
      width?: unknown
      height?: unknown
    }
    const { prompt, aspectRatio = "1:1", width, height } = body

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    }
    if (prompt.trim().length > 1000) {
      return NextResponse.json({ error: "Prompt is too long (max 1000 characters)." }, { status: 400 })
    }

    const VALID_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"]
    const ratio = typeof aspectRatio === "string" && VALID_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1"
    const w = typeof width === "number" && Number.isFinite(width) && width > 0 ? Math.min(width, 2048) : undefined
    const h = typeof height === "number" && Number.isFinite(height) && height > 0 ? Math.min(height, 2048) : undefined

    // Retrieve active Gemini API key if available
    const creds = ProviderCredentialService.getEffectiveCredentials("gemini", effectiveUserId)
    const apiKey = creds.apiKey || process.env.GEMINI_API_KEY

    const result = await AIImageService.generateImage({
      prompt: prompt.trim(),
      aspectRatio: ratio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
      apiKey,
      width: w,
      height: h,
    })

    if (!result || (result as any).success === false) {
      return NextResponse.json(
        { error: (result as any)?.error || "Image generation failed." },
        { status: 502 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[API/AI/IMAGE/GENERATE] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate image" },
      { status: 500 }
    )
  }
}
