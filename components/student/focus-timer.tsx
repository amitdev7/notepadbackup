"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  WarningCircle,
  Coffee,
  Brain,
  SlidersHorizontal,
  Check,
} from "@phosphor-icons/react"

export type TimerPreset = "25/5" | "30/5" | "45/10" | "50/10" | "custom"

export interface FocusSessionResult {
  mode: "work" | "break"
  fes: number
  distractions: number
  durationSeconds: number
}

export interface FocusTimerProps {
  className?: string
  initialPreset?: TimerPreset
  activeTopic?: string
  onSessionFinish?: (result: FocusSessionResult) => void
}

const PRESET_CONFIG: Record<
  Exclude<TimerPreset, "custom">,
  { work: number; break: number; label: string }
> = {
  "25/5": { work: 25, break: 5, label: "25 / 5" },
  "30/5": { work: 30, break: 5, label: "30 / 5" },
  "45/10": { work: 45, break: 10, label: "45 / 10" },
  "50/10": { work: 50, break: 10, label: "50 / 10" },
}

export function FocusTimer({
  className = "",
  initialPreset = "25/5",
  activeTopic = "Deep Work Block",
  onSessionFinish,
}: FocusTimerProps) {
  const [preset, setPreset] = useState<TimerPreset>(initialPreset)
  const [mode, setMode] = useState<"work" | "break">("work")
  const [customWork, setCustomWork] = useState<number>(60)
  const [customBreak, setCustomBreak] = useState<number>(15)
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false)

  const getPresetDuration = useCallback(
    (p: TimerPreset, m: "work" | "break"): number => {
      if (p === "custom") {
        return (m === "work" ? customWork : customBreak) * 60
      }
      return (m === "work" ? PRESET_CONFIG[p].work : PRESET_CONFIG[p].break) * 60
    },
    [customWork, customBreak]
  )

  const [totalSeconds, setTotalSeconds] = useState<number>(() =>
    getPresetDuration(initialPreset, "work")
  )
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    getPresetDuration(initialPreset, "work")
  )
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [distractions, setDistractions] = useState<number>(0)
  const [pauses, setPauses] = useState<number>(0)
  const [completedSessions, setCompletedSessions] = useState<number>(0)

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3)

      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch {
      return
    }
  }, [])

  const calculateFES = useCallback(
    (distractCount: number, pauseCount: number): number => {
      const penalty = distractCount * 12 + pauseCount * 4
      return Math.max(0, Math.min(100, Math.round(100 - penalty)))
    },
    []
  )

  const fes = calculateFES(distractions, pauses)

  const getFesTier = (score: number) => {
    if (score >= 90) return { label: "Optimal Focus", color: "text-stone-900 border-stone-900 bg-stone-900/10" }
    if (score >= 75) return { label: "Good Flow", color: "text-stone-700 border-stone-400 bg-stone-100" }
    if (score >= 50) return { label: "Sub-optimal", color: "text-stone-600 border-stone-300 bg-stone-100" }
    return { label: "Compromised", color: "text-stone-500 border-stone-300 bg-stone-200/50" }
  }

  const fesTier = getFesTier(fes)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playChime()
          const currentFes = calculateFES(distractions, pauses)
          if (onSessionFinish) {
            onSessionFinish({
              mode,
              fes: currentFes,
              distractions,
              durationSeconds: totalSeconds,
            })
          }

          if (mode === "work") {
            setCompletedSessions((c) => c + 1)
            setMode("break")
            const nextDuration = getPresetDuration(preset, "break")
            setTotalSeconds(nextDuration)
            setDistractions(0)
            setPauses(0)
            return nextDuration
          } else {
            setMode("work")
            const nextDuration = getPresetDuration(preset, "work")
            setTotalSeconds(nextDuration)
            setDistractions(0)
            setPauses(0)
            return nextDuration
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [
    isRunning,
    mode,
    preset,
    totalSeconds,
    distractions,
    pauses,
    getPresetDuration,
    calculateFES,
    onSessionFinish,
    playChime,
  ])

  const handleSelectPreset = (p: TimerPreset) => {
    setPreset(p)
    if (p === "custom") {
      setShowCustomConfig(true)
      return
    }
    setShowCustomConfig(false)
    setIsRunning(false)
    const dur = getPresetDuration(p, mode)
    setTotalSeconds(dur)
    setTimeLeft(dur)
    setDistractions(0)
    setPauses(0)
  }

  const handleApplyCustom = () => {
    setShowCustomConfig(false)
    setIsRunning(false)
    const dur = getPresetDuration("custom", mode)
    setTotalSeconds(dur)
    setTimeLeft(dur)
    setDistractions(0)
    setPauses(0)
  }

  const handleToggleMode = (newMode: "work" | "break") => {
    if (newMode === mode) return
    setIsRunning(false)
    setMode(newMode)
    const dur = getPresetDuration(preset, newMode)
    setTotalSeconds(dur)
    setTimeLeft(dur)
    setDistractions(0)
    setPauses(0)
  }

  const handleTogglePlay = () => {
    if (isRunning) {
      setPauses((p) => p + 1)
      setIsRunning(false)
    } else {
      setIsRunning(true)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    const dur = getPresetDuration(preset, mode)
    setTimeLeft(dur)
    setTotalSeconds(dur)
    setDistractions(0)
    setPauses(0)
  }

  const handleAddDistraction = () => {
    setDistractions((d) => d + 1)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedMinutes = String(minutes).padStart(2, "0")
  const formattedSeconds = String(seconds).padStart(2, "0")

  const progressFraction = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0
  const progressPercent = Math.min(100, Math.max(0, Math.round(progressFraction * 100)))

  const ringRadius = 78
  const ringCircumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = ringCircumference - progressFraction * ringCircumference

  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs transition-all ${className}`}
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-semibold tracking-tight text-stone-900">
              Focus Engine
            </span>
            <span className="rounded-full border border-stone-200 bg-[#FBFAF5] px-2 py-0.5 font-mono text-[10px] text-stone-600">
              {completedSessions} {completedSessions === 1 ? "session" : "sessions"} done
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-[#FBFAF5] p-0.5">
            <button
              type="button"
              onClick={() => handleToggleMode("work")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono transition-colors ${
                mode === "work"
                  ? "bg-stone-900 font-medium text-stone-50"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Brain size={13} />
              Work
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode("break")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono transition-colors ${
                mode === "break"
                  ? "bg-stone-900 font-medium text-stone-50"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Coffee size={13} />
              Break
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(["25/5", "30/5", "45/10", "50/10", "custom"] as TimerPreset[]).map((p) => {
            const isSelected = preset === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`rounded-md border px-2.5 py-1 text-xs font-mono transition-colors ${
                  isSelected
                    ? "border-stone-900 bg-stone-900 font-semibold text-stone-50"
                    : "border-stone-200 bg-[#FBFAF5] text-stone-700 hover:border-stone-300 hover:bg-stone-100"
                }`}
              >
                {p === "custom" ? "Custom" : PRESET_CONFIG[p].label}
              </button>
            )
          })}
        </div>

        {showCustomConfig && (
          <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-[#FBFAF5] p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-stone-700">
              <span>Work (m):</span>
              <input
                type="number"
                min="1"
                max="180"
                value={customWork}
                onChange={(e) => setCustomWork(Math.max(1, Number(e.target.value)))}
                className="w-14 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-xs font-mono text-stone-900"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-stone-700">
              <span>Break (m):</span>
              <input
                type="number"
                min="1"
                max="60"
                value={customBreak}
                onChange={(e) => setCustomBreak(Math.max(1, Number(e.target.value)))}
                className="w-14 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-xs font-mono text-stone-900"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="flex items-center gap-1 rounded bg-stone-900 px-2 py-1 text-xs font-mono text-stone-50 hover:bg-stone-800"
            >
              <Check size={12} weight="bold" />
              Set
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative flex items-center justify-center">
          <svg className="size-48 -rotate-90 transform" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={ringRadius}
              className="stroke-stone-100"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={ringRadius}
              className="stroke-stone-900 transition-all duration-500 ease-linear"
              strokeWidth="7"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 tabular-nums">
              {formattedMinutes}:{formattedSeconds}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-stone-500">
              {mode === "work" ? "Focus Interval" : "Rest Period"}
            </span>
            <span className="mt-0.5 max-w-[130px] truncate text-[11px] font-medium text-stone-700">
              {activeTopic}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-mono font-medium shadow-2xs transition-colors ${
              isRunning
                ? "bg-stone-800 text-stone-50 hover:bg-stone-700"
                : "bg-stone-900 text-stone-50 hover:bg-stone-800"
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={15} weight="bold" />
                Pause
              </>
            ) : (
              <>
                <Play size={15} weight="fill" />
                Start Focus
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-[#FBFAF5] px-3.5 py-2.5 text-xs font-mono text-stone-700 hover:border-stone-300 hover:bg-stone-100 transition-colors"
            title="Reset Timer"
          >
            <ArrowCounterClockwise size={15} />
            Reset
          </button>
        </div>
      </div>

      <div className="w-full space-y-1.5 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between text-xs font-mono text-stone-500">
          <span>Session Progress</span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full bg-stone-900 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
              Focus Efficiency Score (FES)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xl font-bold tracking-tight text-stone-900 tabular-nums">
                {fes}%
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium ${fesTier.color}`}
              >
                {fesTier.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddDistraction}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-[#FBFAF5] px-3 py-1.5 text-xs font-mono text-stone-800 hover:border-stone-900 hover:bg-stone-100 active:scale-95 transition-all"
            title="Log an interruption or distraction"
          >
            <WarningCircle size={14} className="text-stone-700" />
            <span>+1 Distraction</span>
            {distractions > 0 && (
              <span className="ml-0.5 rounded-full bg-stone-900 px-1.5 py-0.2 text-[10px] font-bold text-stone-50">
                {distractions}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-stone-600 bg-[#FBFAF5] p-2.5 rounded-lg border border-stone-200">
          <div>
            Distractions: <span className="font-semibold text-stone-900">{distractions}</span>
          </div>
          <div>
            Pauses: <span className="font-semibold text-stone-900">{pauses}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
