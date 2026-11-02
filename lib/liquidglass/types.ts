// ---------------------------------------------------------------------------
// Zenithsui Liquid Glass 2.0 — Architecture & Optical Config
// Adopts the physics-based WebGL shader pipeline from @ybouane/liquidglass
// (Refraction, Chromatic Aberration, Multi-light Specular, Fresnel, Bevel SDF)
// ---------------------------------------------------------------------------

import type { GlassConfig as UpstreamGlassConfig } from "@ybouane/liquidglass"

export interface LiquidGlassOptions {
  /** Blur intensity behind the glass (0 = crystal sharp, 1 = maximum blur) */
  blurAmount?: number
  /** Refraction power bending the background content */
  refraction?: number
  /** Chromatic aberration / wavelength dispersion along refraction boundaries */
  chromAberration?: number
  /** Edge highlight intensity (inner glow & rim lighting) */
  edgeHighlight?: number
  /** Multi-light Blinn-Phong specular glint intensity */
  specular?: number
  /** Fresnel reflection at grazing angles */
  fresnel?: number
  /** Organic micro-distortion noise */
  distortion?: number
  /** Corner radius in pixels */
  cornerRadius?: number
  /** Bevel curvature depth (Z-radius) */
  zRadius?: number
  /** Glass panel transmission opacity */
  opacity?: number
  /** Color saturation boost (-1 = mono, 0 = neutral, 1 = vivid) */
  saturation?: number
  /** Cool glass blue tint factor */
  tintStrength?: number
  /** Brightness adjustment */
  brightness?: number
  /** Two-component shadow opacity */
  shadowOpacity?: number
  /** Shadow spread in pixels */
  shadowSpread?: number
  /** Shadow vertical offset */
  shadowOffsetY?: number
  /** Whether the glass element is draggable */
  floating?: boolean
  /** Whether button hover lift + press compression is enabled */
  button?: boolean
  /** Bevel profile: 0 = biconvex pill (dual refraction), 1 = dome magnifier */
  bevelMode?: 0 | 1
}

export type LiquidGlassPresetId = "apple-hig" | "prismatic" | "dome" | "frosted" | "obsidian"

export interface LiquidGlassPreset {
  id: LiquidGlassPresetId
  name: string
  description: string
  config: LiquidGlassOptions
}

export const LIQUID_GLASS_PRESETS: Record<LiquidGlassPresetId, LiquidGlassPreset> = {
  "apple-hig": {
    id: "apple-hig",
    name: "macOS 27 Liquid Glass",
    description: "Pure Apple HIG biconvex glass with subtle rim light and cold crystal transmission",
    config: {
      blurAmount: 0.12,
      refraction: 0.45,
      chromAberration: 0.04,
      edgeHighlight: 0.28,
      specular: 0.35,
      fresnel: 0.85,
      distortion: 0.0,
      cornerRadius: 24,
      zRadius: 20,
      opacity: 0.94,
      saturation: 0.08,
      tintStrength: 0.04,
      brightness: 0.02,
      shadowOpacity: 0.28,
      shadowSpread: 12,
      shadowOffsetY: 2,
      bevelMode: 0,
    },
  },
  prismatic: {
    id: "prismatic",
    name: "Prismatic Liquid Lens",
    description: "High-refraction fluid optics with vivid chromatic aberration dispersion",
    config: {
      blurAmount: 0.08,
      refraction: 0.72,
      chromAberration: 0.12,
      edgeHighlight: 0.42,
      specular: 0.58,
      fresnel: 1.0,
      distortion: 0.04,
      cornerRadius: 28,
      zRadius: 32,
      opacity: 0.96,
      saturation: 0.15,
      tintStrength: 0.06,
      brightness: 0.04,
      shadowOpacity: 0.35,
      shadowSpread: 16,
      shadowOffsetY: 3,
      bevelMode: 0,
    },
  },
  dome: {
    id: "dome",
    name: "Dome Magnifier",
    description: "Plano-convex optical dome that magnifies elements directly underneath",
    config: {
      blurAmount: 0.0,
      refraction: 0.65,
      chromAberration: 0.06,
      edgeHighlight: 0.32,
      specular: 0.45,
      fresnel: 0.9,
      distortion: 0.0,
      cornerRadius: 36,
      zRadius: 36,
      opacity: 0.98,
      saturation: 0.05,
      tintStrength: 0.02,
      brightness: 0.03,
      shadowOpacity: 0.32,
      shadowSpread: 14,
      shadowOffsetY: 2,
      bevelMode: 1,
    },
  },
  frosted: {
    id: "frosted",
    name: "Frosted Crystal",
    description: "Deep diffusion blur with crisp edge highlights and soft ambient dispersion",
    config: {
      blurAmount: 0.35,
      refraction: 0.25,
      chromAberration: 0.02,
      edgeHighlight: 0.2,
      specular: 0.22,
      fresnel: 0.65,
      distortion: 0.0,
      cornerRadius: 20,
      zRadius: 16,
      opacity: 0.92,
      saturation: 0.04,
      tintStrength: 0.03,
      brightness: 0.01,
      shadowOpacity: 0.22,
      shadowSpread: 10,
      shadowOffsetY: 1,
      bevelMode: 0,
    },
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian Liquid Dark",
    description: "Deep smoke glass with intense specular reflection and subtle blue rim glow",
    config: {
      blurAmount: 0.18,
      refraction: 0.52,
      chromAberration: 0.05,
      edgeHighlight: 0.35,
      specular: 0.6,
      fresnel: 0.95,
      distortion: 0.01,
      cornerRadius: 24,
      zRadius: 24,
      opacity: 0.92,
      saturation: 0.12,
      tintStrength: 0.08,
      brightness: -0.02,
      shadowOpacity: 0.55,
      shadowSpread: 20,
      shadowOffsetY: 4,
      bevelMode: 0,
    },
  },
}

export interface ShellLiquidGlassPreferences {
  enabled: boolean
  preset: LiquidGlassPresetId
  interactiveSheen: boolean
  refraction: number
  chromAberration: number
  specular: number
}

export const DEFAULT_LIQUID_GLASS_PREFERENCES: ShellLiquidGlassPreferences = {
  enabled: true,
  preset: "apple-hig",
  interactiveSheen: true,
  refraction: 0.45,
  chromAberration: 0.04,
  specular: 0.35,
}
