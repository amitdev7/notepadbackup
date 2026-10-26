"use client"

import * as React from "react"
import { Check, Minus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const isChecked = checked === true
    const isIndeterminate = checked === "indeterminate"

    const handleClick = () => {
      if (disabled) return
      onCheckedChange?.(!isChecked)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        onCheckedChange?.(!isChecked)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isIndeterminate ? "mixed" : isChecked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-slot="checkbox"
        className={cn(
          "peer relative size-4 shrink-0 rounded-[4px] border transition-all outline-none cursor-pointer flex items-center justify-center select-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--sq-ink)]/25 focus-visible:border-[var(--sq-ink)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isChecked || isIndeterminate
            ? "border-[var(--sq-ink)] bg-[var(--sq-ink)] text-[var(--sq-paper)] shadow-2xs"
            : "border-input bg-transparent hover:border-foreground/60 dark:bg-input/20",
          className
        )}
        {...props}
      >
        {isChecked && <Check size={11} weight="bold" className="shrink-0" />}
        {isIndeterminate && <Minus size={11} weight="bold" className="shrink-0" />}
      </button>
    )
  }
)

Checkbox.displayName = "Checkbox"
