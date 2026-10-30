"use client"

// ---------------------------------------------------------------------------
// Zenithsui View Menu — Complete macOS-Inspired Viewport & Home View Controller
// ---------------------------------------------------------------------------

import { useSquig } from "@/lib/store"
import { kbd } from "@/lib/shortcuts"
import type { CanvasOpenMode } from "@/lib/types"
import { areViewportsEqual } from "@/lib/canvas/viewport-memory"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CaretDown,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CornersOut,
  House,
  BookmarkSimple,
  Trash,
  Check,
  Compass,
  ArrowClockwise,
} from "@phosphor-icons/react"

export function ViewMenu() {
  const viewport = useSquig((s) => s.viewport)
  const viewState = useSquig((s) => s.viewState)
  const zoomBy = useSquig((s) => s.zoomBy)
  const zoomTo100 = useSquig((s) => s.zoomTo100)
  const zoomToFit = useSquig((s) => s.zoomToFit)
  const setHomeView = useSquig((s) => s.setHomeView)
  const goToHomeView = useSquig((s) => s.goToHomeView)
  const clearHomeView = useSquig((s) => s.clearHomeView)
  const setOpenMode = useSquig((s) => s.setOpenMode)
  const resetViewport = useSquig((s) => s.resetViewport)

  const zoomPercent = Math.round(viewport.zoom * 100)
  const hasHomeView = Boolean(viewState?.homeView)
  const homeZoomPercent = hasHomeView && viewState.homeView ? Math.round(viewState.homeView.zoom * 100) : null
  const openMode = viewState?.openMode || "last-view"

  const isAtHomeView = Boolean(hasHomeView && viewState?.homeView && areViewportsEqual(viewport, viewState.homeView))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          "group tactile-press flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full outline-none transition-all duration-150 cursor-pointer select-none",
          "hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 text-stone-800 dark:text-stone-200"
        )}
        title="Canvas View & Viewport Memory (Home View)"
        aria-label={`View menu, current zoom ${zoomPercent}%`}
      >
        <div className="relative flex items-center justify-center">
          <Compass size={14} className="text-stone-500 dark:text-stone-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
          {hasHomeView && (
            <span
              className={cn(
                "absolute -top-1 -right-1 size-2 rounded-full border border-white dark:border-stone-900 transition-colors",
                isAtHomeView ? "bg-emerald-500" : "bg-blue-500"
              )}
              title={isAtHomeView ? "Currently at saved Home View" : "Home View saved"}
            />
          )}
        </div>
        <span className="hidden xs:inline">View</span>
        <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 font-semibold">
          {zoomPercent}%
        </span>
        <CaretDown size={10} className="text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform duration-150" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-68 p-1.5 font-sans">
        {/* Status Header */}
        <div className="flex items-center justify-between px-2.5 py-2 mb-1 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200/50 dark:border-stone-700/50">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-wider uppercase text-stone-400 dark:text-stone-500">
              CANVAS VIEW
            </span>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
              Current: {zoomPercent}%
            </span>
          </div>

          <div className="flex items-center gap-1">
            {hasHomeView ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium shadow-2xs",
                  isAtHomeView
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                )}
                title={isAtHomeView ? "Viewport matches Home View" : "Saved Home View"}
              >
                {isAtHomeView ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    At Home ({homeZoomPercent}%)
                  </>
                ) : (
                  <>
                    <House size={10} weight="fill" />
                    Home: {homeZoomPercent}%
                  </>
                )}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] text-stone-400 bg-stone-200/50 dark:bg-stone-700/50">
                No Home View
              </span>
            )}
          </div>
        </div>

        {/* Canvas Navigation */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Canvas Navigation</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => zoomBy(1.25)}>
            <MagnifyingGlassPlus size={14} className="text-stone-500" />
            <span>Zoom In</span>
            <DropdownMenuShortcut>{kbd("mod+plus")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => zoomBy(1 / 1.25)}>
            <MagnifyingGlassMinus size={14} className="text-stone-500" />
            <span>Zoom Out</span>
            <DropdownMenuShortcut>{kbd("mod+-")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={resetViewport}>
            <ArrowClockwise size={14} className="text-stone-500" />
            <span>Reset Zoom (100%)</span>
            <DropdownMenuShortcut>{kbd("mod+0")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={zoomToFit}>
            <CornersOut size={14} className="text-stone-500" />
            <span>Fit All Content</span>
            <DropdownMenuShortcut>{kbd("shift+1")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={goToHomeView}
            disabled={!hasHomeView}
            className={cn(!hasHomeView && "opacity-40 pointer-events-none")}
          >
            <House size={14} className={cn(isAtHomeView ? "text-emerald-500" : "text-stone-500")} weight={hasHomeView ? "bold" : "regular"} />
            <span>Go to Home View</span>
            {hasHomeView && isAtHomeView && (
              <span className="size-1.5 rounded-full bg-emerald-500 ml-1" />
            )}
            <DropdownMenuShortcut>{kbd("home")}</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* View Memory */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>View Memory</DropdownMenuLabel>
          <DropdownMenuItem onClick={setHomeView}>
            <BookmarkSimple size={14} className="text-blue-500" weight="bold" />
            <span>{hasHomeView ? "Update Home to Current View" : "Set Current View as Home"}</span>
            <DropdownMenuShortcut>{kbd("shift+home")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {hasHomeView && (
            <DropdownMenuItem onClick={clearHomeView} variant="destructive">
              <Trash size={14} />
              <span>Clear Home View</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Opening Behavior */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Opening Behavior</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => setOpenMode("last-view")}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">Remember Last View</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Restores last visited position & zoom
              </span>
            </div>
            {openMode === "last-view" && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setOpenMode("home-view")}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">Custom Home View</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Always opens at saved Home View
              </span>
            </div>
            {openMode === "home-view" && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setOpenMode("fit-content")}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">Fit All Content</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Automatically frames all canvas elements
              </span>
            </div>
            {openMode === "fit-content" && <Check size={14} className="text-[#007AFF] shrink-0" weight="bold" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
