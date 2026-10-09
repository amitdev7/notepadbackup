// ---------------------------------------------------------------------------
// Excalidraw <-> Zenithsui Bidirectional Converter
// Maps all Excalidraw elements to native SquigNodes and vice versa.
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type {
  SquigNode,
  ShapeNode,
  DrawNode,
  TextNode,
  ArrowNode,
  StickyNoteNode,
  FrameNode,
  EmbedNode,
  ImageNode,
  ArrowBinding,
  FillTone,
  StrokeWeight,
} from "@/lib/types"
import type {
  ExcalidrawDocument,
  ExcalidrawElement,
  ExcalidrawGenericElement,
  ExcalidrawLinearElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawTextElement,
  ExcalidrawImageElement,
  ExcalidrawStickyNoteElement,
} from "./types"

/** Convert Excalidraw fillStyle to Zenithsui FillTone */
function toFillTone(fillStyle: string, backgroundColor: string): FillTone {
  if (backgroundColor === "transparent" || !backgroundColor) return "none"
  if (fillStyle === "solid") return "strong"
  if (fillStyle === "hachure" || fillStyle === "cross-hatch") return "light"
  return "paper"
}

/** Convert Zenithsui FillTone to Excalidraw fillStyle & color */
function fromFillTone(fill: FillTone, color?: string): { fillStyle: "solid" | "hachure"; backgroundColor: string } {
  if (fill === "strong") return { fillStyle: "solid", backgroundColor: color || "#1e1e1e" }
  if (fill === "light" || fill === "paper") return { fillStyle: "hachure", backgroundColor: color || "#a5d8ff" }
  return { fillStyle: "hachure", backgroundColor: "transparent" }
}

/** Check if an unknown JSON object is an Excalidraw document */
export function isExcalidrawDocument(data: unknown): data is ExcalidrawDocument {
  if (!data || typeof data !== "object") return false
  const doc = data as Record<string, unknown>
  return (
    doc.type === "excalidraw" ||
    (Array.isArray(doc.elements) && doc.elements.some((el) => typeof el === "object" && "type" in el))
  )
}

/** Check if an unknown JSON string is an Excalidraw clipboard payload */
export function isExcalidrawClipboard(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    obj.type === "excalidraw/clipboard" ||
    (Array.isArray(obj.elements) && !("nodes" in obj))
  )
}

/**
 * Converts an Excalidraw document or array of elements into Zenithsui SquigNodes and ordering.
 */
export function excalidrawToSquigNodes(
  docOrElements: ExcalidrawDocument | readonly ExcalidrawElement[],
  files?: Record<string, { dataURL: string; mimeType: string }>
): { nodes: Record<string, SquigNode>; order: string[]; fileName?: string } {
  const elements = Array.isArray(docOrElements)
    ? docOrElements
    : (docOrElements as ExcalidrawDocument).elements || []

  const activeFiles = files || (docOrElements as ExcalidrawDocument).files || {}

  const nodes: Record<string, SquigNode> = {}
  const order: string[] = []

  // Track bound text elements so we can attach them to containers/arrows
  const boundTextMap = new Map<string, string>()
  for (const el of elements) {
    if (el.isDeleted) continue
    if (el.type === "text" && (el as ExcalidrawTextElement).containerId) {
      boundTextMap.set((el as ExcalidrawTextElement).containerId!, (el as ExcalidrawTextElement).text)
    }
  }

  for (const el of elements) {
    if (el.isDeleted) continue

    const stroke: StrokeWeight = el.strokeWidth > 3 ? "heavy" : el.strokeWidth > 1.5 ? "regular" : "light"
    const seed = el.seed || Math.floor(Math.random() * 1000000)

    const baseProps = {
      id: el.id || nanoid(8),
      x: Math.round(el.x),
      y: Math.round(el.y),
      w: Math.max(1, Math.round(el.width)),
      h: Math.max(1, Math.round(el.height)),
      seed,
      stroke,
      color: el.strokeColor && el.strokeColor !== "#000000" && el.strokeColor !== "#1e1e1e" ? el.strokeColor : undefined,
      opacity: el.opacity !== undefined ? Math.round(el.opacity) : 100,
      locked: !!el.locked,
      groupIds: el.groupIds ? [...el.groupIds] : undefined,
    }

    switch (el.type) {
      case "rectangle":
      case "diamond":
      case "ellipse": {
        const gen = el as ExcalidrawGenericElement
        const shapeKind = el.type === "rectangle" ? "rect" : el.type === "diamond" ? "diamond" : "ellipse"
        const node: ShapeNode = {
          ...baseProps,
          type: "shape",
          shape: shapeKind,
          fill: toFillTone(gen.fillStyle, gen.backgroundColor),
          roundness: !!gen.roundness,
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "freedraw": {
        const free = el as ExcalidrawFreeDrawElement
        const points: [number, number][] = (free.points || []).map(([px, py]) => [px, py])
        const node: DrawNode = {
          ...baseProps,
          type: "draw",
          points,
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "line":
      case "arrow": {
        const linear = el as ExcalidrawLinearElement
        const pts = linear.points || [[0, 0], [linear.width, linear.height]]
        const startPt = pts[0] || [0, 0]
        const endPt = pts[pts.length - 1] || [linear.width, linear.height]

        let startBinding: ArrowBinding | null = null
        if (linear.startBinding?.elementId) {
          startBinding = {
            elementId: linear.startBinding.elementId,
            focus: linear.startBinding.focus || 0,
            gap: linear.startBinding.gap || 6,
          }
        }

        let endBinding: ArrowBinding | null = null
        if (linear.endBinding?.elementId) {
          endBinding = {
            elementId: linear.endBinding.elementId,
            focus: linear.endBinding.focus || 0,
            gap: linear.endBinding.gap || 6,
          }
        }

        const node: ArrowNode = {
          ...baseProps,
          type: "arrow",
          points: [
            [startPt[0], startPt[1]],
            [endPt[0], endPt[1]],
          ],
          head: el.type === "arrow" || !!linear.endArrowhead,
          startBinding,
          endBinding,
          label: boundTextMap.get(el.id),
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "text": {
        const txt = el as ExcalidrawTextElement
        const node: TextNode = {
          ...baseProps,
          type: "text",
          text: txt.text || "",
          fontSize: txt.fontSize || 18,
          align: txt.textAlign || "left",
          link: el.link || undefined,
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "stickyNote": {
        const sticky = el as ExcalidrawStickyNoteElement
        const node: StickyNoteNode = {
          ...baseProps,
          type: "sticky",
          text: sticky.text || boundTextMap.get(el.id) || "",
          tone: "yellow",
          fontSize: 16,
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "frame":
      case "magicframe": {
        const node: FrameNode = {
          ...baseProps,
          type: "frame",
          name: (el.customData?.name as string) || "Frame",
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }

      case "image": {
        const img = el as ExcalidrawImageElement
        const fileEntry = img.fileId ? activeFiles[img.fileId] : null
        if (fileEntry?.dataURL) {
          const node: ImageNode = {
            ...baseProps,
            type: "image",
            src: fileEntry.dataURL,
            naturalW: baseProps.w,
            naturalH: baseProps.h,
          }
          nodes[node.id] = node
          order.push(node.id)
        }
        break
      }

      case "embeddable": {
        const node: EmbedNode = {
          ...baseProps,
          type: "embed",
          url: el.link || "",
          title: (el.customData?.title as string) || "Embedded link",
        }
        nodes[node.id] = node
        order.push(node.id)
        break
      }
    }
  }

  return { nodes, order }
}

/**
 * Converts Zenithsui nodes and ordering into a compliant Excalidraw v2 document.
 */
export function squigNodesToExcalidraw(
  nodes: Record<string, SquigNode>,
  order: readonly string[],
  fileName = "zenithsui-drawing"
): ExcalidrawDocument {
  const elements: ExcalidrawElement[] = []
  const files: Record<string, { mimeType: string; id: string; dataURL: string; created: number }> = {}

  let versionNonce = 1000

  for (const id of order) {
    const node = nodes[id]
    if (!node) continue

    const strokeVal = "stroke" in node ? (node as any).stroke : undefined
    const strokeWidth = strokeVal === "heavy" ? 4 : strokeVal === "regular" ? 2 : 1
    const base: any = {
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.w,
      height: node.h,
      angle: 0,
      strokeColor: node.color || "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth,
      strokeStyle: "solid",
      roughness: 1,
      opacity: node.opacity !== undefined ? node.opacity : 100,
      groupIds: node.groupIds ? [...node.groupIds] : [],
      frameId: null,
      roundness: null,
      seed: node.seed || Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: versionNonce++,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: !!node.locked,
    }

    switch (node.type) {
      case "shape": {
        const { fillStyle, backgroundColor } = fromFillTone(node.fill, node.color)
        base.type = node.shape === "rect" ? "rectangle" : node.shape === "diamond" ? "diamond" : "ellipse"
        base.fillStyle = fillStyle
        base.backgroundColor = backgroundColor
        base.roundness = node.roundness ? { type: 3 } : null
        elements.push(base)
        break
      }

      case "draw": {
        base.type = "freedraw"
        base.points = node.points && node.points.length ? node.points : [[0, 0], [node.w, node.h]]
        base.pressures = []
        base.simulatePressure = true
        elements.push(base)
        break
      }

      case "arrow": {
        base.type = node.head ? "arrow" : "line"
        base.points = node.points || [[0, 0], [node.w, node.h]]
        base.startArrowhead = null
        base.endArrowhead = node.head ? "arrow" : null
        base.startBinding = node.startBinding
          ? { elementId: node.startBinding.elementId, focus: node.startBinding.focus, gap: node.startBinding.gap || 6 }
          : null
        base.endBinding = node.endBinding
          ? { elementId: node.endBinding.elementId, focus: node.endBinding.focus, gap: node.endBinding.gap || 6 }
          : null
        elements.push(base)

        // If arrow has a label, generate a bound text element
        if (node.label) {
          const textId = nanoid(8)
          const textEl: ExcalidrawTextElement = {
            id: textId,
            type: "text",
            x: node.x + node.w / 2 - 30,
            y: node.y + node.h / 2 - 10,
            width: 60,
            height: 20,
            angle: 0,
            strokeColor: node.color || "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: [],
            frameId: null,
            boundElements: null,
            seed: Math.floor(Math.random() * 1000000),
            version: 1,
            versionNonce: versionNonce++,
            isDeleted: false,
            link: null,
            locked: false,
            text: node.label,
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            baseline: 14,
            containerId: node.id,
            originalText: node.label,
          }
          elements.push(textEl)
        }
        break
      }

      case "text": {
        base.type = "text"
        base.text = node.text
        base.fontSize = node.fontSize || 18
        base.fontFamily = 1
        base.textAlign = node.align || "left"
        base.verticalAlign = "top"
        base.baseline = 16
        base.containerId = null
        base.originalText = node.text
        base.link = node.link || null
        elements.push(base)
        break
      }

      case "sticky": {
        base.type = "stickyNote"
        base.text = node.text
        base.backgroundColor = node.tone === "blue" ? "#a5d8ff" : node.tone === "green" ? "#b2f2bb" : "#ffec99"
        elements.push(base)
        break
      }

      case "frame": {
        base.type = "frame"
        base.customData = { name: node.name }
        elements.push(base)
        break
      }

      case "image": {
        const fileId = nanoid(10)
        base.type = "image"
        base.fileId = fileId
        base.scale = [1, 1]
        base.status = "saved"
        files[fileId] = {
          id: fileId,
          mimeType: "image/png",
          dataURL: node.src,
          created: Date.now(),
        }
        elements.push(base)
        break
      }

      case "embed": {
        base.type = "embeddable"
        base.link = node.url
        base.customData = { title: node.title }
        elements.push(base)
        break
      }
    }
  }

  return {
    type: "excalidraw",
    version: 2,
    source: "https://zenithsui.app",
    elements,
    appState: {
      viewBackgroundColor: "#ffffff",
      gridSize: 24,
      theme: "light",
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
    },
    files,
  }
}
