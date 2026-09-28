// ---------------------------------------------------------------------------
// Zenith AI — Explicit Tool Registry & Execution System
// ---------------------------------------------------------------------------

import type { CanvasAction } from "./types"
import { searchAll, ALL_DEFS } from "../library/registry"
import { AssetMemory } from "./asset-memory"
import { StudyCopilotEngine } from "./study-copilot"
import { AccountSecurityBoundary } from "./account-boundary"
import { AIImageService } from "./image-service"

export interface ToolParameterSchema {
  type: string
  properties: Record<
    string,
    {
      type: string
      description: string
      enum?: string[]
      items?: any
      required?: boolean
    }
  >
  required?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  category: "canvas" | "component" | "study" | "asset" | "workspace" | "account"
  parameters: ToolParameterSchema
  requiresConfirmation?: boolean
  handler: (args: any, context: ToolExecutionContext) => Promise<ToolExecutionResult> | ToolExecutionResult
}

export interface ToolExecutionContext {
  nodes: Record<string, any>
  order: string[]
  selection: string[]
  viewport?: { x: number; y: number; zoom: number }
  fileName?: string
  userId?: string
  isReadOnly?: boolean
  permissionRole?: string
  shareConfig?: any
  currentTeamDetails?: any
  teams?: any[]
}

export interface ToolExecutionResult {
  success: boolean
  message: string
  actions?: CanvasAction[]
  data?: any
  error?: string
}

// ---------------------------------------------------------------------------
// Tool Implementations
// ---------------------------------------------------------------------------

/** headers[i] or "" — table aliases index straight into the header row. */
function headerAt(headers: unknown, i: number): string {
  return Array.isArray(headers) && typeof headers[i] === "string" ? (headers[i] as string) : ""
}

/** Fold a {headers, rows} table back into comparison attributes. */
function headersRowsToAttributes(
  headers: unknown,
  rows: unknown
): Array<{ attribute: string; valueA: string; valueB: string }> {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const cells = Array.isArray(r) ? r.map((c) => String(c ?? "")) : [String(r ?? "")]
    return {
      attribute: cells[0] || "Feature",
      valueA: cells[1] || "—",
      valueB: cells[2] || "—",
    }
  })
}

export const TOOLS: ToolDefinition[] = [
  // 1. read_canvas
  {
    name: "read_canvas",
    description: "Inspects the active canvas document, returning total node count, element types, layers, and bounding viewport.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: (_args, ctx) => {
      const nodeKeys = Object.keys(ctx.nodes || {})
      const counts: Record<string, number> = {}
      for (const k of nodeKeys) {
        const type = ctx.nodes[k]?.type || "unknown"
        counts[type] = (counts[type] || 0) + 1
      }
      return {
        success: true,
        message: `Canvas "${ctx.fileName || "Untitled"}" has ${nodeKeys.length} objects.`,
        data: {
          documentName: ctx.fileName || "Untitled",
          totalNodes: nodeKeys.length,
          typeCounts: counts,
          selectedCount: (ctx.selection || []).length,
          viewport: ctx.viewport,
        },
      }
    },
  },

  // 2. get_selection
  {
    name: "get_selection",
    description: "Returns full properties and text content of currently selected canvas objects.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: (_args, ctx) => {
      const selected = (ctx.selection || []).map((id) => ctx.nodes[id]).filter(Boolean)
      return {
        success: true,
        message: `${selected.length} object(s) currently selected.`,
        data: {
          count: selected.length,
          items: selected.map((n) => ({
            id: n.id,
            type: n.type,
            x: Math.round(n.x),
            y: Math.round(n.y),
            w: Math.round(n.w),
            h: Math.round(n.h),
            text: n.text,
            kind: n.kind,
            shape: n.shape,
            fill: n.fill,
          })),
        },
      }
    },
  },

  // 3. search_components
  {
    name: "search_components",
    description: "Searches the Zenithsui napkin wireframe component library for available reusable UI blocks (buttons, inputs, cards, tables, heroes, navbars, modals, etc.).",
    category: "component",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword to search components (e.g. 'button', 'card', 'navbar', 'table')" },
      },
      required: ["query"],
    },
    handler: (args) => {
      const query = (args.query || "").trim()
      const defs = query ? searchAll(query) : ALL_DEFS.slice(0, 15)
      return {
        success: true,
        message: `Found ${defs.length} component(s) matching "${query}".`,
        data: defs.slice(0, 12).map((d) => ({
          kind: d.kind,
          name: d.name,
          category: d.category,
          group: d.group,
          defaultSize: d.size,
          controls: d.controls.map((c) => ({ key: c.key, label: c.label, type: c.type })),
        })),
      }
    },
  },

  // 4. create_component
  {
    name: "create_component",
    description: "Places a library component (e.g. 'button', 'card', 'input', 'navbar', 'table') at the specified canvas coordinates.",
    category: "component",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", description: "Component kind from registry (e.g. 'button', 'card', 'input', 'badge')" },
        x: { type: "number", description: "Canvas X coordinate" },
        y: { type: "number", description: "Canvas Y coordinate" },
        w: { type: "number", description: "Width override (optional)" },
        h: { type: "number", description: "Height override (optional)" },
        props: { type: "object", description: "Component properties dictionary (e.g. { label: 'Click Me' })" },
      },
      required: ["kind", "x", "y"],
    },
    handler: (args) => {
      const action: CanvasAction = {
        type: "createNode",
        nodeType: "component",
        x: args.x,
        y: args.y,
        w: args.w,
        h: args.h,
        kind: args.kind,
        props: args.props || {},
      }
      return {
        success: true,
        message: `Created component "${args.kind}" at (${args.x}, ${args.y}).`,
        actions: [action],
      }
    },
  },

  // 5. update_component
  {
    name: "update_component",
    description: "Updates properties or dimensions of an existing component node on the canvas.",
    category: "component",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of the component node to update" },
        propsPatch: { type: "object", description: "Updated component props dictionary" },
        w: { type: "number", description: "New width (optional)" },
        h: { type: "number", description: "New height (optional)" },
      },
      required: ["nodeId"],
    },
    handler: (args, ctx) => {
      const existing = ctx.nodes[args.nodeId]
      if (!existing) {
        return { success: false, message: `Node "${args.nodeId}" does not exist on the canvas.` }
      }
      const patch: Record<string, any> = {}
      if (args.propsPatch) {
        patch.props = { ...(existing.props || {}), ...args.propsPatch }
      }
      if (typeof args.w === "number") patch.w = args.w
      if (typeof args.h === "number") patch.h = args.h

      const action: CanvasAction = {
        type: "updateNode",
        nodeId: args.nodeId,
        patch,
      }
      return {
        success: true,
        message: `Updated component "${args.nodeId}".`,
        actions: [action],
      }
    },
  },

  // 6. add_shape
  {
    name: "add_shape",
    description: "Creates a hand-drawn napkin shape (rectangle, ellipse) on the canvas with optional fill tone.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        shape: { type: "string", enum: ["rect", "ellipse"], description: "Shape kind ('rect' or 'ellipse')" },
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        w: { type: "number", description: "Width" },
        h: { type: "number", description: "Height" },
        fill: { type: "string", enum: ["none", "paper", "light", "strong"], description: "Fill tone ('none', 'paper', 'light', 'strong')" },
      },
      required: ["shape", "x", "y"],
    },
    handler: (args) => {
      const action: CanvasAction = {
        type: "createNode",
        nodeType: "shape",
        shape: args.shape || "rect",
        x: args.x,
        y: args.y,
        w: args.w || 160,
        h: args.h || 90,
        fill: args.fill || "paper",
      } as any
      return {
        success: true,
        message: `Added ${args.shape} at (${args.x}, ${args.y}).`,
        actions: [action],
      }
    },
  },

  // 7. add_text
  {
    name: "add_text",
    description: "Places an editable text label or paragraph on the canvas with typography controls.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text string content" },
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        w: { type: "number", description: "Width (optional)" },
        fontSize: { type: "number", description: "Font size in px (default 16)" },
        bold: { type: "boolean", description: "Whether text is bold" },
        align: { type: "string", enum: ["left", "center", "right"], description: "Text alignment" },
      },
      required: ["text", "x", "y"],
    },
    handler: (args) => {
      const action: CanvasAction = {
        type: "createNode",
        nodeType: "text",
        text: args.text,
        x: args.x,
        y: args.y,
        w: args.w || 200,
        h: 40,
        fontSize: args.fontSize || 16,
        bold: !!args.bold,
        align: args.align || "left",
      } as any
      return {
        success: true,
        message: `Added text at (${args.x}, ${args.y}).`,
        actions: [action],
      }
    },
  },

  // 8. add_arrow
  {
    name: "add_arrow",
    description: "Draws a directed connector arrow or relationship line between coordinates.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        fromX: { type: "number", description: "Starting X coordinate" },
        fromY: { type: "number", description: "Starting Y coordinate" },
        toX: { type: "number", description: "Ending X coordinate" },
        toY: { type: "number", description: "Ending Y coordinate" },
      },
      required: ["fromX", "fromY", "toX", "toY"],
    },
    handler: (args) => {
      const minX = Math.min(args.fromX, args.toX)
      const minY = Math.min(args.fromY, args.toY)
      const w = Math.abs(args.toX - args.fromX) || 10
      const h = Math.abs(args.toY - args.fromY) || 10

      const action: CanvasAction = {
        type: "createNode",
        nodeType: "arrow",
        x: minX,
        y: minY,
        w,
        h,
      } as any
      return {
        success: true,
        message: `Added arrow from (${args.fromX}, ${args.fromY}) to (${args.toX}, ${args.toY}).`,
        actions: [action],
      }
    },
  },

  // 9. move_node
  {
    name: "move_node",
    description: "Shifts a canvas object by relative delta dx, dy.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of the node to move" },
        dx: { type: "number", description: "Horizontal shift delta" },
        dy: { type: "number", description: "Vertical shift delta" },
      },
      required: ["nodeId", "dx", "dy"],
    },
    handler: (args, ctx) => {
      if (!ctx.nodes[args.nodeId]) {
        return { success: false, message: `Node "${args.nodeId}" not found.` }
      }
      return {
        success: true,
        message: `Moved node "${args.nodeId}" by (${args.dx}, ${args.dy}).`,
        actions: [{ type: "moveNode", nodeId: args.nodeId, dx: args.dx, dy: args.dy }],
      }
    },
  },

  // 10. delete_node
  {
    name: "delete_node",
    description: "Safely removes one or more nodes from the canvas.",
    category: "canvas",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        nodeIds: { type: "array", items: { type: "string" }, description: "List of node IDs to delete" },
      },
      required: ["nodeIds"],
    },
    handler: (args) => {
      return {
        success: true,
        message: `Deleted ${args.nodeIds.length} object(s).`,
        actions: [{ type: "deleteNode", nodeIds: args.nodeIds }],
      }
    },
  },

  // 11. create_study_artifact
  {
    name: "create_study_artifact",
    description: "Generates high-yield educational study artifacts on the canvas: flashcards, mind maps, concept maps, flowcharts, timelines, quizzes, revision boards, or comparison tables.",
    category: "study",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        artifactType: {
          type: "string",
          enum: ["flashcards", "mind_map", "concept_map", "flowchart", "timeline", "quiz", "revision_board", "comparison_matrix"],
          description: "Type of study artifact to construct",
        },
        title: { type: "string", description: "Topic or subject header" },
        data: { type: "object", description: "Structured data parameters for the chosen artifact" },
        startX: { type: "number", description: "Placement X coordinate (optional)" },
        startY: { type: "number", description: "Placement Y coordinate (optional)" },
      },
      required: ["artifactType", "title", "data"],
    },
    handler: (args, _ctx) => {
      const startX = typeof args.startX === "number" ? args.startX : 150
      const startY = typeof args.startY === "number" ? args.startY : 150
      let actions: CanvasAction[] = []

      switch (args.artifactType) {
        case "flashcards": {
          const cards = args.data.cards || []
          actions = StudyCopilotEngine.buildFlashcards(cards, startX, startY)
          break
        }
        case "concept_map": {
          actions = StudyCopilotEngine.buildConceptMap(args.title, args.data.concepts || [], startX, startY)
          break
        }
        case "quiz": {
          actions = StudyCopilotEngine.buildQuiz(args.data.questions || [], startX, startY)
          break
        }
        case "comparison_matrix": {
          // create_table aliases arrive as {title, headers, rows}: fold the
          // table body back into attributes so nothing renders empty.
          const attrs = Array.isArray(args.data.attributes) && args.data.attributes.length
            ? args.data.attributes
            : headersRowsToAttributes(args.data.headers, args.data.rows)
          actions = StudyCopilotEngine.buildComparisonMatrix(
            args.data.conceptA || headerAt(args.data.headers, 1) || "A",
            args.data.conceptB || headerAt(args.data.headers, 2) || "B",
            attrs,
            startX,
            startY
          )
          break
        }
        case "mind_map": {
          actions = [
            {
              type: "createMindMap",
              rootTopic: args.title,
              branches: args.data.branches || [],
              startX,
              startY,
            },
          ]
          break
        }
        case "flowchart": {
          actions = [
            {
              type: "createFlowchart",
              steps: args.data.steps || [],
              startX,
              startY,
            },
          ]
          break
        }
        case "timeline": {
          // Instantiate timeline template adapted to the topic
          actions = AssetMemory.instantiate("timeline-milestones", { x: startX, y: startY })
          break
        }
        case "revision_board": {
          actions = AssetMemory.instantiate("exam-revision-board", { x: startX, y: startY })
          break
        }
      }

      return {
        success: true,
        message: `Generated ${args.artifactType} on "${args.title}".`,
        actions,
      }
    },
  },

  // 12. search_saved_assets
  {
    name: "search_saved_assets",
    description: "Performs semantic and tag search across previously saved or pre-seeded reusable components and diagrams before generating from scratch (REUSE BEFORE REGENERATE principle).",
    category: "asset",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Semantic search query (e.g. 'biology diagram', 'login screen', 'pricing section', 'flashcard')" },
        type: { type: "string", description: "Optional asset type filter" },
      },
      required: ["query"],
    },
    handler: (args, ctx) => {
      const results = AssetMemory.search(args.query, { type: args.type, userId: ctx.userId, limit: 4 })
      return {
        success: true,
        message: `Found ${results.length} reusable asset(s) matching "${args.query}".`,
        data: results.map((r) => ({
          id: r.asset.id,
          name: r.asset.name,
          type: r.asset.type,
          tags: r.asset.tags,
          description: r.asset.semanticDescription,
          nodeCount: r.asset.templateNodes.length,
          dimensions: r.asset.dimensions,
          score: Math.round(r.score * 10) / 10,
        })),
      }
    },
  },

  // 13. save_reusable_asset
  {
    name: "save_reusable_asset",
    description: "Saves a group of canvas nodes, a generated diagram, or an imported illustration into the reusable asset memory for future semantic search and instant reuse.",
    category: "asset",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Descriptive name for the asset" },
        type: { type: "string", description: "Asset type ('component', 'diagram', 'flashcards', 'flowchart', 'ui_block')" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization and discovery" },
        semanticDescription: { type: "string", description: "Natural language explanation of the asset" },
        nodeIds: { type: "array", items: { type: "string" }, description: "IDs of the canvas nodes to bundle" },
      },
      required: ["name", "type", "tags", "semanticDescription", "nodeIds"],
    },
    handler: (args, ctx) => {
      const selectedNodes = args.nodeIds.map((id: string) => ctx.nodes[id]).filter(Boolean)
      if (selectedNodes.length === 0) {
        return { success: false, message: "No valid canvas nodes provided to save as an asset." }
      }

      const minX = Math.min(...selectedNodes.map((n: any) => n.x))
      const minY = Math.min(...selectedNodes.map((n: any) => n.y))

      const templateNodes = selectedNodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        relX: n.x - minX,
        relY: n.y - minY,
        w: n.w,
        h: n.h,
        shape: n.shape,
        fill: n.fill,
        text: n.text,
        fontSize: n.fontSize,
        bold: n.bold,
        align: n.align,
        kind: n.kind,
        props: n.props,
        points: n.points,
        src: n.src,
      }))

      const saved = AssetMemory.saveAsset({
        name: args.name,
        type: args.type,
        tags: args.tags,
        semanticDescription: args.semanticDescription,
        templateNodes,
        userId: ctx.userId,
      })

      return {
        success: true,
        message: `Saved reusable asset "${saved.name}" (ID: ${saved.id}) with ${templateNodes.length} objects.`,
        data: { assetId: saved.id, name: saved.name },
      }
    },
  },

  // 14. reuse_saved_asset
  {
    name: "reuse_saved_asset",
    description: "Instantiates a previously saved reusable asset at target coordinates, reusing established layouts and saving model generation overhead.",
    category: "asset",
    parameters: {
      type: "object",
      properties: {
        assetId: { type: "string", description: "ID of the reusable asset to stamp" },
        x: { type: "number", description: "Placement X coordinate" },
        y: { type: "number", description: "Placement Y coordinate" },
        textReplacements: { type: "object", description: "Optional map of text string replacements to adapt content" },
      },
      required: ["assetId", "x", "y"],
    },
    handler: (args) => {
      const actions = AssetMemory.instantiate(args.assetId, { x: args.x, y: args.y }, { textReplacements: args.textReplacements })
      if (actions.length === 0) {
        return { success: false, message: `Reusable asset "${args.assetId}" was not found.` }
      }
      return {
        success: true,
        message: `Reused asset "${args.assetId}" on canvas at (${args.x}, ${args.y}).`,
        actions,
      }
    },
  },

  // 15. inspect_share
  {
    name: "inspect_share",
    description: "Inspects the public or team share status of the current document (read-only, never reveals passwords).",
    category: "workspace",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: (_args, ctx) => {
      const share = ctx.shareConfig
      return {
        success: true,
        message: share ? `Document share status: ${share.enabled ? "Publicly Shared" : "Private"}` : "No share configuration active.",
        data: share
          ? {
              enabled: !!share.enabled,
              mode: share.mode || "view",
              requirePassword: !!share.hasPassword,
              shareUrl: share.shareUrl || null,
            }
          : { enabled: false },
      }
    },
  },

  // 16. inspect_team
  {
    name: "inspect_team",
    description: "Inspects accessible workspace teams and role metadata (read-only, never reveals privileged tokens).",
    category: "workspace",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: (_args, ctx) => {
      const teams = ctx.teams || []
      const current = ctx.currentTeamDetails
      return {
        success: true,
        message: `User belongs to ${teams.length} team(s).`,
        data: {
          currentTeam: current
            ? {
                id: current.id,
                name: current.name,
                role: current.role,
                memberCount: current.members?.length || 1,
              }
            : null,
          teams: teams.map((t: any) => ({ id: t.id, name: t.name, role: t.role })),
        },
      }
    },
  },

  // 17. account_guidance
  {
    name: "account_guidance",
    description: "Provides step-by-step guidance for account management, security settings, passwords, and recovery codes without executing or exposing secrets.",
    category: "account",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Account management topic (e.g. 'password', 'recovery_codes', 'profile', 'delete_account')" },
      },
      required: ["topic"],
    },
    handler: (args) => {
      const check = AccountSecurityBoundary.checkRequest(args.topic)
      return {
        success: true,
        message: check.safeGuidanceMessage || "For account modifications, please visit Account Settings via the user avatar menu.",
        data: { guidanceOnly: true },
      }
    },
  },

  // 18. draw_ink
  {
    name: "draw_ink",
    description: "Places a freehand rough napkin ink drawing or sketch with coordinate points on the canvas.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number", description: "X coordinate of drawing container" },
        y: { type: "number", description: "Y coordinate of drawing container" },
        w: { type: "number", description: "Width of drawing bounding box" },
        h: { type: "number", description: "Height of drawing bounding box" },
        points: { type: "array", items: { type: "array" }, description: "Array of [x, y] coordinates relative to origin" },
        stroke: { type: "string", enum: ["light", "regular", "heavy"], description: "Stroke weight" },
        dashed: { type: "boolean", description: "Whether line is dashed" },
      },
      required: ["x", "y", "points"],
    },
    handler: (args) => {
      const action: CanvasAction = {
        type: "createNode",
        nodeType: "draw",
        x: args.x,
        y: args.y,
        w: args.w || 120,
        h: args.h || 120,
        points: args.points,
        stroke: args.stroke || "regular",
        dashed: !!args.dashed,
      } as any
      return {
        success: true,
        message: `Added ink drawing at (${args.x}, ${args.y}).`,
        actions: [action],
      }
    },
  },

  // 19. create_frame
  {
    name: "create_frame",
    description: "Creates a section or frame container box with a title label to group concepts visually.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Frame title label" },
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        w: { type: "number", description: "Width of frame (default 400)" },
        h: { type: "number", description: "Height of frame (default 300)" },
      },
      required: ["title", "x", "y"],
    },
    handler: (args) => {
      const w = args.w || 400
      const h = args.h || 300
      const actions: CanvasAction[] = [
        {
          type: "createNode",
          nodeType: "shape",
          x: args.x,
          y: args.y,
          w,
          h,
          shape: "rect",
          fill: "paper",
        } as any,
        {
          type: "createNode",
          nodeType: "text",
          x: args.x + 16,
          y: args.y + 12,
          w: w - 32,
          h: 28,
          text: args.title,
          fontSize: 16,
          bold: true,
        } as any,
      ]
      return {
        success: true,
        message: `Created frame "${args.title}" at (${args.x}, ${args.y}).`,
        actions,
      }
    },
  },

  // 20. connect_nodes
  {
    name: "connect_nodes",
    description: "Draws an intelligent connector arrow linking two existing canvas objects by their IDs.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        fromNodeId: { type: "string", description: "Origin node ID" },
        toNodeId: { type: "string", description: "Destination node ID" },
        label: { type: "string", description: "Optional relationship label" },
      },
      required: ["fromNodeId", "toNodeId"],
    },
    handler: (args, ctx) => {
      const fromNode = ctx.nodes[args.fromNodeId]
      const toNode = ctx.nodes[args.toNodeId]
      if (!fromNode || !toNode) {
        return { success: false, message: "One or both specified nodes could not be found." }
      }
      const action: CanvasAction = {
        type: "connectNodes",
        fromNodeId: args.fromNodeId,
        toNodeId: args.toNodeId,
        label: args.label,
      }
      return {
        success: true,
        message: `Connected node "${args.fromNodeId}" to "${args.toNodeId}".`,
        actions: [action],
      }
    },
  },

  // 21. duplicate_nodes
  {
    name: "duplicate_nodes",
    description: "Duplicates specified or currently selected canvas objects with an offset.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to duplicate (defaults to active selection)" },
        offset: { type: "number", description: "Pixel offset for duplicate (default 20)" },
      },
    },
    handler: (args, ctx) => {
      const targetIds = args.nodeIds && args.nodeIds.length > 0 ? args.nodeIds : ctx.selection
      if (!targetIds || targetIds.length === 0) {
        return { success: false, message: "No nodes specified or selected for duplication." }
      }
      const action: CanvasAction = {
        type: "duplicateNodes",
        nodeIds: targetIds,
        offset: args.offset || 20,
      }
      return {
        success: true,
        message: `Duplicated ${targetIds.length} object(s).`,
        actions: [action],
      }
    },
  },

  // 22. group_nodes
  {
    name: "group_nodes",
    description: "Groups multiple canvas objects so they move and transform together.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to group" },
      },
      required: ["nodeIds"],
    },
    handler: (args) => {
      if (!args.nodeIds || args.nodeIds.length < 2) {
        return { success: false, message: "Grouping requires at least 2 nodes." }
      }
      const action: CanvasAction = {
        type: "groupNodes",
        nodeIds: args.nodeIds,
      }
      return {
        success: true,
        message: `Grouped ${args.nodeIds.length} objects.`,
        actions: [action],
      }
    },
  },

  // 23. ungroup_nodes
  {
    name: "ungroup_nodes",
    description: "Disassembles a group into individual independent canvas objects.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        nodeIds: { type: "array", items: { type: "string" }, description: "Group node IDs to ungroup (defaults to selection)" },
      },
    },
    handler: (args, ctx) => {
      const targetIds = args.nodeIds && args.nodeIds.length > 0 ? args.nodeIds : ctx.selection
      const action: CanvasAction = {
        type: "ungroupNodes",
        nodeIds: targetIds,
      }
      return {
        success: true,
        message: `Ungrouped selected object(s).`,
        actions: [action],
      }
    },
  },

  // 24. align_nodes
  {
    name: "align_nodes",
    description: "Aligns canvas objects along an edge or axis.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        edge: { type: "string", enum: ["left", "right", "hcenter", "top", "bottom", "vcenter"], description: "Alignment edge" },
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to align (defaults to selection)" },
      },
      required: ["edge"],
    },
    handler: (args, ctx) => {
      const targetIds = args.nodeIds && args.nodeIds.length > 0 ? args.nodeIds : ctx.selection
      const action: CanvasAction = {
        type: "alignNodes",
        edge: args.edge,
        nodeIds: targetIds,
      }
      return {
        success: true,
        message: `Aligned objects to ${args.edge}.`,
        actions: [action],
      }
    },
  },

  // 25. distribute_nodes
  {
    name: "distribute_nodes",
    description: "Evenly distributes spacing between canvas objects horizontally or vertically.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        axis: { type: "string", enum: ["h", "v"], description: "Distribution axis ('h' for horizontal, 'v' for vertical)" },
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to distribute (defaults to selection)" },
      },
      required: ["axis"],
    },
    handler: (args, ctx) => {
      const targetIds = args.nodeIds && args.nodeIds.length > 0 ? args.nodeIds : ctx.selection
      const action: CanvasAction = {
        type: "distributeNodes",
        axis: args.axis,
        nodeIds: targetIds,
      }
      return {
        success: true,
        message: `Distributed objects along ${args.axis === "h" ? "horizontal" : "vertical"} axis.`,
        actions: [action],
      }
    },
  },

  // 26. reorder_nodes
  {
    name: "reorder_nodes",
    description: "Adjusts z-order / layer stacking of canvas objects (bring to front, send to back, forward, backward).",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["front", "back", "forward", "backward"], description: "Stacking direction" },
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to reorder" },
      },
      required: ["direction", "nodeIds"],
    },
    handler: (args) => {
      const action: CanvasAction = {
        type: "reorderNodes",
        direction: args.direction,
        nodeIds: args.nodeIds,
      }
      return {
        success: true,
        message: `Reordered objects: ${args.direction}.`,
        actions: [action],
      }
    },
  },

  // 27. flip_nodes
  {
    name: "flip_nodes",
    description: "Flips canvas objects horizontally or vertically.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        axis: { type: "string", enum: ["x", "y"], description: "Flip axis ('x' for horizontal, 'y' for vertical)" },
        nodeIds: { type: "array", items: { type: "string" }, description: "Node IDs to flip (defaults to selection)" },
      },
      required: ["axis"],
    },
    handler: (args, ctx) => {
      const targetIds = args.nodeIds && args.nodeIds.length > 0 ? args.nodeIds : ctx.selection
      const action: CanvasAction = {
        type: "flipNodes",
        axis: args.axis,
        nodeIds: targetIds,
      }
      return {
        success: true,
        message: `Flipped objects along ${args.axis} axis.`,
        actions: [action],
      }
    },
  },

  // 28. inspect_document_structure
  {
    name: "inspect_document_structure",
    description: "Deeply inspects the hierarchical document structure, including parent groups, z-index ordering, coordinate bounding bounds, and component variants.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: (_args, ctx) => {
      const nodes = ctx.nodes || {}
      const order = ctx.order || []
      const groups: Record<string, string[]> = {}
      const layers = order.map((id, index) => {
        const n = nodes[id]
        if (!n) return { id, z: index }
        if (n.group) {
          groups[n.group] = groups[n.group] || []
          groups[n.group].push(id)
        }
        return {
          id,
          type: n.type,
          z: index,
          kind: n.kind,
          shape: n.shape,
          text: n.text ? n.text.slice(0, 30) : undefined,
          x: Math.round(n.x),
          y: Math.round(n.y),
          w: Math.round(n.w),
          h: Math.round(n.h),
          group: n.group,
        }
      })

      return {
        success: true,
        message: `Document "${ctx.fileName || "Untitled"}" has ${layers.length} layers and ${Object.keys(groups).length} group(s).`,
        data: {
          totalLayers: layers.length,
          layers,
          groups,
        },
      }
    },
  },

  // 29. save_image_asset
  {
    name: "save_image_asset",
    description: "Saves a generated image, diagram illustration, or screenshot to reusable memory for future AI search and stamping.",
    category: "asset",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Title of the visual asset" },
        tags: { type: "array", items: { type: "string" }, description: "Descriptive tags" },
        semanticDescription: { type: "string", description: "What the image represents" },
        src: { type: "string", description: "Data URL or image URL" },
        w: { type: "number", description: "Image pixel width" },
        h: { type: "number", description: "Image pixel height" },
      },
      required: ["name", "tags", "semanticDescription", "src", "w", "h"],
    },
    handler: (args, ctx) => {
      const asset = AssetMemory.saveImageAsset({
        name: args.name,
        tags: args.tags || [],
        semanticDescription: args.semanticDescription,
        src: args.src,
        w: args.w,
        h: args.h,
        userId: ctx.userId,
      })
      return {
        success: true,
        message: `Saved visual image asset "${asset.name}" (ID: ${asset.id}).`,
        data: { assetId: asset.id, name: asset.name },
      }
    },
  },

  // 24. generate_image
  {
    name: "generate_image",
    description: "Generates an AI image using Gemini Imagen models and places it as an image node directly onto the canvas.",
    category: "canvas",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed description of the image to generate" },
        aspectRatio: {
          type: "string",
          enum: ["1:1", "16:9", "4:3", "3:4", "9:16"],
          description: "Aspect ratio for the generated image (default 1:1)",
        },
        x: { type: "number", description: "Target X coordinate on canvas" },
        y: { type: "number", description: "Target Y coordinate on canvas" },
        w: { type: "number", description: "Desired pixel width" },
        h: { type: "number", description: "Desired pixel height" },
      },
      required: ["prompt"],
    },
    handler: async (args, ctx) => {
      const prompt = (args.prompt || "").trim()
      const aspectRatio = args.aspectRatio || "1:1"
      const result = await AIImageService.generateImage({
        prompt,
        aspectRatio,
        width: args.w,
        height: args.h,
      })

      const viewport = ctx.viewport || { x: 0, y: 0, zoom: 1 }
      const defaultX = Math.round(-viewport.x / viewport.zoom + 200)
      const defaultY = Math.round(-viewport.y / viewport.zoom + 150)

      const targetX = typeof args.x === "number" ? args.x : defaultX
      const targetY = typeof args.y === "number" ? args.y : defaultY

      const action: CanvasAction = {
        type: "createNode",
        nodeType: "image",
        x: targetX,
        y: targetY,
        w: result.width,
        h: result.height,
        src: result.imageUrl,
        naturalW: result.width,
        naturalH: result.height,
        name: prompt,
      } as any

      return {
        success: true,
        message: `Generated AI image for "${prompt}" and placed on canvas.`,
        actions: [action],
        data: {
          imageUrl: result.imageUrl,
          prompt,
          width: result.width,
          height: result.height,
        },
      }
    },
  },
]

// ---------------------------------------------------------------------------
// Tool Registry Index & Dispatcher
// ---------------------------------------------------------------------------

export class ToolRegistry {
  private static toolMap = new Map<string, ToolDefinition>(TOOLS.map((t) => [t.name, t]))

  static getTool(name: string): ToolDefinition | undefined {
    return this.toolMap.get(name)
  }

  static listTools(): ToolDefinition[] {
    return TOOLS
  }

  static async execute(name: string, args: any = {}, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    let tool = this.getTool(name)
    if (!tool) {
      const aliasMap: Record<string, string> = {
        add_rectangle: "add_shape",
        add_circle: "add_shape",
        add_line: "add_shape",
        create_shape: "add_shape",
        create_text: "add_text",
        create_arrow: "add_arrow",
        add_ink: "draw_ink",
        add_component: "create_component",
        create_table: "create_study_artifact",
        create_study_table: "create_study_artifact",
        create_mind_map: "create_study_artifact",
        create_flowchart: "create_study_artifact",
        create_flashcards: "create_study_artifact",
        reuse_asset: "reuse_saved_asset",
        create_image: "generate_image",
        make_image: "generate_image",
        draw_image: "generate_image",
        ai_image: "generate_image",
      }
      const resolvedName = aliasMap[name.toLowerCase()]
      if (resolvedName) {
        tool = this.getTool(resolvedName)
        if (name.toLowerCase() === "add_circle" && !args.shape) args.shape = "circle"
        if (name.toLowerCase() === "add_line" && !args.shape) args.shape = "line"
        if (name.toLowerCase() === "add_rectangle" && !args.shape) args.shape = "rect"
        if (name.toLowerCase() === "create_mind_map") {
          args.artifactType = "mind_map"
          args.data = { rootTopic: args.rootTopic || args.topic, branches: args.branches }
        }
        if (name.toLowerCase() === "create_flowchart") {
          args.artifactType = "flowchart"
          args.data = { steps: args.steps }
        }
        if (name.toLowerCase() === "create_flashcards") {
          args.artifactType = "flashcards"
          args.data = { cards: args.cards }
        }
        if (name.toLowerCase() === "create_table" || name.toLowerCase() === "create_study_table") {
          args.artifactType = "comparison_matrix"
          args.data = { title: args.title, headers: args.headers, rows: args.rows }
        }
      }
    }

    if (!tool) {
      return {
        success: false,
        message: `Tool "${name}" is not registered in Zenithsui tool registry.`,
        error: `Unknown tool: ${name}`,
      }
    }

    try {
      return await Promise.resolve(tool.handler(args, context))
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to execute tool "${name}": ${err?.message || "Unknown error"}`,
        error: err?.message || String(err),
      }
    }
  }

  /**
   * Generates a compact system prompt describing available tools for the model.
   */
  static getToolsDocumentation(): string {
    const lines: string[] = [
      "=== AVAILABLE ZENITHSUI NATIVE TOOLS ===",
      "You have access to the following built-in tools. When the user's intent involves interacting with or modifying the canvas, creating study artifacts, searching/reusing assets, or inspecting workspace state, execute the appropriate tool function natively.",
      "CRITICAL: Never output raw JSON action code blocks or function call strings in your conversational response. Always provide clear, natural conversational text explaining the result or confirming the action.",
      "",
    ]

    for (const tool of TOOLS) {
      lines.push(`• **${tool.name}** [${tool.category}]: ${tool.description}`)
      const propKeys = Object.keys(tool.parameters.properties)
      if (propKeys.length > 0) {
        lines.push(`  Params: { ${propKeys.join(", ")} }`)
      }
    }

    lines.push("")
    lines.push("REUSE BEFORE REGENERATE: If the user requests a common diagram, flowchart, login screen, or flashcard set, prefer checking or reusing saved assets ('search_saved_assets' / 'reuse_saved_asset') or standard library components ('search_components' / 'create_component').")
    lines.push("ACCOUNT RESTRICTION: Never directly modify user credentials or request passwords. Use 'account_guidance' to provide steps.")

    return lines.join("\n")
  }
}

