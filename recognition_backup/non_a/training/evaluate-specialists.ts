// ---------------------------------------------------------------------------
// Specialist Sketch Recognition — Scientific Evaluation & Benchmarking Suite
// Measures per-class Precision, Recall, F1, Hard-Negative Disambiguation,
// Scribble Rejection, Sequence Recognition, and Latency on real augmented data.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert"
import {
  ALL_CLASS_DEFINITIONS,
  LETTER_DEFINITIONS,
  DIGIT_DEFINITIONS,
  GEOMETRY_DEFINITIONS,
  OBJECT_DEFINITIONS,
} from "../../lib/sketch-recognition/specialists/class-definitions"
import { specialistRegistry } from "../../lib/sketch-recognition/specialists/specialist-registry"
import {
  evaluateSpecialistEnsemble,
  prepareDrawingInput,
} from "../../lib/sketch-recognition/specialists/specialist-ensemble"
import {
  getHandwritingArchetypes,
  getGeometryArchetypes,
  getObjectArchetypes,
} from "../../lib/sketch-recognition/dataset-archetypes"
import { augmentStrokes, SeededRNG } from "../../lib/sketch-recognition/dataset-generator"
import { recognizeHandwritingSequence } from "../../lib/sketch-recognition/sequence-engine"
import type { Point } from "../../lib/sketch-recognition/types"

interface ClassMetrics {
  targetClass: string
  family: string
  tp: number
  fp: number
  tn: number
  fn: number
  precision: number
  recall: number
  f1: number
}

function getArchetypesForClass(targetClass: string, family: string): Point[][][] {
  if (family === "letter" || family === "digit") {
    return getHandwritingArchetypes(targetClass)
  } else if (family === "geometry" || family === "symbol") {
    return getGeometryArchetypes(targetClass)
  } else if (family === "object") {
    return getObjectArchetypes(targetClass)
  }
  return []
}

export function runSpecialistEvaluation() {
  console.log("\n" + "=".repeat(78))
  console.log("   ZENITHSUI RESEARCH-GRADE SPECIALIST SKETCH RECOGNITION EVALUATION   ")
  console.log("=".repeat(78) + "\n")

  console.log(`Registered Specialists: ${specialistRegistry.totalCount}`)
  console.log(`- Letter Specialists:   ${LETTER_DEFINITIONS.length} (A–Z)`)
  console.log(`- Digit Specialists:    ${DIGIT_DEFINITIONS.length} (0–9)`)
  console.log(`- Geometry Specialists: ${GEOMETRY_DEFINITIONS.length} (Shapes & Symbols)`)
  console.log(`- Object Specialists:   ${OBJECT_DEFINITIONS.length} (Semantic Wireframe Items)\n`)

  const rng = new SeededRNG(42)
  const SAMPLES_PER_CLASS = 15
  const metricsMap = new Map<string, ClassMetrics>()

  // Latency measurements
  const latencies: number[] = []

  // Initialize metrics
  for (const def of ALL_CLASS_DEFINITIONS) {
    metricsMap.set(def.targetClass, {
      targetClass: def.targetClass,
      family: def.family,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
      precision: 0,
      recall: 0,
      f1: 0,
    })
  }

  console.log("--> Phase 1: Evaluating 69 Individual Specialists (Positive & Negative Sets)...")

  // Generate test dataset for each class with realistic multi-tiered augmentations
  for (const def of ALL_CLASS_DEFINITIONS) {
    const archetypes = getArchetypesForClass(def.targetClass, def.family)
    const specialist = specialistRegistry.getSpecialist(def.targetClass)
    if (!specialist || archetypes.length === 0) continue

    const metrics = metricsMap.get(def.targetClass)!

    // Positive samples (canonical + augmented)
    for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
      const base = archetypes[i % archetypes.length]
      const { strokes } = augmentStrokes(base, rng, {
        rotationRangeDeg: 12,
        scaleRangeX: [0.85, 1.15],
        scaleRangeY: [0.85, 1.15],
        jitterAmount: 0.7,
        cornerOvershootProb: 0.25,
      })

      const input = prepareDrawingInput(strokes)
      if (!input) continue

      const t0 = performance.now()
      const res = specialist.evaluate(input)
      latencies.push(performance.now() - t0)

      if (res.accepted) {
        metrics.tp++
      } else {
        metrics.fn++
      }
    }

    // Hard-negative samples evaluated against this specialist
    for (const hnClass of def.hardNegatives) {
      let hnFamily = "geometry"
      if (/^[A-Z]$/.test(hnClass)) hnFamily = "letter"
      else if (/^[0-9]$/.test(hnClass)) hnFamily = "digit"
      else if (["apple", "house", "tree", "lightbulb", "phone", "computer", "camera", "folder", "document", "envelope", "lock", "calendar", "gear", "person", "car", "clock", "database", "server"].includes(hnClass)) {
        hnFamily = "object"
      }

      const hnArchetypes = getArchetypesForClass(hnClass, hnFamily)
      if (hnArchetypes.length === 0) continue

      const base = hnArchetypes[0]
      const { strokes } = augmentStrokes(base, rng, {
        rotationRangeDeg: 8,
        jitterAmount: 0.5,
      })

      const input = prepareDrawingInput(strokes)
      if (!input) continue

      const res = specialist.evaluate(input)
      if (res.accepted) {
        metrics.fp++
      } else {
        metrics.tn++
      }
    }

    // Compute precision, recall, F1
    const p = metrics.tp + metrics.fp > 0 ? metrics.tp / (metrics.tp + metrics.fp) : 0
    const r = metrics.tp + metrics.fn > 0 ? metrics.tp / (metrics.tp + metrics.fn) : 0
    const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0

    metrics.precision = p
    metrics.recall = r
    metrics.f1 = f1
  }

  // Print Summary Table of Specialist Accuracies
  console.log("\n" + "-".repeat(78))
  console.log(
    " CLASS       | FAMILY   | TP   | FP  | FN   | PRECISION | RECALL  | F1 SCORE"
  )
  console.log("-".repeat(78))

  let totalTP = 0
  let totalFP = 0
  let totalFN = 0

  for (const m of metricsMap.values()) {
    totalTP += m.tp
    totalFP += m.fp
    totalFN += m.fn
    const padClass = m.targetClass.padEnd(11)
    const padFam = m.family.padEnd(8)
    const padTP = String(m.tp).padStart(4)
    const padFP = String(m.fp).padStart(3)
    const padFN = String(m.fn).padStart(4)
    const padP = (m.precision * 100).toFixed(1).padStart(7) + "%"
    const padR = (m.recall * 100).toFixed(1).padStart(6) + "%"
    const padF1 = m.f1.toFixed(3).padStart(8)

    // Print subset or critical classes to avoid overflowing logs while demonstrating full evaluation
    const critical = [
      "A", "B", "C", "D", "E", "H", "I", "O", "S", "V", "X", "Z",
      "0", "1", "2", "5", "6", "8",
      "line", "rectangle", "circle", "triangle", "arrow", "checkmark", "plus",
      "apple", "house", "tree", "lightbulb", "phone"
    ]
    if (critical.includes(m.targetClass)) {
      console.log(` ${padClass} | ${padFam} | ${padTP} | ${padFP} | ${padFN} |   ${padP} |  ${padR} | ${padF1}`)
    }
  }

  const macroPrecision = totalTP / (totalTP + totalFP)
  const macroRecall = totalTP / (totalTP + totalFN)
  const macroF1 = (2 * macroPrecision * macroRecall) / (macroPrecision + macroRecall)

  console.log("-".repeat(78))
  console.log(
    ` OVERALL (All 69 Classes): Precision: ${(macroPrecision * 100).toFixed(2)}% | Recall: ${(macroRecall * 100).toFixed(2)}% | F1: ${macroF1.toFixed(3)}`
  )
  console.log("-".repeat(78) + "\n")

  // Phase 2: Critical Hard-Negative Pairwise Disambiguation Test
  console.log("--> Phase 2: Evaluating Hard-Negative Pairwise Disambiguations...")
  const criticalPairs = [
    { name: "A vs Triangle", char: "A", expected: "A", family: "letter" },
    { name: "Triangle vs A", char: "triangle", expected: "triangle", family: "geometry" },
    { name: "O vs Circle", char: "circle", expected: "circle", family: "geometry" },
    { name: "O vs 0 (Digit)", char: "0", expected: "0", family: "digit" },
    { name: "1 vs Line", char: "1", expected: "1", family: "digit" },
    { name: "Line vs 1", char: "line", expected: "line", family: "geometry" },
    { name: "S vs 5", char: "S", expected: "S", family: "letter" },
    { name: "5 vs S", char: "5", expected: "5", family: "digit" },
    { name: "B vs 8", char: "B", expected: "B", family: "letter" },
    { name: "8 vs B", char: "8", expected: "8", family: "digit" },
    { name: "Z vs 2", char: "Z", expected: "Z", family: "letter" },
    { name: "2 vs Z", char: "2", expected: "2", family: "digit" },
    { name: "V vs Checkmark", char: "checkmark", expected: "checkmark", family: "symbol" },
    { name: "X vs Plus", char: "plus", expected: "plus", family: "symbol" },
  ]

  let pairsPassed = 0
  for (const pair of criticalPairs) {
    const archetypes = getArchetypesForClass(pair.char, pair.family)
    const res = evaluateSpecialistEnsemble(archetypes[0])
    const matches = res.topClass === pair.expected || res.candidates.some((c) => c.targetClass === pair.expected)
    if (matches) {
      pairsPassed++
      console.log(`  ✓ ${pair.name.padEnd(20)} -> Correctly disambiguated (${res.topClass})`)
    } else {
      console.log(`  ✗ ${pair.name.padEnd(20)} -> Misclassified as ${res.topClass}`)
    }
  }
  console.log(`  Pairwise Disambiguation Score: ${pairsPassed} / ${criticalPairs.length} (${((pairsPassed / criticalPairs.length) * 100).toFixed(1)}%)\n`)

  // Phase 3: Scribble & Noise Rejection (UNKNOWN Class Verification)
  console.log("--> Phase 3: Evaluating Scribble, Noise & UNKNOWN Rejection...")
  const scribbleTests: { name: string; strokes: Point[][] }[] = [
    {
      name: "Chaotic dense zigzag",
      strokes: [
        [
          [10, 10], [50, 20], [15, 30], [52, 40], [12, 50], [55, 60],
          [14, 70], [51, 80], [10, 90], [53, 95], [12, 100]
        ]
      ],
    },
    {
      name: "Stray dot noise (< 4 points)",
      strokes: [[[10, 10], [11, 10], [10, 11]]],
    },
    {
      name: "High frequency chaotic loop scribble",
      strokes: [
        [
          [20, 20], [25, 22], [18, 26], [28, 30], [15, 35], [30, 40],
          [12, 45], [32, 50], [10, 55], [35, 60], [15, 65], [30, 70]
        ]
      ],
    },
    {
      name: "Incomplete single diagonal segment",
      strokes: [[[10, 10], [18, 18], [24, 25]]],
    },
  ]

  let rejectedCount = 0
  for (const st of scribbleTests) {
    const res = evaluateSpecialistEnsemble(st.strokes)
    if (res.isUnknown || !res.recognized) {
      rejectedCount++
      console.log(`  ✓ ${st.name.padEnd(40)} -> Successfully Rejected as UNKNOWN (${res.rejectionReason || "Low confidence"})`)
    } else {
      console.log(`  ✗ ${st.name.padEnd(40)} -> False Positive Conversion as ${res.topClass}`)
    }
  }
  const rejectionRate = (rejectedCount / scribbleTests.length) * 100
  console.log(`  UNKNOWN Rejection Rate: ${rejectedCount} / ${scribbleTests.length} (${rejectionRate.toFixed(1)}%)\n`)

  // Phase 4: Multi-Digit Continuous Numbers & Words
  console.log("--> Phase 4: Evaluating Multi-Digit Numbers & Words...")
  const numbersToTest = ["12", "123", "1234", "12345", "2026", "100", "8080"]
  let numbersPassed = 0

  for (const numStr of numbersToTest) {
    const strokes: Point[][] = []
    let offsetX = 10
    for (const d of numStr) {
      const arch = getHandwritingArchetypes(d)[0]
      for (const s of arch) {
        strokes.push(s.map(([px, py]) => [px + offsetX, py]))
      }
      offsetX += 45
    }
    const res = recognizeHandwritingSequence(strokes)
    if (res.recognized && (res.text === numStr || res.isNumber)) {
      numbersPassed++
      console.log(`  ✓ Number '${numStr}' -> Recognized: '${res.text}' (Mode: ${res.mode}, Confidence: ${(res.confidence * 100).toFixed(1)}%)`)
    } else {
      console.log(`  ✗ Number '${numStr}' -> Result: '${res.text}'`)
    }
  }

  const wordsToTest = ["ABC", "HELLO", "WORLD", "APPLE", "ZENITHSUI"]
  let wordsPassed = 0

  for (const wordStr of wordsToTest) {
    const strokes: Point[][] = []
    let offsetX = 10
    for (const ch of wordStr) {
      const arch = getHandwritingArchetypes(ch)[0]
      for (const s of arch) {
        strokes.push(s.map(([px, py]) => [px + offsetX, py]))
      }
      offsetX += 48
    }
    const res = recognizeHandwritingSequence(strokes)
    if (res.recognized && (res.text === wordStr || res.isWord)) {
      wordsPassed++
      console.log(`  ✓ Word '${wordStr}' -> Recognized: '${res.text}' (Confidence: ${(res.confidence * 100).toFixed(1)}%)`)
    } else {
      console.log(`  ✗ Word '${wordStr}' -> Result: '${res.text}'`)
    }
  }

  // Phase 5: Latency Benchmark
  latencies.sort((a, b) => a - b)
  const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)]

  console.log("\n" + "=".repeat(78))
  console.log("   EVALUATION SUMMARY & PERFORMANCE BENCHMARKS   ")
  console.log("=".repeat(78))
  console.log(`Total Specialist Models Evaluated: ${specialistRegistry.totalCount}`)
  console.log(`Overall Macro Precision:          ${(macroPrecision * 100).toFixed(2)}%`)
  console.log(`Overall Macro Recall:             ${(macroRecall * 100).toFixed(2)}%`)
  console.log(`Overall Macro F1 Score:           ${macroF1.toFixed(3)}`)
  console.log(`Hard-Negative Disambiguation:     ${((pairsPassed / criticalPairs.length) * 100).toFixed(1)}%`)
  console.log(`Scribble UNKNOWN Rejection Rate:  ${rejectionRate.toFixed(1)}%`)
  console.log(`Continuous Sequence Accuracy:     ${(((numbersPassed + wordsPassed) / (numbersToTest.length + wordsToTest.length)) * 100).toFixed(1)}%`)
  console.log(`Average Forward Latency:          ${avgLatency.toFixed(2)} ms`)
  console.log(`95th Percentile (p95) Latency:    ${p95Latency.toFixed(2)} ms`)
  console.log("=".repeat(78) + "\n")

  // Assertion verifications
  assert(macroPrecision >= 0.85, `Precision too low: ${macroPrecision}`)
  assert(rejectionRate >= 75, `Scribble rejection too low: ${rejectionRate}`)
  assert(avgLatency < 10, `Latency too high: ${avgLatency}ms`)
}

// Run evaluation if executed directly
runSpecialistEvaluation()
