import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mode } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: "Missing handwriting image data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: "GEMINI_API_KEY is not configured on the server. Please set it in Settings.",
      }, { status: 503 })
    }

    const ai = new GoogleGenAI({ apiKey })

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")

    const promptText = mode === "math"
      ? "You are an expert OCR transcription assistant for mathematical handwriting and equations. Transcribe the handwritten math or equation in this image into clean LaTeX notation (or plain math text if standard). Output ONLY the recognized formula or equation without any conversational filler."
      : "You are an expert handwriting transcription assistant for whiteboard sketches and notes. Transcribe the handwritten text in this image verbatim. Preserve line breaks. Output ONLY the recognized text without any conversational filler."

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
    })

    const recognizedText = response.text ? response.text.trim() : ""
    return NextResponse.json({ success: true, text: recognizedText })
  } catch (err: any) {
    console.warn("[Handwriting Recognition] Error:", err)
    return NextResponse.json({
      error: err.message || "Failed to recognize handwriting",
    }, { status: 500 })
  }
}
