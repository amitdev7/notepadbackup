"use client"

// ---------------------------------------------------------------------------
// Zenithsui Liquid Glass React Integration Hook
// Manages the @ybouane/liquidglass WebGL lifecycle, resize observer, and DOM updates.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from "react"
import type { LiquidGlass as LiquidGlassInstance, LiquidGlassOptions } from "@ybouane/liquidglass"
import type { LiquidGlassOptions as ZenOptions } from "./types"

export interface UseLiquidGlassProps {
  rootRef: React.RefObject<HTMLElement | null>
  glassRefs: Array<React.RefObject<HTMLElement | null>>
  config?: ZenOptions
  enabled?: boolean
}

export function useLiquidGlass({
  rootRef,
  glassRefs,
  config,
  enabled = true,
}: UseLiquidGlassProps) {
  const instanceRef = useRef<LiquidGlassInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [hasWebGL, setHasWebGL] = useState(true)

  const markChanged = useCallback((element?: HTMLElement) => {
    if (instanceRef.current) {
      try {
        instanceRef.current.markChanged(element)
      } catch {
        // Safe catch if instance is tearing down
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    // Verify basic WebGL support
    try {
      const testCanvas = document.createElement("canvas")
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl")
      if (!gl) {
        setHasWebGL(false)
        return
      }
    } catch {
      setHasWebGL(false)
      return
    }

    const root = rootRef.current
    if (!root) return

    const validGlasses = glassRefs
      .map((r) => r.current)
      .filter((el): el is HTMLElement => el !== null && el.parentElement === root)

    if (validGlasses.length === 0) return

    let isCancelled = false

    // Apply config dataset to elements before initializing
    if (config) {
      const jsonConfig = JSON.stringify(config)
      for (const el of validGlasses) {
        el.dataset.config = jsonConfig
      }
    }

    // Dynamic import to guarantee safe SSR and tree shaking
    import("@ybouane/liquidglass")
      .then(({ LiquidGlass }) => {
        if (isCancelled) return

        return LiquidGlass.init({
          root,
          glassElements: validGlasses,
          defaults: config as any,
        })
      })
      .then((instance) => {
        if (isCancelled) {
          instance?.destroy()
          return
        }
        if (instance) {
          instanceRef.current = instance
          setIsReady(true)
        }
      })
      .catch((err) => {
        console.warn("Zenithsui LiquidGlass init gracefully bypassed:", err)
        setHasWebGL(false)
      })

    return () => {
      isCancelled = true
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy()
        } catch {}
        instanceRef.current = null
      }
      setIsReady(false)
    }
  }, [rootRef, glassRefs, config, enabled])

  return {
    isReady,
    hasWebGL,
    markChanged,
    instance: instanceRef.current,
  }
}
