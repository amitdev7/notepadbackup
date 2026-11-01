// ---------------------------------------------------------------------------
// The keyboard, written down once.
//
// Specs are platform-neutral ("mod+shift+g"); kbd() prints them the way the
// machine you're on expects. Everything that shows a shortcut — the palette,
// the menus, the cheat sheet — reads from here, so the label and the handler
// can't drift apart.
// ---------------------------------------------------------------------------

export function isMac(): boolean {
  if (typeof navigator === "undefined") return true
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent)
}

const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  alt: "⌥",
  shift: "⇧",
  ctrl: "⌃",
  del: "⌫",
  enter: "↵",
  esc: "esc",
  plus: "+",
}

const PC_SYMBOLS: Record<string, string> = {
  mod: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  ctrl: "Ctrl",
  del: "Del",
  enter: "Enter",
  esc: "Esc",
  plus: "+",
}

/** Modifiers print in the order the platform expects, whatever order you wrote. */
const MAC_ORDER = ["ctrl", "alt", "shift", "mod"]
const PC_ORDER = ["mod", "alt", "shift", "ctrl"]

/**
 * "mod+shift+g" → "⇧⌘G" on a Mac, "Ctrl+Shift+G" elsewhere.
 *
 * The pseudo-modifier "far" is the all-the-way version of a one-step
 * shortcut — Figma spells that ⌥⌘ on a Mac and Ctrl+Shift on Windows.
 */
export function kbd(spec: string): string {
  const mac = isMac()
  const symbols = mac ? MAC_SYMBOLS : PC_SYMBOLS
  const order = mac ? MAC_ORDER : PC_ORDER
  const parts = spec.split("+").flatMap((p) => (p === "far" ? (mac ? ["alt", "mod"] : ["mod", "shift"]) : [p]))
  const mods = parts.filter((p) => order.includes(p)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const rest = parts.filter((p) => !order.includes(p))
  const printed = [
    ...mods.map((m) => symbols[m]),
    ...rest.map((r) => symbols[r] ?? (r.length === 1 ? r.toUpperCase() : r)),
  ]
  // "⇧⌘G" packs tight, but "⌥drag" doesn't — words need air around them
  const wordy = rest.some((r) => !symbols[r] && r.length > 1)
  return mac ? printed.join(wordy ? " " : "") : printed.join("+")
}

export interface ShortcutRow {
  keys: string[]
  label: string
}

export interface KeybindPreset {
  spec: string
  label: string
  description?: string
}

export const ZEN_MODE_PRESETS: KeybindPreset[] = [
  { spec: "mod+\\", label: "Default (⌘\\ / Ctrl+\\)", description: "Standard Zenithsui canvas toggle" },
  { spec: "f11", label: "Fullscreen Zen (F11)", description: "Full browser immersion" },
  { spec: "z", label: "Single Key (Z)", description: "Fast one-tap canvas switch" },
  { spec: "alt+z", label: "Alt + Z", description: "Convenient thumb-key shortcut" },
  { spec: "mod+h", label: "Hide UI (⌘H / Ctrl+H)", description: "Familiar hide hotkey" },
  { spec: "mod+shift+f", label: "Focus (⌘⇧F / Ctrl+Shift+F)", description: "Distraction-free focus mode" },
]

export const HIDE_MOUSE_PRESETS: KeybindPreset[] = [
  { spec: "alt+m", label: "Alt + M (Default)", description: "Convenient thumb toggle" },
  { spec: "mod+shift+m", label: "⌘⇧M / Ctrl+Shift+M", description: "Standard hide mouse shortcut" },
  { spec: "m", label: "Single Key (M)", description: "Fast one-key mouse toggle" },
  { spec: "f10", label: "Function Key (F10)", description: "Clean spectator key" },
  { spec: "alt+c", label: "Alt + C", description: "Clean cursor toggle" },
]

export function matchesKeybind(e: KeyboardEvent, spec: string): boolean {
  if (!spec || typeof spec !== "string") return false
  const parts = spec.toLowerCase().split("+").map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return false

  const wantsMod = parts.includes("mod")
  const wantsCtrl = parts.includes("ctrl")
  const wantsAlt = parts.includes("alt")
  const wantsShift = parts.includes("shift")

  const mac = isMac()

  if (wantsMod) {
    const hasMod = mac ? e.metaKey : (e.ctrlKey || e.metaKey)
    if (!hasMod) return false
  } else if (wantsCtrl) {
    if (!e.ctrlKey) return false
  } else {
    if (e.ctrlKey || e.metaKey) return false
  }

  if (wantsAlt !== Boolean(e.altKey)) return false
  if (wantsShift !== Boolean(e.shiftKey)) return false

  const keyPart = parts.find((p) => p !== "mod" && p !== "ctrl" && p !== "alt" && p !== "shift")
  if (!keyPart) return false

  const eKey = e.key ? e.key.toLowerCase() : ""
  const eCode = e.code ? e.code.toLowerCase() : ""

  if (keyPart === "\\" || keyPart === "backslash") {
    return eKey === "\\" || eCode === "backslash"
  }
  if (keyPart === "/" || keyPart === "slash") {
    return eKey === "/" || eCode === "slash"
  }
  if (keyPart === "space") {
    return eKey === " " || eCode === "space"
  }
  if (keyPart === "esc" || keyPart === "escape") {
    return eKey === "escape" || eCode === "escape"
  }
  if (keyPart.startsWith("f") && !isNaN(Number(keyPart.slice(1)))) {
    return eKey === keyPart || eCode === keyPart
  }
  if (keyPart.length === 1) {
    return eKey === keyPart || eCode === `key${keyPart}` || eCode === `digit${keyPart}`
  }

  return eKey === keyPart || eCode === keyPart
}

export function eventToKeybindSpec(e: KeyboardEvent): string | null {
  const rawKey = e.key
  if (!rawKey || ["Control", "Shift", "Alt", "Meta"].includes(rawKey)) {
    return null
  }

  const parts: string[] = []
  const mac = isMac()

  if (e.metaKey || (e.ctrlKey && !mac)) {
    parts.push("mod")
  } else if (e.ctrlKey) {
    parts.push("ctrl")
  }

  if (e.altKey) {
    parts.push("alt")
  }

  if (e.shiftKey) {
    parts.push("shift")
  }

  let keyName = rawKey.toLowerCase()
  if (rawKey === "\\") keyName = "\\"
  else if (rawKey === "/") keyName = "/"
  else if (rawKey === " ") keyName = "space"
  else if (rawKey === "Escape") keyName = "escape"
  else if (e.code && e.code.startsWith("Key") && e.code.length === 4) {
    keyName = e.code.slice(3).toLowerCase()
  } else if (e.code && e.code.startsWith("Digit") && e.code.length === 6) {
    keyName = e.code.slice(5)
  } else if (e.code && e.code.toLowerCase().startsWith("f") && !isNaN(Number(e.code.slice(1)))) {
    keyName = e.code.toLowerCase()
  }

  parts.push(keyName)
  return parts.join("+")
}

export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Tools",
    rows: [
      { keys: ["v"], label: "Select" },
      { keys: ["r"], label: "Rectangle" },
      { keys: ["o"], label: "Ellipse" },
      { keys: ["p"], label: "Draw" },
      { keys: ["t"], label: "Text" },
      { keys: ["l"], label: "Line" },
      { keys: ["shift+l", "a"], label: "Arrow" },
      { keys: ["c"], label: "Components panel" },
      { keys: ["b"], label: "Blocks panel" },
    ],
  },
  {
    title: "Edit",
    rows: [
      { keys: ["mod+z"], label: "Undo" },
      { keys: ["mod+shift+z"], label: "Redo" },
      { keys: ["mod+d", "alt+drag"], label: "Duplicate" },
      { keys: ["mod+d"], label: "Duplicate again, same gap" },
      { keys: ["mod+c"], label: "Copy" },
      { keys: ["mod+shift+c"], label: "Copy as PNG" },
      { keys: ["mod+x"], label: "Cut" },
      { keys: ["mod+v"], label: "Paste at cursor" },
      { keys: ["mod+shift+v"], label: "Paste in place" },
      { keys: ["mod+a"], label: "Select all" },
      { keys: ["del"], label: "Delete" },
      { keys: ["esc"], label: "Deselect" },
    ],
  },
  {
    title: "Group",
    rows: [
      { keys: ["mod+g"], label: "Group" },
      { keys: ["mod+shift+g"], label: "Ungroup / detach" },
      { keys: ["alt+mod+b"], label: "Detach instance" },
      { keys: ["mod+click"], label: "Select inside a group" },
      { keys: ["double-click"], label: "Step into a group" },
    ],
  },
  {
    title: "Arrange",
    rows: [
      { keys: ["mod+]"], label: "Bring forward" },
      { keys: ["mod+["], label: "Send backward" },
      { keys: ["far+]", "]"], label: "Bring to front" },
      { keys: ["far+[", "["], label: "Send to back" },
      { keys: ["shift+h"], label: "Flip horizontal" },
      { keys: ["shift+v"], label: "Flip vertical" },
      { keys: ["←↑→↓"], label: "Nudge" },
      { keys: ["shift+←↑→↓"], label: "Nudge further" },
    ],
  },
  {
    title: "Text",
    rows: [
      { keys: ["mod+b"], label: "Bold" },
      { keys: ["mod+i"], label: "Italic" },
      { keys: ["mod+u"], label: "Underline" },
      { keys: ["mod+k"], label: "Link selected text" },
      { keys: ["enter", "double-click"], label: "Edit text" },
    ],
  },
  {
    title: "View",
    rows: [
      { keys: ["mod+plus"], label: "Zoom in" },
      { keys: ["mod+-"], label: "Zoom out" },
      { keys: ["shift+0"], label: "Zoom to 100%" },
      { keys: ["shift+1"], label: "Fit all content" },
      { keys: ["shift+2"], label: "Zoom to selection" },
      { keys: ["mod+0"], label: "Reset zoom" },
      { keys: ["home"], label: "Go to Home View" },
      { keys: ["shift+home"], label: "Set current view as Home" },
      { keys: ["space drag"], label: "Pan" },
      { keys: ["mod+\\"], label: "Hide the interface" },
      { keys: ["mod+shift+t"], label: "Toggle top toolbar" },
      { keys: ["mod+shift+d"], label: "Toggle bottom dock" },
    ],
  },
  {
    title: "Files",
    rows: [
      { keys: ["mod+s"], label: "Save to this browser" },
      { keys: ["mod+shift+s"], label: "Export a copy" },
    ],
  },
  {
    title: "Everything else",
    rows: [
      { keys: ["mod+k", "mod+/"], label: "Search everything" },
      { keys: ["shift+/"], label: "This list" },
    ],
  },
]
