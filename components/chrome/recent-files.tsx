"use client"

// ---------------------------------------------------------------------------
// The recent files submenu. Everything zenithsui has saved in this browser, newest
// first — click one to open it, or arm the trash twice to let it go. Deleting
// takes two clicks on purpose: this list is the only copy.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { relativeTime, type FileMeta } from "@/lib/files"
import { CheckIcon, TrashIcon, CloudIcon, HardDriveIcon } from "@phosphor-icons/react"
import { getDatabase } from "@/lib/database"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

/** past this the menu would be a scroll, and old files are the drawer's job */
const SHOWN = 10
/** how long the trash stays armed before it forgets you meant it */
const ARM_MS = 3000

export function RecentFiles() {
  const localFiles = useSquig((s) => s.files)
  const dbFiles = useSquig((s) => s.dbFiles)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const docId = useSquig((s) => s.docId)
  const connectedDb = selectedDbId ? getDatabase(selectedDbId) : null

  const hasDbFiles = selectedDbId && dbFiles.length > 0
  const hasLocalFiles = localFiles.length > 0
  const isEmpty = !hasDbFiles && !hasLocalFiles

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Open recent</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-72 max-h-[70vh] overflow-y-auto">
        {isEmpty ? (
          <p className="px-2.5 py-1.5 text-row text-muted-foreground">nothing saved yet</p>
        ) : (
          <>
            {/* Database shared files if connected */}
            {selectedDbId && (
              <>
                <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  <CloudIcon size={12} weight="bold" />
                  <span className="truncate">{connectedDb?.name ?? "Database"}</span>
                </div>
                {dbFiles.length === 0 ? (
                  <p className="px-2.5 py-1 text-label text-muted-foreground">no shared files yet</p>
                ) : (
                  dbFiles.slice(0, SHOWN).map((f) => (
                    <FileRow key={`db-${f.id}`} file={f} current={f.id === docId} dbId={selectedDbId} />
                  ))
                )}
                {hasLocalFiles && <DropdownMenuSeparator />}
              </>
            )}

            {/* Local files */}
            {hasLocalFiles && (
              <>
                {selectedDbId && (
                  <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                    <HardDriveIcon size={12} weight="bold" />
                    <span>Local Files</span>
                  </div>
                )}
                {localFiles.slice(0, SHOWN).map((f) => (
                  <FileRow key={`local-${f.id}`} file={f} current={f.id === docId} />
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function FileRow({
  file,
  current,
  dbId,
}: {
  file: FileMeta
  current: boolean
  dbId?: string
}) {
  const st = useSquig.getState
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const arm = () => {
    setArmed(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), ARM_MS)
  }

  return (
    <div className="group/row relative flex items-center">
      <DropdownMenuItem
        className="flex-1 gap-2 pr-8"
        onClick={() => st().openFile(file.id, dbId)}
      >
        {current && <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" weight="bold" />}
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className={`shrink-0 text-label ${armed ? "text-destructive" : "text-muted-foreground"}`}>
          {armed ? "click again" : relativeTime(file.updatedAt)}
        </span>
      </DropdownMenuItem>
      {!current && (
        <button
          type="button"
          aria-label={armed ? `delete ${file.name} for good` : `delete ${file.name}`}
          title={armed ? "click again to delete" : "delete"}
          onClick={() => (armed ? st().deleteFile(file.id, dbId) : arm())}
          className={`absolute right-1.5 flex size-6 items-center justify-center rounded-chrome-sm transition-opacity ${
            armed
              ? "text-destructive opacity-100"
              : "text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <TrashIcon className="size-3.5" weight={armed ? "fill" : "regular"} />
        </button>
      )}
    </div>
  )
}
