"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Zenithsui Global Fatal Error]", error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] p-6 font-sans antialiased">
        <div className="max-w-md w-full p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-xl text-center space-y-4">
          <div className="size-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Application Error</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              A fatal error prevented the application from rendering.
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
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors"
            >
              Reload Zenithsui
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
