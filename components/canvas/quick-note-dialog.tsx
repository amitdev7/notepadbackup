"use client"

// ---------------------------------------------------------------------------
// Zenithsui Quick Note Dialog
// Completely disabled from showing per user request.
// ---------------------------------------------------------------------------

import type { SquigNode, HoverNote } from "@/lib/types"

export interface QuickNoteDialogProps {
  node: SquigNode | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeId: string, note: HoverNote) => void
  onDeleteNote?: (nodeId: string) => void
}

export function QuickNoteDialog(_props: QuickNoteDialogProps) {
  // Completely disabled from showing
  return null
}
