"use client"

// ---------------------------------------------------------------------------
// The flash — one line, bottom center, gone in a couple of seconds.
//
// It exists for the commands whose result you can't see on the canvas: a PNG
// on the clipboard leaves no mark, so without this the keystroke feels like it
// did nothing. Anything you *can* watch happen should not come through here.
//
// Driven off a store subscription rather than a selector, the same way the file
// name's "saved" note is: the text has to outlive the fade, so the message is
// held locally and only the arrival of a new one is worth a render.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useSquig } from "@/lib/store"
import { cn } from "@/lib/utils"

const LINGER_MS = 2200

export function Notice() {
  const [text, setText] = useState("")
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = useSquig.subscribe((s, prev) => {
      // the id changes even when the words don't, so saying the same thing
      // twice re-arms the clock instead of riding out the first one's
      if (!s.notice || s.notice === prev.notice) return
      setText(s.notice.text)
      setShown(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setShown(false), LINGER_MS)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-chrome-lg border apple-glass-pill mac-shadow px-4 py-2 text-label whitespace-nowrap text-foreground font-medium transition-all duration-300 ease-out",
        shown
          ? "opacity-100 translate-y-0 scale-100 animate-toast-spring"
          : "opacity-0 translate-y-3 scale-95"
      )}
    >
      {text}
    </div>
  )
}
