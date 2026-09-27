// ---------------------------------------------------------------------------
// Specialist Sketch Recognition — SpecialistModel Engine
// Shared specialist framework implementing the per-class contract:
// Input: NormalizedDrawingInput -> Output: SpecialistEvaluationResult
// ---------------------------------------------------------------------------

import type {
  ClassDefinition,
  NormalizedDrawingInput,
  SpecialistEvaluationResult,
} from "./types"
import { getHandwritingArchetypes, getGeometryArchetypes, getObjectArchetypes } from "../dataset-archetypes"
import { rasterizeStrokesTo32x32 } from "../cnn-rasterizer"
import { disambiguateConfusablePair } from "./hard-negatives-matrix"

// Precomputed archetype raster prototypes cache
const PROTOTYPE_CACHE = new Map<string, Float32Array[]>()

function getArchetypeRasters(targetClass: string, family: string): Float32Array[] {
  const cacheKey = `${family}:${targetClass}`
  const cached = PROTOTYPE_CACHE.get(cacheKey)
  if (cached) return cached

  let strokeSets: [number, number][][][] = []
  if (family === "letter" || family === "digit") {
    strokeSets = getHandwritingArchetypes(targetClass)
  } else if (family === "geometry" || family === "symbol") {
    strokeSets = getGeometryArchetypes(targetClass)
  } else if (family === "object") {
    strokeSets = getObjectArchetypes(targetClass)
  }

  const rasters: Float32Array[] = []
  for (const sSet of strokeSets) {
    rasters.push(rasterizeStrokesTo32x32(sSet))
    for (const deg of [-6, 6]) {
      const rad = (deg * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const rot = sSet.map((s) =>
        s.map(([x, y]) => [
          30 + (x - 30) * cos - (y - 30) * sin,
          30 + (x - 30) * sin + (y - 30) * cos,
        ] as [number, number])
      )
      rasters.push(rasterizeStrokesTo32x32(rot))
    }
  }
  PROTOTYPE_CACHE.set(cacheKey, rasters)
  return rasters
}

/**
 * Computes cosine / normalized dot product similarity between two 32x32 grayscale rasters (1024 floats)
 */
function computeRasterSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < 1024; i++) {
    const va = a[i]
    const vb = b[i]
    dot += va * vb
    normA += va * va
    normB += vb * vb
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Maximum similarity of an input raster against a list of class prototypes
 */
function maxPrototypeSimilarity(inputRaster: Float32Array, prototypes: Float32Array[]): number {
  if (prototypes.length === 0) return 0
  let maxSim = 0
  for (const proto of prototypes) {
    const sim = computeRasterSimilarity(inputRaster, proto)
    if (sim > maxSim) maxSim = sim
  }
  return maxSim
}

/**
 * Single Class Specialist Model
 * Evaluates whether a drawing belongs to THIS target class via One-vs-Rest + Hard Negatives
 */
export class SpecialistModel {
  readonly definition: ClassDefinition
  private targetPrototypes: Float32Array[] = []
  private hardNegativePrototypes = new Map<string, Float32Array[]>()

  // Learned calibration parameters (calibrated via validation dataset)
  private calibrationAlpha = 4.2
  private calibrationBeta = 3.5
  private calibrationGamma = -2.8
  private acceptanceThreshold = 0.58

  constructor(definition: ClassDefinition) {
    this.definition = definition
    this.initPrototypes()
  }

  private initPrototypes(): void {
    this.targetPrototypes = getArchetypeRasters(this.definition.targetClass, this.definition.family)

    for (const hn of this.definition.hardNegatives) {
      let hnFamily = "geometry"
      if (/^[A-Z]$/.test(hn)) hnFamily = "letter"
      else if (/^[0-9]$/.test(hn)) hnFamily = "digit"
      else if (["apple", "house", "tree", "lightbulb", "phone", "computer", "camera", "folder", "document", "envelope", "lock", "calendar", "gear", "person", "car", "clock", "database", "server"].includes(hn)) {
        hnFamily = "object"
      }
      this.hardNegativePrototypes.set(hn, getArchetypeRasters(hn, hnFamily))
    }
  }

  /**
   * Evaluates input against this specialist's contract
   */
  evaluate(input: NormalizedDrawingInput): SpecialistEvaluationResult {
    const { features, raster32, rawStrokes } = input
    const priors = this.definition.priors

    // 1. Vector Priors Check & Progressive Penalties
    let vectorScore = 1.0
    let reject = false

    // Stroke count penalty
    const strokeCount = rawStrokes.length
    if (strokeCount < priors.minStrokes) {
      vectorScore -= 0.35 * (priors.minStrokes - strokeCount)
    } else if (strokeCount > priors.maxStrokes) {
      const excess = strokeCount - priors.maxStrokes
      vectorScore -= Math.min(0.65, 0.25 * excess)
      if (excess >= 3 && priors.maxStrokes <= 2) {
        reject = true
      }
    } else if (priors.preferredStrokes.includes(strokeCount)) {
      vectorScore += 0.05
    }

    // Aspect ratio penalty
    const ar = features.aspectRatio
    if (ar < priors.minAspectRatio) {
      const diff = priors.minAspectRatio - ar
      vectorScore -= Math.min(0.5, diff * 1.5)
    } else if (ar > priors.maxAspectRatio) {
      const diff = ar - priors.maxAspectRatio
      vectorScore -= Math.min(0.5, diff * 1.2)
    }

    // Closure penalty
    if (priors.closure === "must_close" && features.closureRatio > 0.35) {
      vectorScore -= 0.35
    } else if (priors.closure === "must_open" && features.closureRatio < 0.18) {
      vectorScore -= 0.3
    }

    // Circularity check
    if (priors.minCircularity !== undefined && features.circularity < priors.minCircularity) {
      vectorScore -= Math.min(0.4, (priors.minCircularity - features.circularity) * 2)
    }

    // Straightness check
    if (priors.minStraightness !== undefined && features.straightness < priors.minStraightness) {
      vectorScore -= Math.min(0.5, (priors.minStraightness - features.straightness) * 2.5)
    }

    vectorScore = Math.max(0.0, Math.min(1.0, vectorScore))

    if (reject) {
      return {
        classId: this.definition.id,
        targetClass: this.definition.targetClass,
        family: this.definition.family,
        rawScore: 0,
        calibratedConfidence: 0,
        accepted: false,
        hardNegativePenalty: 1.0,
        marginOverHardNegatives: -1.0,
        nearestHardNegative: null,
        nearestHardNegativeScore: 0,
        metadata: { rejectionReason: "Violated strict stroke count priors" },
      }
    }

    // 2. Positive Prototype Raster Similarity
    const posSim = maxPrototypeSimilarity(raster32, this.targetPrototypes)

    // 3. Hard-Negatives Evaluation
    let nearestHN: string | null = null
    let maxHNScore = 0

    for (const [hnClass, hnProtos] of this.hardNegativePrototypes.entries()) {
      const hnSim = maxPrototypeSimilarity(raster32, hnProtos)
      if (hnSim > maxHNScore) {
        maxHNScore = hnSim
        nearestHN = hnClass
      }
    }

    // Pairwise geometric disambiguation if nearest hard negative is strong
    let disambiguationBonus = 0
    if (nearestHN && maxHNScore > 0.5) {
      const disambig = disambiguateConfusablePair(this.definition.targetClass, nearestHN, input)
      if (disambig) {
        if (disambig.favoredClass === this.definition.targetClass) {
          disambiguationBonus = disambig.confidenceDelta
        } else {
          disambiguationBonus = -disambig.confidenceDelta
        }
      }
    }

    // Combined Raw Score
    const rawMatch = 0.55 * posSim + 0.45 * vectorScore + disambiguationBonus
    const rawScore = Math.max(0.0, Math.min(1.0, rawMatch))

    // Hard Negative Margin
    const margin = maxHNScore > 0.45 ? Math.min(0.25, rawScore - maxHNScore) : Math.min(0.0, rawScore - 0.70)

    // 4. Calibrated Confidence (Platt Sigmoid Scaling)
    const logit =
      this.calibrationAlpha * rawScore +
      this.calibrationBeta * margin +
      this.calibrationGamma

    const calibratedConfidence = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, logit))))

    // 5. Acceptance Decision
    const accepted =
      calibratedConfidence >= this.acceptanceThreshold &&
      margin >= -0.15 &&
      rawScore >= 0.52

    return {
      classId: this.definition.id,
      targetClass: this.definition.targetClass,
      family: this.definition.family,
      rawScore,
      calibratedConfidence,
      accepted,
      hardNegativePenalty: Math.max(0, maxHNScore - rawScore),
      marginOverHardNegatives: margin,
      nearestHardNegative: nearestHN,
      nearestHardNegativeScore: maxHNScore,
      metadata: {
        vectorScore,
        posSim,
        disambiguationBonus,
      },
    }
  }
}
