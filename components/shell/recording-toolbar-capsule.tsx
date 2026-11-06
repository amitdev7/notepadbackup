"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Quick Voice Memos & Canvas Audio Recorder Capsule
//
// Studio-Grade Floating Recording Interface:
// - Live microphone frequency waveform (real vocal responsiveness)
// - Monotonic millisecond-accurate timer (MM:SS)
// - Seamless Pause, Resume, Stop & Save to Canvas
// - Crash-resilient draft recovery prompt
// - Zero cloud leaks (100% private & local-first)
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from "react"
import { useVoiceRecorder } from "@/lib/media/voice-recorder"
import { LiveRecordingWaveform } from "@/components/canvas/live-recording-waveform"
import {
  Microphone,
  Pause,
  Play,
  Check,
  X,
  WarningCircle,
  ArrowsClockwise,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function RecordingToolbarCapsule() {
  const {
    status,
    durationSeconds,
    isPaused,
    errorMessage,
    analyserNode,
    hasRecoverableDraft,
    draftDuration,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearError,
    checkRecoverableDraft,
    recoverDraft,
    discardDraft,
  } = useVoiceRecorder()

  // Check for unsaved draft on mount
  useEffect(() => {
    void checkRecoverableDraft()
  }, [checkRecoverableDraft])

  // Keyboard hotkeys while recording is active (Space to Pause/Resume, Enter to Save, Esc to Cancel)
  useEffect(() => {
    if (status !== "recording" && status !== "paused") return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault()
        if (isPaused) {
          resumeRecording()
        } else {
          pauseRecording()
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        void stopRecording()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelRecording()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [status, isPaused, pauseRecording, resumeRecording, stopRecording, cancelRecording])

  // Nothing to render if idle and no recoverable draft
  if (status === "idle" && !hasRecoverableDraft) {
    return null
  }

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex items-center justify-center px-4 pointer-events-none select-none">
      {/* 1. Recoverable Draft Notification Capsule */}
      {hasRecoverableDraft && status === "idle" && (
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-full bg-amber-50/95 dark:bg-stone-900/95 border border-amber-300 dark:border-amber-700/60 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <Microphone size={15} weight="fill" className="text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>Unsaved Voice Memo (~{draftDuration}s)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void recoverDraft()}
              className="px-2.5 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold transition cursor-pointer shadow-xs active:scale-95"
            >
              Add to Canvas
            </button>
            <button
              type="button"
              onClick={() => void discardDraft()}
              className="p-1 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition cursor-pointer"
              title="Discard recording draft"
            >
              <Trash size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Error Capsule */}
      {status === "error" && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs max-w-md">
          <WarningCircle size={17} weight="bold" className="shrink-0 text-red-500" />
          <span className="flex-1 font-medium truncate">{errorMessage || "Microphone recording error"}</span>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded-full hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* 3. Requesting Permission State */}
      {status === "requesting" && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--sq-paper)]/95 border border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs font-semibold">
          <Microphone size={16} weight="fill" className="animate-pulse" />
          <span>Accessing microphone…</span>
        </div>
      )}

      {/* 4. Saving State */}
      {(status === "stopping" || status === "saving") && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--sq-paper)]/95 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs font-semibold">
          <ArrowsClockwise size={16} weight="bold" className="animate-spin text-emerald-500" />
          <span>Saving voice memo to canvas…</span>
        </div>
      )}

      {/* 5. Active Recording / Paused Controller Capsule */}
      {(status === "recording" || status === "paused") && (
        <div
          role="region"
          aria-label="Active voice recording"
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-[var(--sq-paper)]/95 border border-[var(--sq-border)] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            boxShadow: "0 12px 36px -6px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          {/* Status Indicator Dot & Label */}
          <div className="flex items-center gap-1.5 shrink-0">
            {status === "recording" ? (
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </span>
            ) : (
              <span className="size-2.5 rounded-full bg-amber-500" />
            )}
            <span
              className={cn(
                "font-mono font-extrabold text-[11px] tracking-wider uppercase",
                status === "recording" ? "text-red-500" : "text-amber-500"
              )}
            >
              {status === "recording" ? "REC" : "PAUSED"}
            </span>
          </div>

          {/* Monotonic Elapsed Timer */}
          <span className="font-mono font-bold text-xs text-[var(--sq-ink)] tabular-nums shrink-0">
            {formatTimer(durationSeconds)}
          </span>

          {/* Live Waveform Canvas */}
          <div className="flex items-center px-1 shrink-0">
            <LiveRecordingWaveform
              analyserNode={analyserNode}
              isPaused={isPaused}
              className="w-20 sm:w-28 h-5"
              barCount={18}
            />
          </div>

          {/* Action: Pause / Resume Toggle */}
          <button
            type="button"
            onClick={isPaused ? resumeRecording : pauseRecording}
            className={cn(
              "flex items-center justify-center size-7 rounded-full transition cursor-pointer tactile-press shadow-xs",
              isPaused
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                : "bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-300/80 dark:hover:bg-stone-700 border border-stone-300/50 dark:border-stone-700/50"
            )}
            title={isPaused ? "Resume recording (Space)" : "Pause recording (Space)"}
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
          >
            {isPaused ? <Play size={13} weight="fill" /> : <Pause size={13} weight="fill" />}
          </button>

          {/* Action: Stop & Save to Canvas */}
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm active:scale-95"
            title="Finish & Save Audio to Canvas (Enter)"
            aria-label="Finish and save recording"
          >
            <Check size={13} weight="bold" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Action: Discard / Cancel */}
          <button
            type="button"
            onClick={cancelRecording}
            className="flex items-center justify-center size-7 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer tactile-press"
            title="Discard recording (Escape)"
            aria-label="Discard recording"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
}
