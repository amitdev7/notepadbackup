"use client"

// ---------------------------------------------------------------------------
// Zenithsui Laser Pointer Overlay
// Ephemeral pointer trail with real-time RAF decay (~800ms)
// Uses smooth continuous ribbon polygon geometry for 100% dot-free rendering.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore, DEFAULT_LASER_SETTINGS } from "@/lib/shell-store"
import { renderLaserTrail, type LaserPoint } from "@/lib/canvas/laser-ribbon"

export function LaserOverlay() {
  const tool = useSquig((s) => s.tool)
  const laserSettings = useShellStore((s) => s.preferences.laserSettings ?? DEFAULT_LASER_SETTINGS)
  const laserRef = useRef(laserSettings)
  useEffect(() => {
    laserRef.current = laserSettings
  }, [laserSettings])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointsRef = useRef<LaserPoint[]>([])
  const isDownRef = useRef(false)
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (tool !== "laser") {
      pointsRef.current = []
      pointerPosRef.current = null
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
      const settings = laserRef.current || DEFAULT_LASER_SETTINGS
      const trailLifetime = settings.durationMs || 850

      // Prune expired points
      pointsRef.current = pointsRef.current.filter((p) => now - p.t < trailLifetime)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.scale(dpr, dpr)
      renderLaserTrail(ctx, pointsRef.current, settings, now, pointerPosRef.current, isDownRef.current)
      ctx.restore()

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      isDownRef.current = true
      const rect = canvas?.getBoundingClientRect()
      const x = e.clientX - (rect?.left || 0)
      const y = e.clientY - (rect?.top || 0)
      pointerPosRef.current = { x, y }
      pointsRef.current.push({ x, y, t: performance.now() })
    }

    function onPointerMove(e: PointerEvent) {
      const now = performance.now()
      const rect = canvas?.getBoundingClientRect()
      const offsetX = rect ? rect.left : 0
      const offsetY = rect ? rect.top : 0

      // Extract all high-precision sub-sample events from hardware digitizer/mouse
      const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e]
      for (const ev of events) {
        const x = ev.clientX - offsetX
        const y = ev.clientY - offsetY
        pointerPosRef.current = { x, y }

        if (isDownRef.current) {
          const pts = pointsRef.current
          if (pts.length > 0) {
            const last = pts[pts.length - 1]
            const dx = x - last.x
            const dy = y - last.y
            // Only skip duplicate points at virtually identical coordinates (<0.5px within 4ms)
            if (dx * dx + dy * dy < 0.25 && now - last.t < 4) {
              continue
            }
          }
          pts.push({ x, y, t: now })
        }
      }
    }

    function onPointerUp() {
      isDownRef.current = false
    }

    function onPointerLeave() {
      isDownRef.current = false
      pointerPosRef.current = null
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    window.addEventListener("pointerleave", onPointerLeave, { passive: true })

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointerleave", onPointerLeave)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [tool])

  if (tool !== "laser") return null

  return (
    <canvas
      ref={canvasRef}
      aria-label="Laser pointer overlay"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      style={{ touchAction: "none" }}
    />
  )
}
