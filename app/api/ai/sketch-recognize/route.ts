import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { SKETCH_REGISTRY } from "@/lib/sketch-recognition/registry"

export const dynamic = "force-dynamic"

// Simple in-memory sliding window rate limiter (max 40 requests per minute per IP)
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const current = rateLimits.get(ip)
  if (!current || now > current.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (current.count >= 40) {
    return false
  }
  current.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { recognized: false, kind: null, confidence: 0, error: "Rate limit reached" },
        { status: 429 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as { imageBase64?: unknown; strokeSummary?: unknown }
    const { imageBase64, strokeSummary } = body

    if (typeof imageBase64 !== "string" && typeof strokeSummary !== "string") {
      return NextResponse.json(
        { recognized: false, kind: null, confidence: 0, error: "Missing sketch data" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          recognized: false,
          kind: null,
          confidence: 0,
          error: "AI recognition unavailable (no API key configured)",
        },
        { status: 200 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const supportedKinds = Object.keys(SKETCH_REGISTRY).join(", ")
    const systemPrompt = `You are a fast, accurate sketch symbol classifier for Zenithsui, a low-fidelity napkin wireframing tool.
Analyze this user-drawn sketch and classify it into EXACTLY ONE of the supported classes if there is a match:
Supported classes: [${supportedKinds}]

Rules:
1. If the sketch clearly resembles one of the supported classes, return recognized: true, with the exact kind name and confidence (0.0 to 1.0).
2. If it is ambiguous, incomplete, or does not clearly represent any supported class, return recognized: false, kind: null, confidence: 0.0.
3. Respond ONLY with valid JSON matching this schema:
{"recognized": boolean, "kind": string | null, "confidence": number}
No conversational filler.`

    const contents: any[] = []

    if (typeof imageBase64 === "string" && imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "")
      contents.push({
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      })
    } else {
      contents.push({
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\nStroke geometry summary: ${JSON.stringify(strokeSummary)}`,
          },
        ],
      })
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    })

    const rawText = response.text ? response.text.trim() : "{}"
    let parsed: any
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ recognized: false, kind: null, confidence: 0 })
    }

    const recognized = Boolean(parsed.recognized)
    let kind = typeof parsed.kind === "string" ? parsed.kind.toLowerCase().trim() : null
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0

    // Validate that kind is actually in our supported whitelist
    if (kind && !(kind in SKETCH_REGISTRY)) {
      kind = null
    }

    if (!kind) {
      return NextResponse.json({ recognized: false, kind: null, confidence: 0 })
    }

    return NextResponse.json({
      recognized: recognized && confidence >= 0.6,
      kind,
      confidence: Math.max(0, Math.min(1, confidence)),
      source: "ai",
    })
  } catch (err: any) {
    console.warn("[Sketch Recognition API] Error:", err)
    return NextResponse.json(
      { recognized: false, kind: null, confidence: 0, error: err.message },
      { status: 200 }
    )
  }
}
