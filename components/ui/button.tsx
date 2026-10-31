"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-sans rounded-xl border border-transparent bg-clip-padding text-xs font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ui-accent,#007AFF)]/40 focus-visible:ring-offset-1 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ui-accent,#007AFF)] hover:brightness-95 active:brightness-90 text-white shadow-xs font-semibold",
        outline:
          "border-stone-200/80 dark:border-white/10 bg-white/70 dark:bg-stone-800/70 hover:bg-stone-100 dark:hover:bg-stone-700/80 text-stone-800 dark:text-stone-100 backdrop-blur-md shadow-2xs",
        secondary:
          "bg-stone-100/90 dark:bg-stone-800/80 text-stone-800 dark:text-stone-100 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 border border-stone-200/40 dark:border-white/5",
        ghost:
          "text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 active:bg-destructive/30 border border-destructive/25 font-semibold",
        link: "text-[var(--ui-accent,#007AFF)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * `render` replaces Radix's `asChild`: pass an element to compose the button's
 * behaviour onto it. Base UI's convention, and what the base-nova registry
 * ships, so a component pulled from shadcn drops in without translation.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  render,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    render?: useRender.RenderProp
    loading?: boolean
  }) {
  const content = loading ? (
    <>
      <svg
        className="size-3.5 animate-spin-smooth"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {children}
    </>
  ) : (
    children
  )

  return useRender({
    render,
    defaultTagName: "button",
    props: {
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size,
      "aria-busy": loading ? true : undefined,
      disabled: disabled || loading,
      className: cn(buttonVariants({ variant, size, className })),
      children: content,
      ...props,
    },
  })
}

export { Button, buttonVariants }
