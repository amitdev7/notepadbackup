// ---------------------------------------------------------------------------
// Zenith AI — Native SLM & Agent Orchestrator
// ---------------------------------------------------------------------------

import type { CanvasAction, CanvasActionProposal } from "./types"
import { AccountSecurityBoundary } from "./account-boundary"
import { AssetMemory, type AssetSearchResult } from "./asset-memory"
import { ToolRegistry } from "./tool-registry"
import { AIContextBuilder } from "./context-builder"
import { extractActionProposals } from "./action-schema"

export type UserIntentType =
  | "ACCOUNT_RESTRICTED"
  | "CONVERSATION"
  | "STUDY_COPILOT"
  | "CANVAS_CREATION"
  | "CANVAS_MODIFICATION"
  | "REUSE_ASSET"
  | "IMAGE_GENERATION"

export interface IntentClassification {
  intent: UserIntentType
  confidence: number
  matchedKeywords: string[]
  suggestedAction?: string
  matchingReusableAssets?: AssetSearchResult[]
  accountGuidance?: string
}

export class AIOrchestrator {
  /**
   * Classifies user prompt intent to guide model reasoning and tool selection.
   */
  static classifyIntent(
    input: string,
    hasSelection = false,
    studentAction?: string
  ): IntentClassification {
    const text = input.toLowerCase().trim()

    // 1. Critical: Account Security Check (Highest Priority)
    const accountCheck = AccountSecurityBoundary.checkRequest(input)
    if (accountCheck.isRestrictedAccountAction) {
      return {
        intent: "ACCOUNT_RESTRICTED",
        confidence: 1.0,
        matchedKeywords: [accountCheck.category || "account"],
        accountGuidance: accountCheck.safeGuidanceMessage,
      }
    }

    // 2. Explicit Student Action Mode
    if (studentAction) {
      return {
        intent: "STUDY_COPILOT",
        confidence: 0.95,
        matchedKeywords: [studentAction],
        suggestedAction: studentAction,
      }
    }

    // 3. AI Image Generation Intent (High priority when user asks for an image/photo/art)
    const imageKeywords = [
      "generate image", "create image", "make an image", "ai image", "draw an image",
      "generate picture", "create picture", "make a picture", "picture of", "photo of",
      "illustration of", "generate a photo", "create photo", "paint an image", "sketch an image",
      "generate art", "generate wallpaper", "draw a photo", "generate an image"
    ]
    const matchedImage = imageKeywords.filter((k) => text.includes(k))
    if (matchedImage.length > 0) {
      return {
        intent: "IMAGE_GENERATION",
        confidence: 0.95,
        matchedKeywords: matchedImage,
      }
    }

    // 4. Reusable Asset / Component matching (REUSE BEFORE REGENERATE)
    const assetMatches = AssetMemory.search(input, { limit: 3 })
    const hasStrongAssetMatch = assetMatches.length > 0 && assetMatches[0].score >= 12

    // 5. Canvas Modification Intent (Operate on selected objects or specific nodes)
    const modKeywords = [
      "move", "shift", "resize", "scale", "delete", "remove", "align",
      "distribute", "group", "ungroup", "rotate", "flip", "make bold", "color", "fill", "clear canvas"
    ]
    const matchedMod = modKeywords.filter((k) => text.includes(k))
    if ((hasSelection && matchedMod.length > 0) || text.includes("delete") || text.includes("remove") || text.includes("clear")) {
      return {
        intent: "CANVAS_MODIFICATION",
        confidence: 0.9,
        matchedKeywords: matchedMod,
      }
    }

    // 6. Canvas Creation & Writing Intent
    const createKeywords = [
      "write", "type", "add text", "put text", "insert text", "saying", "draw", "create", "make a", "build a",
      "add", "put", "place", "insert", "diagram", "flowchart", "mind map", "mindmap",
      "flashcard", "flashcards", "wireframe", "table", "timeline", "mockup", "screen", "ui", "login",
      "button", "card", "input", "box", "rectangle", "circle", "ellipse", "arrow", "shape", "canvas"
    ]
    const matchedCreate = createKeywords.filter((k) => text.includes(k))
    if (matchedCreate.length > 0) {
      return {
        intent: hasStrongAssetMatch ? "REUSE_ASSET" : "CANVAS_CREATION",
        confidence: 0.92,
        matchedKeywords: matchedCreate,
        matchingReusableAssets: assetMatches,
      }
    }

    // 7. Study Copilot Intent
    const studyKeywords = [
      "explain", "simplify", "step by step", "teach me", "quiz", "summary",
      "cheat sheet", "revision", "formula", "practice", "active recall", "compare"
    ]
    const matchedStudy = studyKeywords.filter((k) => text.includes(k))
    if (matchedStudy.length > 0) {
      return {
        intent: "STUDY_COPILOT",
        confidence: 0.85,
        matchedKeywords: matchedStudy,
      }
    }

    // 8. General Conversation
    return {
      intent: "CONVERSATION",
      confidence: 0.7,
      matchedKeywords: [],
    }
  }

  /**
   * Synthesizes a structured orchestrator prompt for the model.
   */
  static buildOrchestratorPrompt(params: {
    userInput: string
    intent: IntentClassification
    canvasContext?: string
    studentAction?: string
  }): string {
    const parts: string[] = []

    parts.push(`=== ZENITHSUI NATIVE AI AGENT SYSTEM ===`)
    parts.push(`You are Zenith AI, the native intelligent study copilot and canvas wireframe orchestrator for Zenithsui.`)
    parts.push(`You operate strictly inside Zenithsui. Preserve the hand-drawn rough.js napkin sketch aesthetic.`)
    parts.push(`Chat is for clear communication; the Canvas is the shared workspace.`)
    parts.push(``)

    // Append Tool Documentation
    parts.push(ToolRegistry.getToolsDocumentation())
    parts.push(``)

    // Reusable Asset Memory injection (Reuse Before Regenerate)
    if (params.intent.matchingReusableAssets && params.intent.matchingReusableAssets.length > 0) {
      parts.push(`=== REUSABLE ASSET MEMORY (REUSE BEFORE REGENERATE) ===`)
      parts.push(`The following pre-existing high-quality assets were found in memory:`)
      for (const m of params.intent.matchingReusableAssets) {
        parts.push(`- **${m.asset.name}** (ID: \`${m.asset.id}\`, Type: ${m.asset.type})`)
        parts.push(`  Description: ${m.asset.semanticDescription}`)
        parts.push(`  Preview: ${m.asset.thumbnailSnippet}`)
      }
      parts.push(`If one of these matches the user's request, propose action 'reuse_saved_asset' or adapt it rather than generating redundant nodes from scratch!`)
      parts.push(``)
    }

    // Intent specific instructions
    parts.push(`=== HOW TO APPLY ACTIONS TO THE CANVAS ===`)
    parts.push(`When the user asks you to write text, draw shapes, add UI components, create diagrams/mind maps/flowcharts/tables/flashcards, or modify/delete elements on the canvas, you MUST append a \`\`\`zenith-actions code block at the end of your response containing a JSON array of actions.`)
    parts.push(`The \`\`\`zenith-actions block will be automatically extracted and executed on the canvas, while your conversational text will be shown in chat.`)
    parts.push(``)
    parts.push(`Example zenith-actions blocks:`)
    parts.push(`1. Write text on canvas:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createNode", "nodeType": "text", "text": "Hello World", "x": 200, "y": 150, "fontSize": 18, "bold": true }\n]\n\`\`\``)
    parts.push(`2. Draw a shape (rect, ellipse, circle, line):`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createNode", "nodeType": "shape", "shape": "rect", "x": 150, "y": 120, "w": 200, "h": 120, "fill": "paper" }\n]\n\`\`\``)
    parts.push(`3. Add UI component (button, input, card, navbar, modal, badge, table, etc.):`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createNode", "nodeType": "component", "kind": "button", "props": { "label": "Submit", "variant": "primary" }, "x": 200, "y": 180, "w": 140, "h": 44 }\n]\n\`\`\``)
    parts.push(`4. Create Mind Map:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createMindMap", "rootTopic": "Main Concept", "branches": [{ "title": "Branch 1", "subTopics": ["Point A", "Point B"] }, { "title": "Branch 2", "subTopics": ["Point C"] }] }\n]\n\`\`\``)
    parts.push(`5. Create Flowchart:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createFlowchart", "steps": [{ "id": "1", "label": "Start", "kind": "start", "next": ["2"] }, { "id": "2", "label": "Process Data", "kind": "step", "next": ["3"] }, { "id": "3", "label": "Complete", "kind": "end" }] }\n]\n\`\`\``)
    parts.push(`6. Create Study Table:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createTable", "title": "Topic Comparison", "headers": ["Column 1", "Column 2"], "rows": [["Row 1", "Data 1"], ["Row 2", "Data 2"]] }\n]\n\`\`\``)
    parts.push(`7. Create Flashcards:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "createFlashcards", "cards": [{ "question": "Question 1?", "answer": "Answer 1", "hint": "Hint" }] }\n]\n\`\`\``)
    parts.push(`8. Generate AI Image on Canvas:`)
    parts.push(`\`\`\`zenith-actions\n[\n  { "type": "generateImage", "prompt": "A futuristic robot wireframe mascot", "aspectRatio": "1:1", "w": 260, "h": 260 }\n]\n\`\`\``)
    parts.push(``)
    parts.push(`CRITICAL CONVERSATIONAL GUIDELINES:`)
    parts.push(`- Provide a polite, friendly, natural conversational message (e.g. "I've generated the image and placed it on your canvas!" or an explanation of the topic).`)
    parts.push(`- Always append the \`\`\`zenith-actions code block when the user asks to create, draw, write, generate an image, or modify anything on the canvas.`)
    parts.push(``)

    switch (params.intent.intent) {
      case "IMAGE_GENERATION":
        parts.push(`Image Generation Mode: The user wants an AI image created and placed on canvas. Confirm the image creation in chat and output a \`\`\`zenith-actions block with { "type": "generateImage", "prompt": "<descriptive prompt>", "aspectRatio": "1:1" }.`)
        break
      case "STUDY_COPILOT":
        parts.push(`Pedagogical Mode: Deliver clear, high-yield academic insights. Call study tools (create_flashcards, create_mind_map, create_study_table, create_flowchart) natively to place structured artifacts onto the canvas. Keep your conversational response focused on teaching and explaining the concepts.`)
        break
      case "CANVAS_CREATION":
        parts.push(`Canvas Creation Mode: Design clean napkin sketches by invoking tools (add_text, add_shape, add_arrow, create_component). In your conversational output, provide a concise confirmation of what was created.`)
        break
      case "CANVAS_MODIFICATION":
        parts.push(`Canvas Modification Mode: Apply surgical updates to the specified or selected nodes using native tools (move_node, delete_node, align_nodes, distribute_nodes). Avoid mutating unrelated objects. Confirm the change concisely in chat.`)
        break
      case "REUSE_ASSET":
        parts.push(`Asset Reuse Mode: Utilize 'reuse_saved_asset' to stamp the matching asset onto the canvas, adapting text labels if needed.`)
        break
      case "CONVERSATION":
        parts.push(`Conversational Mode: Answer clearly and concisely. Only invoke canvas tools if explicitly asked or directly relevant to the user request.`)
        break
    }

    return parts.join("\n")
  }
}


