"use client"

import { useState, useMemo } from "react"
import { useSquig } from "@/lib/store"
import {
  tryParseSpreadsheet,
  renderBarChart,
  renderLineChart,
  renderRadarChart,
  type ChartType,
} from "@/lib/excalidraw/charts"
import { ChartBar, ChartLine, Compass, X, Sparkle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const SAMPLE_DATA: Record<ChartType, string> = {
  bar: `Category\tSales\tProfit
Q1\t45\t15
Q2\t70\t28
Q3\t85\t35
Q4\t110\t52`,
  line: `Month\tUsers\tRevenue
Jan\t20\t12
Feb\t35\t22
Mar\t60\t45
Apr\t80\t65
May\t95\t88`,
  radar: `Subject\tStudent A\tStudent B
Math\t90\t75
Physics\t85\t80
Chemistry\t70\t88
Biology\t65\t92
English\t95\t70`,
}

export function ChartDialog() {
  const open = useSquig((s) => s.chartDialogOpen)
  const setOpen = useSquig((s) => s.setChartDialogOpen)
  const addNodes = useSquig((s) => s.addNodes)
  const setSelection = useSquig((s) => s.setSelection)
  const viewport = useSquig((s) => s.viewport)
  const setNotice = useSquig((s) => s.setNotice)

  const [chartType, setChartType] = useState<ChartType>("bar")
  const [dataText, setDataText] = useState(SAMPLE_DATA.bar)

  const handleTabChange = (type: ChartType) => {
    setChartType(type)
    setDataText(SAMPLE_DATA[type])
  }

  const parsed = useMemo(() => {
    return tryParseSpreadsheet(dataText)
  }, [dataText])

  if (!open) return null

  const handleInsert = () => {
    if (!parsed.ok) return

    // Position around canvas center
    const cx = Math.round((-viewport.x + window.innerWidth / 2) / viewport.zoom)
    const cy = Math.round((-viewport.y + window.innerHeight / 2) / viewport.zoom)

    let createdNodes = []
    if (chartType === "bar") {
      createdNodes = renderBarChart(parsed.data, cx - 200, cy + 100)
    } else if (chartType === "line") {
      createdNodes = renderLineChart(parsed.data, cx - 200, cy + 100)
    } else {
      createdNodes = renderRadarChart(parsed.data, cx, cy)
    }

    if (createdNodes.length > 0) {
      addNodes(createdNodes)
      setSelection(createdNodes.map((n) => n.id))
      setNotice(`Inserted ${chartType.toUpperCase()} chart (${createdNodes.length} elements)`)
    }

    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-popover-enter">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-[#1C1C1F] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ChartBar size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Insert Hand-Drawn Chart</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Convert spreadsheet or table data into canvas elements</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/50">
            <button
              onClick={() => handleTabChange("bar")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                chartType === "bar"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              <ChartBar size={14} /> Bar Chart
            </button>
            <button
              onClick={() => handleTabChange("line")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                chartType === "line"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              <ChartLine size={14} /> Line Chart
            </button>
            <button
              onClick={() => handleTabChange("radar")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                chartType === "radar"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              <Compass size={14} /> Radar Chart
            </button>
          </div>

          {/* Data Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Table Data (TSV, CSV, or pasted Excel / Sheets)
              </label>
              <button
                onClick={() => setDataText(SAMPLE_DATA[chartType])}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sparkle size={10} /> Reset Sample
              </button>
            </div>
            <textarea
              value={dataText}
              onChange={(e) => setDataText(e.target.value)}
              rows={7}
              placeholder="Paste spreadsheet columns..."
              className="w-full p-3 font-mono text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Validation Feedback */}
          {parsed.ok ? (
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
              <div className="font-semibold flex items-center gap-1.5">
                <span>✓ Valid Data Detected:</span>
                <span className="font-normal">
                  {parsed.data.series.length} series, {parsed.data.series[0]?.values.length || 0} categories
                  {parsed.data.title && ` ("${parsed.data.title}")`}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
              ⚠️ Unable to parse table data: {parsed.reason}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/30">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-medium rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!parsed.ok}
            onClick={handleInsert}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            Insert Chart onto Canvas
          </button>
        </div>
      </div>
    </div>
  )
}
