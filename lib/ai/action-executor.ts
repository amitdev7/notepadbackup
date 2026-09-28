// ---------------------------------------------------------------------------
// Zenith AI — Canvas Action Executor & Layout Synthesizer
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { SquigNode, ShapeNode, TextNode, ArrowNode, ComponentNode, DrawNode, ImageNode, ShapeKind, FillTone } from "../types"
import type { CanvasAction, CanvasActionProposal } from "./types"
import { useSquig } from "../store"
import { AssetMemory } from "./asset-memory"
import { StudyCopilotEngine } from "./study-copilot"

export class AIActionExecutor {
  /**
   * Executes a validated canvas action proposal onto the active Zenithsui document.
   * Uses an atomic transaction checkpoint with rollback on failure and single-undo history.
   */
  static applyProposal(
    proposal: CanvasActionProposal,
    storeState?: any
  ): { success: boolean; createdNodeIds: string[]; error?: string } {
    const store = storeState || useSquig.getState()

    // 1. Permission check: viewers cannot mutate canvas
    if (store.permissionRole === "viewer" || store.isReadOnly) {
      return { success: false, createdNodeIds: [], error: "Viewer role cannot apply canvas modifications." }
    }

    // 2. Start atomic transaction with checkpoint
    if (typeof store.checkpoint === "function") {
      store.checkpoint()
    }

    const createdNodeIds: string[] = []
    const newNodes: Record<string, SquigNode> = {}
    const deletedIds: string[] = []
    const patches: Record<string, Record<string, any>> = {}

    try {
      // 3. Base positioning offset
      const viewport = store.viewport || { x: 0, y: 0, zoom: 1 }
      const defaultStartX = Math.round(-viewport.x / viewport.zoom + 200)
      const defaultStartY = Math.round(-viewport.y / viewport.zoom + 150)

      // Helper to process actions recursively (for composite artifact actions)
      const processActionList = (actions: CanvasAction[]) => {
        for (const action of actions) {
          switch (action.type) {
            case "createNode": {
              const id = nanoid(8)
              const x = typeof action.x === "number" ? action.x : defaultStartX
              const y = typeof action.y === "number" ? action.y : defaultStartY

              if (action.nodeType === "shape") {
                const shapeNode: ShapeNode = {
                  id,
                  type: "shape",
                  x,
                  y,
                  w: action.w || 160,
                  h: action.h || 90,
                  shape: (action.shape || action.shapeKind || "rect") as ShapeKind,
                  fill: (action.fill || action.tone || "none") as FillTone,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = shapeNode
                createdNodeIds.push(id)
              } else if (action.nodeType === "text") {
                const textNode: TextNode = {
                  id,
                  type: "text",
                  x,
                  y,
                  w: action.w || 180,
                  h: action.h || 40,
                  text: action.text || "New Text",
                  fontSize: action.fontSize || 16,
                  bold: action.bold,
                  align: action.align,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = textNode
                createdNodeIds.push(id)
              } else if (action.nodeType === "component") {
                const compNode: ComponentNode = {
                  id,
                  type: "component",
                  x,
                  y,
                  w: action.w || 200,
                  h: action.h || 120,
                  kind: action.kind || action.componentKind || "card",
                  props: action.props || {},
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = compNode
                createdNodeIds.push(id)
              } else if (action.nodeType === "arrow") {
                const arrowNode: ArrowNode = {
                  id,
                  type: "arrow",
                  x,
                  y,
                  w: action.w || 100,
                  h: action.h || 100,
                  points: [[0, 0], [action.w || 100, action.h || 100]],
                  head: true,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = arrowNode
                createdNodeIds.push(id)
              } else if (action.nodeType === "draw") {
                const drawNode: DrawNode = {
                  id,
                  type: "draw",
                  x,
                  y,
                  w: action.w || 100,
                  h: action.h || 100,
                  points: (action.points as [number, number][]) || [[0, 0], [action.w || 100, action.h || 100]],
                  stroke: action.stroke,
                  dashed: action.dashed,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = drawNode
                createdNodeIds.push(id)
              } else if (action.nodeType === "image") {
                const imageNode: ImageNode = {
                  id,
                  type: "image",
                  x,
                  y,
                  w: action.w || 200,
                  h: action.h || 150,
                  src: action.src || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150'><rect width='200' height='150' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'>AI Image</text></svg>",
                  naturalW: action.naturalW || action.w || 200,
                  naturalH: action.naturalH || action.h || 150,
                  name: action.name || "AI Generated Image",
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[id] = imageNode
                createdNodeIds.push(id)
              }
              break
            }

            case "updateNode": {
              patches[action.nodeId] = action.patch
              break
            }

            case "deleteNode": {
              if ((action as any).all) {
                deletedIds.push(...Object.keys(store.nodes || {}))
              } else if (action.nodeIds && action.nodeIds.length > 0) {
                deletedIds.push(...action.nodeIds)
              }
              break
            }

            case "moveNode": {
              const existing = store.nodes[action.nodeId] || newNodes[action.nodeId]
              if (existing) {
                patches[action.nodeId] = {
                  x: existing.x + action.dx,
                  y: existing.y + action.dy,
                }
              }
              break
            }

            case "arrangeNodes": {
              const targetIds = action.nodeIds && action.nodeIds.length > 0 ? action.nodeIds : Object.keys(store.nodes || {})
              const spacing = action.spacing || 30
              if (targetIds.length > 0) {
                const nodesToArrange = targetIds.map((nid) => store.nodes[nid] || newNodes[nid]).filter(Boolean)
                if (nodesToArrange.length > 0) {
                  let curX = nodesToArrange[0].x
                  let curY = nodesToArrange[0].y

                  if (action.layout === "horizontal") {
                    for (const node of nodesToArrange) {
                      patches[node.id] = { x: curX, y: curY }
                      curX += (node.w || 150) + spacing
                    }
                  } else if (action.layout === "vertical") {
                    for (const node of nodesToArrange) {
                      patches[node.id] = { x: curX, y: curY }
                      curY += (node.h || 80) + spacing
                    }
                  } else if (action.layout === "grid") {
                    const cols = Math.ceil(Math.sqrt(nodesToArrange.length))
                    let colIdx = 0
                    let rowMaxH = 0
                    const startGridX = curX
                    for (const node of nodesToArrange) {
                      patches[node.id] = { x: curX, y: curY }
                      rowMaxH = Math.max(rowMaxH, node.h || 80)
                      curX += (node.w || 150) + spacing
                      colIdx++
                      if (colIdx >= cols) {
                        colIdx = 0
                        curX = startGridX
                        curY += rowMaxH + spacing
                        rowMaxH = 0
                      }
                    }
                  }
                }
              }
              break
            }

            case "createMindMap": {
              const startX = typeof action.startX === "number" ? action.startX : defaultStartX
              const startY = typeof action.startY === "number" ? action.startY : defaultStartY
              // Normalize LLM-shaped branches: strings, subBranches alias, missing.
              const rawBranches: unknown[] = Array.isArray(action.branches) ? action.branches : []
              const branches = (rawBranches.length ? rawBranches : ["Branch 1", "Branch 2"]).map((b: any) => {
                if (typeof b === "string") return { title: b, subTopics: [] as string[] }
                const subs = Array.isArray(b?.subTopics)
                  ? b.subTopics
                  : Array.isArray(b?.subBranches)
                    ? b.subBranches
                    : []
                return {
                  title: String(b?.title ?? "Branch"),
                  subTopics: subs.map((s: unknown) => String(s ?? "")),
                }
              })
              const rootTopic = String((action as any).rootTopic ?? "Mind Map")

              // 1. Root Node
              const rootId = nanoid(8)
              const rootNode: ShapeNode = {
                id: rootId,
                type: "shape",
                x: startX,
                y: startY,
                w: 220,
                h: 70,
                shape: "rect",
                fill: "light",
                seed: Math.floor(Math.random() * 100000),
              }
              newNodes[rootId] = rootNode
              createdNodeIds.push(rootId)

              const rootTextId = nanoid(8)
              newNodes[rootTextId] = {
                id: rootTextId,
                type: "text",
                x: startX + 15,
                y: startY + 22,
                w: 190,
                h: 30,
                text: rootTopic,
                fontSize: 18,
                bold: true,
                align: "center",
                seed: Math.floor(Math.random() * 100000),
              }
              createdNodeIds.push(rootTextId)

              // 2. Branches
              let branchY = startY - (branches.length * 100) / 2 + 30
              for (let bIdx = 0; bIdx < branches.length; bIdx++) {
                const branch = branches[bIdx]
                const branchX = startX + 320
                const branchId = nanoid(8)

                newNodes[branchId] = {
                  id: branchId,
                  type: "shape",
                  x: branchX,
                  y: branchY,
                  w: 180,
                  h: 55,
                  shape: "rect",
                  fill: "paper",
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(branchId)

                const branchTextId = nanoid(8)
                newNodes[branchTextId] = {
                  id: branchTextId,
                  type: "text",
                  x: branchX + 10,
                  y: branchY + 16,
                  w: 160,
                  h: 24,
                  text: branch.title,
                  fontSize: 14,
                  bold: true,
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(branchTextId)

                // Arrow from Root to Branch
                const arrowId = nanoid(8)
                const arrowW = branchX - (startX + 220)
                const arrowH = branchY + 25 - (startY + 35)
                const arrowNode: ArrowNode = {
                  id: arrowId,
                  type: "arrow",
                  x: startX + 220,
                  y: startY + 35,
                  w: arrowW,
                  h: arrowH,
                  points: [[0, 0], [arrowW, arrowH]],
                  head: true,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[arrowId] = arrowNode
                createdNodeIds.push(arrowId)

                // Sub-topics
                if (branch.subTopics && branch.subTopics.length > 0) {
                  let subY = branchY
                  for (const sub of branch.subTopics) {
                    const subId = nanoid(8)
                    const subX = branchX + 240
                    newNodes[subId] = {
                      id: subId,
                      type: "text",
                      x: subX,
                      y: subY,
                      w: 160,
                      h: 30,
                      text: `• ${sub}`,
                      fontSize: 13,
                      seed: Math.floor(Math.random() * 100000),
                    }
                    createdNodeIds.push(subId)
                    subY += 35
                  }
                }

                branchY += 120
              }
              break
            }

            case "createFlowchart": {
              const startX = typeof action.startX === "number" ? action.startX : defaultStartX
              let curY = typeof action.startY === "number" ? action.startY : defaultStartY
              // Normalize LLM-shaped steps: strings, missing ids, "step" alias.
              const rawSteps: unknown[] = Array.isArray(action.steps) ? action.steps : []
              const steps = (rawSteps.length ? rawSteps : ["Step 1", "Step 2"]).map((s: any, i: number) => {
                if (typeof s === "string") return { id: `step-${i}`, label: s, kind: "process" }
                const kind = s?.kind === "step" ? "process" : (s?.kind ?? "process")
                return { id: String(s?.id ?? `step-${i}`), label: String(s?.label ?? "Step"), kind }
              })

              const stepIdMap: Record<string, { id: string; x: number; y: number; w: number; h: number }> = {}

              for (const step of steps) {
                const id = nanoid(8)
                const w = step.kind === "decision" ? 180 : 160
                const h = step.kind === "decision" ? 80 : 60

                newNodes[id] = {
                  id,
                  type: "shape",
                  x: startX,
                  y: curY,
                  w,
                  h,
                  shape: step.kind === "start" || step.kind === "end" ? "ellipse" : "rect",
                  fill: step.kind === "decision" ? "light" : "paper",
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(id)

                const textId = nanoid(8)
                newNodes[textId] = {
                  id: textId,
                  type: "text",
                  x: startX + 10,
                  y: curY + (h / 2 - 10),
                  w: w - 20,
                  h: 24,
                  text: step.label,
                  fontSize: 13,
                  align: "center",
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(textId)

                stepIdMap[step.id] = { id, x: startX, y: curY, w, h }
                curY += h + 50
              }

              // Connect arrows
              for (const step of action.steps) {
                if (step.next && step.next.length > 0) {
                  const src = stepIdMap[step.id]
                  for (const targetStepId of step.next) {
                    const target = stepIdMap[targetStepId]
                    if (src && target) {
                      const arrowId = nanoid(8)
                      const arrowW = target.x + target.w / 2 - (src.x + src.w / 2)
                      const arrowH = target.y - (src.y + src.h)
                      const arrowNode: ArrowNode = {
                        id: arrowId,
                        type: "arrow",
                        x: src.x + src.w / 2,
                        y: src.y + src.h,
                        w: arrowW,
                        h: arrowH,
                        points: [[0, 0], [arrowW, arrowH]],
                        head: true,
                        seed: Math.floor(Math.random() * 100000),
                      }
                      newNodes[arrowId] = arrowNode
                      createdNodeIds.push(arrowId)
                    }
                  }
                }
              }
              break
            }

            case "createFlashcards": {
              const subActions = StudyCopilotEngine.buildFlashcards(
                action.cards,
                typeof action.startX === "number" ? action.startX : defaultStartX,
                typeof action.startY === "number" ? action.startY : defaultStartY
              )
              processActionList(subActions)
              break
            }

            case "createTable": {
              const startX = typeof action.startX === "number" ? action.startX : defaultStartX
              let startY = typeof action.startY === "number" ? action.startY : defaultStartY

              // Headers
              let colX = startX
              for (const header of action.headers) {
                const hId = nanoid(8)
                newNodes[hId] = {
                  id: hId,
                  type: "shape",
                  x: colX,
                  y: startY,
                  w: 160,
                  h: 40,
                  shape: "rect",
                  fill: "light",
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(hId)

                const htId = nanoid(8)
                newNodes[htId] = {
                  id: htId,
                  type: "text",
                  x: colX + 8,
                  y: startY + 10,
                  w: 144,
                  h: 20,
                  text: header,
                  fontSize: 13,
                  bold: true,
                  seed: Math.floor(Math.random() * 100000),
                }
                createdNodeIds.push(htId)
                colX += 165
              }

              startY += 45

              // Rows
              for (const row of action.rows) {
                colX = startX
                for (let cIdx = 0; cIdx < row.length; cIdx++) {
                  const cellText = row[cIdx] || ""
                  const rId = nanoid(8)
                  newNodes[rId] = {
                    id: rId,
                    type: "shape",
                    x: colX,
                    y: startY,
                    w: 160,
                    h: 45,
                    shape: "rect",
                    fill: "none",
                    seed: Math.floor(Math.random() * 100000),
                  }
                  createdNodeIds.push(rId)

                  const rtId = nanoid(8)
                  newNodes[rtId] = {
                    id: rtId,
                    type: "text",
                    x: colX + 8,
                    y: startY + 12,
                    w: 144,
                    h: 24,
                    text: cellText,
                    fontSize: 12,
                    seed: Math.floor(Math.random() * 100000),
                  }
                  createdNodeIds.push(rtId)
                  colX += 165
                }
                startY += 50
              }
              break
            }

            case "reuseAsset": {
              const subActions = AssetMemory.instantiate(
                action.assetId,
                {
                  x: typeof action.x === "number" ? action.x : defaultStartX,
                  y: typeof action.y === "number" ? action.y : defaultStartY,
                },
                { textReplacements: action.textReplacements }
              )
              processActionList(subActions)
              break
            }

            case "createStudyArtifact": {
              const startX = typeof action.startX === "number" ? action.startX : defaultStartX
              const startY = typeof action.startY === "number" ? action.startY : defaultStartY
              let subActions: CanvasAction[] = []

              switch (action.artifactType) {
                case "flashcards":
                  subActions = StudyCopilotEngine.buildFlashcards(action.data.cards || [], startX, startY)
                  break
                case "concept_map":
                  subActions = StudyCopilotEngine.buildConceptMap(action.title, action.data.concepts || [], startX, startY)
                  break
                case "quiz":
                  subActions = StudyCopilotEngine.buildQuiz(action.data.questions || [], startX, startY)
                  break
                case "comparison_matrix":
                  subActions = StudyCopilotEngine.buildComparisonMatrix(
                    action.data.conceptA || "A",
                    action.data.conceptB || "B",
                    action.data.attributes || [],
                    startX,
                    startY
                  )
                  break
                case "timeline":
                  if (action.data?.events && action.data.events.length > 0) {
                    subActions = StudyCopilotEngine.buildTimeline(action.data.events, startX, startY)
                  } else {
                    subActions = AssetMemory.instantiate("timeline-milestones", { x: startX, y: startY })
                  }
                  break
                case "revision_board":
                  if (action.data?.sections && action.data.sections.length > 0) {
                    subActions = StudyCopilotEngine.buildRevisionBoard(action.title || "Exam Revision", action.data.sections, startX, startY)
                  } else {
                    subActions = AssetMemory.instantiate("exam-revision-board", { x: startX, y: startY })
                  }
                  break
              }
              processActionList(subActions)
              break
            }

            case "alignNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                store.setSelection(action.nodeIds)
              }
              if (typeof store.alignSelected === "function") {
                store.alignSelected(action.edge)
              }
              break
            }

            case "distributeNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                store.setSelection(action.nodeIds)
              }
              if (typeof store.distributeSelected === "function") {
                store.distributeSelected(action.axis)
              }
              break
            }

            case "groupNodes": {
              if (action.nodeIds && action.nodeIds.length > 1) {
                store.setSelection(action.nodeIds)
                if (typeof store.groupSelected === "function") {
                  store.groupSelected()
                }
              }
              break
            }

            case "ungroupNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                store.setSelection(action.nodeIds)
              }
              if (typeof store.ungroupSelected === "function") {
                store.ungroupSelected()
              }
              break
            }

            case "duplicateNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                store.setSelection(action.nodeIds)
              }
              if (typeof store.duplicateSelected === "function") {
                // duplicateSelected clones with its own offset and selects the
                // clones — collect whatever became selected (fresh read: the
                // `store` snapshot above is stale after mutations).
                store.duplicateSelected()
                const after = useSquig.getState().selection as string[]
                if (Array.isArray(after)) createdNodeIds.push(...after)
              }
              break
            }

            case "reorderNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                if (action.direction === "front" && typeof store.bringToFront === "function") {
                  store.bringToFront(action.nodeIds)
                } else if (action.direction === "back" && typeof store.sendToBack === "function") {
                  store.sendToBack(action.nodeIds)
                } else if (action.direction === "forward" && typeof store.bringForward === "function") {
                  store.bringForward(action.nodeIds)
                } else if (action.direction === "backward" && typeof store.sendBackward === "function") {
                  store.sendBackward(action.nodeIds)
                }
              }
              break
            }

            case "flipNodes": {
              if (action.nodeIds && action.nodeIds.length > 0) {
                store.setSelection(action.nodeIds)
              }
              if (typeof store.flipSelected === "function") {
                store.flipSelected(action.axis || "x")
              }
              break
            }

            case "connectNodes": {
              const fromNode = store.nodes[action.fromNodeId] || newNodes[action.fromNodeId]
              const toNode = store.nodes[action.toNodeId] || newNodes[action.toNodeId]
              if (fromNode && toNode) {
                const fromCenterX = fromNode.x + fromNode.w / 2
                const fromCenterY = fromNode.y + fromNode.h / 2
                const toCenterX = toNode.x + toNode.w / 2
                const toCenterY = toNode.y + toNode.h / 2

                const arrowId = nanoid(8)
                const arrowX = Math.min(fromCenterX, toCenterX)
                const arrowY = Math.min(fromCenterY, toCenterY)
                const arrowW = Math.max(Math.abs(toCenterX - fromCenterX), 20)
                const arrowH = Math.max(Math.abs(toCenterY - fromCenterY), 20)

                const p1: [number, number] = [fromCenterX - arrowX, fromCenterY - arrowY]
                const p2: [number, number] = [toCenterX - arrowX, toCenterY - arrowY]

                const arrowNode: ArrowNode = {
                  id: arrowId,
                  type: "arrow",
                  x: arrowX,
                  y: arrowY,
                  w: arrowW,
                  h: arrowH,
                  points: [p1, p2],
                  head: true,
                  seed: Math.floor(Math.random() * 100000),
                }
                newNodes[arrowId] = arrowNode
                createdNodeIds.push(arrowId)
              }
              break
            }

            case "generateImage": {
              const id = nanoid(8)
              const x = typeof action.x === "number" ? action.x : defaultStartX
              const y = typeof action.y === "number" ? action.y : defaultStartY
              const w = action.w || 260
              const h = action.h || 260
              const prompt = action.prompt || "AI Generated Image"

              const placeholderSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><rect width='100%' height='100%' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='6,6' rx='8'/><circle cx='${w / 2}' cy='${h / 2 - 16}' r='24' fill='%23e2e8f0'/><path d='M ${w / 2 - 12} ${h / 2 - 10} L ${w / 2 - 4} ${h / 2 - 20} L ${w / 2 + 6} ${h / 2 - 6} L ${w / 2 + 14} ${h / 2 - 16} L ${w / 2 + 18} ${h / 2 - 10} Z' fill='%2394a3b8'/><circle cx='${w / 2 - 8}' cy='${h / 2 - 22}' r='3' fill='%2394a3b8'/><text x='50%' y='${h / 2 + 24}' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='12' font-weight='500'>Generating "${encodeURIComponent(prompt.slice(0, 22))}"</text></svg>`

              const imageNode: ImageNode = {
                id,
                type: "image",
                x,
                y,
                w,
                h,
                src: action.src || placeholderSvg,
                naturalW: w,
                naturalH: h,
                name: prompt,
                seed: Math.floor(Math.random() * 100000),
              }
              newNodes[id] = imageNode
              createdNodeIds.push(id)

              // If src not yet generated, trigger background request to /api/ai/image/generate
              if (!action.src && typeof window !== "undefined") {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 90000)
                fetch("/api/ai/image/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  signal: controller.signal,
                  body: JSON.stringify({
                    prompt,
                    aspectRatio: action.aspectRatio || "1:1",
                    width: w,
                    height: h,
                  }),
                })
                  .then((r) => r.json().catch(() => ({})))
                  .then((res) => {
                    clearTimeout(timeout)
                    if (res && res.imageUrl) {
                      useSquig.getState().updateNode(id, {
                        src: res.imageUrl,
                        w: res.width || w,
                        h: res.height || h,
                        naturalW: res.width || w,
                        naturalH: res.height || h,
                      })
                      if (res.source && res.source !== "gemini") {
                        useSquig.getState().setNotice("Image rendered as a sketch placeholder (AI image unavailable)")
                      }
                    } else if (res && res.error) {
                      useSquig.getState().setNotice(`Image: ${res.error}`)
                    }
                  })
                  .catch((err) => {
                    clearTimeout(timeout)
                    if ((err as any)?.name !== "AbortError") {
                      console.error("[AIActionExecutor] Async image generation failed:", err)
                    }
                  })
              }
              break
            }
          }
        }
      }

      // Execute all actions
      processActionList(proposal.actions)

      // 4. Batch apply to Zustand store (single checkpoint already recorded)
      const newNodesList = Object.values(newNodes)
      if (newNodesList.length > 0) {
        store.addNodes(newNodesList, { checkpoint: false })
      }

      if (deletedIds.length > 0) {
        store.removeNodes(deletedIds, { checkpoint: false })
      }

      if (Object.keys(patches).length > 0) {
        for (const [nodeId, patch] of Object.entries(patches)) {
          store.updateNode(nodeId, patch, { checkpoint: false })
        }
      }

      if (createdNodeIds.length > 0) {
        store.setSelection(createdNodeIds)
      }

      return { success: true, createdNodeIds }
    } catch (err: any) {
      console.error("[AIActionExecutor] Execution failed, rolling back:", err)
      if (typeof store.revertToCheckpoint === "function") {
        store.revertToCheckpoint()
      }
      return {
        success: false,
        createdNodeIds: [],
        error: err?.message || "Execution failed and was safely rolled back.",
      }
    }
  }
}


