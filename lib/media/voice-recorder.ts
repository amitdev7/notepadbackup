"use client"

// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Quick Voice Memos & Canvas Audio Recorder
//
// Features:
// 1. One-click microphone recording with secure-context & permission handling.
// 2. Real-time audio waveform analysis via AudioContext + AnalyserNode (no feedback loop).
// 3. Monotonic accurate timer (independent of browser chunk timeslices).
// 4. Incremental IndexedDB persistence to protect against unexpected crashes/refreshes.
// 5. Automatic Audio Card (MediaNode) insertion at visible viewport center.
// 6. Zero cloud leaks: 100% local-first IndexedDB binary asset storage.
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { useSquig } from "@/lib/store"
import { screenToWorld, type MediaNode } from "@/lib/types"
import { saveMediaAsset } from "@/lib/media/media-assets"
import { openZenithsuiDb, STORES, withTransaction } from "@/lib/storage/db"
import { audioFx } from "@/lib/canvas/audio-fx"

export type VoiceRecordingStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopping"
  | "saving"
  | "error"

export interface VoiceRecorderState {
  status: VoiceRecordingStatus
  durationSeconds: number
  isPaused: boolean
  errorMessage: string | null
  analyserNode: AnalyserNode | null
  hasRecoverableDraft: boolean
  draftDuration: number

  // Actions
  startRecording: () => Promise<boolean>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<string | null>
  cancelRecording: () => void
  clearError: () => void
  checkRecoverableDraft: () => Promise<void>
  recoverDraft: () => Promise<string | null>
  discardDraft: () => Promise<void>
}

// ── Internal Non-Reactive Audio Runtime References ─────────────────────────
let activeStream: MediaStream | null = null
let activeAudioCtx: AudioContext | null = null
let activeAnalyser: AnalyserNode | null = null
let activeRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let activeSessionId: string | null = null
let timerInterval: NodeJS.Timeout | null = null
let startTimeMs = 0
let pausedAccumulatedMs = 0
let pauseStartedAtMs = 0

const DRAFT_DB_KEY = "voice_recording_draft"

function getCanvasCenter(): [number, number] {
  const vp = useSquig.getState().viewport
  const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 400
  const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 300
  return screenToWorld(vp, cx, cy)
}

function getExtensionForMime(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes("webm")) return "webm"
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a"
  if (m.includes("ogg") || m.includes("opus")) return "ogg"
  if (m.includes("wav")) return "wav"
  return "webm"
}

/**
 * Detects the best browser-supported audio recording MIME type.
 */
function getBestSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm"
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ""
}

/**
 * Saves incremental recording chunks to IndexedDB APP_STATE to support crash recovery.
 */
async function saveIncrementalDraft(sessionId: string, chunks: Blob[], mimeType: string, duration: number) {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return
  try {
    await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
      tx.objectStore(STORES.APP_STATE).put({
        key: DRAFT_DB_KEY,
        sessionId,
        chunks,
        mimeType,
        duration,
        timestamp: Date.now(),
      })
    })
  } catch (err) {
    // Non-fatal write failure (storage quota or incognito)
  }
}

/**
 * Clears the active recording draft from IndexedDB.
 */
async function clearDraftFromDb() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return
  try {
    await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
      tx.objectStore(STORES.APP_STATE).delete(DRAFT_DB_KEY)
    })
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Safely releases microphone tracks and closes Web Audio resources.
 */
function cleanupAudioHardware() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (activeStream) {
    try {
      activeStream.getTracks().forEach((t) => t.stop())
    } catch {}
    activeStream = null
  }
  if (activeAudioCtx) {
    try {
      if (activeAudioCtx.state !== "closed") {
        activeAudioCtx.close().catch(() => {})
      }
    } catch {}
    activeAudioCtx = null
  }
  activeAnalyser = null
  activeRecorder = null
}

export const useVoiceRecorder = create<VoiceRecorderState>((set, get) => ({
  status: "idle",
  durationSeconds: 0,
  isPaused: false,
  errorMessage: null,
  analyserNode: null,
  hasRecoverableDraft: false,
  draftDuration: 0,

  startRecording: async () => {
    // Prevent duplicate triggers
    if (get().status === "recording" || get().status === "requesting") return false

    // 1. Validate browser support
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      set({
        status: "error",
        errorMessage: "Microphone recording is not supported on this browser or platform.",
      })
      return false
    }

    // 2. Validate secure context (HTTPS or localhost)
    if (
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      set({
        status: "error",
        errorMessage: "Microphone access requires a secure connection (HTTPS).",
      })
      return false
    }

    set({ status: "requesting", errorMessage: null, durationSeconds: 0, isPaused: false })

    try {
      // 3. Request user microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // 4. Initialize Web Audio analyser for live real-time waveform visualization
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      let audioCtx: AudioContext | null = null
      let analyser: AnalyserNode | null = null

      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
        const source = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.65
        source.connect(analyser)
        // CRITICAL: DO NOT connect analyser to audioCtx.destination to prevent speaker feedback loop!
      }

      // 5. Detect supported MIME & initialize MediaRecorder
      const chosenMime = getBestSupportedMime()
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream)

      const sessionId = `rec_${Date.now()}`
      recordedChunks = []
      activeStream = stream
      activeAudioCtx = audioCtx
      activeAnalyser = analyser
      activeRecorder = recorder
      activeSessionId = sessionId

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data)
          void saveIncrementalDraft(
            sessionId,
            recordedChunks,
            recorder.mimeType || chosenMime,
            get().durationSeconds
          )
        }
      }

      // 6. Monotonic timer setup
      startTimeMs = performance.now()
      pausedAccumulatedMs = 0
      pauseStartedAtMs = 0

      timerInterval = setInterval(() => {
        if (!get().isPaused) {
          const now = performance.now()
          const totalElapsed = (now - startTimeMs - pausedAccumulatedMs) / 1000
          set({ durationSeconds: Math.max(0, Math.floor(totalElapsed)) })
        }
      }, 150)

      // Collect data every 1000ms for incremental safety
      recorder.start(1000)

      audioFx.playReactionPop()
      set({
        status: "recording",
        analyserNode: analyser,
        isPaused: false,
      })
      return true
    } catch (err: unknown) {
      cleanupAudioHardware()
      const error = err as Error
      let friendlyMsg = "Could not start audio recording."

      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        friendlyMsg = "Microphone permission was denied. Please allow microphone access in your browser address bar."
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        friendlyMsg = "No microphone hardware found. Please plug in or enable a microphone."
      } else if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
        friendlyMsg = "Microphone is already in use by another app or browser tab."
      }

      set({
        status: "error",
        errorMessage: friendlyMsg,
      })
      return false
    }
  },

  pauseRecording: () => {
    if (activeRecorder && activeRecorder.state === "recording") {
      try {
        activeRecorder.pause()
        pauseStartedAtMs = performance.now()
        set({ status: "paused", isPaused: true })
        audioFx.playToolSwitch()
      } catch (err) {
        console.warn("[voice-recorder] Failed to pause:", err)
      }
    }
  },

  resumeRecording: () => {
    if (activeRecorder && activeRecorder.state === "paused") {
      try {
        pausedAccumulatedMs += performance.now() - pauseStartedAtMs
        pauseStartedAtMs = 0
        activeRecorder.resume()
        set({ status: "recording", isPaused: false })
        audioFx.playShapeSnap()
      } catch (err) {
        console.warn("[voice-recorder] Failed to resume:", err)
      }
    }
  },

  stopRecording: async (): Promise<string | null> => {
    const recorder = activeRecorder
    if (!recorder || recorder.state === "inactive") {
      set({ status: "idle" })
      return null
    }

    set({ status: "stopping" })

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        set({ status: "saving" })
        const durationSec = get().durationSeconds
        const mimeType = recorder.mimeType || "audio/webm"
        const finalBlob = new Blob(recordedChunks, { type: mimeType })

        // Immediately release microphone hardware
        cleanupAudioHardware()

        if (finalBlob.size === 0) {
          void clearDraftFromDb()
          set({ status: "idle", durationSeconds: 0 })
          resolve(null)
          return
        }

        try {
          // Format understandable filename with user local timestamp
          const now = new Date()
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "")
          const dateStr = now.toISOString().slice(0, 10)
          const ext = getExtensionForMime(mimeType)
          const filename = `Voice-Memo-${dateStr}-${timeStr}.${ext}`
          const cleanTitle = `Voice Memo - ${now.toLocaleDateString([], { month: "short", day: "numeric" })}`

          // 1. Commit audio binary into IndexedDB asset storage
          const savedAsset = await saveMediaAsset(finalBlob, filename)

          // 2. Clear incremental draft
          void clearDraftFromDb()

          // 3. Insert real playable MediaNode onto active canvas at visible center
          const [cx, cy] = getCanvasCenter()
          const w = 380
          const h = 135

          const mediaNodeData: Omit<MediaNode, "id" | "seed"> = {
            type: "media",
            mediaKind: "audio",
            source: { kind: "local", assetId: savedAsset.assetId },
            name: cleanTitle,
            mimeType: savedAsset.mimeType,
            sizeBytes: savedAsset.sizeBytes,
            duration: savedAsset.duration || Math.max(1, durationSec),
            waveform: savedAsset.waveform,
            x: Math.round(cx - w / 2),
            y: Math.round(cy - h / 2),
            w,
            h,
            controls: true,
            playbackRate: 1,
            metadata: {
              isVoiceMemo: true,
              recordedAt: Date.now(),
              originalFilename: filename,
            },
          }

          const newNodeId = useSquig.getState().addNode(mediaNodeData as any)
          useSquig.getState().setSelection([newNodeId])
          useSquig.getState().setNotice("Voice Memo saved to canvas ✨")
          audioFx.playReactionPop()

          set({
            status: "idle",
            durationSeconds: 0,
            isPaused: false,
            analyserNode: null,
          })
          resolve(newNodeId)
        } catch (err: unknown) {
          console.error("[voice-recorder] Failed to save recording:", err)
          set({
            status: "error",
            errorMessage: "Failed to save audio recording locally. Please check storage capacity.",
          })
          resolve(null)
        }
      }

      // Request final audio chunk & trigger stop
      try {
        recorder.requestData()
        recorder.stop()
      } catch {
        cleanupAudioHardware()
        set({ status: "idle" })
        resolve(null)
      }
    })
  },

  cancelRecording: () => {
    if (activeRecorder && activeRecorder.state !== "inactive") {
      try {
        activeRecorder.stop()
      } catch {}
    }
    cleanupAudioHardware()
    recordedChunks = []
    void clearDraftFromDb()
    set({
      status: "idle",
      durationSeconds: 0,
      isPaused: false,
      analyserNode: null,
      errorMessage: null,
    })
  },

  clearError: () => {
    set({ status: "idle", errorMessage: null })
  },

  checkRecoverableDraft: async () => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return
    try {
      const draft = await withTransaction(STORES.APP_STATE, "readonly", (tx) => {
        return new Promise<{ chunks?: Blob[]; duration?: number; timestamp?: number } | null>((resolve) => {
          const req = tx.objectStore(STORES.APP_STATE).get(DRAFT_DB_KEY)
          req.onsuccess = () => resolve(req.result || null)
          req.onerror = () => resolve(null)
        })
      })

      if (draft && Array.isArray(draft.chunks) && draft.chunks.length > 0) {
        set({ hasRecoverableDraft: true, draftDuration: Math.round(draft.duration || 0) })
      }
    } catch {}
  },

  recoverDraft: async (): Promise<string | null> => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return null
    try {
      const draft = await withTransaction(STORES.APP_STATE, "readonly", (tx) => {
        return new Promise<{ chunks?: Blob[]; mimeType?: string; duration?: number } | null>((resolve) => {
          const req = tx.objectStore(STORES.APP_STATE).get(DRAFT_DB_KEY)
          req.onsuccess = () => resolve(req.result || null)
          req.onerror = () => resolve(null)
        })
      })

      if (!draft || !Array.isArray(draft.chunks) || draft.chunks.length === 0) {
        set({ hasRecoverableDraft: false })
        return null
      }

      const mimeType = draft.mimeType || "audio/webm"
      const finalBlob = new Blob(draft.chunks, { type: mimeType })
      const ext = getExtensionForMime(mimeType)
      const filename = `Recovered-Voice-Memo-${Date.now()}.${ext}`

      const savedAsset = await saveMediaAsset(finalBlob, filename)
      await clearDraftFromDb()

      const [cx, cy] = getCanvasCenter()
      const w = 380
      const h = 135

      const mediaNodeData: Omit<MediaNode, "id" | "seed"> = {
        type: "media",
        mediaKind: "audio",
        source: { kind: "local", assetId: savedAsset.assetId },
        name: `Recovered Voice Memo`,
        mimeType: savedAsset.mimeType,
        sizeBytes: savedAsset.sizeBytes,
        duration: savedAsset.duration || Math.max(1, draft.duration || 0),
        waveform: savedAsset.waveform,
        x: Math.round(cx - w / 2),
        y: Math.round(cy - h / 2),
        w,
        h,
        controls: true,
        playbackRate: 1,
        metadata: {
          isVoiceMemo: true,
          recordedAt: Date.now(),
          recovered: true,
        },
      }

      const newNodeId = useSquig.getState().addNode(mediaNodeData as any)
      useSquig.getState().setSelection([newNodeId])
      useSquig.getState().setNotice("Recovered Voice Memo restored to canvas ✨")

      set({ hasRecoverableDraft: false, draftDuration: 0 })
      return newNodeId
    } catch (err) {
      console.error("[voice-recorder] Failed to recover draft:", err)
      return null
    }
  },

  discardDraft: async () => {
    await clearDraftFromDb()
    set({ hasRecoverableDraft: false, draftDuration: 0 })
  },
}))
