// ---------------------------------------------------------------------------
// Zenithsui Background Canvas & Geometry Worker
// Offloads heavy CPU operations (JSON serialization, search indexing,
// spatial queries) away from the browser's 60/120fps UI thread.
// ---------------------------------------------------------------------------

self.onmessage = function (event) {
  const { id, type, payload } = event.data

  try {
    switch (type) {
      case "SERIALIZE_DOCUMENT": {
        const json = JSON.stringify(payload)
        const sizeBytes = new Blob([json]).size
        self.postMessage({ id, success: true, result: { json, sizeBytes } })
        break
      }

      case "INDEX_SEARCH": {
        const { nodes } = payload
        const index = {}
        for (const [nodeId, node] of Object.entries(nodes)) {
          if (!node) continue
          const tokens = []
          if (node.type === "text" && node.text) {
            tokens.push(...node.text.toLowerCase().split(/\s+/))
          }
          if (node.label) {
            tokens.push(...node.label.toLowerCase().split(/\s+/))
          }
          if (node.title) {
            tokens.push(...node.title.toLowerCase().split(/\s+/))
          }
          if (tokens.length > 0) {
            index[nodeId] = Array.from(new Set(tokens.filter(Boolean)))
          }
        }
        self.postMessage({ id, success: true, result: { index } })
        break
      }

      case "CALCULATE_BOUNDS": {
        const { nodeIds, nodes } = payload
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const nid of nodeIds) {
          const n = nodes[nid]
          if (!n) continue
          minX = Math.min(minX, n.x)
          minY = Math.min(minY, n.y)
          maxX = Math.max(maxX, n.x + (n.w || 0))
          maxY = Math.max(maxY, n.y + (n.h || 0))
        }

        const bounds =
          minX === Infinity
            ? null
            : { x: minX, y: minY, w: maxX - minX, h: maxY - minY }

        self.postMessage({ id, success: true, result: { bounds } })
        break
      }

      default:
        self.postMessage({ id, success: false, error: `Unknown worker action: ${type}` })
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message || String(err) })
  }
}
