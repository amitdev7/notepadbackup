// ---------------------------------------------------------------------------
// Zenith AI — Core Types & Interfaces
// ---------------------------------------------------------------------------

import type { ShapeKind, FillTone, TextAlign } from "../types"

export type AIProviderId =
  | "gemini"
  | "openai"
  | "groq"
  | "openrouter"
  | "anthropic"
  | "deepseek"
  | "perplexity"
  | "huggingface"
  | "azure"
  | "openai-compatible"
  | "custom"

export interface ModelCapability {
  chat: boolean
  streaming: boolean
  vision: boolean
  structuredOutput: boolean
  tools: boolean
  documentInput: boolean
  webSearch: boolean
  reasoning: boolean
  imageGeneration?: boolean
}

export interface ModelPricing {
  inputPerMillionUsd: number
  outputPerMillionUsd: number
}

export interface AIModelMeta {
  id: string
  name: string
  providerId: AIProviderId
  description: string
  contextWindow: number
  capabilities: ModelCapability
  pricing?: ModelPricing
  isDefault?: boolean
  isFree?: boolean
  recommendedFor?: string[]
}

export interface AIProviderMeta {
  id: AIProviderId
  name: string
  description: string
  website: string
  supportsCustomEndpoint?: boolean
  defaultEndpoint?: string
  requiresApiKey: boolean
  models: AIModelMeta[]
}

export type RoutingMode =
  | "manual"
  | "best-available"
  | "fastest"
  | "cheapest"
  | "best-reasoning"
  | "document-analysis"

export interface BYOKConfig {
  providerId: AIProviderId
  apiKey?: string
  maskedKey?: string
  customEndpoint?: string
  updatedAt: string
}

export type StudentModeAction =
  | "explain"
  | "simplify"
  | "solve-step-by-step"
  | "summarize"
  | "create-notes"
  | "flashcards"
  | "practice-questions"
  | "quiz-me"
  | "study-plan"
  | "revision-sheet"
  | "mind-map"
  | "flowchart"
  | "concept-map"
  | "timeline"
  | "table"
  | "diagram"

export interface CitationReference {
  sourceTitle: string
  pageNumber?: number
  sectionName?: string
  snippet?: string
}

export type AICitation = CitationReference

// ---------------------------------------------------------------------------
// Canvas Action Proposals
// ---------------------------------------------------------------------------

export type CanvasActionType =
  | "createNode"
  | "updateNode"
  | "deleteNode"
  | "moveNode"
  | "arrangeNodes"
  | "createDiagram"
  | "createMindMap"
  | "createFlowchart"
  | "createTable"
  | "createFlashcards"
  | "reuseAsset"
  | "createStudyArtifact"
  | "alignNodes"
  | "distributeNodes"
  | "groupNodes"
  | "ungroupNodes"
  | "duplicateNodes"
  | "reorderNodes"
  | "flipNodes"
  | "connectNodes"
  | "generateImage"

export interface BaseCanvasAction {
  type: CanvasActionType
  description?: string
}

export interface CreateNodeAction extends BaseCanvasAction {
  type: "createNode"
  nodeType: "shape" | "text" | "component" | "arrow" | "draw" | "image" | "pdf"
  x: number
  y: number
  w?: number
  h?: number
  props?: Record<string, any>
  text?: string
  fontSize?: number
  bold?: boolean
  align?: TextAlign
  shapeKind?: ShapeKind
  shape?: ShapeKind
  tone?: FillTone
  fill?: FillTone
  componentKind?: string
  kind?: string
  points?: [number, number][] | [[number, number], [number, number]]
  stroke?: "light" | "regular" | "heavy"
  dashed?: boolean
  src?: string
  naturalW?: number
  naturalH?: number
  name?: string
}

export interface UpdateNodeAction extends BaseCanvasAction {
  type: "updateNode"
  nodeId: string
  patch: Record<string, any>
}

export interface DeleteNodeAction extends BaseCanvasAction {
  type: "deleteNode"
  nodeIds: string[]
  /** clear the whole canvas instead of the listed nodes */
  all?: boolean
}

export interface MoveNodeAction extends BaseCanvasAction {
  type: "moveNode"
  nodeId: string
  dx: number
  dy: number
}

export interface ArrangeNodesAction extends BaseCanvasAction {
  type: "arrangeNodes"
  nodeIds: string[]
  layout: "grid" | "horizontal" | "vertical"
  spacing?: number
}

export interface CreateMindMapAction extends BaseCanvasAction {
  type: "createMindMap"
  rootTopic: string
  branches: Array<{
    title: string
    subTopics?: string[]
  }>
  startX?: number
  startY?: number
}

export interface CreateFlowchartAction extends BaseCanvasAction {
  type: "createFlowchart"
  steps: Array<{
    id: string
    label: string
    kind: "start" | "process" | "decision" | "end"
    next?: string[]
  }>
  startX?: number
  startY?: number
}

export interface CreateTableAction extends BaseCanvasAction {
  type: "createTable"
  title?: string
  headers: string[]
  rows: string[][]
  startX?: number
  startY?: number
}

export interface CreateFlashcardsAction extends BaseCanvasAction {
  type: "createFlashcards"
  cards: Array<{
    question: string
    answer: string
    hint?: string
  }>
  startX?: number
  startY?: number
}

export interface ReuseAssetAction extends BaseCanvasAction {
  type: "reuseAsset"
  assetId: string
  x: number
  y: number
  textReplacements?: Record<string, string>
}

export interface CreateStudyArtifactAction extends BaseCanvasAction {
  type: "createStudyArtifact"
  artifactType: "flashcards" | "mind_map" | "concept_map" | "flowchart" | "timeline" | "quiz" | "revision_board" | "comparison_matrix"
  title: string
  data: Record<string, any>
  startX?: number
  startY?: number
}

export interface AlignNodesAction extends BaseCanvasAction {
  type: "alignNodes"
  edge: "left" | "right" | "hcenter" | "top" | "bottom" | "vcenter"
  nodeIds?: string[]
}

export interface DistributeNodesAction extends BaseCanvasAction {
  type: "distributeNodes"
  axis: "h" | "v"
  nodeIds?: string[]
}

export interface GroupNodesAction extends BaseCanvasAction {
  type: "groupNodes"
  nodeIds: string[]
}

export interface UngroupNodesAction extends BaseCanvasAction {
  type: "ungroupNodes"
  nodeIds?: string[]
}

export interface DuplicateNodesAction extends BaseCanvasAction {
  type: "duplicateNodes"
  nodeIds?: string[]
  offset?: number
}

export interface ReorderNodesAction extends BaseCanvasAction {
  type: "reorderNodes"
  direction: "front" | "back" | "forward" | "backward"
  nodeIds: string[]
}

export interface FlipNodesAction extends BaseCanvasAction {
  type: "flipNodes"
  axis: "x" | "y"
  nodeIds?: string[]
}

export interface ConnectNodesAction extends BaseCanvasAction {
  type: "connectNodes"
  fromNodeId: string
  toNodeId: string
  label?: string
}

export interface GenerateImageAction extends BaseCanvasAction {
  type: "generateImage"
  prompt: string
  aspectRatio?: "1:1" | "16:9" | "4:3" | "3:4" | "9:16"
  x?: number
  y?: number
  w?: number
  h?: number
  src?: string
}

export type CanvasAction =
  | CreateNodeAction
  | UpdateNodeAction
  | DeleteNodeAction
  | MoveNodeAction
  | ArrangeNodesAction
  | CreateMindMapAction
  | CreateFlowchartAction
  | CreateTableAction
  | CreateFlashcardsAction
  | ReuseAssetAction
  | CreateStudyArtifactAction
  | AlignNodesAction
  | DistributeNodesAction
  | GroupNodesAction
  | UngroupNodesAction
  | DuplicateNodesAction
  | ReorderNodesAction
  | FlipNodesAction
  | ConnectNodesAction
  | GenerateImageAction

export interface CanvasActionProposal {
  id: string
  summary: string
  actions: CanvasAction[]
  actionCount: {
    total: number
    create: number
    update: number
    delete: number
    nodesCreated?: number
    nodesUpdated?: number
    nodesDeleted?: number
    arrowsCreated?: number
  }
  generatedAt?: string
}

export type AIActionProposal = CanvasActionProposal

// ---------------------------------------------------------------------------
// Chat & Messages
// ---------------------------------------------------------------------------

export interface AIMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  provider?: AIProviderId
  model?: string
  isStreaming?: boolean
  isError?: boolean
  studentAction?: StudentModeAction
  citations?: CitationReference[]
  actions?: CanvasActionProposal[]
  actionsApplied?: boolean
}

export interface AIChatContext {
  pageName?: string
  selectedNodesCount?: number
  selectedNodesSummary?: string
  canvasSummary?: string
  attachedDocs?: Array<{
    id: string
    name: string
    pageCount?: number
    textSnippet?: string
  }>
}

export interface AIUsageRecord {
  timestamp: number
  providerId: AIProviderId
  modelId: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  estimatedCostUsd: number
  status: "success" | "error"
  errorMessage?: string
}

export interface AIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  estimatedCostUsd?: number
}

export interface AIRequest {
  model?: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  customEndpoint?: string
}

export interface AIResponse {
  id: string
  text: string
  reasoningText?: string
  provider: AIProviderId
  model: string
  citations?: AICitation[]
  actions?: AIActionProposal
  usage?: AIUsage
}

export interface AIStreamChunk {
  text?: string
  done: boolean
  citations?: AICitation[]
  actions?: AIActionProposal
  error?: string
}

// ---------------------------------------------------------------------------
// Native Agent Tool & Orchestration Types
// ---------------------------------------------------------------------------

export interface AIToolCall {
  id: string
  name: string
  args: Record<string, any>
}

export interface AIToolResult {
  tool: string
  success: boolean
  message: string
  actions?: CanvasAction[]
  data?: any
  error?: string
}

export type OrchestrationStatus =
  | "idle"
  | "preparing"
  | "generating"
  | "executing"
  | "completed"
  | "error"
  | "success"
  | "clarification_needed"

export interface AIOrchestrationResponse {
  finalText: string
  toolCalls?: AIToolCall[]
  toolResults?: AIToolResult[]
  canvasChanges?: CanvasActionProposal | CanvasAction[] | null
  artifacts?: any[]
  citations?: CitationReference[]
  status: OrchestrationStatus
  error?: string | any

  // Compatibility aliases
  text?: string
  proposals?: CanvasActionProposal[]
  actions?: CanvasActionProposal[]
  providerUsed?: AIProviderId
  modelUsed?: string
}


