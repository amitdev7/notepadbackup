"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.ComponentProps<"textarea">

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[64px] w-full rounded-chrome-sm border border-input bg-background/60 dark:bg-input/20 px-3 py-2 text-row font-sans transition-all duration-150 outline-none placeholder:text-muted-foreground/70 hover:border-muted-foreground/30 focus-visible:border-[var(--ui-accent,#007AFF)] focus-visible:ring-2 focus-visible:ring-[var(--ui-accent,#007AFF)]/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 resize-y",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
