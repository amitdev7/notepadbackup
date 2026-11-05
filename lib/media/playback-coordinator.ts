"use client"

// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Playback Coordinator
// ---------------------------------------------------------------------------

type PlaybackListener = (activeId: string | null) => void

class PlaybackCoordinator {
  private activePlayerId: string | null = null
  private listeners: Set<PlaybackListener> = new Set()
  private soloMode: boolean = true

  constructor() {
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          // Pause all media when tab is hidden or backgrounded
          this.pauseAll()
        }
      })
    }
  }

  public subscribe(fn: PlaybackListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  public notifyPlay(nodeId: string): void {
    if (this.soloMode && this.activePlayerId && this.activePlayerId !== nodeId) {
      // Notify other players to pause
      this.listeners.forEach((fn) => fn(nodeId))
    }
    this.activePlayerId = nodeId
  }

  public notifyPause(nodeId: string): void {
    if (this.activePlayerId === nodeId) {
      this.activePlayerId = null
    }
  }

  public pauseAll(): void {
    this.activePlayerId = null
    this.listeners.forEach((fn) => fn(null))
  }

  public setSoloMode(enabled: boolean): void {
    this.soloMode = enabled
  }

  public isSoloMode(): boolean {
    return this.soloMode
  }

  public getActivePlayerId(): string | null {
    return this.activePlayerId
  }
}

export const playbackCoordinator = new PlaybackCoordinator()
