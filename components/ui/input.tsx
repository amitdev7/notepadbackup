import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-ctl w-full min-w-0 rounded-chrome-sm border border-input bg-background/60 dark:bg-input/20 px-3 py-1 text-row transition-all duration-150 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-label file:font-medium file:text-foreground placeholder:text-muted-foreground/70 hover:border-muted-foreground/30 focus-visible:border-[var(--ui-accent,#007AFF)] focus-visible:ring-2 focus-visible:ring-[var(--ui-accent,#007AFF)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
