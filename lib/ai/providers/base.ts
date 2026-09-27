// ---------------------------------------------------------------------------
// Zenith AI — Base Provider Class
// Standardized abstract interface for multi-provider adapters
// ---------------------------------------------------------------------------

import type { AIRequest, AIResponse, AIStreamChunk, AIProviderId, AICitation, AIActionProposal } from "../types"
import { extractActionProposals, cleanVisibleAIOutput } from "../action-schema"

export interface ProviderTestResult {
  success: boolean
  providerId: AIProviderId
  model: string
  latencyMs: number
  error?: string
}

export abstract class BaseAIProvider {
  abstract readonly providerId: AIProviderId
  abstract readonly name: string

  /**
   * Execute non-streaming generation
   */
  abstract generate(request: AIRequest, apiKey: string): Promise<AIResponse>

  /**
   * Execute streaming generation
   */
  abstract generateStream(
    request: AIRequest,
    apiKey: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse>

  /**
   * Test connection and credentials
   */
  abstract testConnection(apiKey: string, customEndpoint?: string): Promise<ProviderTestResult>

  /**
   * Parse structured AI actions and markdown citations from model output text
   */
  protected parseActionsAndCitations(rawText: string): {
    cleanText: string
    citations?: AICitation[]
    actions?: AIActionProposal
    reasoningText?: string
  } {
    let cleanText = rawText
    let reasoningText: string | undefined
    let citations: AICitation[] | undefined
    let actions: AIActionProposal | undefined

    // Extract reasoning blocks (e.g. <think>...</think> or ```reasoning ... ```)
    const thinkMatch = cleanText.match(/<think>([\s\S]*?)<\/think>/i)
    if (thinkMatch) {
      reasoningText = thinkMatch[1].trim()
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    }

    // Extract JSON action blocks using standardized parser
    const { cleanText: cleanedOfActions, proposals } = extractActionProposals(cleanText)
    if (proposals.length > 0) {
      actions = proposals[0]
      cleanText = cleanedOfActions
    } else {
      cleanText = cleanVisibleAIOutput(cleanText)
    }

    // Extract citation blocks if present (e.g. [Source: lecture.pdf (Page 12)])
    const citationRegex = /\[(?:Source|Reference|Citation):\s*([^,\]]+)(?:,\s*(?:Page|p\.)\s*(\d+))?\]/gi
    let match
    const extractedCitations: AICitation[] = []

    while ((match = citationRegex.exec(cleanText)) !== null) {
      extractedCitations.push({
        sourceTitle: match[1].trim(),
        pageNumber: match[2] ? parseInt(match[2], 10) : undefined,
      })
    }

    if (extractedCitations.length > 0) {
      citations = extractedCitations
    }

    return {
      cleanText,
      reasoningText,
      citations,
      actions,
    }
  }
}
