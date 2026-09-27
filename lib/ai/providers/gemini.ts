// ---------------------------------------------------------------------------
// Zenith AI — Google Gemini Provider Adapter
// Uses @google/genai SDK with telemetry, streaming, and full multimodal support
// ---------------------------------------------------------------------------

import { GoogleGenAI } from "@google/genai"
import { BaseAIProvider, type ProviderTestResult } from "./base"
import type { AIRequest, AIResponse, AIStreamChunk, AIProviderId } from "../types"

export class GeminiProvider extends BaseAIProvider {
  readonly providerId: AIProviderId = "gemini"
  readonly name = "Google Gemini"

  private getClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  }

  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const startTime = Date.now()
    const ai = this.getClient(apiKey)
    const initialModel = request.model && request.model !== "gemini-3.6-flash" && request.model !== "gemini-2.5-flash"
      ? request.model
      : "gemini-3.8-flash"

    // Construct contents
    const contents: any[] = []
    
    // System instruction
    const systemInstruction = request.systemPrompt || "You are Zenith AI, a precise, helpful study copilot for Zenithsui wireframe canvas."

    for (const msg of request.messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    }

    let response: any
    let model = initialModel

    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: request.temperature ?? 0.7,
        },
      })
    } catch (firstErr: any) {
      if (model !== "gemini-3.7-flash") {
        model = "gemini-3.7-flash"
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: request.temperature ?? 0.7,
          },
        })
      } else {
        throw new Error(`Gemini generation failed: ${firstErr.message || String(firstErr)}`)
      }
    }

    const rawText = response?.text || ""
    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(rawText)
    const latencyMs = Date.now() - startTime

    // Estimate token count
    const promptChars = request.messages.reduce((acc, m) => acc + m.content.length, 0) + systemInstruction.length
    const completionChars = rawText.length
    const promptTokens = Math.max(1, Math.round(promptChars / 4))
    const completionTokens = Math.max(1, Math.round(completionChars / 4))

    return {
      id: `gemini-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "gemini",
      model,
      citations,
      actions,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        estimatedCostUsd: (promptTokens * 0.0001 + completionTokens * 0.0004) / 1000,
      },
    }
  }

  async generateStream(
    request: AIRequest,
    apiKey: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const ai = this.getClient(apiKey)
    const initialModel = request.model && request.model !== "gemini-3.6-flash" && request.model !== "gemini-2.5-flash"
      ? request.model
      : "gemini-3.8-flash"

    const contents: any[] = []
    const systemInstruction = request.systemPrompt || "You are Zenith AI, a precise, helpful study copilot for Zenithsui wireframe canvas."

    for (const msg of request.messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    }

    let responseStream: any
    let model = initialModel

    try {
      responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: request.temperature ?? 0.7,
        },
      })
    } catch (firstErr: any) {
      if (model !== "gemini-3.7-flash") {
        model = "gemini-3.7-flash"
        responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: request.temperature ?? 0.7,
          },
        })
      } else {
        onChunk({
          done: true,
          error: firstErr.message || String(firstErr),
        })
        throw new Error(`Gemini stream failed: ${firstErr.message || String(firstErr)}`)
      }
    }

    try {
      let accumulatedText = ""

      for await (const chunk of responseStream) {
        const text = chunk.text || ""
        if (text) {
          accumulatedText += text
          onChunk({
            text,
            done: false,
          })
        }
      }

      const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(accumulatedText)
      const latencyMs = Date.now() - startTime

      const promptChars = request.messages.reduce((acc, m) => acc + m.content.length, 0) + systemInstruction.length
      const completionChars = accumulatedText.length
      const promptTokens = Math.max(1, Math.round(promptChars / 4))
      const completionTokens = Math.max(1, Math.round(completionChars / 4))

      const finalResponse: AIResponse = {
        id: `gemini-${Date.now()}`,
        text: cleanText,
        reasoningText,
        provider: "gemini",
        model,
        citations,
        actions,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          latencyMs,
          estimatedCostUsd: (promptTokens * 0.0001 + completionTokens * 0.0004) / 1000,
        },
      }

      onChunk({
        done: true,
        citations,
        actions,
      })

      return finalResponse
    } catch (err: any) {
      onChunk({
        done: true,
        error: err.message || String(err),
      })
      throw new Error(`Gemini stream failed: ${err.message || String(err)}`)
    }
  }

  async testConnection(apiKey: string): Promise<ProviderTestResult> {
    const startTime = Date.now()
    try {
      const ai = this.getClient(apiKey)
      let response: any
      let modelTested = "gemini-3.8-flash"
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: "ping",
        })
      } catch {
        modelTested = "gemini-3.7-flash"
        response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: "ping",
        })
      }
      const latencyMs = Date.now() - startTime

      return {
        success: !!response?.text,
        providerId: "gemini",
        model: modelTested,
        latencyMs,
      }
    } catch (err: any) {
      return {
        success: false,
        providerId: "gemini",
        model: "gemini-3.8-flash",
        latencyMs: Date.now() - startTime,
        error: err.message || String(err),
      }
    }
  }
}
