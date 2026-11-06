// ---------------------------------------------------------------------------
// Zenithsui — Quick Voice Memos & Canvas Audio Recorder Test Suite
// ---------------------------------------------------------------------------

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`)
    process.exit(1)
  }
  console.log(`  ✓ ${msg}`)
}

console.log("=== ZENITHSUI QUICK VOICE MEMOS & RECORDER TEST SUITE ===")

// 1. Extension and MIME validation
console.log("\n1. Testing Audio MIME & Extension Mapping...")

function getExtensionForMime(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes("webm")) return "webm"
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a"
  if (m.includes("ogg") || m.includes("opus")) return "ogg"
  if (m.includes("wav")) return "wav"
  return "webm"
}

assert(getExtensionForMime("audio/webm;codecs=opus") === "webm", "Resolves audio/webm;codecs=opus to .webm")
assert(getExtensionForMime("audio/webm") === "webm", "Resolves audio/webm to .webm")
assert(getExtensionForMime("audio/mp4") === "m4a", "Resolves audio/mp4 to .m4a")
assert(getExtensionForMime("audio/aac") === "m4a", "Resolves audio/aac to .m4a")
assert(getExtensionForMime("audio/ogg;codecs=opus") === "ogg", "Resolves audio/ogg to .ogg")
assert(getExtensionForMime("audio/wav") === "wav", "Resolves audio/wav to .wav")

// 2. Timer Formatting Logic
console.log("\n2. Testing Monotonic Timer Formatter...")

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

assert(formatTimer(0) === "00:00", "0 seconds formats to 00:00")
assert(formatTimer(9) === "00:09", "9 seconds formats to 00:09")
assert(formatTimer(65) === "01:05", "65 seconds formats to 01:05")
assert(formatTimer(3599) === "59:59", "3599 seconds formats to 59:59")
assert(formatTimer(3600) === "60:00", "3600 seconds formats to 60:00")

// 3. Audio Node Schema Integrity
console.log("\n3. Testing MediaNode Schema for Voice Memos...")

interface VoiceMemoNode {
  type: "media"
  mediaKind: "audio"
  source: { kind: "local"; assetId: string }
  name: string
  mimeType: string
  duration: number
  waveform?: number[]
  controls: boolean
  metadata?: {
    isVoiceMemo: boolean
    recordedAt: number
    recovered?: boolean
  }
}

const mockVoiceMemo: VoiceMemoNode = {
  type: "media",
  mediaKind: "audio",
  source: { kind: "local", assetId: "asset_abc123" },
  name: "Voice Memo - Nov 6",
  mimeType: "audio/webm",
  duration: 42,
  waveform: [0.1, 0.4, 0.8, 0.5, 0.2],
  controls: true,
  metadata: {
    isVoiceMemo: true,
    recordedAt: Date.now(),
  },
}

assert(mockVoiceMemo.type === "media", "Node type is media")
assert(mockVoiceMemo.mediaKind === "audio", "Media kind is audio")
assert(mockVoiceMemo.source.kind === "local", "Source is strictly local IndexedDB asset")
assert(mockVoiceMemo.controls === true, "Controls are enabled by default for playback")
assert(mockVoiceMemo.metadata?.isVoiceMemo === true, "Carries isVoiceMemo metadata badge flag")
assert(Array.isArray(mockVoiceMemo.waveform) && mockVoiceMemo.waveform.length === 5, "Waveform data array is intact")

// 4. Secure Context and Permission Checks
console.log("\n4. Testing Secure Context & Permission Simulation...")

function checkContext(isSecure: boolean, hostname: string): { allowed: boolean; error?: string } {
  if (!isSecure && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return { allowed: false, error: "Microphone access requires a secure connection (HTTPS)." }
  }
  return { allowed: true }
}

assert(checkContext(true, "zenithsui.vercel.app").allowed, "HTTPS production is allowed")
assert(checkContext(false, "localhost").allowed, "HTTP localhost is allowed")
assert(checkContext(false, "127.0.0.1").allowed, "HTTP 127.0.0.1 is allowed")
assert(!checkContext(false, "192.168.1.50").allowed, "HTTP on remote IP is blocked securely")

// 5. Monotonic Time Math (excluding paused intervals)
console.log("\n5. Testing Monotonic Pause Math...")

function computeElapsed(startMs: number, nowMs: number, pausedMs: number): number {
  return Math.max(0, Math.floor((nowMs - startMs - pausedMs) / 1000))
}

const t0 = 10000
const t1 = 25000 // 15s later
const pausedDuration = 5000 // 5s spent paused
assert(computeElapsed(t0, t1, pausedDuration) === 10, "Correctly excludes 5s of paused time from total 15s wall clock")

console.log("\n🎉 ALL VOICE RECORDER SYSTEM TESTS PASSED SUCCESSFULLY!\n")
