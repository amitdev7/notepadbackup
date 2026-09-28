// ---------------------------------------------------------------------------
// Zenith AI — Hugging Face, Microsoft, OpenAI-Compatible & Custom Providers
// ---------------------------------------------------------------------------

import { OpenAIProvider } from "./openai"
import { BaseAIProvider, type ProviderTestResult } from "./base"
import type { AIProviderId, AIRequest, AIResponse, AIStreamChunk } from "../types"

// 1. Hugging Face Inference Provider
export class HuggingFaceProvider extends BaseAIProvider {
  readonly providerId: AIProviderId = "huggingface"
  readonly name: string = "Hugging Face Inference"

  private getEndpoint(model: string, customEndpoint?: string): string {
    if (customEndpoint) return customEndpoint
    return `https://api-inference.huggingface.co/models/${model}`
  }

  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const startTime = Date.now()
    const model = request.model || "meta-llama/Llama-3.3-70B-Instruct"
    const endpoint = this.getEndpoint(model, request.customEndpoint)

    // HuggingFace Router or Chat endpoint format
    const promptText = request.messages.map((m) => `${m.role}: ${m.content}`).join("\n")

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: promptText,
        parameters: {
          max_new_tokens: request.maxTokens || 1024,
          temperature: request.temperature ?? 0.7,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => "")
      throw new Error(`HuggingFace API error (${res.status}): ${err}`)
    }

    const data = await res.json()
    let rawText = ""
    if (Array.isArray(data) && data[0]?.generated_text) {
      rawText = data[0].generated_text
    } else if (typeof data === "string") {
      rawText = data
    } else if (data.generated_text) {
      rawText = data.generated_text
    }

    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(rawText)
    const latencyMs = Date.now() - startTime

    return {
      id: `hf-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "huggingface",
      model,
      citations,
      actions,
      usage: {
        promptTokens: Math.round(promptText.length / 4),
        completionTokens: Math.round(cleanText.length / 4),
        totalTokens: Math.round((promptText.length + cleanText.length) / 4),
        latencyMs,
      },
    }
  }

  async generateStream(
    request: AIRequest,
    apiKey: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    // Non-streaming fallback for simple inference
    const response = await this.generate(request, apiKey)
    onChunk({ text: response.text, done: true, citations: response.citations, actions: response.actions })
    return response
  }

  async testConnection(apiKey: string): Promise<ProviderTestResult> {
    const startTime = Date.now()
    try {
      const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ inputs: "ping", parameters: { max_new_tokens: 2 } }),
      })
      return {
        success: res.ok,
        providerId: "huggingface",
        model: "Mistral-7B",
        latencyMs: Date.now() - startTime,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err: any) {
      return {
        success: false,
        providerId: "huggingface",
        model: "Mistral-7B",
        latencyMs: Date.now() - startTime,
        error: err.message,
      }
    }
  }
}

// 2. Microsoft Foundry / Azure Provider
export class MicrosoftProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "azure"
  override readonly name: string = "Microsoft Foundry / Azure"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || process.env.AZURE_OPENAI_ENDPOINT || "https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview"
  }
}

// 3. OpenAI-Compatible (Ollama, Groq, vLLM, LMStudio, Together)
export class OpenAICompatibleProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "openai-compatible"
  override readonly name: string = "OpenAI-Compatible / Local"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "http://localhost:11434/v1/chat/completions"
  }
}

// 4. Custom Endpoint Provider
export class CustomProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "custom"
  override readonly name: string = "Custom API Endpoint"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "http://localhost:8000/v1/chat/completions"
  }
}
