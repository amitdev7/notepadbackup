// ---------------------------------------------------------------------------
// Zenithsui Audio Haptics & Acoustic Feedback Synthesizer
//
// Zero-dependency Web Audio API procedural sound engine:
// - Generates organic Apple-style tactile clicks, snaps, chimes, and pops
// - Fully synthesized in real time (zero external MP3/WAV assets)
// - Lazy AudioContext initialization on first user interaction
// - Safe for SSR and non-browser headless environments
// ---------------------------------------------------------------------------

import { useShellStore } from "@/lib/shell-store"

class AudioHapticsSynthesizer {
  private ctx: AudioContext | null = null
  private initialized = false

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private isEnabled(): boolean {
    if (typeof window === "undefined") return false
    const prefs = useShellStore.getState().preferences
    // If not explicitly defined, default to enabled with subtle volume
    const haptics = prefs.audioHaptics
    if (haptics === undefined) return true
    return Boolean(haptics.enabled)
  }

  private getMasterVolume(): number {
    if (typeof window === "undefined") return 0.25
    const prefs = useShellStore.getState().preferences
    return prefs.audioHaptics?.volume ?? 0.25
  }

  /** Subtle wooden / glass tap when switching tools or clicking dock buttons */
  playToolSwitch(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = "sine"
    osc.frequency.setValueAtTime(680, now)
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.025)

    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1400, now)

    const vol = this.getMasterVolume() * 0.18
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.03)
  }

  /** Harmonic chime-pop when a rough drawing snaps into a perfect geometric shape */
  playShapeSnap(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const masterVol = this.getMasterVolume() * 0.32

    // Dual-tone harmonic bell (C5 + G5: 523Hz + 784Hz)
    const freqs = [523.25, 783.99]
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.04)
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.12)

      const noteVol = masterVol * (idx === 0 ? 0.7 : 0.45)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(noteVol, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.17)
    })
  }

  /** Smooth airy glide whoosh when navigating presentation slides */
  playSlideChange(direction: "next" | "prev" = "next"): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = "triangle"
    const startFreq = direction === "next" ? 380 : 540
    const endFreq = direction === "next" ? 580 : 360

    osc.frequency.setValueAtTime(startFreq, now)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14)

    filter.type = "lowpass"
    filter.frequency.setValueAtTime(900, now)
    filter.frequency.linearRampToValueAtTime(1600, now + 0.08)
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.15)

    const vol = this.getMasterVolume() * 0.22
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.17)
  }

  /** Electrostatic laser activation sizzle */
  playLaserSizzle(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04)

    const vol = this.getMasterVolume() * 0.12
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  /** Bouncy bubble pop when sending or receiving live emoji reactions */
  playReactionPop(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Pitch sweep upward creates authentic bubble pop
    const baseFreq = 580 + Math.random() * 160
    osc.type = "sine"
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.85, now + 0.05)

    const vol = this.getMasterVolume() * 0.28
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.1)
  }
}

export const audioFx = new AudioHapticsSynthesizer()
