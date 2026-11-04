"use client"

// ---------------------------------------------------------------------------
// Zenithsui Focus Spotlight Overlay
//
// Dims the entire canvas with a cinema-grade dark shroud while illuminating
// a fluid feathered circular spotlight around the cursor to guide audience focus.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from "react"
import { useShellStore } from "@/lib/shell-store"

export function SpotlightOverlay() {
  const spotlightActive = useShellStore((s) => s.spotlightActive)
  const spotlightRadius = useShellStore((s) => s.spotlightRadius)
  const setSpotlightRadius = useShellStore((s) => s.setSpotlightRadius)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Fluid spring position tracking
  const targetPos = useRef({ x: typeof window !== "undefined" ? window.innerWidth / 2 : 500, y: typeof window !== "undefined" ? window.innerHeight / 2 : 400 })
  const currentPos = useRef({ x: targetPos.current.x, y: targetPos.current.y })
  const animFrameRef = useRef<number | null>(null)

  // Track cursor
  const onMouseMove = useCallback((e: MouseEvent) => {
    targetPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  // Alt + wheel adjusts spotlight radius
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -15 : 15
        const newRadius = Math.max(70, Math.min(360, spotlightRadius + delta))
        setSpotlightRadius(newRadius)
      }
    },
    [spotlightRadius, setSpotlightRadius]
  )

  useEffect(() => {
    if (!spotlightActive) return
    window.addEventListener("mousemove", onMouseMove, { passive: true })
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("wheel", onWheel)
    }
  }, [spotlightActive, onMouseMove, onWheel])

  // Animation loop with spring easing
  useEffect(() => {
    if (!spotlightActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Smooth lerp (0.22)
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.22
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.22

      const w = window.innerWidth
      const h = window.innerHeight

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.clearRect(0, 0, w, h)

      // Draw dark shroud
      ctx.fillStyle = "rgba(10, 10, 14, 0.76)"
      ctx.fillRect(0, 0, w, h)

      // Cut out feathered spotlight aperture
      const cx = currentPos.current.x
      const cy = currentPos.current.y
      const r = spotlightRadius

      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      const grad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r)
      grad.addColorStop(0, "rgba(0, 0, 0, 1)")
      grad.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Luminous aperture ring edge
      ctx.save()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [spotlightActive, spotlightRadius])

  if (!spotlightActive) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-35 pointer-events-none select-none transition-opacity duration-300"
    />
  )
}
