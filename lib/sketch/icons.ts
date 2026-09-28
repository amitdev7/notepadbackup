import * as PhosphorIcons from "@phosphor-icons/react"
import React from "react"

export function getIconComponent(name: string): React.ComponentType<{ size?: number | string; color?: string; weight?: string }> | null {
  const cleanName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")

  // @ts-expect-error dynamic access
  const comp = PhosphorIcons[cleanName] || PhosphorIcons[name] || PhosphorIcons[`${cleanName}Icon`]
  return comp || PhosphorIcons.Sparkle
}
