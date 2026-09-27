import Link from "next/link"
import { House } from "@phosphor-icons/react/dist/ssr"

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--sq-paper,#fbfaf5)] p-6 text-[var(--sq-ink,#1a1a1a)]">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border-2 border-[var(--sq-ink,#1a1a1a)]/20 bg-[var(--sq-paper,#fbfaf5)] p-6 text-center shadow-lg">
        <h2 className="font-sketch text-3xl font-bold">404 - Page Not Found</h2>
        <p className="font-sans text-xs text-[var(--sq-ink,#1a1a1a)]/70">
          The requested wireframe or page could not be located.
        </p>
        <Link
          href="/"
          className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--sq-ink,#1a1a1a)] px-4 py-2 text-xs font-semibold text-[var(--sq-paper,#fbfaf5)] transition-opacity hover:opacity-90"
        >
          <House className="size-4" />
          Back to Canvas
        </Link>
      </div>
    </div>
  )
}
