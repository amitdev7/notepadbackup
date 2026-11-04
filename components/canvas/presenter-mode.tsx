"use client"

// ---------------------------------------------------------------------------
// Zenithsui Frame-to-Frame Presenter & Slideshow Engine
//
// Features:
// 1. Automatic frame detection & spatial slide sequencing.
// 2. Fallback cluster engine for documents without explicit frames.
// 3. Cinematic camera transitions with physics-based viewport easing.
// 4. Apple-style floating presenter capsule with slide progress & laser tools.
// 5. Full keyboard navigation (Arrow keys, Space, PageUp/Down, S, L, Esc).
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { audioFx } from "@/lib/canvas/audio-fx"
import { cn } from "@/lib/utils"
import {
  Play,
  CaretLeft,
  CaretRight,
  X,
  Flashlight,
  Sun,
  FrameCorners,
  Presentation,
} from "@phosphor-icons/react"
import type { SquigNode, FrameNode } from "@/lib/types"

export interface SlideDefinition {
  id: string
  title: string
  x: number
  y: number
  w: number
  h: number
}

export function PresenterMode() {
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)
  const setViewport = useSquig((s) => s.setViewport)
  const setTool = useSquig((s) => s.setTool)
  const tool = useSquig((s) => s.tool)

  const presenterActive = useShellStore((s) => s.presenterActive)
  const setPresenterActive = useShellStore((s) => s.setPresenterActive)
  const slideIndex = useShellStore((s) => s.presenterSlideIndex)
  const setSlideIndex = useShellStore((s) => s.setPresenterSlideIndex)
  const spotlightActive = useShellStore((s) => s.spotlightActive)
  const toggleSpotlight = useShellStore((s) => s.toggleSpotlight)

  const animRafRef = useRef<number | null>(null)

  // ── 1. Discover Slides ───────────────────────────────────────────────────────
  const slides = useMemo<SlideDefinition[]>(() => {
    // Collect all frame nodes
    const frames: SlideDefinition[] = []
    for (const id of order) {
      const n = nodes[id]
      if (n && n.type === "frame") {
        frames.push({
          id: n.id,
          title: (n as FrameNode).name || `Frame ${frames.length + 1}`,
          x: n.x,
          y: n.y,
          w: Math.max(n.w, 320),
          h: Math.max(n.h, 220),
        })
      }
    }

    if (frames.length > 0) {
      // Sort frames reading order: top-to-bottom, left-to-right
      return frames.sort((a, b) => {
        const rowDiff = Math.floor(a.y / 400) - Math.floor(b.y / 400)
        if (rowDiff !== 0) return rowDiff
        return a.x - b.x
      })
    }

    // Fallback: If no frames exist, group content into natural slides
    if (order.length === 0) {
      return [{ id: "blank", title: "Canvas", x: 0, y: 0, w: 800, h: 500 }]
    }

    // Split nodes into spatial batches of 4-6 elements
    const batchSize = 5
    const fallbackSlides: SlideDefinition[] = []
    for (let i = 0; i < order.length; i += batchSize) {
      const batchIds = order.slice(i, i + batchSize)
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const id of batchIds) {
        const n = nodes[id]
        if (!n) continue
        if (n.x < minX) minX = n.x
        if (n.y < minY) minY = n.y
        if (n.x + n.w > maxX) maxX = n.x + n.w
        if (n.y + n.h > maxY) maxY = n.y + n.h
      }

      if (Number.isFinite(minX)) {
        fallbackSlides.push({
          id: `cluster-${i}`,
          title: `Slide ${fallbackSlides.length + 1}`,
          x: minX,
          y: minY,
          w: Math.max(maxX - minX, 360),
          h: Math.max(maxY - minY, 240),
        })
      }
    }

    return fallbackSlides.length > 0
      ? fallbackSlides
      : [{ id: "overview", title: "Overview", x: 0, y: 0, w: 900, h: 600 }]
  }, [nodes, order])

  // ── 2. Viewport Camera Gliding Engine ───────────────────────────────────────
  const flyToSlide = useCallback(
    (slide: SlideDefinition) => {
      if (typeof window === "undefined") return

      const screenW = window.innerWidth
      const screenH = window.innerHeight
      const padding = 80

      // Calculate ideal zoom to fit slide with margins
      const zoomX = (screenW - padding * 2) / slide.w
      const zoomY = (screenH - padding * 2) / slide.h
      const targetZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 2.2)

      // Center slide in viewport
      const targetX = screenW / 2 - (slide.x + slide.w / 2) * targetZoom
      const targetY = screenH / 2 - (slide.y + slide.h / 2) * targetZoom

      // Smooth camera interpolation
      const current = useSquig.getState().viewport
      const startTime = performance.now()
      const duration = 650

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Apple-style cubic ease-out
        const t = 1 - Math.pow(1 - progress, 3)

        const curX = current.x + (targetX - current.x) * t
        const curY = current.y + (targetY - current.y) * t
        const curZoom = current.zoom + (targetZoom - current.zoom) * t

        setViewport({ x: curX, y: curY, zoom: curZoom })

        if (progress < 1) {
          animRafRef.current = requestAnimationFrame(animate)
        } else {
          setViewport({ x: targetX, y: targetY, zoom: targetZoom })
        }
      }

      if (animRafRef.current) cancelAnimationFrame(animRafRef.current)
      animRafRef.current = requestAnimationFrame(animate)
    },
    [setViewport]
  )

  // Navigate to slide by index
  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, index))
      setSlideIndex(clamped)
      const target = slides[clamped]
      if (target) {
        flyToSlide(target)
      }
    },
    [slides, setSlideIndex, flyToSlide]
  )

  // Auto-fly to initial slide upon entering presenter mode
  useEffect(() => {
    if (presenterActive) {
      goToSlide(slideIndex)
    }
  }, [presenterActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard controls
  useEffect(() => {
    if (!presenterActive) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault()
        if (slideIndex < slides.length - 1) {
          audioFx.playSlideChange("next")
          goToSlide(slideIndex + 1)
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault()
        if (slideIndex > 0) {
          audioFx.playSlideChange("prev")
          goToSlide(slideIndex - 1)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setPresenterActive(false)
        audioFx.playToolSwitch()
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        toggleSpotlight()
        audioFx.playToolSwitch()
      } else if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setTool(tool === "laser" ? "select" : "laser")
        audioFx.playLaserSizzle()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [presenterActive, slideIndex, slides.length, goToSlide, setPresenterActive, toggleSpotlight, setTool, tool])

  if (!presenterActive) return null

  const currentSlide = slides[slideIndex]

  return (
    <div className="fixed inset-x-0 bottom-6 z-45 flex items-center justify-center pointer-events-none select-none animate-dock-enter">
      {/* Floating Apple Liquid Glass Presenter Capsule */}
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl apple-glass-pill shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl">
        {/* Previous Slide */}
        <button
          type="button"
          onClick={() => {
            if (slideIndex > 0) {
              audioFx.playSlideChange("prev")
              goToSlide(slideIndex - 1)
            }
          }}
          disabled={slideIndex === 0}
          aria-label="Previous slide"
          className={cn(
            "p-2 rounded-xl transition-all duration-150 cursor-pointer",
            slideIndex === 0
              ? "opacity-30 cursor-not-allowed text-stone-400"
              : "text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
          )}
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        {/* Slide Counter & Progress */}
        <div className="flex flex-col items-center justify-center min-w-[120px] px-2 text-center">
          <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate max-w-[140px]">
            {currentSlide?.title || `Slide ${slideIndex + 1}`}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
              {slideIndex + 1} / {slides.length}
            </span>
            <div className="w-16 h-1 rounded-full bg-stone-300 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 rounded-full"
                style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Slide */}
        <button
          type="button"
          onClick={() => {
            if (slideIndex < slides.length - 1) {
              audioFx.playSlideChange("next")
              goToSlide(slideIndex + 1)
            }
          }}
          disabled={slideIndex === slides.length - 1}
          aria-label="Next slide"
          className={cn(
            "p-2 rounded-xl transition-all duration-150 cursor-pointer",
            slideIndex === slides.length - 1
              ? "opacity-30 cursor-not-allowed text-stone-400"
              : "text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
          )}
        >
          <CaretRight size={16} weight="bold" />
        </button>

        <div className="h-5 w-px bg-white/20 dark:bg-white/10 mx-1" />

        {/* Focus Spotlight Toggle */}
        <button
          type="button"
          onClick={() => {
            toggleSpotlight()
            audioFx.playToolSwitch()
          }}
          title="Toggle Focus Spotlight (S)"
          className={cn(
            "p-2 rounded-xl transition-all duration-150 cursor-pointer",
            spotlightActive
              ? "bg-amber-500/20 text-amber-500 font-bold shadow-xs border border-amber-500/30"
              : "text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <Sun size={16} weight={spotlightActive ? "fill" : "regular"} />
        </button>

        {/* Laser Pointer Toggle */}
        <button
          type="button"
          onClick={() => {
            setTool(tool === "laser" ? "select" : "laser")
            audioFx.playLaserSizzle()
          }}
          title="Toggle Laser Pointer (L)"
          className={cn(
            "p-2 rounded-xl transition-all duration-150 cursor-pointer",
            tool === "laser"
              ? "bg-red-500/20 text-red-500 font-bold shadow-xs border border-red-500/30"
              : "text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <Flashlight size={16} weight={tool === "laser" ? "fill" : "regular"} />
        </button>

        <div className="h-5 w-px bg-white/20 dark:bg-white/10 mx-1" />

        {/* Exit Presenter Mode */}
        <button
          type="button"
          onClick={() => {
            setPresenterActive(false)
            audioFx.playToolSwitch()
          }}
          title="Exit Presentation (Esc)"
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  )
}
