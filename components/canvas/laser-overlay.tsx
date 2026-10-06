"use client"

// ---------------------------------------------------------------------------
// Zenithsui Laser Pointer Overlay
// Ephemeral pointer trail with real-time RAF decay (~800ms)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"

interface Point {
  x: number
  y: number
  t: number
}

const TRAIL_LIFETIME_MS = 850

export function LaserOverlay() {
  const tool = useSquig((s) => s.tool)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointsRef = useRef<Point[]>([])
  const isDownRef = useRef(false)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (tool !== "laser") {
      pointsRef.current = []
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }

    resize()
    window.addEventListener("resize", resize)

    function render() {
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const now = performance.now()
      const dpr = window.devicePixelRatio || 1

      // Prune expired points
      pointsRef.current = pointsRef.current.filter((p) => now - p.t < TRAIL_LIFETIME_MS)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pts = pointsRef.current
      if (pts.length > 1) {
        ctx.save()
        ctx.scale(dpr, dpr)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1]
          const p1 = pts[i]
          const age = now - p1.t
          const progress = Math.min(1, Math.max(0, age / TRAIL_LIFETIME_MS))
          const alpha = 1 - progress

          // Core laser ink glow
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.95})`
          ctx.lineWidth = Math.max(2, 6 * (1 - progress * 0.7))
          ctx.shadowColor = "rgba(239, 68, 68, 0.8)"
          ctx.shadowBlur = 8 * (1 - progress)
          ctx.stroke()

          // Inner bright core
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`
          ctx.lineWidth = Math.max(1, 2 * (1 - progress))
          ctx.shadowBlur = 0
          ctx.stroke()
        }

        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      isDownRef.current = true
      pointsRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    }

    function onPointerMove(e: PointerEvent) {
      if (!isDownRef.current) return
      pointsRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    }

    function onPointerUp() {
      isDownRef.current = false
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [tool])

  if (tool !== "laser") return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      style={{ touchAction: "none" }}
    />
  )
}
