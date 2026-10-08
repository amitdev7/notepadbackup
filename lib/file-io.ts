// ---------------------------------------------------------------------------
// Import / export documents.
// Supports both native .zenithsui.json and .excalidraw formats.
// ---------------------------------------------------------------------------

import { useSquig } from "./store"
import { parseExcalidrawLibrary, isExcalidrawLibrary } from "./excalidraw/index"

export function exportDoc() {
  const s = useSquig.getState()
  const blob = new Blob([s.serialize()], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${s.fileName.replace(/[^\w -]+/g, "").trim() || "zenithsui"}.zenithsui.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportExcalidrawDoc() {
  const s = useSquig.getState()
  const blob = new Blob([s.serializeExcalidraw()], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${s.fileName.replace(/[^\w -]+/g, "").trim() || "zenithsui"}.excalidraw`
  a.click()
  URL.revokeObjectURL(url)
}

export function importDoc() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json,.zenithsui,.excalidraw,.excalidrawlib,application/json"
  input.addEventListener("change", async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()

    // Check if it's an excalidraw library file
    try {
      const parsedJson = JSON.parse(text)
      if (isExcalidrawLibrary(parsedJson)) {
        const assets = parseExcalidrawLibrary(text)
        if (assets.length > 0) {
          const allNodes = assets.flatMap((a) => a.nodes)
          useSquig.getState().addNodes(allNodes)
          useSquig.getState().setSelection(allNodes.map((n) => n.id))
          useSquig.getState().setNotice(`Imported ${assets.length} library item(s)`)
          return
        }
      }
    } catch {
      // Not JSON or parse error, fall through to loadDoc
    }

    const ok = useSquig.getState().loadDoc(text)
    if (!ok) window.alert("That file could not be read as a Zenithsui or Excalidraw document.")
  })
  input.click()
}
