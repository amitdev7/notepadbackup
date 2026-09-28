"use client"

// ---------------------------------------------------------------------------
// Left rail — narrow strip of tool icons. Components/Blocks open the panel.
// ---------------------------------------------------------------------------

import {
  CursorIcon,
  PencilSimple as PencilSimpleIcon,
  TextT as TextTIcon,
  BlueprintIcon,
  StackIcon,
  FileTextIcon,
  SparkleIcon,
  ChalkboardTeacherIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react"
import { useZenithAI } from "@/lib/ai/ai-store"
import { useSquig } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Panel } from "@/components/ui/panel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function RailButton({
  active,
  label,
  hotkey,
  onClick,
  icon: Icon,
}: {
  active: boolean
  label: string
  hotkey?: string
  onClick: () => void
  icon: PhosphorIcon
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex size-ctl-lg items-center justify-center rounded-chrome-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--sq-ink)]/40",
          active
            ? "bg-[var(--sq-ink)] text-[var(--sq-paper)]"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="size-[18px]" weight={active ? "fill" : "regular"} />
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {label}
        {hotkey && (
          <kbd className="rounded-chrome-xs bg-muted px-1 font-mono text-micro text-muted-foreground">{hotkey}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function LeftRail() {
  const tool = useSquig((s) => s.tool)
  const panel = useSquig((s) => s.panel)
  const selection = useSquig((s) => s.selection)
  const pagePanel = useSquig((s) => s.pagePanel)
  const isPdfClassroomActive = useSquig((s) => s.activePdfModalNodeId !== null)
  const isZenithAIOpen = useZenithAI((s) => s.isOpen)
  const st = useSquig.getState

  const empty = selection.length === 0
  const isPageActive = empty && pagePanel

  return (
    // one shared delay for the whole rail: skimming across the tools after the
    // first tooltip shows the rest instantly, which is the point of grouping
    <TooltipProvider delay={400} closeDelay={80}>
      <Panel className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2 flex-row md:translate-x-0 md:bottom-auto md:top-1/2 md:left-3 md:-translate-y-1/2 md:flex-col gap-1 p-1 sm:p-1.5 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar shadow-panel">
        <RailButton
          active={tool === "select" && !panel}
          label="Select"
          hotkey="V"
          icon={CursorIcon}
          onClick={() => st().setTool("select")}
        />
        <RailButton
          active={tool === "draw" && !panel}
          label="Draw (Pencil & Pen)"
          hotkey="D"
          icon={PencilSimpleIcon}
          onClick={() => {
            st().setTool("draw")
            st().setPanel(null)
          }}
        />
        <RailButton
          active={tool === "text" && !panel}
          label="Text"
          hotkey="T"
          icon={TextTIcon}
          onClick={() => {
            st().setTool("text")
            st().setPanel(null)
          }}
        />
        <RailButton
          active={panel === "components"}
          label="Components"
          hotkey="C"
          icon={BlueprintIcon}
          onClick={() => st().setPanel("components")}
        />
        <RailButton
          active={panel === "blocks"}
          label="Blocks & templates"
          hotkey="B"
          icon={StackIcon}
          onClick={() => st().setPanel("blocks")}
        />
        <RailButton
          active={isPageActive}
          label="Page (Tools, Shapes, Colors & Styles)"
          hotkey="P"
          icon={FileTextIcon}
          onClick={() => {
            if (selection.length > 0) {
              st().selectNone()
              st().setPagePanel(true)
            } else {
              st().togglePagePanel()
            }
          }}
        />
        <div className="hidden md:block mx-1 my-0.5 h-px bg-border" />
        <div className="md:hidden mx-0.5 my-1 w-px self-stretch bg-border" />
        <RailButton
          active={isPdfClassroomActive}
          label="PDF Classroom & Smart Board"
          hotkey="⌘⇧P"
          icon={ChalkboardTeacherIcon}
          onClick={() => useSquig.getState().openClassroom()}
        />
        <RailButton
          active={isZenithAIOpen}
          label="Zenith AI — Study Copilot"
          hotkey="⌘J"
          icon={SparkleIcon}
          onClick={() => useZenithAI.getState().toggleOpen()}
        />
      </Panel>
    </TooltipProvider>
  )
}

