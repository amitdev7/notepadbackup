"use client"

// ---------------------------------------------------------------------------
// Zenithsui Liquid Glass 2.0 Live Playground & Customizer
// Interactive optical surface showcasing @ybouane/liquidglass WebGL shader physics
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useShellStore } from "@/lib/shell-store"
import {
  LIQUID_GLASS_PRESETS,
  type LiquidGlassPresetId,
} from "@/lib/liquidglass/types"
import { LiquidGlassSurface } from "@/components/ui/liquid-glass-surface"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Sparkle,
  Sliders,
  Drop,
  SunHorizon,
  ArrowsClockwise,
  Check,
} from "@phosphor-icons/react"

export function LiquidGlassSettingsSection() {
  const liquidPrefs = useShellStore((s) => s.preferences.liquidGlassSettings)
  const updateLiquidPrefs = useShellStore((s) => s.updateLiquidGlassPreferences)

  const activePreset = liquidPrefs.preset || "apple-hig"

  const handleSelectPreset = (presetId: LiquidGlassPresetId) => {
    const preset = LIQUID_GLASS_PRESETS[presetId]
    if (!preset) return
    updateLiquidPrefs({
      preset: presetId,
      refraction: preset.config.refraction ?? 0.45,
      chromAberration: preset.config.chromAberration ?? 0.04,
      specular: preset.config.specular ?? 0.35,
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Main Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              Liquid Glass Optical Materials (2.0)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              WebGL Shader
            </span>
          </div>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            Physical glass refraction, chromatic aberration dispersion, and Blinn-Phong specular glints
          </span>
        </div>
        <Switch
          checked={liquidPrefs.enabled}
          onCheckedChange={(checked) => updateLiquidPrefs({ enabled: checked })}
          aria-label="Toggle Liquid Glass materials"
        />
      </div>

      {liquidPrefs.enabled && (
        <>
          {/* 2. Interactive Live Visualizer Pod */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-border/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Sparkle size={14} className="text-[#007AFF]" weight="fill" />
                Live Optical Glass Preview
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                Hover to trace light reflection
              </span>
            </div>

            {/* Simulated background with rich visual grid */}
            <div className="relative rounded-xl p-5 overflow-hidden bg-gradient-to-tr from-amber-500/20 via-sky-500/20 to-rose-500/20 border border-stone-200/50 dark:border-stone-700/50 flex items-center justify-center min-h-[140px]">
              {/* Background Napkin Sketch Grid Pattern */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
                    linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Floating Liquid Glass Lens */}
              <LiquidGlassSurface
                preset={activePreset}
                options={{
                  refraction: liquidPrefs.refraction,
                  chromAberration: liquidPrefs.chromAberration,
                  specular: liquidPrefs.specular,
                }}
                enableInteractiveSheen={liquidPrefs.interactiveSheen}
                className="px-6 py-4 rounded-2xl cursor-pointer max-w-sm text-center select-none shadow-2xl"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-sm mb-1">
                    <Drop size={18} weight="fill" />
                  </div>
                  <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                    {LIQUID_GLASS_PRESETS[activePreset]?.name ?? "Liquid Glass"}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                    Refraction: {(liquidPrefs.refraction * 100).toFixed(0)}% · Chromatic: {(liquidPrefs.chromAberration * 100).toFixed(0)}%
                  </span>
                </div>
              </LiquidGlassSurface>
            </div>
          </div>

          {/* 3. Preset Gallery */}
          <div className="space-y-2.5">
            <label className="font-semibold text-xs text-stone-900 dark:text-stone-100 block">
              Curated Material Profiles
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.values(LIQUID_GLASS_PRESETS).map((preset) => {
                const isSelected = activePreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={cn(
                      "flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden",
                      isSelected
                        ? "border-[#007AFF] bg-blue-50/60 dark:bg-blue-950/40 shadow-xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white/40 dark:bg-stone-900/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check size={14} weight="bold" className="text-[#007AFF]" />
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Fine-Tuning Sliders */}
          <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/40 dark:bg-stone-900/40 space-y-4">
            <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 block">
              Optical Physics Fine-Tuning
            </span>

            {/* Refraction Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <Drop size={13} className="text-[#007AFF]" />
                  Refraction Index / Power
                </span>
                <span className="font-mono text-[11px] text-stone-500">
                  {(liquidPrefs.refraction * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={liquidPrefs.refraction}
                onChange={(e) =>
                  updateLiquidPrefs({ refraction: parseFloat(e.target.value) })
                }
                className="w-full accent-[#007AFF] cursor-pointer"
              />
            </div>

            {/* Chromatic Aberration Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <Sparkle size={13} className="text-indigo-500" />
                  Chromatic Dispersion Fringe
                </span>
                <span className="font-mono text-[11px] text-stone-500">
                  {(liquidPrefs.chromAberration * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.2"
                step="0.01"
                value={liquidPrefs.chromAberration}
                onChange={(e) =>
                  updateLiquidPrefs({
                    chromAberration: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#007AFF] cursor-pointer"
              />
            </div>

            {/* Specular Glint Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <SunHorizon size={13} className="text-amber-500" />
                  Blinn-Phong Specular Arc
                </span>
                <span className="font-mono text-[11px] text-stone-500">
                  {(liquidPrefs.specular * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={liquidPrefs.specular}
                onChange={(e) =>
                  updateLiquidPrefs({ specular: parseFloat(e.target.value) })
                }
                className="w-full accent-[#007AFF] cursor-pointer"
              />
            </div>

            {/* Interactive Pointer Sheen Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-800/50">
              <div>
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200 block">
                  Mouse-Tracking Specular Sheen
                </span>
                <span className="text-[10px] text-stone-500">
                  Dynamically moves the key light across the glass surface as you move your pointer
                </span>
              </div>
              <Switch
                checked={liquidPrefs.interactiveSheen}
                onCheckedChange={(checked) =>
                  updateLiquidPrefs({ interactiveSheen: checked })
                }
                aria-label="Toggle mouse-tracking specular sheen"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
