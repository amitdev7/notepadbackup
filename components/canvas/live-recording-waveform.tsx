"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Real-Time Live Microphone Waveform Visualizer
//
// Renders live audio frequency bars using Web Audio AnalyserNode:
// - Direct hardware microphone amplitude tracking (real voice response).
// - Zero React state rerenders during recording (pure Canvas 2D RAF loop).
// - HiDPI / Retina display crispness with devicePixelRatio.
// - Smooth EMA decay smoothing for organic aesthetic audio motion.
// ---------------------------------------------------------------------------

import { useEffect, useRef, memo } from "react"

interface LiveRecordingWaveformProps {
  analyserNode: AnalyserNode | null
  isPaused?: boolean
  className?: string
  barCount?: number
}

export const LiveRecordingWaveform = memo(function LiveRecordingWaveform({
  analyserNode,
  isPaused = false,
  className = "w-28 h-6",
  barCount = 20,
}: LiveRecordingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const smoothedBarsRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize smoothing buffer
    if (smoothedBarsRef.current.length !== barCount) {
      smoothedBarsRef.current = new Array(barCount).fill(0.15)
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width || 112
    const height = rect.height || 24

    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.scale(dpr, dpr)

    let bufferLength = 0
    let dataArray: Uint8Array<ArrayBuffer> | null = null

    if (analyserNode) {
      bufferLength = analyserNode.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height)

      if (analyserNode && dataArray && !isPaused) {
        analyserNode.getByteFrequencyData(dataArray)

        // Focus on vocal frequency range (approx. 85Hz - 4000Hz, bins 2 to 64)
        const minBin = 2
        const maxBin = Math.min(bufferLength - 1, 68)
        const binStep = Math.max(1, Math.floor((maxBin - minBin) / barCount))

        for (let i = 0; i < barCount; i++) {
          const binIndex = minBin + i * binStep
          let sum = 0
          let count = 0
          for (let b = 0; b < binStep && binIndex + b < bufferLength; b++) {
            sum += dataArray[binIndex + b]
            count++
          }
          const rawAmp = count > 0 ? sum / count / 255 : 0
          // Damping & smoothing: fast attack (0.45), slow release (0.15)
          const current = smoothedBarsRef.current[i] || 0.1
          const factor = rawAmp > current ? 0.45 : 0.15
          smoothedBarsRef.current[i] = current + (rawAmp - current) * factor
        }
      } else if (isPaused) {
        // Paused state: gentle low flat line
        for (let i = 0; i < barCount; i++) {
          smoothedBarsRef.current[i] = 0.12
        }
      }

      // Draw rounded aesthetic bars
      const gap = 2
      const totalGaps = (barCount - 1) * gap
      const barWidth = Math.max(2, (width - totalGaps) / barCount)
      const centerY = height / 2

      // Create gradient from red to vibrant orange
      const grad = ctx.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, "#EF4444")
      grad.addColorStop(1, "#F97316")
      ctx.fillStyle = grad

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap)
        const amp = smoothedBarsRef.current[i] || 0.1
        const barHeight = Math.max(3, Math.min(height - 2, amp * height * 0.95))
        const y = centerY - barHeight / 2
        const radius = barWidth / 2

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, radius)
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(renderFrame)
    }

    renderFrame()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [analyserNode, isPaused, barCount])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  )
})
