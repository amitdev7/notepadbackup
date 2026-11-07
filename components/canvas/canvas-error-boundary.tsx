"use client"

// ---------------------------------------------------------------------------
// Zenithsui Localized Canvas Error Boundary
//
// Prevents isolated runtime exceptions in floating toolbars, third-party embeds,
// or interactive component nodes from crashing the root application or triggering
// app/error.tsx.
// ---------------------------------------------------------------------------

import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { WarningCircle, ArrowCounterClockwise } from "@phosphor-icons/react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[Zenithsui CanvasErrorBoundary] Caught error in ${this.props.name || "Canvas Subtree"}:`,
      error,
      errorInfo
    )
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }

      if (this.props.name === "Workspace Canvas") {
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
            <div className="max-w-md w-full p-6 rounded-2xl border border-border/80 bg-card/90 shadow-2xl text-center space-y-4">
              <div className="size-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <WarningCircle size={28} weight="fill" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Canvas Temporarily Interrupted</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  A transient error occurred while drawing the canvas workspace. Your documents and files are preserved.
                </p>
                {this.state.error?.message && (
                  <p className="font-mono text-[11px] text-red-500 bg-red-500/10 rounded-lg p-2 mt-2 break-words">
                    {this.state.error.message}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowCounterClockwise size={14} weight="bold" />
                  Resume Canvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.clear()
                      localStorage.removeItem("zenithsui-selection")
                    } catch {}
                    this.handleReset()
                  }}
                  className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear Selection & Resume
                </button>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="p-3 m-2 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-3 shadow-lg select-none pointer-events-auto">
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-red-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-[11px]">
                {this.props.name || "Element"} encountered an issue
              </span>
              <span className="text-[10px] text-red-500/80 font-mono truncate max-w-[220px]">
                {this.state.error?.message || "Render error"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowCounterClockwise size={12} weight="bold" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
