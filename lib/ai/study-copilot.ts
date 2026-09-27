// ---------------------------------------------------------------------------
// Zenith AI — Study Copilot Engine & Pedagogical Layout Generators
// ---------------------------------------------------------------------------

import type { CanvasAction } from "./types"

export interface StudyArtifactParams {
  topic: string
  startX?: number
  startY?: number
}

export class StudyCopilotEngine {
  /**
   * Builds an active recall flashcard grid on the canvas.
   */
  static buildFlashcards(
    cards: Array<{ question: string; answer: string; hint?: string }>,
    startX = 100,
    startY = 100
  ): CanvasAction[] {
    const actions: CanvasAction[] = []
    const cardW = 320
    const cardH = 170
    const gapX = 30
    const gapY = 25
    const cols = 2

    cards.forEach((card, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = startX + col * (cardW + gapX)
      const y = startY + row * (cardH + gapY)

      // Base card container
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x,
        y,
        w: cardW,
        h: cardH,
        shape: "rect",
        fill: "paper",
      } as any)

      // Card Header / Index
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: x + 14,
        y: y + 12,
        w: cardW - 28,
        h: 18,
        text: `CARD ${idx + 1} • ACTIVE RECALL`,
        fontSize: 10,
        bold: true,
      } as any)

      // Question
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: x + 14,
        y: y + 34,
        w: cardW - 28,
        h: 46,
        text: `Q: ${card.question}`,
        fontSize: 13,
        bold: true,
      } as any)

      // Separator / divider line
      actions.push({
        type: "createNode",
        nodeType: "arrow",
        x: x + 14,
        y: y + 84,
        w: cardW - 28,
        h: 0,
      } as any)

      // Answer
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: x + 14,
        y: y + 92,
        w: cardW - 28,
        h: 60,
        text: `A: ${card.answer}${card.hint ? `\n💡 Hint: ${card.hint}` : ""}`,
        fontSize: 12,
      } as any)
    })

    return actions
  }

  /**
   * Builds an interconnected Concept Map with labeled propositions.
   */
  static buildConceptMap(
    centralConcept: string,
    nodes: Array<{
      id: string
      concept: string
      relationToCenter: string // e.g. "synthesizes", "regulates", "contains"
      notes?: string
    }>,
    startX = 300,
    startY = 200
  ): CanvasAction[] {
    const actions: CanvasAction[] = []

    // 1. Central Concept Bubble
    const centerW = 200
    const centerH = 70
    actions.push({
      type: "createNode",
      nodeType: "shape",
      x: startX,
      y: startY,
      w: centerW,
      h: centerH,
      shape: "ellipse",
      fill: "light",
    } as any)

    actions.push({
      type: "createNode",
      nodeType: "text",
      x: startX + 10,
      y: startY + 22,
      w: centerW - 20,
      h: 26,
      text: centralConcept,
      fontSize: 15,
      bold: true,
      align: "center",
    } as any)

    // 2. Peripheral Concept Nodes arranged radially
    const radius = 220
    const count = nodes.length
    nodes.forEach((item, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      const nodeX = Math.round(startX + centerW / 2 + radius * Math.cos(angle) - 80)
      const nodeY = Math.round(startY + centerH / 2 + radius * Math.sin(angle) - 40)
      const nodeW = 160
      const nodeH = 80

      // Node box
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: nodeX,
        y: nodeY,
        w: nodeW,
        h: nodeH,
        shape: "rect",
        fill: "paper",
      } as any)

      // Concept Title
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: nodeX + 10,
        y: nodeY + 12,
        w: nodeW - 20,
        h: 24,
        text: item.concept,
        fontSize: 13,
        bold: true,
        align: "center",
      } as any)

      if (item.notes) {
        actions.push({
          type: "createNode",
          nodeType: "text",
          x: nodeX + 8,
          y: nodeY + 38,
          w: nodeW - 16,
          h: 36,
          text: item.notes,
          fontSize: 11,
          align: "center",
        } as any)
      }

      // Connecting arrow from center to node
      const fromX = startX + centerW / 2
      const fromY = startY + centerH / 2
      const toX = nodeX + nodeW / 2
      const toY = nodeY + nodeH / 2

      actions.push({
        type: "createNode",
        nodeType: "arrow",
        x: Math.min(fromX, toX),
        y: Math.min(fromY, toY),
        w: Math.abs(toX - fromX) || 20,
        h: Math.abs(toY - fromY) || 20,
      } as any)

      // Proposition label on the connector
      const midX = Math.round((fromX + toX) / 2 - 40)
      const midY = Math.round((fromY + toY) / 2 - 12)
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: midX,
        y: midY,
        w: 80,
        h: 20,
        text: `[${item.relationToCenter}]`,
        fontSize: 10,
        bold: true,
        align: "center",
      } as any)
    })

    return actions
  }

  /**
   * Builds an Interactive Diagnostic Quiz with questions, options, and answer reveals.
   */
  static buildQuiz(
    questions: Array<{
      question: string
      options: string[]
      correctAnswer: string
      explanation: string
    }>,
    startX = 100,
    startY = 100
  ): CanvasAction[] {
    const actions: CanvasAction[] = []
    let curY = startY

    questions.forEach((q, idx) => {
      const qW = 600
      const qH = 140 + q.options.length * 28

      // Main quiz card
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: startX,
        y: curY,
        w: qW,
        h: qH,
        shape: "rect",
        fill: "paper",
      } as any)

      // Question Title
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: startX + 16,
        y: curY + 14,
        w: qW - 32,
        h: 36,
        text: `Question ${idx + 1}: ${q.question}`,
        fontSize: 14,
        bold: true,
      } as any)

      // Options
      let optY = curY + 54
      q.options.forEach((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx)
        actions.push({
          type: "createNode",
          nodeType: "text",
          x: startX + 24,
          y: optY,
          w: qW - 48,
          h: 24,
          text: `( ${letter} )  ${opt}`,
          fontSize: 12,
        } as any)
        optY += 28
      })

      // Answer reveal box
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: startX + 16,
        y: optY + 8,
        w: qW - 32,
        h: 46,
        shape: "rect",
        fill: "light",
      } as any)

      actions.push({
        type: "createNode",
        nodeType: "text",
        x: startX + 24,
        y: optY + 14,
        w: qW - 48,
        h: 34,
        text: `✓ Correct: ${q.correctAnswer} — ${q.explanation}`,
        fontSize: 11,
      } as any)

      curY += qH + 24
    })

    return actions
  }

  /**
   * Builds a side-by-side Concept Comparison Table.
   */
  static buildComparisonMatrix(
    conceptA: string,
    conceptB: string,
    attributes: Array<{
      attribute: string
      valueA: string
      valueB: string
    }>,
    startX = 100,
    startY = 100
  ): CanvasAction[] {
    const headers = ["Attribute / Feature", conceptA, conceptB]
    const rows = attributes.map((attr) => [attr.attribute, attr.valueA, attr.valueB])

    return [
      {
        type: "createTable",
        title: `Comparison: ${conceptA} vs ${conceptB}`,
        headers,
        rows,
        startX,
        startY,
      } as any,
    ]
  }

  /**
   * Builds a horizontal timeline with chronological stages/events and milestones.
   */
  static buildTimeline(
    events: Array<{ dateOrStage: string; title: string; description: string }>,
    startX = 100,
    startY = 100
  ): CanvasAction[] {
    const actions: CanvasAction[] = []
    const count = events.length
    const stepW = 200
    const lineW = count * stepW

    // Horizontal baseline arrow
    actions.push({
      type: "createNode",
      nodeType: "arrow",
      x: startX,
      y: startY + 60,
      w: lineW,
      h: 0,
    } as any)

    events.forEach((ev, idx) => {
      const nodeX = startX + idx * stepW
      const isUpper = idx % 2 === 0
      const boxY = isUpper ? startY - 80 : startY + 90

      // Milestone circle
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: nodeX + 70,
        y: startY + 45,
        w: 30,
        h: 30,
        shape: "ellipse",
        fill: "light",
      } as any)

      // Milestone box
      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: nodeX,
        y: boxY,
        w: 170,
        h: 90,
        shape: "rect",
        fill: "paper",
      } as any)

      // Date / stage badge
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: nodeX + 10,
        y: boxY + 8,
        w: 150,
        h: 18,
        text: ev.dateOrStage,
        fontSize: 11,
        bold: true,
      } as any)

      // Title
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: nodeX + 10,
        y: boxY + 28,
        w: 150,
        h: 22,
        text: ev.title,
        fontSize: 13,
        bold: true,
      } as any)

      // Description
      actions.push({
        type: "createNode",
        nodeType: "text",
        x: nodeX + 10,
        y: boxY + 52,
        w: 150,
        h: 32,
        text: ev.description,
        fontSize: 11,
      } as any)
    })

    return actions
  }

  /**
   * Builds an expansive multi-column revision sheet board for exam preparation.
   */
  static buildRevisionBoard(
    topic: string,
    sections: Array<{ heading: string; points: string[] }>,
    startX = 100,
    startY = 100
  ): CanvasAction[] {
    const actions: CanvasAction[] = []
    const colW = 280
    const colH = 360
    const gap = 30

    // Master Header
    actions.push({
      type: "createNode",
      nodeType: "text",
      x: startX,
      y: startY,
      w: 600,
      h: 36,
      text: `📋 REVISION SHEET: ${topic.toUpperCase()}`,
      fontSize: 20,
      bold: true,
    } as any)

    sections.forEach((sec, idx) => {
      const colX = startX + idx * (colW + gap)
      const colY = startY + 50

      actions.push({
        type: "createNode",
        nodeType: "shape",
        x: colX,
        y: colY,
        w: colW,
        h: colH,
        shape: "rect",
        fill: "paper",
      } as any)

      actions.push({
        type: "createNode",
        nodeType: "text",
        x: colX + 16,
        y: colY + 16,
        w: colW - 32,
        h: 26,
        text: sec.heading,
        fontSize: 15,
        bold: true,
      } as any)

      let ptY = colY + 50
      sec.points.forEach((pt) => {
        actions.push({
          type: "createNode",
          nodeType: "text",
          x: colX + 16,
          y: ptY,
          w: colW - 32,
          h: 44,
          text: `• ${pt}`,
          fontSize: 12,
        } as any)
        ptY += 50
      })
    })

    return actions
  }
}
