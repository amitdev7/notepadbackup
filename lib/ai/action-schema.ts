// ---------------------------------------------------------------------------
// Zenith AI — Action Schema Validator & Parser
// ---------------------------------------------------------------------------

import type { CanvasAction, CanvasActionProposal } from "./types"

const VALID_ACTION_TYPES = new Set([
  "createNode",
  "updateNode",
  "deleteNode",
  "moveNode",
  "arrangeNodes",
  "createDiagram",
  "createMindMap",
  "createFlowchart",
  "createTable",
  "createFlashcards",
  "reuseAsset",
  "createStudyArtifact",
  "alignNodes",
  "distributeNodes",
  "groupNodes",
  "ungroupNodes",
  "duplicateNodes",
  "reorderNodes",
  "flipNodes",
  "connectNodes",
  "generateImage",
])

const VALID_NODE_TYPES = new Set([
  "shape",
  "text",
  "component",
  "arrow",
  "draw",
  "image",
  "pdf",
])

/**
 * Normalizes tool calls (e.g. { tool: "add_text", parameters: { ... } })
 * into standard CanvasAction objects.
 */
export function normalizeToolToAction(raw: any): CanvasAction | null {
  if (!raw || typeof raw !== "object") return null

  // If already a standard CanvasAction
  if (raw.type && VALID_ACTION_TYPES.has(raw.type)) {
    return raw as CanvasAction
  }

  const toolName = raw.tool || raw.name || raw.function || raw.action
  const params = raw.parameters || raw.arguments || raw.args || raw.props || raw

  if (!toolName || typeof toolName !== "string") return null

  switch (toolName.toLowerCase()) {
    case "add_text":
    case "create_text": {
      return {
        type: "createNode",
        nodeType: "text",
        text: params.text || "Text",
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        w: params.w,
        h: params.h,
        fontSize: params.fontSize || 16,
        bold: params.bold,
        align: params.align || "left",
      }
    }

    case "add_rectangle":
    case "add_circle":
    case "add_line":
    case "add_shape":
    case "create_shape": {
      const shapeKind =
        toolName === "add_circle"
          ? "circle"
          : toolName === "add_line"
          ? "line"
          : params.shapeKind || params.shape || "rect"
      return {
        type: "createNode",
        nodeType: "shape",
        shapeKind: shapeKind as any,
        shape: shapeKind as any,
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        w: params.w || (shapeKind === "circle" ? 120 : shapeKind === "line" ? 180 : 160),
        h: params.h || (shapeKind === "circle" ? 120 : shapeKind === "line" ? 20 : 90),
        tone: params.tone || params.fill || "none",
        fill: params.fill || params.tone || "none",
      }
    }

    case "add_arrow":
    case "create_arrow": {
      return {
        type: "createNode",
        nodeType: "arrow",
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        w: params.w || 140,
        h: params.h || 40,
        points: params.points,
      }
    }

    case "draw_ink":
    case "add_ink": {
      return {
        type: "createNode",
        nodeType: "draw",
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        points: params.points || [[0, 0], [20, 20]],
      }
    }

    case "create_component":
    case "add_component": {
      return {
        type: "createNode",
        nodeType: "component",
        componentKind: params.componentKind || params.kind || "button",
        kind: params.componentKind || params.kind || "button",
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        w: params.w || 200,
        h: params.h || 120,
        props: params.props,
      }
    }

    case "create_frame": {
      return {
        type: "createNode",
        nodeType: "component",
        componentKind: "window",
        kind: "window",
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        w: params.w || 480,
        h: params.h || 320,
        props: { title: params.name || "Frame" },
      }
    }

    case "move_node": {
      return {
        type: "moveNode",
        nodeId: params.nodeId,
        dx: typeof params.dx === "number" ? params.dx : 0,
        dy: typeof params.dy === "number" ? params.dy : 0,
      }
    }

    case "delete_node": {
      const nodeIds = Array.isArray(params.nodeIds)
        ? params.nodeIds
        : params.nodeId
        ? [params.nodeId]
        : []
      return {
        type: "deleteNode",
        nodeIds,
      }
    }

    case "align_nodes": {
      return {
        type: "alignNodes",
        edge: params.edge || "left",
        nodeIds: params.nodeIds,
      }
    }

    case "distribute_nodes": {
      return {
        type: "distributeNodes",
        axis: params.axis || "h",
        nodeIds: params.nodeIds,
      }
    }

    case "group_nodes": {
      return {
        type: "groupNodes",
        nodeIds: params.nodeIds || [],
      }
    }

    case "ungroup_nodes": {
      return {
        type: "ungroupNodes",
        nodeIds: params.nodeIds,
      }
    }

    case "duplicate_nodes": {
      return {
        type: "duplicateNodes",
        nodeIds: params.nodeIds,
        offset: params.offset || 20,
      }
    }

    case "reorder_nodes": {
      return {
        type: "reorderNodes",
        direction: params.direction || "front",
        nodeIds: params.nodeIds || [],
      }
    }

    case "flip_nodes": {
      return {
        type: "flipNodes",
        axis: params.axis || "x",
        nodeIds: params.nodeIds,
      }
    }

    case "connect_nodes": {
      return {
        type: "connectNodes",
        fromNodeId: params.fromNodeId,
        toNodeId: params.toNodeId,
        label: params.label,
      }
    }

    case "create_mind_map": {
      const rawBranches = Array.isArray(params.branches) && params.branches.length
        ? params.branches
        : ["Branch 1", "Branch 2"]
      return {
        type: "createMindMap",
        rootTopic: params.rootTopic || params.topic || "Topic",
        branches: rawBranches.map((b: unknown) =>
          typeof b === "string" ? { title: b, subTopics: [] } : b
        ),
        startX: params.startX,
        startY: params.startY,
      }
    }

    case "create_flowchart": {
      const rawSteps = Array.isArray(params.steps) && params.steps.length
        ? params.steps
        : [{ label: "Start", kind: "start" }, { label: "End", kind: "end" }]
      let n = 0
      return {
        type: "createFlowchart",
        steps: rawSteps.map((s: unknown) => {
          if (typeof s === "string") return { id: `step-${n++}`, label: s, kind: "process" }
          const o = (s ?? {}) as Record<string, unknown>
          return {
            id: typeof o.id === "string" && o.id ? o.id : `step-${n++}`,
            label: typeof o.label === "string" ? o.label : "Step",
            kind: o.kind === "step" ? "process" : (o.kind ?? "process"),
          }
        }),
        startX: params.startX,
        startY: params.startY,
      }
    }

    case "create_study_table":
    case "create_table": {
      return {
        type: "createTable",
        title: params.title,
        headers: params.headers || ["Col 1", "Col 2"],
        rows: params.rows || [["A", "B"]],
        startX: params.startX,
        startY: params.startY,
      }
    }

    case "create_flashcards": {
      return {
        type: "createFlashcards",
        cards: params.cards || [{ question: "Question?", answer: "Answer" }],
        startX: params.startX,
        startY: params.startY,
      }
    }

    case "reuse_saved_asset":
    case "reuse_asset": {
      return {
        type: "reuseAsset",
        assetId: params.assetId,
        x: typeof params.x === "number" ? params.x : 100,
        y: typeof params.y === "number" ? params.y : 100,
        textReplacements: params.textReplacements,
      }
    }

    case "create_study_artifact": {
      return {
        type: "createStudyArtifact",
        artifactType: params.artifactType || "flashcards",
        title: params.title || "Study Artifact",
        data: params.data || {},
        startX: params.startX,
        startY: params.startY,
      }
    }

    case "generate_image":
    case "create_image":
    case "make_image":
    case "ai_image": {
      return {
        type: "generateImage",
        prompt: params.prompt || params.description || params.query || "AI Image",
        aspectRatio: params.aspectRatio || "1:1",
        x: typeof params.x === "number" ? params.x : undefined,
        y: typeof params.y === "number" ? params.y : undefined,
        w: params.w || params.width,
        h: params.h || params.height,
        src: params.src || params.imageUrl,
      }
    }

    default:
      return null
  }
}

/**
 * Validates a single canvas action object.
 */
export function validateCanvasAction(action: any): { valid: boolean; error?: string; action?: CanvasAction } {
  if (!action || typeof action !== "object") {
    return { valid: false, error: "Action must be a non-null object." }
  }

  // Attempt normalization from tool call if type is missing or not a known action
  let act = action
  if (!VALID_ACTION_TYPES.has(act.type)) {
    const normalized = normalizeToolToAction(act)
    if (normalized) {
      act = normalized
    } else {
      return { valid: false, error: `Invalid action type: ${act.type || act.tool || act.name}` }
    }
  }

  switch (act.type) {
    case "createNode": {
      if (!VALID_NODE_TYPES.has(act.nodeType)) {
        return { valid: false, error: `Invalid nodeType: ${act.nodeType}` }
      }
      if (typeof act.x !== "number" || typeof act.y !== "number") {
        return { valid: false, error: "createNode requires numeric x and y coordinates." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "updateNode": {
      if (!act.nodeId || typeof act.nodeId !== "string") {
        return { valid: false, error: "updateNode requires a valid string nodeId." }
      }
      if (!act.patch || typeof act.patch !== "object") {
        return { valid: false, error: "updateNode requires a patch object." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "deleteNode": {
      if (act.all === true) {
        return { valid: true, action: act as CanvasAction }
      }
      if (!Array.isArray(act.nodeIds) || act.nodeIds.length === 0) {
        return { valid: false, error: "deleteNode requires a non-empty nodeIds array." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "moveNode": {
      if (!act.nodeId || typeof act.dx !== "number" || typeof act.dy !== "number") {
        return { valid: false, error: "moveNode requires nodeId and numeric dx, dy." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "arrangeNodes": {
      if (!Array.isArray(act.nodeIds)) {
        return { valid: false, error: "arrangeNodes requires nodeIds array." }
      }
      if (!["grid", "horizontal", "vertical"].includes(act.layout)) {
        return { valid: false, error: "arrangeNodes layout must be 'grid', 'horizontal', or 'vertical'." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "createMindMap": {
      if (!act.rootTopic || typeof act.rootTopic !== "string") {
        return { valid: false, error: "createMindMap requires rootTopic string." }
      }
      if (!Array.isArray(act.branches)) {
        return { valid: false, error: "createMindMap requires branches array." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "createFlowchart": {
      if (!Array.isArray(act.steps) || act.steps.length === 0) {
        return { valid: false, error: "createFlowchart requires non-empty steps array." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "createTable": {
      if (!Array.isArray(act.headers) || !Array.isArray(act.rows)) {
        return { valid: false, error: "createTable requires headers and rows arrays." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "createFlashcards": {
      if (!Array.isArray(act.cards) || act.cards.length === 0) {
        return { valid: false, error: "createFlashcards requires non-empty cards array." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "reuseAsset": {
      if (!act.assetId || typeof act.assetId !== "string") {
        return { valid: false, error: "reuseAsset requires assetId string." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "createStudyArtifact": {
      if (!act.artifactType || !act.title || !act.data) {
        return { valid: false, error: "createStudyArtifact requires artifactType, title, and data." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "alignNodes": {
      if (!["left", "right", "hcenter", "top", "bottom", "vcenter"].includes(act.edge)) {
        return { valid: false, error: "alignNodes requires a valid edge." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "distributeNodes": {
      if (!["h", "v"].includes(act.axis)) {
        return { valid: false, error: "distributeNodes axis must be 'h' or 'v'." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "groupNodes": {
      if (!Array.isArray(act.nodeIds) || act.nodeIds.length < 2) {
        return { valid: false, error: "groupNodes requires at least 2 nodeIds." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "ungroupNodes": {
      return { valid: true, action: act as CanvasAction }
    }

    case "duplicateNodes": {
      return { valid: true, action: act as CanvasAction }
    }

    case "reorderNodes": {
      if (!["front", "back", "forward", "backward"].includes(act.direction)) {
        return { valid: false, error: "reorderNodes direction must be 'front', 'back', 'forward', or 'backward'." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "flipNodes": {
      if (!["x", "y"].includes(act.axis)) {
        return { valid: false, error: "flipNodes axis must be 'x' or 'y'." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "connectNodes": {
      if (!act.fromNodeId || !act.toNodeId) {
        return { valid: false, error: "connectNodes requires fromNodeId and toNodeId." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    case "generateImage": {
      if (!act.prompt || typeof act.prompt !== "string") {
        return { valid: false, error: "generateImage requires a prompt string." }
      }
      return { valid: true, action: act as CanvasAction }
    }

    default:
      return { valid: true, action: act as CanvasAction }
  }
}

/**
 * Bulletproof cleaner that removes any internal action syntax, zenith-actions blocks,
 * tool call JSON, parameter dumps, or protocol tags from user-visible AI output.
 */
export function cleanVisibleAIOutput(text: string): string {
  if (!text) return ""

  let clean = text

  // 1. Remove ```zenith-actions ... ``` blocks (any number of backticks or tildes, with or without closing)
  clean = clean.replace(/(?:```+|~~~+)(?:zenith[-_]?actions|zenithsui[-_]?actions|actions|canvas[-_]?actions|json:zenithsui-actions|json:actions)[\s\S]*?(?:```+|~~~+|$)/gi, "")

  // 2. Remove code blocks that contain action / tool payloads
  clean = clean.replace(/(?:```+|~~~+)(?:json)?\s*[\r\n]*([\s\S]*?)(?:```+|~~~+|$)/gi, (fullMatch, inner) => {
    const trimmed = (inner || "").trim()
    if (
      trimmed.includes('"tool"') ||
      trimmed.includes('"nodeType"') ||
      trimmed.includes('"createNode"') ||
      trimmed.includes('"updateNode"') ||
      trimmed.includes('"deleteNode"') ||
      trimmed.includes('"moveNode"') ||
      trimmed.includes('"action"') ||
      trimmed.includes('"parameters"') ||
      trimmed.includes('"actions"') ||
      trimmed.includes('"add_text"') ||
      trimmed.includes('"add_shape"') ||
      trimmed.includes('"add_arrow"')
    ) {
      return ""
    }
    return fullMatch
  })

  // 3. Remove raw unbracketed JSON arrays of tool calls or actions: [ { "tool": ... } ]
  clean = clean.replace(/\[\s*\{[\s\S]*?"(?:tool|type|action|nodeType|parameters)"[\s\S]*?\}\s*\]/gi, "")

  // 4. Remove raw single JSON tool/action objects: { "tool": ... } or { "actions": [...] }
  clean = clean.replace(/\{\s*"(?:tool|actions|action|nodeType)"\s*:\s*[\s\S]*?\}/gi, "")

  // 5. Remove internal XML-like tags such as <tool_call>, <action>, <internal>
  clean = clean.replace(/<\/?(?:tool_call|tool_calls|action|actions|zenith-actions|zenithsui-actions|thought|parameters|internal)[^>]*>/gi, "")

  // 6. Remove lingering references to internal action execution artifacts
  clean = clean.replace(/You can instantly generate and place these hand-drawn mind map nodes directly on your canvas using the button below\./gi, "")
  clean = clean.replace(/propose action JSON blocks using ```zenith-actions\./gi, "")

  // 7. Clean up excessive whitespace and double newlines
  clean = clean
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return clean
}

/**
 * Fallback synthesizer that inspects the user's prompt (or conversational response)
 * and constructs a valid CanvasActionProposal if the LLM omitted the explicit zenith-actions JSON block.
 */
export function synthesizeFallbackProposal(
  userPrompt?: string,
  responseText?: string
): CanvasActionProposal | null {
  const combined = `${userPrompt || ""} ${responseText || ""}`.trim()
  if (!combined) return null

  const lower = combined.toLowerCase()
  const actions: CanvasAction[] = []

  // 1. Check for text writing intent (e.g. "write hello on canvas", "write 'hii guys'", "write text: ...")
  if (
    lower.includes("write ") ||
    lower.includes("type ") ||
    lower.includes("add text") ||
    lower.includes("put text") ||
    lower.includes("saying ") ||
    lower.includes("text:") ||
    lower.includes("added '") ||
    lower.includes('added "') ||
    lower.includes("wrote '") ||
    lower.includes('wrote "')
  ) {
    let extractedText = ""

    // Try extracting quoted text first: "...", '...', “...”, ‘...’
    const quoteMatch = combined.match(/["'“‘]([^"'“”‘’]{1,500})["'”’]/)
    if (quoteMatch && quoteMatch[1]?.trim()) {
      extractedText = quoteMatch[1].trim()
    } else {
      // Try regex matching after write / type / text
      const textMatch = combined.match(/(?:write|type|add text|saying|text:)\s+(?:on (?:the )?canvas\s+)?([^\n.,;!?]{1,120})/i)
      if (textMatch && textMatch[1]?.trim()) {
        extractedText = textMatch[1]
          .replace(/on (?:the )?canvas/gi, "")
          .replace(/to (?:the )?canvas/gi, "")
          .trim()
      }
    }

    if (extractedText && extractedText.length > 0) {
      actions.push({
        type: "createNode",
        nodeType: "text",
        text: extractedText,
        x: 200,
        y: 150,
        fontSize: extractedText.length > 40 ? 15 : 18,
        bold: true,
      } as any)

      return {
        id: `proposal_${Date.now()}_fallback`,
        summary: `Add text: "${extractedText.length > 25 ? extractedText.slice(0, 22) + "..." : extractedText}"`,
        actions,
        actionCount: { total: 1, create: 1, update: 0, delete: 0 },
        generatedAt: new Date().toISOString(),
      }
    }
  }

  // 2. Check for shape creation (rectangle, circle, ellipse, line, arrow)
  if (lower.includes("draw ") || lower.includes("create shape") || lower.includes("add shape") || lower.includes("make a circle") || lower.includes("draw a box")) {
    let shapeKind: "rect" | "circle" | "ellipse" | "line" = "rect"
    if (lower.includes("circle")) shapeKind = "circle"
    else if (lower.includes("ellipse") || lower.includes("oval")) shapeKind = "ellipse"
    else if (lower.includes("line")) shapeKind = "line"

    actions.push({
      type: "createNode",
      nodeType: "shape",
      shape: shapeKind,
      shapeKind: shapeKind,
      fill: "paper",
      x: 180,
      y: 140,
      w: shapeKind === "circle" ? 140 : shapeKind === "line" ? 180 : 200,
      h: shapeKind === "circle" ? 140 : shapeKind === "line" ? 20 : 120,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_shape`,
      summary: `Draw ${shapeKind} on canvas`,
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 3. Check for component creation (button, input, card, etc.)
  if (lower.includes("button") || lower.includes("input") || lower.includes("card") || lower.includes("navbar") || lower.includes("modal")) {
    let kind = "card"
    if (lower.includes("button")) kind = "button"
    else if (lower.includes("input") || lower.includes("text field")) kind = "input"
    else if (lower.includes("navbar") || lower.includes("header")) kind = "navbar"
    else if (lower.includes("modal") || lower.includes("dialog")) kind = "modal"

    // Extract button or component label if quoted
    const labelMatch = combined.match(/["'“‘]([^"'“”‘’]{1,100})["'”’]/)
    const label = labelMatch ? labelMatch[1].trim() : kind === "button" ? "Submit" : "Title"

    actions.push({
      type: "createNode",
      nodeType: "component",
      kind,
      props: { label, title: label },
      x: 180,
      y: 150,
      w: kind === "button" ? 140 : kind === "navbar" ? 400 : 220,
      h: kind === "button" ? 44 : kind === "navbar" ? 54 : 140,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_comp`,
      summary: `Add ${kind} component to canvas`,
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 4. Check for Mind Map
  if (lower.includes("mind map") || lower.includes("mindmap") || lower.includes("concept map")) {
    const topicMatch = combined.match(/(?:mind\s*map|concept\s*map)(?:\s+(?:of|on|about|for)\s+([^\n.,;!?]{1,80}))?/i)
    const topic = topicMatch && topicMatch[1] ? topicMatch[1].trim() : "Core Concept"
    actions.push({
      type: "createMindMap",
      rootTopic: topic,
      branches: [
        { title: "Key Principles", subTopics: ["Core Idea", "Application"] },
        { title: "Components", subTopics: ["Structure", "Process"] },
        { title: "Outcomes", subTopics: ["Impact", "Summary"] },
      ],
      startX: 200,
      startY: 180,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_mindmap`,
      summary: `Create Mind Map for "${topic}"`,
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 5. Check for Flowchart
  if (lower.includes("flowchart") || lower.includes("flow chart") || lower.includes("process diagram")) {
    actions.push({
      type: "createFlowchart",
      steps: [
        { id: "1", label: "Start Process", kind: "start", next: ["2"] },
        { id: "2", label: "Execute Step", kind: "step", next: ["3"] },
        { id: "3", label: "Condition Met?", kind: "decision", next: ["4", "5"] },
        { id: "4", label: "Success Action", kind: "step", next: ["6"] },
        { id: "5", label: "Fallback Action", kind: "step", next: ["6"] },
        { id: "6", label: "Complete", kind: "end" },
      ],
      startX: 220,
      startY: 120,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_flowchart`,
      summary: "Create Process Flowchart",
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 6. Check for Flashcards
  if (lower.includes("flashcard") || lower.includes("flashcards") || lower.includes("study cards")) {
    actions.push({
      type: "createFlashcards",
      cards: [
        { question: "Key Concept 1", answer: "Definition and fundamental principle", hint: "Core definition" },
        { question: "Key Concept 2", answer: "Practical application and example", hint: "Real-world usage" },
      ],
      startX: 150,
      startY: 120,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_flashcards`,
      summary: "Create Study Flashcards",
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 7. Check for Canvas Clearing or Deletion (Min to Max scale: Canvas Operations)
  if (lower.includes("clear canvas") || lower.includes("delete everything") || lower.includes("remove all") || lower.includes("delete all nodes")) {
    actions.push({
      type: "deleteNode",
      nodeIds: [],
      all: true,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_clear`,
      summary: "Clear all elements from canvas",
      actions,
      actionCount: { total: 1, create: 0, update: 0, delete: 1 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 8. Check for Complex Wireframe / UI Screen (Max Scale: Full Page & Screen Mockups)
  if (
    lower.includes("login screen") ||
    lower.includes("login form") ||
    lower.includes("sign in screen") ||
    lower.includes("auth screen")
  ) {
    // Construct entire login UI wireframe
    const startX = 200
    const startY = 100
    actions.push(
      // Frame
      { type: "createNode", nodeType: "shape", shape: "rect", fill: "paper", x: startX, y: startY, w: 340, h: 420 } as any,
      // Title
      { type: "createNode", nodeType: "text", text: "Welcome Back", fontSize: 20, bold: true, align: "center", x: startX + 20, y: startY + 25, w: 300, h: 32 } as any,
      { type: "createNode", nodeType: "text", text: "Please enter your credentials to sign in", fontSize: 12, align: "center", x: startX + 20, y: startY + 60, w: 300, h: 24 } as any,
      // Email Field
      { type: "createNode", nodeType: "text", text: "Email Address", fontSize: 12, bold: true, x: startX + 30, y: startY + 105, w: 120, h: 20 } as any,
      { type: "createNode", nodeType: "component", kind: "input", props: { placeholder: "name@example.com" }, x: startX + 30, y: startY + 130, w: 280, h: 40 } as any,
      // Password Field
      { type: "createNode", nodeType: "text", text: "Password", fontSize: 12, bold: true, x: startX + 30, y: startY + 185, w: 120, h: 20 } as any,
      { type: "createNode", nodeType: "component", kind: "input", props: { placeholder: "••••••••" }, x: startX + 30, y: startY + 210, w: 280, h: 40 } as any,
      // Sign In Button
      { type: "createNode", nodeType: "component", kind: "button", props: { label: "Sign In", variant: "primary" }, x: startX + 30, y: startY + 275, w: 280, h: 44 } as any,
      // Forgot Password Link
      { type: "createNode", nodeType: "text", text: "Forgot password?  •  Create account", fontSize: 12, align: "center", x: startX + 20, y: startY + 340, w: 300, h: 24 } as any
    )

    return {
      id: `proposal_${Date.now()}_fallback_login`,
      summary: "Create Login Screen Wireframe",
      actions,
      actionCount: { total: actions.length, create: actions.length, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 9. Check for Dashboard Layout Wireframe (Max Scale: Multi-component dashboard)
  if (lower.includes("dashboard") || lower.includes("admin panel") || lower.includes("analytics layout")) {
    const startX = 140
    const startY = 80
    actions.push(
      // Navbar
      { type: "createNode", nodeType: "component", kind: "navbar", props: { title: "Zenithsui Dashboard" }, x: startX, y: startY, w: 720, h: 54 } as any,
      // Sidebar
      { type: "createNode", nodeType: "component", kind: "sidebar", props: { title: "Navigation" }, x: startX, y: startY + 65, w: 160, h: 360 } as any,
      // Metric Cards
      { type: "createNode", nodeType: "component", kind: "card", props: { title: "Total Users", label: "12,450 (+14%)" }, x: startX + 180, y: startY + 65, w: 165, h: 100 } as any,
      { type: "createNode", nodeType: "component", kind: "card", props: { title: "Revenue", label: "$48,200 (+8%)" }, x: startX + 360, y: startY + 65, w: 165, h: 100 } as any,
      { type: "createNode", nodeType: "component", kind: "card", props: { title: "Active Sessions", label: "1,890 live" }, x: startX + 540, y: startY + 65, w: 160, h: 100 } as any,
      // Main Chart Area
      { type: "createNode", nodeType: "shape", shape: "rect", fill: "light", x: startX + 180, y: startY + 180, w: 520, h: 245 } as any,
      { type: "createNode", nodeType: "text", text: "Activity & Performance Trends", fontSize: 14, bold: true, x: startX + 200, y: startY + 195, w: 260, h: 24 } as any
    )

    return {
      id: `proposal_${Date.now()}_fallback_dashboard`,
      summary: "Create Dashboard Wireframe",
      actions,
      actionCount: { total: actions.length, create: actions.length, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 10. Check for Layout Arrangement (Arrange in Grid, Horizontal, Vertical)
  if (lower.includes("arrange") || lower.includes("organize nodes") || lower.includes("layout nodes")) {
    let layout: "grid" | "horizontal" | "vertical" = "grid"
    if (lower.includes("horizont")) layout = "horizontal"
    else if (lower.includes("vertic")) layout = "vertical"

    actions.push({
      type: "arrangeNodes",
      nodeIds: [],
      layout,
      spacing: 30,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_arrange`,
      summary: `Arrange nodes in ${layout} layout`,
      actions,
      actionCount: { total: 1, create: 0, update: 1, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 11. Check for Alignment Actions
  if (lower.includes("align left") || lower.includes("align right") || lower.includes("align center") || lower.includes("align top") || lower.includes("align bottom")) {
    let edge: "left" | "right" | "hcenter" | "top" | "bottom" | "vcenter" = "hcenter"
    if (lower.includes("left")) edge = "left"
    else if (lower.includes("right")) edge = "right"
    else if (lower.includes("top")) edge = "top"
    else if (lower.includes("bottom")) edge = "bottom"

    actions.push({
      type: "alignNodes",
      edge,
      nodeIds: [],
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_align`,
      summary: `Align nodes to ${edge}`,
      actions,
      actionCount: { total: 1, create: 0, update: 1, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  // 12. Check for AI Image Generation Request
  const isImageRequest =
    lower.includes("generate image") ||
    lower.includes("create image") ||
    lower.includes("make an image") ||
    lower.includes("ai image") ||
    lower.includes("draw an image") ||
    lower.includes("generate picture") ||
    lower.includes("create picture") ||
    lower.includes("make a picture") ||
    lower.includes("generate a photo") ||
    lower.includes("create photo") ||
    lower.includes("paint an image") ||
    lower.includes("generate art") ||
    lower.includes("generate an image") ||
    lower.includes("picture of") ||
    lower.includes("photo of") ||
    lower.includes("illustration of")

  if (isImageRequest) {
    let promptSubject = userPrompt || "AI Image"
    // Strip common trigger phrases to isolate the subject
    promptSubject = promptSubject
      .replace(/^(can you |please |could you |i want to |i said |ai )+/i, "")
      .replace(/^(generate|create|make|draw|paint|sketch|give me|put|add) (an |a )?(ai )?(image|picture|photo|illustration|art|wallpaper) (of|showing|about|with)?/i, "")
      .replace(/(and )?(put|place|add|draw|insert) (it |that )?(on |to |onto |in )?(the )?canvas/i, "")
      .replace(/(on |to |onto |in )?(the )?canvas/i, "")
      .trim()

    if (!promptSubject) promptSubject = "AI Generated Visual Illustration"

    actions.push({
      type: "generateImage",
      prompt: promptSubject,
      aspectRatio: "1:1",
      w: 260,
      h: 260,
    } as any)

    return {
      id: `proposal_${Date.now()}_fallback_image`,
      summary: `Generate AI Image: ${promptSubject}`,
      actions,
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }
  }

  return null
}

/**
 * Extracts and parses internal canvas actions or tool calls from AI model responses,
 * with optional fallback synthesis from user prompt.
 */
export function extractActionProposals(
  responseText: string,
  userPrompt?: string
): {
  cleanText: string
  proposals: CanvasActionProposal[]
} {
  const proposals: CanvasActionProposal[] = []
  if (!responseText && !userPrompt) {
    return { cleanText: "", proposals: [] }
  }

  // 1. Extract any valid action blocks from ```zenith-actions, ```actions, ```json blocks
  const actionBlockRegex = /(?:```+|~~~+)(?:zenith[-_]?actions|zenithsui[-_]?actions|actions|canvas[-_]?actions|json:zenithsui-actions|json:actions|json)?\s*[\r\n]*([\s\S]*?)(?:```+|~~~+|$)/gi
  let match: RegExpExecArray | null

  while ((match = actionBlockRegex.exec(responseText || "")) !== null) {
    const rawContent = match[1]?.trim()
    if (!rawContent) continue

    try {
      const parsed = JSON.parse(rawContent)
      const actionsRaw = Array.isArray(parsed)
        ? parsed
        : parsed.actions || (parsed.type || parsed.tool ? [parsed] : null)

      if (actionsRaw && Array.isArray(actionsRaw)) {
        const validatedActions: CanvasAction[] = []
        let createCount = 0
        let updateCount = 0
        let deleteCount = 0

        for (const act of actionsRaw) {
          const res = validateCanvasAction(act)
          if (res.valid && res.action) {
            validatedActions.push(res.action)
            if (res.action.type.startsWith("create")) createCount++
            else if (
              res.action.type.startsWith("update") ||
              res.action.type.startsWith("move") ||
              res.action.type.startsWith("arrange") ||
              res.action.type.startsWith("align") ||
              res.action.type.startsWith("distribute")
            )
              updateCount++
            else if (res.action.type.startsWith("delete")) deleteCount++
          }
        }

        if (validatedActions.length > 0) {
          proposals.push({
            id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            summary:
              parsed.summary ||
              (validatedActions.length === 1 && validatedActions[0].type === "createNode" && (validatedActions[0] as any).text
                ? `Add text: ${(validatedActions[0] as any).text}`
                : `${validatedActions.length} Canvas Action${validatedActions.length > 1 ? "s" : ""}`),
            actions: validatedActions,
            actionCount: {
              total: validatedActions.length,
              create: createCount,
              update: updateCount,
              delete: deleteCount,
            },
            generatedAt: new Date().toISOString(),
          })
        }
      }
    } catch {
      // Ignore parse errors on non-action JSON blocks
    }
  }

  // 2. Also check for raw unbracketed JSON arrays of actions if no proposals found yet
  if (proposals.length === 0 && responseText) {
    const rawArrayMatch = responseText.match(/\[\s*\{[\s\S]*?"(?:tool|type|nodeType)"[\s\S]*?\}\s*\]/)
    if (rawArrayMatch) {
      try {
        const parsed = JSON.parse(rawArrayMatch[0])
        if (Array.isArray(parsed)) {
          const validatedActions: CanvasAction[] = []
          for (const item of parsed) {
            const res = validateCanvasAction(item)
            if (res.valid && res.action) {
              validatedActions.push(res.action)
            }
          }
          if (validatedActions.length > 0) {
            proposals.push({
              id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              summary: `${validatedActions.length} Canvas Action${validatedActions.length > 1 ? "s" : ""}`,
              actions: validatedActions,
              actionCount: {
                total: validatedActions.length,
                create: validatedActions.filter((a) => a.type.startsWith("create")).length,
                update: validatedActions.filter((a) => !a.type.startsWith("create") && !a.type.startsWith("delete")).length,
                delete: validatedActions.filter((a) => a.type.startsWith("delete")).length,
              },
              generatedAt: new Date().toISOString(),
            })
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // 3. Fallback Synthesis if no structured proposals were extracted and user requested canvas action
  if (proposals.length === 0) {
    const fallback = synthesizeFallbackProposal(userPrompt, responseText)
    if (fallback) {
      proposals.push(fallback)
    }
  }

  // STRICT USER-VISIBLE ISOLATION:
  // Clean all action syntax from the output so the user never sees raw JSON or zenith-actions
  let cleanText = cleanVisibleAIOutput(responseText || "")

  // If cleanText is empty because the entire response was just an action block,
  // generate an appropriate friendly confirmation
  if (!cleanText && proposals.length > 0) {
    const firstAct = proposals[0].actions[0]
    if (firstAct && firstAct.type === "createNode" && (firstAct as any).nodeType === "text") {
      cleanText = `Added "${(firstAct as any).text || "text"}" to the canvas.`
    } else if (firstAct && firstAct.type === "createNode" && (firstAct as any).nodeType === "shape") {
      cleanText = `Added ${(firstAct as any).shape || "shape"} to the canvas.`
    } else {
      cleanText = `${proposals[0].summary} applied to the canvas.`
    }
  }

  return { cleanText, proposals }
}

