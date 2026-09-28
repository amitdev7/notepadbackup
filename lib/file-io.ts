// ---------------------------------------------------------------------------
// Import / Export Architecture
// Supports .zenithsui, JSON, PNG, SVG, PDF, and Image formats.
// ---------------------------------------------------------------------------

import { useSquig } from "./store"
import { copyAsPngWithNotice, exportAsPdf, exportAsPngFile, exportAsSvg } from "./export-image"
import { imageNodeFrom, pdfNodeFrom } from "./clipboard"
import { screenToWorld } from "./types"

function cleanFileName(fileName: string, fallback = "zenithsui"): string {
  return fileName.replace(/[^\w -]+/g, "").trim() || fallback
}

/** Export native editable .zenithsui document */
export function exportZenithsui(): void {
  const s = useSquig.getState()
  const name = cleanFileName(s.fileName)
  const blob = new Blob([s.serialize()], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name}.zenithsui`
  a.click()
  URL.revokeObjectURL(url)
  s.setNotice(`Exported ${name}.zenithsui`)
}

/** Export standard JSON document backup */
export function exportJson(): void {
  const s = useSquig.getState()
  const name = cleanFileName(s.fileName)
  const blob = new Blob([s.serialize()], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name}.json`
  a.click()
  URL.revokeObjectURL(url)
  s.setNotice(`Exported ${name}.json`)
}

/** Alias to native export for backward compatibility */
export function exportDoc(): void {
  exportZenithsui()
}

/** Export as PDF Document */
export async function exportPdfDoc(): Promise<boolean> {
  return exportAsPdf()
}

/** Export as Vector SVG */
export async function exportSvgDoc(): Promise<boolean> {
  return exportAsSvg()
}

/** Export as Raster PNG */
export async function exportPngDoc(): Promise<boolean> {
  return exportAsPngFile()
}

/** Copy PNG to system clipboard */
export async function copyPngClipboard(): Promise<void> {
  await copyAsPngWithNotice()
}

/** Calculate center of the current canvas viewport */
function getViewportCenter(): [number, number] {
  const v = useSquig.getState().viewport
  return screenToWorld(v, window.innerWidth / 2, window.innerHeight / 2)
}

/** Import .zenithsui or .json document file */
export async function importZenithsuiOrJson(file?: File): Promise<boolean> {
  if (file) {
    try {
      const text = await file.text()
      return useSquig.getState().loadDoc(text)
    } catch {
      useSquig.getState().setNotice("Could not read file from disk")
      return false
    }
  }

  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".zenithsui,.json,application/json"
  input.addEventListener("change", async () => {
    const selected = input.files?.[0]
    if (!selected) return
    try {
      const text = await selected.text()
      useSquig.getState().loadDoc(text)
    } catch {
      useSquig.getState().setNotice("Could not read that document file")
    }
  })
  input.click()
  return true
}

/** Import PDF document onto canvas */
export async function importPdf(file?: File): Promise<boolean> {
  if (file) {
    const node = await pdfNodeFrom(file, file.name)
    if (!node) {
      useSquig.getState().setNotice("Could not parse that PDF document")
      return false
    }
    const [cx, cy] = getViewportCenter()
    node.x = Math.round(cx - node.w / 2)
    node.y = Math.round(cy - node.h / 2)
    useSquig.getState().addNodes([node])
    useSquig.getState().setNotice(`Imported ${node.name}`)
    return true
  }

  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".pdf,application/pdf"
  input.addEventListener("change", async () => {
    const selected = input.files?.[0]
    if (!selected) return
    const node = await pdfNodeFrom(selected, selected.name)
    if (!node) {
      useSquig.getState().setNotice("Could not parse that PDF document")
      return
    }
    const [cx, cy] = getViewportCenter()
    node.x = Math.round(cx - node.w / 2)
    node.y = Math.round(cy - node.h / 2)
    useSquig.getState().addNodes([node])
    useSquig.getState().setNotice(`Imported ${node.name}`)
  })
  input.click()
  return true
}

/** Import Image file onto canvas */
export async function importImage(file?: File): Promise<boolean> {
  if (file) {
    const node = await imageNodeFrom(file, file.name)
    if (!node) {
      useSquig.getState().setNotice("Could not load that image")
      return false
    }
    const [cx, cy] = getViewportCenter()
    node.x = Math.round(cx - node.w / 2)
    node.y = Math.round(cy - node.h / 2)
    useSquig.getState().addNodes([node])
    useSquig.getState().setNotice(`Imported ${node.name || "image"}`)
    return true
  }

  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*,.png,.jpg,.jpeg,.webp,.svg,.gif"
  input.addEventListener("change", async () => {
    const selected = input.files?.[0]
    if (!selected) return
    const node = await imageNodeFrom(selected, selected.name)
    if (!node) {
      useSquig.getState().setNotice("Could not load that image")
      return
    }
    const [cx, cy] = getViewportCenter()
    node.x = Math.round(cx - node.w / 2)
    node.y = Math.round(cy - node.h / 2)
    useSquig.getState().addNodes([node])
    useSquig.getState().setNotice(`Imported ${node.name || "image"}`)
  })
  input.click()
  return true
}

/** Attach any arbitrary file (Markdown, Word, Code, ZIP, CSV, etc.) onto canvas */
export async function attachFileToCanvas(file?: File): Promise<boolean> {
  const uploadAndAdd = async (selected: File) => {
    try {
      useSquig.getState().setNotice(`Uploading ${selected.name}…`)
      const formData = new FormData()
      formData.append("file", selected)
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json().catch(() => ({}))
      const attachment = (data as any)?.attachment
      if (!attachment?.url) throw new Error("Upload failed")
      const [cx, cy] = getViewportCenter()
      const fileNode = {
        type: "file" as const,
        name: selected.name,
        fileSize: selected.size,
        mimeType: selected.type || "application/octet-stream",
        attachmentId: attachment.id,
        src: attachment.url,
        status: "ready" as const,
        x: Math.round(cx - 120),
        y: Math.round(cy - 32),
        w: 240,
        h: 64,
        seed: Math.floor(Math.random() * 2 ** 31),
      }
      useSquig.getState().addNodes([fileNode as any])
      useSquig.getState().setNotice(`Attached ${selected.name}`)
      return true
    } catch (err: any) {
      useSquig.getState().setNotice(err.message || "Failed to attach file")
      return false
    }
  }

  if (file) {
    return uploadAndAdd(file)
  }

  const input = document.createElement("input")
  input.type = "file"
  input.addEventListener("change", async () => {
    const selected = input.files?.[0]
    if (selected) await uploadAndAdd(selected)
  })
  input.click()
  return true
}

/** Universal Import Dialog - intelligently handles .zenithsui, .json, .pdf, images, attachments */
export function importDoc(): void {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".zenithsui,.json,.pdf,image/*,.zenithsui-workspace,application/json,application/pdf"
  input.addEventListener("change", async () => {
    const file = input.files?.[0]
    if (!file) return

    const name = String(file.name || "")
    const mime = String((file as any).type || "")
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
    if (ext === ".pdf" || mime === "application/pdf") {
      await importPdf(file)
    } else if (mime.startsWith("image/")) {
      await importImage(file)
    } else if (ext === ".zenithsui" || (ext === ".json" && !name.includes("workspace"))) {
      await importZenithsuiOrJson(file)
    } else {
      await attachFileToCanvas(file)
    }
  })
  input.click()
}
