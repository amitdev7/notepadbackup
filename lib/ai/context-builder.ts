// ---------------------------------------------------------------------------
// Zenith AI — Canvas Context Builder & Natural Reference Resolver
// ---------------------------------------------------------------------------

import type { SquigNode } from "../types"
import { sanitizeOutput } from "./security-audit"

export interface NaturalContextOptions {
  fileName?: string
  attachedDocs?: Array<{ name: string; textSnippet?: string }>
  userQuery?: string
  lastReferencedNodeIds?: string[]
  recentlyCreatedNodeIds?: string[]
  recentlyModifiedNodeIds?: string[]
  recentArtifacts?: Array<{
    id: string
    type: string
    title: string
    nodeIds: string[]
    timestamp: number
  }>
  lastAssistantMessage?: string
  recentAssetsUsed?: string[]
}

export interface ResolvedContextReference {
  focalNodeIds: string[]
  referenceSource: "explicit_selection" | "recent_ai_created" | "last_referenced" | "recent_artifact" | "previous_answer" | "canvas_overview"
  explanation?: string
  previousAnswerSnippet?: string
}

export class AIContextBuilder {
  /**
   * Resolves contextual pronouns ("this", "that", "it", "the thing you just added", "the previous answer")
   * following strict priority rules:
   * 1. Explicit current selection
   * 2. Explicit referenced node ID or name
   * 3. Most recently referenced node
   * 4. Most recently AI-created artifact / node
   * 5. Relevant nearby object/context
   */
  static resolveContextualFocus(
    nodes: Record<string, SquigNode>,
    selectedIds: string[] = [],
    options: NaturalContextOptions = {}
  ): ResolvedContextReference {
    const q = (options.userQuery || "").toLowerCase()

    // 1. References to previous AI response / placing answer on canvas
    if (
      q.includes("previous answer") ||
      q.includes("last answer") ||
      q.includes("put this on the canvas") ||
      q.includes("put that on the canvas") ||
      q.includes("show the answer on canvas") ||
      q.includes("place on canvas") ||
      q.includes("add this answer") ||
      q.includes("turn that into a mind map") && !selectedIds.length && options.lastAssistantMessage
    ) {
      if (options.lastAssistantMessage) {
        return {
          focalNodeIds: [],
          referenceSource: "previous_answer",
          explanation: "User is referring to your previous assistant answer.",
          previousAnswerSnippet: options.lastAssistantMessage.slice(0, 1500),
        }
      }
    }

    // 2. Explicit current selection
    const validSelection = selectedIds.filter((id) => Boolean(nodes[id]))
    if (validSelection.length > 0) {
      return {
        focalNodeIds: validSelection,
        referenceSource: "explicit_selection",
        explanation: `User has ${validSelection.length} canvas object(s) explicitly selected.`,
      }
    }

    // 3. User specifically refers to "what you just added" / "the thing you just created"
    if (
      q.includes("just added") ||
      q.includes("just created") ||
      q.includes("you added") ||
      q.includes("you just created") ||
      q.includes("last object") ||
      q.includes("last node")
    ) {
      const recentIds = (options.recentlyCreatedNodeIds || []).filter((id) => Boolean(nodes[id]))
      if (recentIds.length > 0) {
        return {
          focalNodeIds: recentIds.slice(-5),
          referenceSource: "recent_ai_created",
          explanation: "Resolved to the objects most recently created by Zenith AI.",
        }
      }
    }

    // 4. User refers to "this", "that", "it", "these", "those" with no explicit selection
    const hasDeicticPronoun = /\b(this|that|it|these|those|the selected|make that|move that|turn that|delete that|style that)\b/i.test(q)
    if (hasDeicticPronoun) {
      // Check last referenced nodes
      const lastReferenced = (options.lastReferencedNodeIds || []).filter((id) => Boolean(nodes[id]))
      if (lastReferenced.length > 0) {
        return {
          focalNodeIds: lastReferenced.slice(-3),
          referenceSource: "last_referenced",
          explanation: "Resolved deictic reference ('this'/'that') to the most recently referenced object(s).",
        }
      }

      // Check recently created nodes
      const recentlyCreated = (options.recentlyCreatedNodeIds || []).filter((id) => Boolean(nodes[id]))
      if (recentlyCreated.length > 0) {
        return {
          focalNodeIds: recentlyCreated.slice(-3),
          referenceSource: "recent_ai_created",
          explanation: "Resolved deictic reference ('this'/'that') to the objects recently created by Zenith AI.",
        }
      }

      // Check recent artifact
      if (options.recentArtifacts && options.recentArtifacts.length > 0) {
        const latestArtifact = options.recentArtifacts[0]
        const artifactNodes = latestArtifact.nodeIds.filter((id) => Boolean(nodes[id]))
        if (artifactNodes.length > 0) {
          return {
            focalNodeIds: artifactNodes,
            referenceSource: "recent_artifact",
            explanation: `Resolved deictic reference to recent study artifact: "${latestArtifact.title}" (${latestArtifact.type}).`,
          }
        }
      }
    }

    return {
      focalNodeIds: [],
      referenceSource: "canvas_overview",
    }
  }

  /**
   * Finds nearby neighboring nodes within a bounding radius to provide spatial awareness.
   */
  static findNearbyNodes(
    nodes: Record<string, SquigNode>,
    targetIds: string[],
    proximityRadius = 250
  ): Array<{ id: string; type: string; label?: string; relativePosition: string }> {
    if (targetIds.length === 0) return []

    // Calculate bounding box of target nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of targetIds) {
      const n = nodes[id]
      if (!n) continue
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + (n.w || 100))
      maxY = Math.max(maxY, n.y + (n.h || 50))
    }

    if (minX === Infinity) return []

    const searchBox = {
      minX: minX - proximityRadius,
      minY: minY - proximityRadius,
      maxX: maxX + proximityRadius,
      maxY: maxY + proximityRadius,
    }

    const nearby: Array<{ id: string; type: string; label?: string; relativePosition: string }> = []
    const targetSet = new Set(targetIds)

    for (const [id, n] of Object.entries(nodes)) {
      if (targetSet.has(id)) continue
      const cx = n.x + (n.w || 100) / 2
      const cy = n.y + (n.h || 50) / 2

      if (cx >= searchBox.minX && cx <= searchBox.maxX && cy >= searchBox.minY && cy <= searchBox.maxY) {
        let relPos = "nearby"
        if (cx < minX) relPos = "to the left"
        else if (cx > maxX) relPos = "to the right"
        else if (cy < minY) relPos = "above"
        else if (cy > maxY) relPos = "below"

        let label: string = n.type
        if (n.type === "text" && n.text) label = `"${n.text.slice(0, 30)}"`
        else if (n.type === "component") label = `${n.kind || "component"}`
        else if (n.type === "shape") label = `${n.shape || "shape"}`

        nearby.push({ id, type: n.type, label, relativePosition: relPos })
        if (nearby.length >= 6) break
      }
    }

    return nearby
  }

  /**
   * Builds a concise, highly focused context prompt for the AI model with
   * targeted context extraction and pronoun reference resolution.
   */
  static buildContextPrompt(
    nodes: Record<string, SquigNode>,
    selectedIds: string[] = [],
    options: NaturalContextOptions = {}
  ): string {
    const parts: string[] = []

    if (options.fileName) {
      parts.push(`Current Canvas Page: "${options.fileName}"`)
    }

    // 1. Contextual reference resolution
    const resolved = this.resolveContextualFocus(nodes, selectedIds, options)

    if (resolved.referenceSource === "previous_answer" && resolved.previousAnswerSnippet) {
      parts.push(`\n=== CONTEXT: PREVIOUS ASSISTANT ANSWER TO PLACE/ADAPT ===`)
      parts.push(`The user wants to work with or place your previous answer onto the canvas:`)
      parts.push(`"""\n${sanitizeOutput(resolved.previousAnswerSnippet)}\n"""`)
    } else if (resolved.focalNodeIds.length > 0) {
      parts.push(`\n=== FOCAL CANVAS OBJECTS (${resolved.focalNodeIds.length}) [Source: ${resolved.referenceSource}] ===`)
      if (resolved.explanation) {
        parts.push(`ℹ️ Context note: ${resolved.explanation}`)
      }

      for (const id of resolved.focalNodeIds) {
        const node = nodes[id]
        if (!node) continue

        let desc = `- [Node ID: ${id}] Type: ${node.type}, Position: (${Math.round(node.x)}, ${Math.round(node.y)}), Size: ${Math.round(node.w)}x${Math.round(node.h)}`

        if (node.type === "text") {
          desc += `, Text Content: "${sanitizeOutput(node.text || "")}"`
          if (node.fontSize) desc += `, Font Size: ${node.fontSize}px`
        } else if (node.type === "shape") {
          desc += `, Shape: ${node.shape || (node as any).shapeKind || "rect"}, Fill Tone: ${node.fill || (node as any).tone || "none"}`
        } else if (node.type === "component") {
          desc += `, Component: ${node.kind || (node as any).componentKind || "component"}, Props: ${JSON.stringify(node.props || {})}`
        } else if (node.type === "arrow") {
          desc += `, Arrow Connector: start (${Math.round(node.x)}, ${Math.round(node.y)}) to (${Math.round(node.x + (node.w || 50))}, ${Math.round(node.y + (node.h || 50))})`
        }

        parts.push(desc)
      }

      // Nearby spatial context
      const nearby = this.findNearbyNodes(nodes, resolved.focalNodeIds)
      if (nearby.length > 0) {
        parts.push(`Nearby surrounding objects: ${nearby.map((n) => `${n.label} (${n.relativePosition})`).join(", ")}`)
      }
    } else {
      // Summary of overall canvas if no specific focus
      const nodeKeys = Object.keys(nodes)
      if (nodeKeys.length > 0) {
        parts.push(`\n=== CANVAS OVERVIEW (${nodeKeys.length} total objects) ===`)
        const textNodes = nodeKeys.map((id) => nodes[id]).filter((n) => n?.type === "text")
        const componentNodes = nodeKeys.map((id) => nodes[id]).filter((n) => n?.type === "component")

        if (textNodes.length > 0) {
          parts.push(`Text Headings/Labels on canvas:`)
          for (const tn of textNodes.slice(0, 8)) {
            if (tn.type === "text" && tn.text) {
              parts.push(`  • "${sanitizeOutput(tn.text.slice(0, 80))}"`)
            }
          }
        }

        if (componentNodes.length > 0) {
          parts.push(`UI Components present: ${componentNodes.map((c) => (c.type === "component" ? (c.kind || (c as any).componentKind) : "")).filter(Boolean).slice(0, 6).join(", ")}`)
        }
      }
    }

    // 2. Recent AI-created artifacts if available
    if (options.recentArtifacts && options.recentArtifacts.length > 0) {
      const topArtifact = options.recentArtifacts[0]
      parts.push(`\nRecent Study Artifact on Canvas: "${topArtifact.title}" (${topArtifact.type})`)
    }

    // 3. Attached document context
    if (options.attachedDocs && options.attachedDocs.length > 0) {
      parts.push(`\n=== ATTACHED STUDY DOCUMENTS & EXCERPTS ===`)
      for (const doc of options.attachedDocs) {
        parts.push(`Document: "${doc.name}"`)
        if (doc.textSnippet) {
          parts.push(`Excerpt:\n"""\n${sanitizeOutput(doc.textSnippet.slice(0, 2000))}\n"""`)
        }
      }
    }

    return parts.join("\n")
  }
}
