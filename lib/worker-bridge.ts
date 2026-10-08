// ---------------------------------------------------------------------------
// Zenithsui Web Worker Bridge
// Provides typed background execution with automatic main-thread fallback
// ---------------------------------------------------------------------------

import { useShellStore } from "./shell-store"

type WorkerMessage = {
  id: string
  type: "SERIALIZE_DOCUMENT" | "INDEX_SEARCH" | "CALCULATE_BOUNDS"
  payload: unknown
}

type WorkerResponse = {
  id: string
  success: boolean
  result?: unknown
  error?: string
}

class CanvasWorkerBridge {
  private worker: Worker | null = null
  private pending = new Map<
    string,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >()
  private counter = 0

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    if (typeof window === "undefined" || !window.Worker) return

    try {
      this.worker = new Worker("/workers/canvas-worker.js")
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, success, result, error } = e.data
        const p = this.pending.get(id)
        if (!p) return
        this.pending.delete(id)
        if (success) {
          p.resolve(result)
        } else {
          p.reject(new Error(error || "Worker error"))
        }
      }
      this.worker.onerror = (err) => {
        console.warn("[Zenithsui Worker Bridge] Background worker error:", err)
      }
    } catch (err) {
      console.warn("[Zenithsui Worker Bridge] Unable to instantiate Web Worker:", err)
      this.worker = null
    }
  }

  /**
   * Run background task or fallback to main-thread execution
   */
  async runTask<T>(
    type: WorkerMessage["type"],
    payload: unknown,
    fallbackSync: () => T
  ): Promise<T> {
    const isWorkerEnabled =
      typeof window !== "undefined"
        ? useShellStore.getState().preferences.performanceSettings?.useWebWorkers ?? true
        : false

    if (!isWorkerEnabled || !this.worker) {
      return fallbackSync()
    }

    const id = `w_${++this.counter}_${Date.now()}`
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          // Fallback to sync on timeout
          resolve(fallbackSync())
        }
      }, 2500)

      this.pending.set(id, {
        resolve: (val) => {
          clearTimeout(timeout)
          resolve(val as T)
        },
        reject: (err) => {
          clearTimeout(timeout)
          console.warn("[Zenithsui Worker Bridge] Falling back to sync due to error:", err)
          resolve(fallbackSync())
        },
      })

      this.worker!.postMessage({ id, type, payload })
    })
  }

  /**
   * Serialize document payload asynchronously
   */
  async serializeDocument(payload: unknown): Promise<{ json: string; sizeBytes: number }> {
    return this.runTask(
      "SERIALIZE_DOCUMENT",
      payload,
      () => {
        const json = JSON.stringify(payload)
        const sizeBytes = typeof Blob !== "undefined" ? new Blob([json]).size : json.length
        return { json, sizeBytes }
      }
    )
  }

  /**
   * Calculate collective bounding box
   */
  async calculateBounds(
    nodeIds: string[],
    nodes: Record<string, { x: number; y: number; w?: number; h?: number }>
  ): Promise<{ x: number; y: number; w: number; h: number } | null> {
    return this.runTask(
      "CALCULATE_BOUNDS",
      { nodeIds, nodes },
      () => {
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

        if (minX === Infinity) return null
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      }
    )
  }
}

export const workerBridge = new CanvasWorkerBridge()
