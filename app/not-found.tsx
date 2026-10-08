import Link from "next/link"
import { Compass, House } from "@phosphor-icons/react/dist/ssr"

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] p-6 font-sans select-none">
      <div className="max-w-md w-full p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-xl text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Compass size={28} weight="fill" />
        </div>
        <div>
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
            404 Not Found
          </span>
          <h2 className="text-lg font-bold tracking-tight mt-1">This page wandered off the canvas</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            The wireframe or resource you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <House size={14} weight="bold" />
            Back to Canvas
          </Link>
        </div>
      </div>
    </div>
  )
}
