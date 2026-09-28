"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSquig } from "@/lib/store"
import {
  X as XIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  ArrowCounterClockwise as ResetIcon,
  Cursor as CursorIcon,
  Record as LaserIcon,
  Flashlight as SpotlightIcon,
  PenNib as InkIcon,
  Presentation as PresentationIcon,
} from "@phosphor-icons/react"

interface StrokePoint {
  x: number
  y: number
  time: number
}

interface InkStroke {
  points: StrokePoint[]
  createdAt: number
}

export function PresentationToolbar() {
  const presentationMode = useSquig((s) => s.presentationMode)
  const setPresentationMode = useSquig((s) => s.setPresentationMode)
  const pointerType = useSquig((s) => s.presentationPointerType)
  const setPointerType = useSquig((s) => s.setPresentationPointerType)
  const timer = useSquig((s) => s.presentationTimer)
  const timerRunning = useSquig((s) => s.presentationTimerRunning)
  const setTimer = useSquig((s) => s.setPresentationTimer)
  const setTimerRunning = useSquig((s) => s.setPresentationTimerRunning)
  const resetTimer = useSquig((s) => s.resetPresentationTimer)

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -100, y: -100 })
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number; id: number }[]>([])
  const strokesRef = useRef<InkStroke[]>([])
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<StrokePoint[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Timer interval
  useEffect(() => {
    if (!presentationMode || !timerRunning) return
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [presentationMode, timerRunning, setTimer])

  // Track mouse movement
  useEffect(() => {
    if (!presentationMode) return

    const handleMouseMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY }
      setMousePos(pos)

      if (pointerType === "laser") {
        setLaserTrail((prev) => [
          ...prev.slice(-12),
          { x: pos.x, y: pos.y, id: Date.now() + Math.random() },
        ])
      }

      if (pointerType === "marker" && isDrawingRef.current) {
        currentStrokeRef.current.push({ x: pos.x, y: pos.y, time: Date.now() })
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (pointerType === "marker" && e.button === 0) {
        isDrawingRef.current = true
        currentStrokeRef.current = [{ x: e.clientX, y: e.clientY, time: Date.now() }]
      }
    }

    const handleMouseUp = () => {
      if (pointerType === "marker" && isDrawingRef.current) {
        isDrawingRef.current = false
        if (currentStrokeRef.current.length > 1) {
          strokesRef.current.push({
            points: [...currentStrokeRef.current],
            createdAt: Date.now(),
          })
        }
        currentStrokeRef.current = []
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === "Escape") {
        e.preventDefault()
        setPresentationMode(false)
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault()
        setPointerType(pointerType === "laser" ? "none" : "laser")
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        setPointerType(pointerType === "spotlight" ? "none" : "spotlight")
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault()
        setPointerType(pointerType === "marker" ? "none" : "marker")
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [presentationMode, pointerType, setPointerType, setPresentationMode])

  // Disappearing ink animation loop
  useEffect(() => {
    if (!presentationMode || pointerType !== "marker") return

    let animId: number
    const FADE_DURATION = 2500 // 2.5 seconds

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = Date.now()

      // Prune old strokes
      strokesRef.current = strokesRef.current.filter((s) => now - s.createdAt < FADE_DURATION)

      // Draw active strokes
      for (const stroke of strokesRef.current) {
        const age = now - stroke.createdAt
        const opacity = Math.max(0, 1 - age / FADE_DURATION)

        ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.9})`
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()

        for (let i = 0; i < stroke.points.length; i++) {
          const pt = stroke.points[i]
          if (i === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
      }

      // Draw currently drawing stroke
      if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.95)"
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()

        for (let i = 0; i < currentStrokeRef.current.length; i++) {
          const pt = currentStrokeRef.current[i]
          if (i === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [presentationMode, pointerType])

  if (!presentationMode) return null

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${String(mins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`
  }

  return (
    <>
      {/* Spotlight Mask */}
      {pointerType === "spotlight" && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-150"
          style={{
            background: `radial-gradient(circle 160px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0, 0, 0, 0.72) 100%)`,
          }}
        />
      )}

      {/* Laser Pointer Trail */}
      {pointerType === "laser" && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {laserTrail.map((pt, i) => {
            const size = 6 + (i / laserTrail.length) * 8
            const opacity = (i / laserTrail.length) * 0.8
            return (
              <div
                key={pt.id}
                className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: pt.x,
                  top: pt.y,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: "rgb(239, 68, 68)",
                  boxShadow: "0 0 8px rgb(239, 68, 68)",
                  opacity,
                }}
              />
            )
          })}
          <div
            className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              width: "14px",
              height: "14px",
              backgroundColor: "#ff2222",
              boxShadow: "0 0 14px #ff2222, 0 0 20px #ff5555",
            }}
          />
        </div>
      )}

      {/* Disappearing Ink Canvas */}
      {pointerType === "marker" && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-40 pointer-events-none cursor-crosshair"
        />
      )}

      {/* Floating Presentation Control Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-[var(--sq-paper)]/95 border border-[var(--sq-border)] shadow-md rounded-chrome-md backdrop-blur-md text-xs font-sans select-none">
        <div className="flex items-center gap-1.5 pr-2 border-r border-[var(--sq-border)] text-[var(--sq-ink)]">
          <PresentationIcon className="size-4 text-[var(--sq-accent)]" />
          <span className="font-semibold hidden sm:inline">Presenting</span>
        </div>

        {/* Pointer Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPointerType("none")}
            className={`p-1.5 rounded-chrome-sm transition-colors ${
              pointerType === "none"
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)]"
            }`}
            title="Default Cursor"
          >
            <CursorIcon className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setPointerType(pointerType === "laser" ? "none" : "laser")}
            className={`p-1.5 rounded-chrome-sm transition-colors flex items-center gap-1 ${
              pointerType === "laser"
                ? "bg-red-600 text-white"
                : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)]"
            }`}
            title="Laser Pointer (L)"
          >
            <LaserIcon className="size-4" />
            <span className="text-[10px] hidden md:inline">Laser</span>
          </button>

          <button
            type="button"
            onClick={() => setPointerType(pointerType === "spotlight" ? "none" : "spotlight")}
            className={`p-1.5 rounded-chrome-sm transition-colors flex items-center gap-1 ${
              pointerType === "spotlight"
                ? "bg-amber-600 text-white"
                : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)]"
            }`}
            title="Spotlight Focus (S)"
          >
            <SpotlightIcon className="size-4" />
            <span className="text-[10px] hidden md:inline">Spotlight</span>
          </button>

          <button
            type="button"
            onClick={() => setPointerType(pointerType === "marker" ? "none" : "marker")}
            className={`p-1.5 rounded-chrome-sm transition-colors flex items-center gap-1 ${
              pointerType === "marker"
                ? "bg-blue-600 text-white"
                : "text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)]"
            }`}
            title="Disappearing Ink (I) — Fades after 2.5s"
          >
            <InkIcon className="size-4" />
            <span className="text-[10px] hidden md:inline">Ink</span>
          </button>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--sq-border)]">
          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--sq-ink)] min-w-[42px] text-center">
            {formatTime(timer)}
          </span>
          <button
            type="button"
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-1 rounded-chrome-sm text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)] transition-colors"
            title={timerRunning ? "Pause Timer" : "Start Timer"}
          >
            {timerRunning ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="p-1 rounded-chrome-sm text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)] transition-colors"
            title="Reset Timer"
          >
            <ResetIcon className="size-3.5" />
          </button>
        </div>

        {/* Exit */}
        <div className="pl-2 border-l border-[var(--sq-border)]">
          <button
            type="button"
            onClick={() => setPresentationMode(false)}
            className="flex items-center gap-1 px-2 py-1 rounded-chrome-sm bg-[var(--sq-bg)] text-[var(--sq-ink)] hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors font-medium text-xs"
            title="Exit Presentation Mode (Esc)"
          >
            <XIcon className="size-3.5" />
            <span>Exit</span>
            <span className="text-[10px] text-[var(--sq-muted)] hidden sm:inline">Esc</span>
          </button>
        </div>
      </div>
    </>
  )
}
