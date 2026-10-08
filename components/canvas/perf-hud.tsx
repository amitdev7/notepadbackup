"use client"

import React, { useEffect, useRef, useState } from "react"
import { useShellStore } from "@/lib/shell-store"
import { Lightning, X, CaretDown, CaretUp, Gauge, Eye, Cpu } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface PerfHudProps {
  totalNodes: number
  renderedNodes: number
  zoom: number
  isDragging?: boolean
}

export function PerfHud({
  totalNodes,
  renderedNodes,
  zoom,
  isDragging = false,
}: PerfHudProps) {
  const perf = useShellStore((s) => s.preferences.performanceSettings)
  const updatePerf = useShellStore((s) => s.updatePerformanceSettings)

  const [fps, setFps] = useState<number>(60)
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6)
  const [memoryMb, setMemoryMb] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<boolean>(false)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lastFrameTimestampRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  // RAF loop for measuring real frame rate and frame delta time
  useEffect(() => {
    if (!perf?.showFpsHud) return
    lastTimeRef.current = performance.now()
    lastFrameTimestampRef.current = performance.now()

    const loop = (now: number) => {
      frameCountRef.current++
      const delta = now - lastFrameTimestampRef.current
      lastFrameTimestampRef.current = now

      // Measure instantaneous frame time smoothed over rolling window
      if (delta > 0 && delta < 100) {
        setFrameTimeMs((prev) => Math.round((prev * 0.8 + delta * 0.2) * 10) / 10)
      }

      // Calculate FPS once every 500ms
      const elapsed = now - lastTimeRef.current
      if (elapsed >= 500) {
        const measuredFps = Math.round((frameCountRef.current * 1000) / elapsed)
        setFps(measuredFps)
        frameCountRef.current = 0
        lastTimeRef.current = now

        // Check memory if available (Chromium performance.memory API)
        if (typeof window !== "undefined" && (window.performance as unknown as { memory?: { usedJSHeapSize: number } })?.memory) {
          const usedBytes = (window.performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
          setMemoryMb(Math.round((usedBytes / (1024 * 1024)) * 10) / 10)
        }
      }

      rafIdRef.current = requestAnimationFrame(loop)
    }

    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [perf?.showFpsHud])

  // Alt + P toggle shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault()
        updatePerf({ showFpsHud: !perf?.showFpsHud })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [perf?.showFpsHud, updatePerf])

  if (!perf?.showFpsHud) return null

  const culledCount = Math.max(0, totalNodes - renderedNodes)
  const culledPercent = totalNodes > 0 ? Math.round((culledCount / totalNodes) * 100) : 0
  const isHealthyFps = fps >= 55
  const isWarningFps = fps >= 30 && fps < 55

  return (
    <div
      role="region"
      aria-label="Engine Performance Telemetry HUD"
      className={cn(
        "fixed bottom-4 right-4 z-40 select-none font-mono text-[11px] leading-tight",
        "rounded-xl border border-stone-200/90 dark:border-stone-800/90",
        "bg-white/90 dark:bg-stone-900/90 backdrop-blur-md shadow-xl text-stone-800 dark:text-stone-200",
        "transition-all duration-150 animate-in fade-in zoom-in-95",
        collapsed ? "w-48" : "w-64"
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-stone-200/60 dark:border-stone-800/60 bg-stone-100/50 dark:bg-stone-800/50 rounded-t-xl">
        <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-semibold">
          <Lightning size={13} weight="fill" className="text-amber-500 animate-pulse" />
          <span className="tracking-wide">ENGINE HUD</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand HUD" : "Collapse HUD"}
            className="p-1 rounded text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors"
          >
            {collapsed ? <CaretDown size={12} weight="bold" /> : <CaretUp size={12} weight="bold" />}
          </button>
          <button
            type="button"
            onClick={() => updatePerf({ showFpsHud: false })}
            title="Close HUD (Alt+P)"
            className="p-1 rounded text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main Stats Body */}
      <div className="p-2.5 space-y-2">
        {/* FPS and Frame latency */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge size={13} className="text-stone-400" />
            <span className="text-stone-500 font-sans">Framerate</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                isHealthyFps
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isWarningFps
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              )}
            >
              {fps} FPS
            </span>
            <span className="text-[10px] text-stone-400 tabular-nums">({frameTimeMs}ms)</span>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Viewport Culling & Node Metrics */}
            <div className="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Eye size={13} className="text-stone-400" />
                  <span className="text-stone-500 font-sans">Scene Nodes</span>
                </div>
                <span className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {renderedNodes} / {totalNodes}
                </span>
              </div>

              {perf.viewportCulling && totalNodes > 0 && (
                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span>Culled from SVG:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    -{culledCount} ({culledPercent}% offload)
                  </span>
                </div>
              )}
            </div>

            {/* Hardware & Profile details */}
            <div className="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800/60 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-sans">Profile</span>
                <span className="uppercase font-semibold text-blue-600 dark:text-blue-400">
                  {perf.profile}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-sans">GPU Compositor</span>
                <span className={perf.hardwareCompositing ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400"}>
                  {perf.hardwareCompositing ? "3D Accelerated" : "Standard"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-sans">Culling Buffer</span>
                <span className="capitalize text-stone-700 dark:text-stone-300">
                  {perf.viewportCulling ? perf.cullingBuffer : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-sans">Zoom / LoD</span>
                <span className="tabular-nums text-stone-700 dark:text-stone-300">
                  {Math.round(zoom * 100)}% {zoom < 0.35 && perf.adaptiveLevelOfDetail ? "(Low-res LoD)" : "(Full)"}
                </span>
              </div>

              {memoryMb !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-stone-500 font-sans">
                    <Cpu size={11} />
                    <span>JS Heap</span>
                  </div>
                  <span className="tabular-nums text-stone-700 dark:text-stone-300">
                    ~{memoryMb} MB
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer shortcut hint */}
      <div className="px-2.5 py-1 bg-stone-50 dark:bg-stone-800/30 rounded-b-xl border-t border-stone-200/40 dark:border-stone-800/40 text-[9px] text-stone-400 flex items-center justify-between">
        <span>Toggle: Alt+P</span>
        {isDragging && <span className="text-amber-500 font-semibold">Active Gesture</span>}
      </div>
    </div>
  )
}
