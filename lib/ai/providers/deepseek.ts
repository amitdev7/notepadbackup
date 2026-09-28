// ---------------------------------------------------------------------------
// Zenith AI — DeepSeek Provider Adapter
// Official DeepSeek API (deepseek-chat, deepseek-reasoner)
// ---------------------------------------------------------------------------

import { OpenAIProvider } from "./openai"
import type { AIProviderId } from "../types"

export class DeepSeekProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "deepseek"
  override readonly name: string = "DeepSeek"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "https://api.deepseek.com/chat/completions"
  }
}
