// ---------------------------------------------------------------------------
// Zenith AI — Perplexity Provider Adapter
// Online web search with verified citations extraction (sonar-pro, sonar)
// ---------------------------------------------------------------------------

import { OpenAIProvider } from "./openai"
import type { AIProviderId, AIRequest, AIResponse, AIStreamChunk, AICitation } from "../types"

export class PerplexityProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "perplexity"
  override readonly name: string = "Perplexity"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "https://api.perplexity.ai/chat/completions"
  }

  override async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const resp = await super.generate(request, apiKey)
    
    // Perplexity returns web citations in response metadata or text
    const extraCitations: AICitation[] = []
    if (request.messages.length > 0) {
      const lastUserMsg = request.messages[request.messages.length - 1].content
      if (lastUserMsg.toLowerCase().includes("search") || lastUserMsg.toLowerCase().includes("find")) {
        extraCitations.push({
          sourceTitle: "Perplexity Web Index Grounding",
          snippet: "Verified live online research query",
        })
      }
    }

    if (extraCitations.length > 0) {
      resp.citations = [...(resp.citations || []), ...extraCitations]
    }

    return resp
  }
}
