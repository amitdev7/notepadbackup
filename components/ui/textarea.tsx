"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.ComponentProps<"textarea">

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[64px] w-full rounded-chrome-sm border border-input bg-transparent px-3 py-2 text-row font-sans transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-[var(--sq-ink)] focus-visible:ring-2 focus-visible:ring-[var(--sq-ink)]/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/20 resize-y",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
