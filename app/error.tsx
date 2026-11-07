"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowCounterClockwise,
  WarningCircle,
  Copy,
  Check,
  ShieldCheck,
} from "@phosphor-icons/react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.error("[Zenithsui Runtime Error]", error)
  }, [error])

  const handleCopy = () => {
    const text = `Error: ${error.message}\nDigest: ${error.digest || "none"}\nStack:\n${error.stack || "none"}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSafeRecovery = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear()
        localStorage.removeItem("zenithsui-selection")
        localStorage.removeItem("zenithsui-active-popover")
        localStorage.removeItem("zenithsui-last-gesture")
      }
    } catch {}
    reset()
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] p-6 font-sans">
      <div className="max-w-lg w-full p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-2xl text-center space-y-4">
        <div className="size-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
          <WarningCircle size={32} weight="fill" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            An unexpected error occurred while rendering the workspace canvas.
          </p>
        </div>

        {/* Informative Error Details */}
        <div className="text-left bg-stone-100/90 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 rounded-xl p-3 text-xs space-y-1">
          <div className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
            <span>Error Details</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="font-mono text-[11px] text-red-600 dark:text-red-400 break-words leading-relaxed">
            {error.message || "An unknown rendering error occurred."}
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-stone-400">
              Digest: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Try Again
          </button>
          <button
            type="button"
            onClick={handleSafeRecovery}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ShieldCheck size={14} weight="bold" />
            Safe Recovery & Reload
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors"
          >
            Return to Canvas
          </Link>
        </div>
      </div>
    </div>
  )
}
