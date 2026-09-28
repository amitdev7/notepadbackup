// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Real CNN Training Script
// Trains Handwriting, Geometry, and Semantic Object CNNs end-to-end.
// Evaluates Top-1/Top-3, Confusion Matrix, and exports model weight artifacts.
// ---------------------------------------------------------------------------

import * as fs from "node:fs"
import * as path from "node:path"
import { SketchCNN, crossEntropy } from "../../lib/sketch-recognition/cnn-engine"
import { generateDataset, type AugmentedSample } from "../../lib/sketch-recognition/dataset-generator"

interface TrainingResult {
  modelName: string
  epochs: number
  trainLoss: number
  trainAccuracy: number
  valLoss: number
  valAccuracy: number
  testAccuracy: number
  top3Accuracy: number
  artifactPath: string
}

function shuffle<T>(arr: T[]): T[] {
  const res = [...arr]
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[res[i], res[j]] = [res[j], res[i]]
  }
  return res
}

function evaluate(model: SketchCNN, dataset: AugmentedSample[]): {
  loss: number
  top1Accuracy: number
  top3Accuracy: number
  confusion: Record<string, Record<string, number>>
} {
  let totalLoss = 0
  let correctTop1 = 0
  let correctTop3 = 0

  const confusion: Record<string, Record<string, number>> = {}
  for (const c of model.classes) {
    confusion[c] = {}
    for (const c2 of model.classes) {
      confusion[c][c2] = 0
    }
  }

  for (const sample of dataset) {
    const res = model.predict(sample.tensor)
    const { loss } = crossEntropy(res.probs, sample.classIndex)
    totalLoss += loss

    const predictedClass = res.topClass
    confusion[sample.label][predictedClass] = (confusion[sample.label][predictedClass] || 0) + 1

    if (predictedClass === sample.label) {
      correctTop1++
    }

    const top3Names = res.topCandidates.slice(0, 3).map((c) => c.className)
    if (top3Names.includes(sample.label)) {
      correctTop3++
    }
  }

  return {
    loss: totalLoss / dataset.length,
    top1Accuracy: (correctTop1 / dataset.length) * 100,
    top3Accuracy: (correctTop3 / dataset.length) * 100,
    confusion,
  }
}

export function trainCategory(
  category: "handwriting" | "geometry" | "object",
  epochs = 14,
  samplesPerClass = 22,
  initialLr = 0.0035
): TrainingResult {
  console.log(`\n======================================================`)
  console.log(`Training CNN for: ${category.toUpperCase()}`)
  console.log(`======================================================`)

  const data = generateDataset(category, samplesPerClass, 42)
  console.log(
    `Dataset generated: ${data.classes.length} classes | Train: ${data.train.length} | Val: ${data.val.length} | Test: ${data.test.length}`
  )

  const model = new SketchCNN(`${category}-cnn`, data.classes, 48)

  let lr = initialLr
  const batchSize = 16

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const shuffledTrain = shuffle(data.train)
    let epochLoss = 0
    let epochCorrect = 0

    // Learning rate schedule: decay every 5 epochs
    if (epoch % 5 === 0) {
      lr *= 0.80
    }

    for (let i = 0; i < shuffledTrain.length; i++) {
      const sample = shuffledTrain[i]
      const probs = model.forwardTrain(sample.tensor)
      const { loss, grad } = crossEntropy(probs, sample.classIndex)

      epochLoss += loss
      let maxIdx = 0
      let maxP = -1
      for (let p = 0; p < probs.length; p++) {
        if (probs[p] > maxP) {
          maxP = probs[p]
          maxIdx = p
        }
      }
      if (maxIdx === sample.classIndex) epochCorrect++

      model.backward(grad)

      // Step optimizer after mini-batch or at the end
      if ((i + 1) % batchSize === 0 || i === shuffledTrain.length - 1) {
        model.stepAdam(lr, 1e-4)
      }
    }

    const trainLossAvg = epochLoss / shuffledTrain.length
    const trainAcc = (epochCorrect / shuffledTrain.length) * 100

    if (epoch % 3 === 0 || epoch === epochs) {
      const valEval = evaluate(model, data.val)
      console.log(
        `Epoch ${epoch.toString().padStart(2)}/${epochs} | Train Loss: ${trainLossAvg.toFixed(4)} | Train Acc: ${trainAcc.toFixed(1)}% | Val Loss: ${valEval.loss.toFixed(4)} | Val Acc: ${valEval.top1Accuracy.toFixed(1)}% (Top-3: ${valEval.top3Accuracy.toFixed(1)}%)`
      )
    }
  }

  // Final evaluation on unseen Test set
  const testEval = evaluate(model, data.test)
  const valFinal = evaluate(model, data.val)
  console.log(`\nFinal Test Evaluation for ${category}:`)
  console.log(`  Top-1 Accuracy: ${testEval.top1Accuracy.toFixed(2)}%`)
  console.log(`  Top-3 Accuracy: ${testEval.top3Accuracy.toFixed(2)}%`)
  console.log(`  Test Loss:      ${testEval.loss.toFixed(4)}`)

  // Export weights artifact
  const weightsArtifact = model.exportWeights()
  weightsArtifact.metrics = {
    accuracy: testEval.top1Accuracy,
    top3Accuracy: testEval.top3Accuracy,
    valLoss: valFinal.loss,
    valAccuracy: valFinal.top1Accuracy,
  }

  const outDir = path.join(process.cwd(), "lib", "sketch-recognition", "models")
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const artifactPath = path.join(outDir, `${category}-cnn.json`)
  fs.writeFileSync(artifactPath, JSON.stringify(weightsArtifact, null, 2), "utf8")
  console.log(`Exported trained model artifact to: ${artifactPath} (${(fs.statSync(artifactPath).size / 1024).toFixed(1)} KB)`)

  return {
    modelName: `${category}-cnn`,
    epochs,
    trainLoss: 0,
    trainAccuracy: 0,
    valLoss: valFinal.loss,
    valAccuracy: valFinal.top1Accuracy,
    testAccuracy: testEval.top1Accuracy,
    top3Accuracy: testEval.top3Accuracy,
    artifactPath,
  }
}

// If run directly via node
if (process.argv[1]?.endsWith("train-cnn.ts")) {
  console.log("Starting Zenithsui Smart Sketch CNN Training Pipeline...")
  const start = Date.now()

  trainCategory("geometry", 14, 22, 0.0035)
  trainCategory("handwriting", 15, 22, 0.0035)
  trainCategory("object", 14, 22, 0.0035)

  const duration = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n======================================================`)
  console.log(`All CNN Models successfully trained & exported in ${duration}s!`)
  console.log(`======================================================\n`)
}
