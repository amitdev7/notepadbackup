"use client"

import { useEffect } from "react"
import { ArrowCounterClockwise, House } from "@phosphor-icons/react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Zenithsui Runtime Error:", error)
  }, [error])

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--sq-paper,#fbfaf5)] p-6 text-[var(--sq-ink,#1a1a1a)]">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border-2 border-[var(--sq-ink,#1a1a1a)]/20 bg-[var(--sq-paper,#fbfaf5)] p-6 text-center shadow-lg">
        <h2 className="font-sketch text-2xl font-bold">Something hiccuped!</h2>
        <p className="font-sans text-xs text-[var(--sq-ink,#1a1a1a)]/70">
          The canvas ran into an unexpected state. You can restore the session without losing your document.
        </p>
        {error?.message && (
          <p className="font-mono text-[11px] text-red-600/80 bg-red-500/10 px-2.5 py-1 rounded max-w-sm truncate" title={error.message}>
            {error.message}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 rounded-lg bg-[var(--sq-ink,#1a1a1a)] px-4 py-2 text-xs font-semibold text-[var(--sq-paper,#fbfaf5)] transition-opacity hover:opacity-90"
          >
            <ArrowCounterClockwise className="size-4" weight="bold" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.location.href = "/"
              } catch {
                window.location.reload()
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-[var(--sq-ink,#1a1a1a)]/30 px-4 py-2 text-xs font-medium text-[var(--sq-ink,#1a1a1a)] hover:bg-[var(--sq-ink,#1a1a1a)]/5 cursor-pointer"
          >
            <House className="size-4" />
            Reload canvas
          </button>
        </div>
      </div>
    </div>
  )
}
