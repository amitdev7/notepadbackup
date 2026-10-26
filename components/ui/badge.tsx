"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-sans rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-2xs",
        secondary:
          "bg-muted text-muted-foreground hover:bg-muted/80",
        outline:
          "border border-border text-foreground bg-background/50",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/20",
        success:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
        warning:
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25",
        info:
          "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25",
        pill:
          "bg-[var(--sq-shade)] text-[var(--sq-ink)] border border-[var(--sq-border)]",
      },
      size: {
        default: "px-2 py-0.5 text-[11px]",
        sm: "px-1.5 py-0.25 text-[10px]",
        lg: "px-2.5 py-1 text-xs font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { badgeVariants }
