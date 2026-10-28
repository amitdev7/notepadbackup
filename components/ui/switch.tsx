"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 outline-none cursor-pointer",
        "bg-[#e9e9ea] dark:bg-[#39393d]",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:ring-2 focus-visible:ring-blue-500/50",
        "data-checked:bg-[#34c759]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-[22px] data-[size=default]:w-[38px] data-[size=sm]:h-[16px] data-[size=sm]:w-[28px]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_1px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-data-[size=default]/switch:size-[18px] group-data-[size=sm]/switch:size-[12px]",
          "data-unchecked:translate-x-[2px] data-checked:translate-x-[18px] group-data-[size=sm]/switch:data-checked:translate-x-[14px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
