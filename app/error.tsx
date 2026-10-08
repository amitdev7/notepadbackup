"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Zenithsui Runtime Error]", error)
  }, [error])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] p-6 font-sans">
      <div className="max-w-md w-full p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-xl text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
          <WarningCircle size={28} weight="fill" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            An unexpected error occurred while rendering the workspace canvas.
          </p>
        </div>
        {error.digest && (
          <code className="block text-[11px] font-mono text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/80 p-2 rounded-lg break-all">
            Digest: {error.digest}
          </code>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors"
          >
            Return to Canvas
          </Link>
        </div>
      </div>
    </div>
  )
}
