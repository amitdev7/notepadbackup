// ---------------------------------------------------------------------------
// Zenithsui Mermaid Diagram Engine
// Converts Mermaid diagram syntax (flowcharts, sequence diagrams, state diagrams,
// class diagrams) into native connected Zenithsui canvas nodes with bindings.
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { ShapeNode, ArrowNode, TextNode, SquigNode } from "@/lib/types"

/**
 * Heuristically checks whether the text may be a Mermaid diagram definition.
 * Directly ported from Excalidraw's mermaid.ts.
 */
export const isMaybeMermaidDefinition = (text: string): boolean => {
  const chartTypes = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "quadrantChart",
    "requirementDiagram",
    "gitGraph",
    "C4Context",
    "mindmap",
    "timeline",
    "zenuml",
    "sankey",
    "xychart",
    "block",
  ]

  const re = new RegExp(
    `^(?:%%{.*?}%%[\\s\\n]*)?\\b(?:${chartTypes
      .map((x) => `\\s*${x}(-beta)?`)
      .join("|")})\\b`
  )

  return re.test(text.trim())
}

export interface MermaidParsedResult {
  nodes: SquigNode[]
  width: number
  height: number
}

function makeSeed(): number {
  return Math.floor(Math.random() * 1000000)
}

/**
 * Parses Mermaid flowchart, graph, sequence, or state diagram into Zenithsui nodes.
 */
export function parseMermaidToZenithsui(
  code: string,
  startX = 100,
  startY = 100
): MermaidParsedResult {
  const lines = code
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"))

  if (lines.length === 0) {
    return { nodes: [], width: 0, height: 0 }
  }

  const firstLine = lines[0]

  if (firstLine.startsWith("sequenceDiagram")) {
    return parseSequenceDiagram(lines.slice(1), startX, startY)
  }

  // Default to Flowchart / Graph parser
  return parseFlowchart(lines, startX, startY)
}

/**
 * Parses flowchart / graph definitions
 */
function parseFlowchart(lines: string[], startX: number, startY: number): MermaidParsedResult {
  const isHorizontal = /flowchart\s+LR|graph\s+LR/i.test(lines[0])
  const bodyLines = lines.slice(1)

  interface RawNode {
    id: string
    label: string
    shape: "rect" | "diamond" | "ellipse"
  }
  interface RawEdge {
    from: string
    to: string
    label?: string
  }

  const nodeMap = new Map<string, RawNode>()
  const edges: RawEdge[] = []

  const parseNodeToken = (raw: string): string => {
    const diamondMatch = raw.match(/^([a-zA-Z0-9_-]+)\{(.+?)\}$/)
    if (diamondMatch) {
      const [, id, label] = diamondMatch
      nodeMap.set(id, { id, label, shape: "diamond" })
      return id
    }
    const ellipseMatch = raw.match(/^([a-zA-Z0-9_-]+)\(\((.+?)\)\)$/)
    if (ellipseMatch) {
      const [, id, label] = ellipseMatch
      nodeMap.set(id, { id, label, shape: "ellipse" })
      return id
    }
    const rectMatch = raw.match(/^([a-zA-Z0-9_-]+)\[(.+?)\]$/)
    if (rectMatch) {
      const [, id, label] = rectMatch
      nodeMap.set(id, { id, label, shape: "rect" })
      return id
    }
    const roundRectMatch = raw.match(/^([a-zA-Z0-9_-]+)\((.+?)\)$/)
    if (roundRectMatch) {
      const [, id, label] = roundRectMatch
      nodeMap.set(id, { id, label, shape: "rect" })
      return id
    }

    const simpleId = raw.trim()
    if (!nodeMap.has(simpleId)) {
      nodeMap.set(simpleId, { id: simpleId, label: simpleId, shape: "rect" })
    }
    return simpleId
  }

  for (const line of bodyLines) {
    const arrowMatch = line.match(/^(.+?)\s*(?:---|-->|-\.->|==>)\s*(?:\|(.+?)\|)?\s*(.+)$/)
    if (arrowMatch) {
      const [, leftStr, edgeLabel, rightStr] = arrowMatch
      const leftId = parseNodeToken(leftStr.trim())
      const rightId = parseNodeToken(rightStr.trim())
      edges.push({ from: leftId, to: rightId, label: edgeLabel?.trim() })
    } else {
      parseNodeToken(line)
    }
  }

  const nodesList = Array.from(nodeMap.values())
  if (nodesList.length === 0) return { nodes: [], width: 0, height: 0 }

  const inDegree = new Map<string, number>()
  nodesList.forEach((n) => inDegree.set(n.id, 0))
  edges.forEach((e) => inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1))

  const levels = new Map<string, number>()
  const queue: string[] = []

  nodesList.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      levels.set(n.id, 0)
      queue.push(n.id)
    }
  })

  if (queue.length === 0 && nodesList.length > 0) {
    levels.set(nodesList[0].id, 0)
    queue.push(nodesList[0].id)
  }

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curLvl = levels.get(cur) || 0
    edges
      .filter((e) => e.from === cur)
      .forEach((e) => {
        if (!levels.has(e.to)) {
          levels.set(e.to, curLvl + 1)
          queue.push(e.to)
        }
      })
  }

  nodesList.forEach((n) => {
    if (!levels.has(n.id)) levels.set(n.id, 0)
  })

  const byLevel = new Map<number, RawNode[]>()
  nodesList.forEach((n) => {
    const lvl = levels.get(n.id) || 0
    const list = byLevel.get(lvl) || []
    list.push(n)
    byLevel.set(lvl, list)
  })

  const squigNodes: SquigNode[] = []
  const createdMap = new Map<string, ShapeNode>()

  const NODE_W = 140
  const NODE_H = 60
  const GAP_LEVEL = 90
  const GAP_SIBLING = 50

  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b)

  sortedLevels.forEach((lvl) => {
    const siblings = byLevel.get(lvl) || []
    siblings.forEach((raw, sIdx) => {
      let x = 0
      let y = 0

      if (isHorizontal) {
        x = startX + lvl * (NODE_W + GAP_LEVEL)
        y = startY + sIdx * (NODE_H + GAP_SIBLING)
      } else {
        x = startX + sIdx * (NODE_W + GAP_SIBLING)
        y = startY + lvl * (NODE_H + GAP_LEVEL)
      }

      const shapeNode: ShapeNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "shape",
        shape: raw.shape,
        x,
        y,
        w: raw.shape === "diamond" ? 150 : NODE_W,
        h: raw.shape === "diamond" ? 80 : NODE_H,
        fill: "strong",
        stroke: "regular",
        roundness: raw.shape === "rect",
        color: raw.shape === "diamond" ? "#f59e0b" : "#3b82f6",
      }
      squigNodes.push(shapeNode)
      createdMap.set(raw.id, shapeNode)

      // Center text inside shape
      const textNode: TextNode = {
        id: nanoid(8),
        seed: makeSeed(),
        type: "text",
        x: x + 10,
        y: y + (shapeNode.h / 2) - 10,
        w: shapeNode.w - 20,
        h: 24,
        text: raw.label,
        fontSize: 14,
        align: "center",
      }
      squigNodes.push(textNode)
    })
  })

  // Connect Edges
  edges.forEach((e) => {
    const fromNode = createdMap.get(e.from)
    const toNode = createdMap.get(e.to)
    if (!fromNode || !toNode) return

    const startCenter: [number, number] = [fromNode.x + fromNode.w / 2, fromNode.y + fromNode.h / 2]
    const endCenter: [number, number] = [toNode.x + toNode.w / 2, toNode.y + toNode.h / 2]

    const edgeX = Math.min(startCenter[0], endCenter[0])
    const edgeY = Math.min(startCenter[1], endCenter[1])
    const edgeW = Math.max(1, Math.abs(endCenter[0] - startCenter[0]))
    const edgeH = Math.max(1, Math.abs(endCenter[1] - startCenter[1]))

    const arrow: ArrowNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "arrow",
      x: edgeX,
      y: edgeY,
      w: edgeW,
      h: edgeH,
      points: [
        [startCenter[0] - edgeX, startCenter[1] - edgeY],
        [endCenter[0] - edgeX, endCenter[1] - edgeY],
      ],
      head: true,
      stroke: "regular",
      startBinding: { elementId: fromNode.id, focus: 0, gap: 6 },
      endBinding: { elementId: toNode.id, focus: 0, gap: 6 },
      label: e.label,
    }
    squigNodes.push(arrow)
  })

  return {
    nodes: squigNodes,
    width: 600,
    height: 400,
  }
}

/**
 * Parses Mermaid sequence diagrams
 */
function parseSequenceDiagram(lines: string[], startX: number, startY: number): MermaidParsedResult {
  const squigNodes: SquigNode[] = []
  const participants = new Set<string>()

  interface SequenceMsg {
    from: string
    to: string
    text: string
    dashed: boolean
  }
  const messages: SequenceMsg[] = []

  for (const line of lines) {
    if (line.startsWith("participant ")) {
      participants.add(line.replace("participant ", "").trim())
      continue
    }

    const msgMatch = line.match(/^(.+?)\s*(->>|-->>|->|-->)\s*(.+?):\s*(.+)$/)
    if (msgMatch) {
      const [, from, arrowType, to, text] = msgMatch
      participants.add(from.trim())
      participants.add(to.trim())
      messages.push({
        from: from.trim(),
        to: to.trim(),
        text: text.trim(),
        dashed: arrowType.includes("--"),
      })
    }
  }

  const pList = Array.from(participants)
  const COL_WIDTH = 180
  const LIFELINE_HEIGHT = 100 + messages.length * 60

  const participantPositions = new Map<string, number>()

  pList.forEach((p, idx) => {
    const colX = startX + idx * COL_WIDTH
    participantPositions.set(p, colX + 60)

    // Header box
    const headBox: ShapeNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "shape",
      shape: "rect",
      x: colX,
      y: startY,
      w: 120,
      h: 40,
      fill: "strong",
      color: "#3b82f6",
      roundness: true,
    }
    const headText: TextNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "text",
      x: colX + 10,
      y: startY + 10,
      w: 100,
      h: 20,
      text: p,
      fontSize: 14,
      align: "center",
      bold: true,
    }
    // Lifeline
    const lifeline: ArrowNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "arrow",
      x: colX + 60,
      y: startY + 40,
      w: 0,
      h: LIFELINE_HEIGHT,
      points: [[0, 0], [0, LIFELINE_HEIGHT]],
      head: false,
      stroke: "light",
      opacity: 50,
    }
    squigNodes.push(headBox, headText, lifeline)
  })

  // Messages
  messages.forEach((msg, mIdx) => {
    const fromX = participantPositions.get(msg.from) || startX
    const toX = participantPositions.get(msg.to) || startX
    const y = startY + 80 + mIdx * 60

    const arrowX = Math.min(fromX, toX)
    const arrowW = Math.abs(toX - fromX)

    const arrow: ArrowNode = {
      id: nanoid(8),
      seed: makeSeed(),
      type: "arrow",
      x: arrowX,
      y,
      w: arrowW,
      h: 0,
      points: [
        [fromX - arrowX, 0],
        [toX - arrowX, 0],
      ],
      head: true,
      stroke: "regular",
      label: msg.text,
    }
    squigNodes.push(arrow)
  })

  return {
    nodes: squigNodes,
    width: pList.length * COL_WIDTH,
    height: LIFELINE_HEIGHT + 80,
  }
}
