"use client"

// ---------------------------------------------------------------------------
// The system clipboard.
//
// zenithsui keeps its own private clipboard for ⌘C/⌘V inside one canvas, but that
// stops at the tab. This is the other half: layers written out in a form a
// second zenithsui tab can read back, and everything else the world might hand us
// — a screenshot, a logo, a paragraph — turned into something on the paper.
//
// The payload's own format, and the vetting every incoming node goes through,
// live next door in clipboard-payload.
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"

import { decodeNodes, encodeNodes, payloadFromHtml, payloadHtml, wordsOf } from "./clipboard-payload"
import { useSquig } from "./store"
import { measureTextWidth } from "./canvas/text-metrics"
import { fitTextBox } from "./canvas/text-reflow"
import { screenToWorld, type ImageNode, type DocumentNode, type SquigNode, type TextNode } from "./types"
import { saveDocumentAsset } from "./storage/document-assets"
import {
  isExcalidrawDocument,
  isExcalidrawClipboard,
  excalidrawToSquigNodes,
  isMaybeMermaidDefinition,
  parseMermaidToZenithsui,
  isMaybeSpreadsheet,
  tryParseSpreadsheet,
  renderBarChart,
  parseExcalidrawLibrary,
} from "./excalidraw/index"

// -- copying out ------------------------------------------------------------

/** Put a selection on the clipboard, both ways round. */
export function writeNodes(dt: DataTransfer, nodes: readonly SquigNode[]): void {
  const json = encodeNodes(nodes)
  dt.setData("text/html", payloadHtml(json))
  dt.setData("text/plain", wordsOf(nodes) || json)
}

/**
 * Copy from a click rather than a keystroke — the palette and the menu.
 *
 * There is no copy event to hang this on: the palette's own input has the
 * focus by then, and a copy aimed at a text field is that field's business.
 * So the same two carriers go on through the async clipboard instead, and
 * zenithsui's private one is filled either way, so ⇧⌘V still has something to put
 * back even where the browser refuses the write.
 */
export function copySelection(): void {
  const s = useSquig.getState()
  const sel = s.order.filter((id) => s.selection.includes(id)).map((id) => s.nodes[id]).filter(Boolean)
  if (!sel.length) return
  s.copySelected()
  const json = encodeNodes(sel)
  try {
    void navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([payloadHtml(json)], { type: "text/html" }),
        "text/plain": new Blob([wordsOf(sel) || json], { type: "text/plain" }),
      }),
    ])
  } catch {
    // zenithsui's own clipboard already has it; the system one can sit this out
  }
}

/** Cut from a click — the same copy, and then the layers go. */
export function cutSelection(): void {
  copySelection()
  useSquig.getState().deleteSelected()
}

// -- pictures ---------------------------------------------------------------

/**
 * How big a pasted picture is allowed to be once it's in the document.
 *
 * Documents live in localStorage, which is a handful of megabytes for the
 * whole drawer — and a full-quota save doesn't fail quietly, it starts
 * evicting other files to make room (see saveFile). So a screenshot gets
 * re-encoded down before it's ever a node, and the budget is set by how many
 * of them one document should be able to hold rather than by how good any one
 * of them could look: ~10 at a few hundred KB each, which is more reference
 * than a wireframe has ever needed.
 */
const MAX_EDGE = 1280
/** past this, re-encode rather than keep the original bytes */
const KEEP_ORIGINAL_BYTES = 120_000
/** the ceiling a re-encode aims to come in under, in data-URL characters */
const MAX_STORED = 400_000

/**
 * Quality then scale, tried in order.
 *
 * Quality first because it's free — a screenshot at 0.7 is indistinguishable
 * at wireframe size. Scale only when a picture is genuinely enormous, and only
 * as far as the point where it stops being worth pasting at all.
 */
const ATTEMPTS: { scale: number; quality: number }[] = [
  { scale: 1, quality: 0.85 },
  { scale: 1, quality: 0.7 },
  { scale: 0.75, quality: 0.7 },
  { scale: 0.5, quality: 0.65 },
  { scale: 0.35, quality: 0.6 },
]

/** How wide a picture lands on the canvas — big enough to see, small enough to move. */
const PLACED_EDGE = 420

let webpOk: boolean | null = null

/** Does this browser's canvas encode WebP? Asked once, answered forever. */
function supportsWebp(): boolean {
  if (webpOk === null) {
    try {
      const c = document.createElement("canvas")
      c.width = 1
      c.height = 1
      webpOk = c.toDataURL("image/webp").startsWith("data:image/webp")
    } catch {
      webpOk = false
    }
  }
  return webpOk
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("image failed to load"))
    img.src = src
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error("could not read the file"))
    r.readAsDataURL(blob)
  })
}

/**
 * Redraw a picture small enough to keep, and hand back a data URL.
 *
 * WebP where there is one — it holds transparency and beats both JPEG and PNG
 * on a screenshot. Where there isn't, a photo falls back to JPEG and anything
 * that might have an alpha channel stays PNG, which the size loop then has to
 * shrink its way out of instead.
 */
function reencode(img: HTMLImageElement, nw: number, nh: number, sourceType: string): string | null {
  const type = supportsWebp() ? "image/webp" : sourceType === "image/jpeg" ? "image/jpeg" : "image/png"
  const base = Math.min(1, MAX_EDGE / Math.max(nw, nh))
  let last: string | null = null

  for (const attempt of ATTEMPTS) {
    const k = base * attempt.scale
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(nw * k))
    canvas.height = Math.max(1, Math.round(nh * k))
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    // JPEG has no alpha, and an unpainted canvas behind a transparent PNG
    // comes out black rather than absent
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    try {
      last = canvas.toDataURL(type, attempt.quality)
    } catch {
      return null
    }
    if (last.length <= MAX_STORED) return last
  }
  // even the smallest attempt is over: take it anyway rather than refusing the
  // paste. One oversized picture is a document that saves slowly, not a lost one
  return last
}

/** Turn a picture off the clipboard into a node, or null if it isn't one. */
export async function imageNodeFrom(blob: Blob, name?: string): Promise<ImageNode | null> {
  if (!blob.type.startsWith("image/")) return null
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height
    if (!nw || !nh) return null

    // small enough already: keep the original bytes rather than re-encoding
    // them. That's what keeps a crisp UI screenshot crisp — and an animated
    // GIF animated, since a redraw would flatten it to its first frame
    const asIs = blob.size <= KEEP_ORIGINAL_BYTES && Math.max(nw, nh) <= MAX_EDGE
    const src = asIs ? await blobToDataUrl(blob) : reencode(img, nw, nh, blob.type)
    if (!src) return null

    const k = Math.min(1, PLACED_EDGE / Math.max(nw, nh))
    return {
      id: nanoid(8),
      type: "image",
      src,
      naturalW: nw,
      naturalH: nh,
      name,
      x: 0,
      y: 0,
      w: Math.round(nw * k),
      h: Math.round(nh * k),
      seed: Math.floor(Math.random() * 2 ** 31),
    }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Turn a document (PDF, TXT, CSV, JSON, MD, DOCX, XLSX, etc.) into a DocumentNode. */
export async function documentNodeFrom(file: File | Blob, rawName?: string): Promise<DocumentNode | null> {
  try {
    const filename = rawName || (file instanceof File ? file.name : "document.pdf")
    const res = await saveDocumentAsset(file, filename)
    const isPdf = res.extension === "pdf"
    const isTable = res.extension === "csv" || res.extension === "tsv"
    const isCode = ["json", "js", "ts", "html", "css"].includes(res.extension)
    const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(res.extension)

    let w = 320
    let h = 260
    if (isPdf) {
      if (res.naturalW && res.naturalH && res.naturalW > res.naturalH) {
        w = 440
        h = 340 // landscape PDF
      } else {
        w = 340
        h = 440 // portrait PDF
      }
    } else if (isTable) {
      w = 380
      h = 300
    } else if (isCode) {
      w = 340
      h = 280
    } else if (isOffice) {
      w = 260
      h = 220
    }

    return {
      id: nanoid(8),
      type: "document",
      assetId: res.assetId,
      src: `asset://${res.hash}`,
      name: res.name,
      mimeType: res.mimeType,
      extension: res.extension,
      sizeBytes: res.sizeBytes,
      pageCount: res.pageCount || 1,
      currentPage: 1,
      textContent: res.textContent,
      thumbnailUrl: res.thumbnailUrl,
      attachedAt: Date.now(),
      status: "local",
      x: 0,
      y: 0,
      w,
      h,
      seed: Math.floor(Math.random() * 2 ** 31),
    }
  } catch (err) {
    console.error("Failed to create document node:", err)
    return null
  }
}

// -- words ------------------------------------------------------------------

/** The size pasted words land at — the same one the text tool starts from. */
const PASTED_FONT_SIZE = 18
/** How wide a pasted run is allowed to run before it's broken up. */
const PASTED_WIDTH = 420

/**
 * Break a pasted line to a readable width.
 *
 * zenithsui text doesn't wrap — a line ends where you pressed Return — so this is
 * not a layout rule, it's a one-time decision about where the returns go. A
 * paragraph off a web page arrives as a single line, and a single line is
 * three thousand units wide and no use to anybody.
 */
function wrap(line: string, style: { size: number }): string[] {
  if (measureTextWidth(line, style) <= PASTED_WIDTH) return [line]
  const out: string[] = []
  let current = ""
  for (const word of line.split(/(?<=\s)/)) {
    const next = current + word
    if (current && measureTextWidth(next.trimEnd(), style) > PASTED_WIDTH) {
      out.push(current.trimEnd())
      current = word.trimStart()
    } else {
      current = next
    }
  }
  if (current.trimEnd()) out.push(current.trimEnd())
  return out.length ? out : [line]
}

function textNodeFrom(text: string, at: [number, number]): TextNode | null {
  // a clipboard full of newlines and nothing else is not a paste worth making
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\s+$/, "")
  if (!normalized.trim()) return null
  const cleaned = normalized
    .split("\n")
    .flatMap((line) => wrap(line, { size: PASTED_FONT_SIZE }))
    .join("\n")
  const base: TextNode = {
    id: nanoid(8),
    type: "text",
    text: "",
    fontSize: PASTED_FONT_SIZE,
    x: at[0],
    y: at[1],
    w: 0,
    h: 0,
    seed: Math.floor(Math.random() * 2 ** 31),
  }
  return { ...base, ...fitTextBox(base, cleaned) }
}

// -- putting it down --------------------------------------------------------

/** Where a paste lands when the pointer has never been over the canvas. */
function viewportCentre(): [number, number] {
  const v = useSquig.getState().viewport
  return screenToWorld(v, window.innerWidth / 2, window.innerHeight / 2)
}

/** Stagger, so pasting four pictures at once doesn't stack them into one. */
const CASCADE = 24

interface Incoming {
  html?: string | null
  text?: string | null
  images: Blob[]
  documents?: File[]
}

/**
 * Everything a paste or drop could be, in the order it should be tried.
 *
 * Layers first: a zenithsui payload arrives as text, so reading the words before
 * looking for the payload would turn every cross-tab paste into a paragraph of
 * JSON. Pictures next, documents next, then whatever text is left over.
 *
 * `at` is the top-left corner the paste lands on — the same convention ⌘V has
 * always had here. `inPlace` ignores it and puts the layers back at the
 * coordinates they were copied from.
 */
async function place(c: Incoming, at?: [number, number], inPlace = false): Promise<boolean> {
  const s = useSquig.getState()

  const nodes = decodeNodes(payloadFromHtml(c.html)) ?? decodeNodes(c.text)
  if (nodes) {
    const corner: [number, number] | undefined = inPlace
      ? [Math.min(...nodes.map((n) => n.x)), Math.min(...nodes.map((n) => n.y))]
      : at
    s.pasteNodes(nodes, corner)
    return true
  }

  // Check if text is Excalidraw clipboard JSON
  if (c.text) {
    try {
      const parsed = JSON.parse(c.text)
      if (isExcalidrawDocument(parsed) || isExcalidrawClipboard(parsed)) {
        const { nodes: excalNodes, order } = excalidrawToSquigNodes(parsed)
        const list = order.map((id) => excalNodes[id]).filter(Boolean)
        if (list.length > 0) {
          const corner: [number, number] | undefined = inPlace
            ? [Math.min(...list.map((n) => n.x)), Math.min(...list.map((n) => n.y))]
            : at
          s.pasteNodes(list, corner)
          s.setNotice(`Pasted ${list.length} element(s) from Universal Sketch`)
          return true
        }
      }
    } catch {
      // not JSON, continue
    }

    // Check if text is a Mermaid diagram
    if (isMaybeMermaidDefinition(c.text)) {
      const [px, py] = at ?? viewportCentre()
      const res = parseMermaidToZenithsui(c.text, px - 200, py - 150)
      if (res.nodes.length > 0) {
        s.addNodes(res.nodes)
        s.setSelection(res.nodes.map((n) => n.id))
        s.setNotice(`Converted Mermaid diagram (${res.nodes.length} nodes)`)
        return true
      }
    }

    // Check if text is spreadsheet tabular data (TSV / CSV)
    if (isMaybeSpreadsheet(c.text)) {
      const parsedChart = tryParseSpreadsheet(c.text)
      if (parsedChart.ok) {
        const [px, py] = at ?? viewportCentre()
        const chartNodes = renderBarChart(parsedChart.data, px - 200, py)
        if (chartNodes.length > 0) {
          s.addNodes(chartNodes)
          s.setSelection(chartNodes.map((n) => n.id))
          s.setNotice("Generated Bar Chart from pasted spreadsheet data")
          return true
        }
      }
    }
  }

  const hasFiles = (c.images && c.images.length > 0) || (c.documents && c.documents.length > 0)
  if (hasFiles) {
    const made: (ImageNode | DocumentNode)[] = []
    for (const blob of c.images) {
      const node = await imageNodeFrom(blob, blob instanceof File ? blob.name : undefined)
      if (node) made.push(node)
    }
    if (c.documents?.length) {
      for (const doc of c.documents) {
        const node = await documentNodeFrom(doc, doc.name)
        if (node) made.push(node)
      }
    }

    if (!made.length) {
      s.setNotice("couldn't read those attachments")
      return false
    }

    const [px, py] = at ?? viewportCentre()
    const [ox, oy] = at ? [px, py] : [px - made[0].w / 2, py - made[0].h / 2]

    // Multi-file layout: clean grid with up to 3 columns and 28px gaps (Section 73)
    const cols = made.length <= 4 ? made.length : 3
    const GAP_X = 28
    const GAP_Y = 28
    let curX = ox
    let curY = oy
    let rowMaxH = 0

    made.forEach((n, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      if (col === 0 && row > 0) {
        curX = ox
        curY += rowMaxH + GAP_Y
        rowMaxH = 0
      }
      n.x = Math.round(curX)
      n.y = Math.round(curY)
      curX += n.w + GAP_X
      rowMaxH = Math.max(rowMaxH, n.h)
    })

    s.addNodes(made)
    s.setSelection(made.map((m) => m.id))
    return true
  }

  if (c.text) {
    const node = textNodeFrom(c.text, at ?? viewportCentre())
    if (node) {
      s.addNodes([node])
      s.setSelection([node.id])
      return true
    }
  }

  return false
}

/** Files on a paste or a drop, categorized into images and documents. */
function filesIn(dt: DataTransfer): { images: Blob[]; documents: File[] } {
  const images: Blob[] = []
  const documents: File[] = []

  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind !== "file") continue
      const file = item.getAsFile()
      if (!file) continue
      if (file.type.startsWith("image/")) {
        images.push(file)
      } else {
        documents.push(file)
      }
    }
  } else if (dt.files && dt.files.length) {
    for (const file of Array.from(dt.files)) {
      if (file.type.startsWith("image/")) {
        images.push(file)
      } else {
        documents.push(file)
      }
    }
  }

  return { images, documents }
}

/** Drop desktop files directly onto canvas at world coordinates. */
export async function dropFiles(files: File[], at: [number, number]): Promise<boolean> {
  const s = useSquig.getState()
  const images: Blob[] = []
  const documents: File[] = []

  for (const file of files) {
    const lower = file.name.toLowerCase()
    if (lower.endsWith(".excalidraw") || lower.endsWith(".zenithsui.json")) {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (isExcalidrawDocument(parsed)) {
          const { nodes, order } = excalidrawToSquigNodes(parsed)
          const list = order.map((id) => nodes[id]).filter(Boolean)
          if (list.length > 0) {
            s.pasteNodes(list, at)
            s.setNotice(`Imported ${list.length} element(s) from ${file.name}`)
            return true
          }
        } else if (parsed && parsed.nodes && Array.isArray(parsed.order)) {
          s.loadDoc(text)
          return true
        }
      } catch (err) {
        console.warn("[clipboard] Error reading drawing file:", err)
      }
    } else if (lower.endsWith(".excalidrawlib")) {
      try {
        const text = await file.text()
        const items = parseExcalidrawLibrary(text)
        if (items.length > 0) {
          const allNodes = items.flatMap((i) => i.nodes)
          s.addNodes(allNodes)
          s.setSelection(allNodes.map((n) => n.id))
          s.setNotice(`Imported ${items.length} library item(s) from ${file.name}`)
          return true
        }
      } catch (err) {
        console.warn("[clipboard] Error reading library file:", err)
      }
    } else if (file.type.startsWith("image/")) {
      images.push(file)
    } else {
      documents.push(file)
    }
  }

  return place({ images, documents }, at)
}

/** Handle a real paste event. Returns whether anything landed. */
export function pasteFrom(dt: DataTransfer, at?: [number, number]): Promise<boolean> {
  // everything comes off the DataTransfer now: it is only alive for this turn
  // of the event loop, and placing a picture takes several
  const { images, documents } = filesIn(dt)
  return place({ html: dt.getData("text/html"), text: dt.getData("text/plain"), images, documents }, at)
}

/**
 * How long to wait for a browser to hand over the clipboard before giving up
 * on it. Some refuse the read outright, which is fine — and some never answer
 * at all, which would leave the menu item quietly doing nothing for ever.
 */
const SYSTEM_READ_TIMEOUT = 1200

/**
 * Paste without a paste event — the command palette and the context menu.
 *
 * Reading the clipboard from a click means asking the browser for it, which
 * some will refuse and others will prompt about. Either way there's still a
 * private clipboard underneath, so the menu item does something whenever zenithsui
 * itself has something to give. Whichever route gets there first wins; the
 * other one stands down rather than pasting twice.
 */
export async function pasteFromSystem(at?: [number, number], inPlace = false): Promise<void> {
  let settled = false
  const ownClipboard = () => {
    if (settled) return
    settled = true
    useSquig.getState().pasteClipboard(at)
  }

  const giveUp = setTimeout(ownClipboard, SYSTEM_READ_TIMEOUT)
  try {
    const items = await navigator.clipboard.read()
    if (settled) return
    settled = true
    const c: Incoming = { images: [], documents: [] }
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith("image/"))
      if (imageType) {
        c.images.push(await item.getType(imageType))
        continue
      }
      const docType = item.types.find((t) => t === "application/pdf" || t === "text/csv" || t === "application/json")
      if (docType) {
        const blob = await item.getType(docType)
        const ext = docType.split("/")[1] || "pdf"
        c.documents!.push(new File([blob], `pasted_document.${ext}`, { type: docType }))
        continue
      }
      if (!c.html && item.types.includes("text/html")) c.html = await (await item.getType("text/html")).text()
      if (!c.text && item.types.includes("text/plain")) c.text = await (await item.getType("text/plain")).text()
    }
    // nothing on it we could use — zenithsui's own clipboard is still an answer
    if (!(await place(c, at, inPlace))) useSquig.getState().pasteClipboard(at)
  } catch {
    ownClipboard()
  } finally {
    clearTimeout(giveUp)
  }
}
