export default function Loading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] text-[#18181b] dark:text-[#f4f4f5] select-none font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="font-mono text-xs text-stone-500 dark:text-stone-400 tracking-wider">
          ZENITHSUI
        </span>
      </div>
    </div>
  )
}
