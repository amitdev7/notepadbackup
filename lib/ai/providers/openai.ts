// ---------------------------------------------------------------------------
// Zenith AI — OpenAI Provider Adapter
// Official OpenAI HTTP API (GPT-4o, GPT-4o-mini, o3-mini) with streaming
// ---------------------------------------------------------------------------

import { BaseAIProvider, type ProviderTestResult } from "./base"
import type { AIRequest, AIResponse, AIStreamChunk, AIProviderId } from "../types"

export class OpenAIProvider extends BaseAIProvider {
  readonly providerId: AIProviderId = "openai"
  readonly name: string = "OpenAI / ChatGPT"

  protected getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "https://api.openai.com/v1/chat/completions"
  }

  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(request.customEndpoint)
    const model = request.model || "gpt-4o"

    const messages = []
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt })
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content })
    }

    const payload: any = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`OpenAI API error (${res.status}): ${errText || res.statusText}`)
    }

    const data = await res.json()
    const rawText = data.choices?.[0]?.message?.content || ""
    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(rawText)
    const latencyMs = Date.now() - startTime

    const promptTokens = data.usage?.prompt_tokens || Math.max(1, Math.round(rawText.length / 4))
    const completionTokens = data.usage?.completion_tokens || Math.max(1, Math.round(rawText.length / 4))

    return {
      id: data.id || `openai-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "openai",
      model,
      citations,
      actions,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        estimatedCostUsd: (promptTokens * 0.0025 + completionTokens * 0.01) / 1000,
      },
    }
  }

  async generateStream(
    request: AIRequest,
    apiKey: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(request.customEndpoint)
    const model = request.model || "gpt-4o"

    const messages = []
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt })
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content })
    }

    const payload = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      stream: true,
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "")
      throw new Error(`OpenAI stream failed (${res.status}): ${errText || res.statusText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let accumulatedText = ""
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith("data:")) continue
        const dataStr = trimmed.replace(/^data:\s*/, "")
        if (dataStr === "[DONE]") continue

        try {
          const parsed = JSON.parse(dataStr)
          const delta = parsed.choices?.[0]?.delta?.content || ""
          if (delta) {
            accumulatedText += delta
            onChunk({ text: delta, done: false })
          }
        } catch {
          // ignore parse errors on malformed chunks
        }
      }
    }

    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(accumulatedText)
    const latencyMs = Date.now() - startTime

    const promptTokens = Math.max(1, Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4))
    const completionTokens = Math.max(1, Math.round(accumulatedText.length / 4))

    const finalResponse: AIResponse = {
      id: `openai-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "openai",
      model,
      citations,
      actions,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        estimatedCostUsd: (promptTokens * 0.0025 + completionTokens * 0.01) / 1000,
      },
    }

    onChunk({ done: true, citations, actions })
    return finalResponse
  }

  async testConnection(apiKey: string, customEndpoint?: string): Promise<ProviderTestResult> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(customEndpoint)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      })

      const latencyMs = Date.now() - startTime
      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        return {
          success: false,
          providerId: "openai",
          model: "gpt-4o-mini",
          latencyMs,
          error: `HTTP ${res.status}: ${errText}`,
        }
      }

      return {
        success: true,
        providerId: "openai",
        model: "gpt-4o-mini",
        latencyMs,
      }
    } catch (err: any) {
      return {
        success: false,
        providerId: "openai",
        model: "gpt-4o-mini",
        latencyMs: Date.now() - startTime,
        error: err.message || String(err),
      }
    }
  }
}

