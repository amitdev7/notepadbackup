// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Dataset Generator & Mouse Dynamics Augmenter
// Generates realistic mouse/pen augmented sketches and splits into Train/Val/Test
// ---------------------------------------------------------------------------

import type { Point } from "./types"
import { rasterizeStrokesToTensor, CNN_INPUT_SIZE } from "./cnn-rasterizer"
import {
  getHandwritingArchetypes,
  HANDWRITING_CLASSES,
  getGeometryArchetypes,
  GEOMETRY_CLASSES,
  getObjectArchetypes,
  OBJECT_CLASSES,
} from "./dataset-archetypes"

export interface AugmentedSample {
  strokes: Point[][]
  tensor: Float32Array // [1024] = 32 * 32
  label: string
  classIndex: number
  split: "train" | "val" | "test"
}

export interface AugmentConfig {
  jitterAmount?: number // 0 to 2.5 pixels
  rotationRangeDeg?: number // -20 to +20 degrees
  scaleRangeX?: [number, number] // [0.8, 1.25]
  scaleRangeY?: [number, number] // [0.8, 1.25]
  strokeWidthRange?: [number, number] // [1.8, 2.8]
  incompleteClosureProb?: number // 0.15
  cornerOvershootProb?: number // 0.20
}

/**
 * Pseudo-random generator with deterministic seed for reproducibility
 */
export class SeededRNG {
  private s: number

  constructor(seed = 42) {
    this.s = seed % 2147483647
    if (this.s <= 0) this.s += 2147483646
  }

  next(): number {
    this.s = (this.s * 16807) % 2147483647
    return (this.s - 1) / 2147483646
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }
}

/**
 * Applies realistic mouse & pen dynamics to a set of raw vector strokes
 */
export function augmentStrokes(
  strokes: Point[][],
  rng: SeededRNG,
  cfg: AugmentConfig = {}
): { strokes: Point[][]; strokeWidth: number } {
  const jitterAmount = cfg.jitterAmount ?? 1.2
  const maxRotRad = ((cfg.rotationRangeDeg ?? 18) * Math.PI) / 180
  const rotAngle = rng.range(-maxRotRad, maxRotRad)
  const scaleX = rng.range(cfg.scaleRangeX?.[0] ?? 0.85, cfg.scaleRangeX?.[1] ?? 1.18)
  const scaleY = rng.range(cfg.scaleRangeY?.[0] ?? 0.85, cfg.scaleRangeY?.[1] ?? 1.18)
  const strokeWidth = rng.range(cfg.strokeWidthRange?.[0] ?? 1.9, cfg.strokeWidthRange?.[1] ?? 2.6)

  // Compute centroid
  let sumX = 0
  let sumY = 0
  let totalPts = 0
  for (const s of strokes) {
    for (const [px, py] of s) {
      sumX += px
      sumY += py
      totalPts++
    }
  }
  const cx = totalPts > 0 ? sumX / totalPts : 25
  const cy = totalPts > 0 ? sumY / totalPts : 25

  const cosTh = Math.cos(rotAngle)
  const sinTh = Math.sin(rotAngle)

  const augmented: Point[][] = []

  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    const newStroke: Point[] = []

    for (let i = 0; i < stroke.length; i++) {
      const [px, py] = stroke[i]

      // 1. Center relative
      const dx = (px - cx) * scaleX
      const dy = (py - cy) * scaleY

      // 2. Rotate
      const rx = dx * cosTh - dy * sinTh
      const ry = dx * sinTh + dy * cosTh

      // 3. Mouse hand tremor / jitter
      const jx = rng.range(-jitterAmount, jitterAmount)
      const jy = rng.range(-jitterAmount, jitterAmount)

      // 4. Corner overshoot at endpoints (simulating hurried mouse gestures)
      let ox = 0
      let oy = 0
      if ((i === 0 || i === stroke.length - 1) && rng.next() < (cfg.cornerOvershootProb ?? 0.18)) {
        ox = rng.range(-2.5, 2.5)
        oy = rng.range(-2.5, 2.5)
      }

      newStroke.push([cx + rx + jx + ox, cy + ry + jy + oy])
    }

    // Occasional stroke drop / incomplete closure for near-closed loops
    if (newStroke.length > 8 && rng.next() < (cfg.incompleteClosureProb ?? 0.12)) {
      newStroke.splice(newStroke.length - 2, 2)
    }

    augmented.push(newStroke)
  }

  return { strokes: augmented, strokeWidth }
}

/**
 * Generates a full dataset for a given category ("handwriting", "geometry", "object")
 * with a clean 70% Train, 15% Validation, 15% Test split.
 */
export function generateDataset(
  category: "handwriting" | "geometry" | "object",
  samplesPerClass = 30,
  seed = 1337
): {
  train: AugmentedSample[]
  val: AugmentedSample[]
  test: AugmentedSample[]
  classes: string[]
} {
  const rng = new SeededRNG(seed)

  let classes: string[]
  let getArchetypes: (name: string) => Point[][][]

  if (category === "handwriting") {
    classes = HANDWRITING_CLASSES
    getArchetypes = getHandwritingArchetypes
  } else if (category === "geometry") {
    classes = GEOMETRY_CLASSES
    getArchetypes = getGeometryArchetypes
  } else {
    classes = OBJECT_CLASSES
    getArchetypes = getObjectArchetypes
  }

  const train: AugmentedSample[] = []
  const val: AugmentedSample[] = []
  const test: AugmentedSample[] = []

  for (let cIdx = 0; cIdx < classes.length; cIdx++) {
    const clsName = classes[cIdx]
    const archetypes = getArchetypes(clsName)

    for (let s = 0; s < samplesPerClass; s++) {
      // Rotate through archetypes for variety
      const baseStrokes = archetypes[s % archetypes.length]

      // Train / Val / Test assignment
      let split: "train" | "val" | "test"
      const r = rng.next()
      if (r < 0.70) {
        split = "train"
      } else if (r < 0.85) {
        split = "val"
      } else {
        split = "test"
      }

      const { strokes, strokeWidth } = augmentStrokes(baseStrokes, rng, {
        jitterAmount: split === "train" ? 1.4 : 0.9,
        rotationRangeDeg: split === "train" ? 18 : 12,
        scaleRangeX: [0.82, 1.22],
        scaleRangeY: [0.82, 1.22],
        strokeWidthRange: [1.9, 2.6],
      })

      const raster = rasterizeStrokesToTensor(strokes, CNN_INPUT_SIZE, strokeWidth)

      const sample: AugmentedSample = {
        strokes,
        tensor: raster.data,
        label: clsName,
        classIndex: cIdx,
        split,
      }

      if (split === "train") train.push(sample)
      else if (split === "val") val.push(sample)
      else test.push(sample)
    }
  }

  return { train, val, test, classes }
}
