"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { CaretRightIcon } from "@phosphor-icons/react"

const POPUP =
  "min-w-52 origin-(--transform-origin) rounded-2xl apple-glass-panel p-1.5 text-stone-900 dark:text-stone-100 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 outline-none transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 font-sans"

/**
 * A menu row in Apple macOS style:
 * Comfortable hit target, rounded squircle hover highlight, crisp typography.
 */
const ITEM =
  "relative flex h-8 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-xs font-medium outline-none select-none transition-colors duration-100 data-highlighted:bg-[#007AFF] data-highlighted:text-white data-disabled:pointer-events-none data-disabled:opacity-40"

function DropdownMenu(props: React.ComponentProps<typeof Menu.Root>) {
  return <Menu.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof Menu.Trigger>) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  className,
  children,
  align = "start",
  sideOffset = 8,
  finalFocus,
  ...props
}: React.ComponentProps<typeof Menu.Popup> & {
  align?: React.ComponentProps<typeof Menu.Positioner>["align"]
  sideOffset?: number
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup data-slot="dropdown-menu-content" finalFocus={finalFocus} className={cn(POPUP, className)} {...props}>
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Menu.Item> & { variant?: "default" | "destructive" }) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        ITEM,
        variant === "destructive" && "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dropdown-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />
}

/** Right-aligned hint — a shortcut, a file extension, a tick. */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto pl-6 text-label text-muted-foreground", className)}
      {...props}
    />
  )
}

function DropdownMenuSub(props: React.ComponentProps<typeof Menu.SubmenuRoot>) {
  return <Menu.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Menu.SubmenuTrigger>) {
  return (
    <Menu.SubmenuTrigger data-slot="dropdown-menu-sub-trigger" className={cn(ITEM, className)} {...props}>
      {children}
      <CaretRightIcon className="ml-auto size-3.5 text-muted-foreground" weight="bold" />
    </Menu.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Menu.Popup>) {
  return (
    <Menu.Portal>
      <Menu.Positioner align="start" sideOffset={4} className="z-50 outline-none">
        <Menu.Popup data-slot="dropdown-menu-sub-content" className={cn(POPUP, className)} {...props}>
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<typeof Menu.Group>) {
  return <Menu.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Menu.GroupLabel>) {
  return (
    <Menu.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn("px-2.5 py-1.5 text-label text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
