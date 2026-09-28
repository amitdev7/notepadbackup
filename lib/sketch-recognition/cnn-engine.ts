// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Real Vectorized CNN Engine
// Pure TypeScript neural network with Conv2D, MaxPool2D, LeakyReLU, Dense,
// Softmax Cross-Entropy loss, Adam optimizer, model export and fast inference.
// ---------------------------------------------------------------------------

export interface Conv2DLayerConfig {
  type: "conv2d"
  inChannels: number
  outChannels: number
  kernelSize: number // 3
  stride: number // 1
  padding: number // 1
}

export interface MaxPool2DLayerConfig {
  type: "maxpool2d"
  poolSize: number // 2
  stride: number // 2
}

export interface DenseLayerConfig {
  type: "dense"
  inFeatures: number
  outFeatures: number
}

export interface ActivationLayerConfig {
  type: "leaky_relu"
  alpha: number // 0.1
}

export interface FlattenLayerConfig {
  type: "flatten"
}

export type LayerConfig =
  | Conv2DLayerConfig
  | MaxPool2DLayerConfig
  | DenseLayerConfig
  | ActivationLayerConfig
  | FlattenLayerConfig

export interface ModelWeights {
  version: string
  name: string
  classes: string[]
  inputShape: [number, number, number] // [channels, height, width]
  layers: {
    type: string
    weights?: number[]
    biases?: number[]
    inChannels?: number
    outChannels?: number
    inFeatures?: number
    outFeatures?: number
  }[]
  metrics?: {
    accuracy: number
    top3Accuracy: number
    valLoss: number
    valAccuracy: number
  }
}

/**
 * 3D Tensor: [Channels, Height, Width]
 */
export class Tensor3D {
  data: Float32Array
  channels: number
  height: number
  width: number

  constructor(channels: number, height: number, width: number, data?: Float32Array) {
    this.channels = channels
    this.height = height
    this.width = width
    this.data = data || new Float32Array(channels * height * width)
  }

  get(c: number, y: number, x: number): number {
    return this.data[c * this.height * this.width + y * this.width + x]
  }

  set(c: number, y: number, x: number, val: number): void {
    this.data[c * this.height * this.width + y * this.width + x] = val
  }

  fill(val: number): void {
    this.data.fill(val)
  }
}

/**
 * 2D Convolution Layer
 */
export class Conv2D {
  inChannels: number
  outChannels: number
  kernelSize: number
  padding: number
  weights: Float32Array // [outChannels, inChannels, kernelSize, kernelSize]
  biases: Float32Array // [outChannels]

  // Gradients for training
  dWeights: Float32Array
  dBiases: Float32Array

  // Adam optimizer moments
  mWeights: Float32Array
  vWeights: Float32Array
  mBiases: Float32Array
  vBiases: Float32Array

  // Cache for backward pass
  lastInput: Tensor3D | null = null

  constructor(inChannels: number, outChannels: number, kernelSize = 3, padding = 1) {
    this.inChannels = inChannels
    this.outChannels = outChannels
    this.kernelSize = kernelSize
    this.padding = padding

    const numWeights = outChannels * inChannels * kernelSize * kernelSize
    this.weights = new Float32Array(numWeights)
    this.biases = new Float32Array(outChannels)

    this.dWeights = new Float32Array(numWeights)
    this.dBiases = new Float32Array(outChannels)
    this.mWeights = new Float32Array(numWeights)
    this.vWeights = new Float32Array(numWeights)
    this.mBiases = new Float32Array(outChannels)
    this.vBiases = new Float32Array(outChannels)

    // He (Kaiming) normal initialization
    const std = Math.sqrt(2.0 / (inChannels * kernelSize * kernelSize))
    for (let i = 0; i < numWeights; i++) {
      this.weights[i] = (Math.random() * 2 - 1) * std * 1.2
    }
    this.biases.fill(0.01)
  }

  forward(input: Tensor3D, isTraining = false): Tensor3D {
    if (isTraining) this.lastInput = input

    const outH = input.height
    const outW = input.width
    const output = new Tensor3D(this.outChannels, outH, outW)

    const halfK = Math.floor(this.kernelSize / 2)
    const inData = input.data
    const outData = output.data
    const wData = this.weights
    const bData = this.biases
    const inC = this.inChannels
    const inH = input.height
    const inW = input.width

    for (let oc = 0; oc < this.outChannels; oc++) {
      const ocOffset = oc * outH * outW
      const ocWeightOffset = oc * inC * 9
      const biasVal = bData[oc]

      for (let y = 0; y < outH; y++) {
        const outRowOffset = ocOffset + y * outW
        for (let x = 0; x < outW; x++) {
          let sum = biasVal

          for (let ic = 0; ic < inC; ic++) {
            const icOffset = ic * inH * inW
            const icWeightOffset = ocWeightOffset + ic * 9

            for (let ky = -halfK; ky <= halfK; ky++) {
              const iy = y + ky
              if (iy < 0 || iy >= inH) continue
              const inRowOffset = icOffset + iy * inW
              const kRowOffset = icWeightOffset + (ky + halfK) * 3

              for (let kx = -halfK; kx <= halfK; kx++) {
                const ix = x + kx
                if (ix < 0 || ix >= inW) continue
                sum += inData[inRowOffset + ix] * wData[kRowOffset + (kx + halfK)]
              }
            }
          }

          outData[outRowOffset + x] = sum
        }
      }
    }

    return output
  }

  backward(dOutput: Tensor3D): Tensor3D {
    if (!this.lastInput) throw new Error("Conv2D backward called before forward")
    const input = this.lastInput
    const inH = input.height
    const inW = input.width
    const inC = this.inChannels
    const outC = this.outChannels
    const halfK = Math.floor(this.kernelSize / 2)

    const dInput = new Tensor3D(inC, inH, inW)
    const inData = input.data
    const dOutData = dOutput.data
    const dInData = dInput.data
    const wData = this.weights
    const dWData = this.dWeights
    const dBData = this.dBiases

    for (let oc = 0; oc < outC; oc++) {
      const ocOffset = oc * inH * inW
      const ocWeightOffset = oc * inC * 9

      // Bias gradient
      let biasGrad = 0
      for (let i = 0; i < inH * inW; i++) {
        biasGrad += dOutData[ocOffset + i]
      }
      dBData[oc] += biasGrad

      // Weight and Input gradients
      for (let y = 0; y < inH; y++) {
        const outRowOffset = ocOffset + y * inW
        for (let x = 0; x < inW; x++) {
          const dVal = dOutData[outRowOffset + x]
          if (Math.abs(dVal) < 1e-9) continue

          for (let ic = 0; ic < inC; ic++) {
            const icOffset = ic * inH * inW
            const icWeightOffset = ocWeightOffset + ic * 9

            for (let ky = -halfK; ky <= halfK; ky++) {
              const iy = y + ky
              if (iy < 0 || iy >= inH) continue
              const inRowOffset = icOffset + iy * inW
              const kRowOffset = icWeightOffset + (ky + halfK) * 3

              for (let kx = -halfK; kx <= halfK; kx++) {
                const ix = x + kx
                if (ix < 0 || ix >= inW) continue

                const wIdx = kRowOffset + (kx + halfK)
                dWData[wIdx] += dVal * inData[inRowOffset + ix]
                dInData[inRowOffset + ix] += dVal * wData[wIdx]
              }
            }
          }
        }
      }
    }

    return dInput
  }
}

/**
 * 2x2 Max Pooling Layer (Stride 2)
 */
export class MaxPool2D {
  poolSize: number
  stride: number
  lastInputShape: [number, number, number] | null = null
  argMaxIndices: Int32Array | null = null

  constructor(poolSize = 2, stride = 2) {
    this.poolSize = poolSize
    this.stride = stride
  }

  forward(input: Tensor3D, isTraining = false): Tensor3D {
    const outH = Math.floor(input.height / this.stride)
    const outW = Math.floor(input.width / this.stride)
    const output = new Tensor3D(input.channels, outH, outW)

    if (isTraining) {
      this.lastInputShape = [input.channels, input.height, input.width]
      this.argMaxIndices = new Int32Array(input.channels * outH * outW)
    }

    const inData = input.data
    const outData = output.data
    const inH = input.height
    const inW = input.width
    const argMax = this.argMaxIndices

    for (let c = 0; c < input.channels; c++) {
      const inCOffset = c * inH * inW
      const outCOffset = c * outH * outW

      for (let oy = 0; oy < outH; oy++) {
        const iy = oy * this.stride
        const outRowOffset = outCOffset + oy * outW

        for (let ox = 0; ox < outW; ox++) {
          const ix = ox * this.stride
          let maxVal = -Infinity
          let maxIdx = -1

          for (let dy = 0; dy < this.poolSize; dy++) {
            const py = iy + dy
            if (py >= inH) continue
            const inRowOffset = inCOffset + py * inW

            for (let dx = 0; dx < this.poolSize; dx++) {
              const px = ix + dx
              if (px >= inW) continue
              const idx = inRowOffset + px
              const val = inData[idx]
              if (val > maxVal) {
                maxVal = val
                maxIdx = idx
              }
            }
          }

          const outIdx = outRowOffset + ox
          outData[outIdx] = maxVal
          if (isTraining && argMax) {
            argMax[outIdx] = maxIdx
          }
        }
      }
    }

    return output
  }

  backward(dOutput: Tensor3D): Tensor3D {
    if (!this.lastInputShape || !this.argMaxIndices) {
      throw new Error("MaxPool2D backward called before training forward")
    }

    const [inC, inH, inW] = this.lastInputShape
    const dInput = new Tensor3D(inC, inH, inW)
    const dInData = dInput.data
    const dOutData = dOutput.data
    const argMax = this.argMaxIndices

    for (let i = 0; i < dOutData.length; i++) {
      const targetIdx = argMax[i]
      if (targetIdx >= 0) {
        dInData[targetIdx] += dOutData[i]
      }
    }

    return dInput
  }
}

/**
 * LeakyReLU Activation ($f(x) = x \ge 0 ? x : \alpha x$)
 */
export class LeakyReLU {
  alpha: number
  lastInput: Tensor3D | Float32Array | null = null

  constructor(alpha = 0.1) {
    this.alpha = alpha
  }

  forward(input: Tensor3D, isTraining = false): Tensor3D {
    if (isTraining) this.lastInput = input
    const output = new Tensor3D(input.channels, input.height, input.width)
    const inD = input.data
    const outD = output.data
    const a = this.alpha

    for (let i = 0; i < inD.length; i++) {
      const val = inD[i]
      outD[i] = val >= 0 ? val : a * val
    }
    return output
  }

  forward1D(input: Float32Array, isTraining = false): Float32Array {
    if (isTraining) this.lastInput = input
    const output = new Float32Array(input.length)
    const a = this.alpha
    for (let i = 0; i < input.length; i++) {
      const v = input[i]
      output[i] = v >= 0 ? v : a * v
    }
    return output
  }

  backward(dOutput: Tensor3D): Tensor3D {
    if (!this.lastInput || !(this.lastInput instanceof Tensor3D)) {
      throw new Error("LeakyReLU backward called without Tensor3D input")
    }
    const input = this.lastInput
    const dInput = new Tensor3D(input.channels, input.height, input.width)
    const inD = input.data
    const dOutD = dOutput.data
    const dInD = dInput.data
    const a = this.alpha

    for (let i = 0; i < inD.length; i++) {
      dInD[i] = inD[i] >= 0 ? dOutD[i] : a * dOutD[i]
    }
    return dInput
  }

  backward1D(dOutput: Float32Array): Float32Array {
    if (!this.lastInput || !(this.lastInput instanceof Float32Array)) {
      throw new Error("LeakyReLU backward1D called without Float32Array input")
    }
    const inD = this.lastInput
    const dInput = new Float32Array(dOutput.length)
    const a = this.alpha
    for (let i = 0; i < inD.length; i++) {
      dInput[i] = inD[i] >= 0 ? dOutput[i] : a * dOutput[i]
    }
    return dInput
  }
}

/**
 * Fully Connected Dense Layer ($Y = W \cdot X + B$)
 */
export class Dense {
  inFeatures: number
  outFeatures: number
  weights: Float32Array // [outFeatures, inFeatures]
  biases: Float32Array // [outFeatures]

  dWeights: Float32Array
  dBiases: Float32Array

  mWeights: Float32Array
  vWeights: Float32Array
  mBiases: Float32Array
  vBiases: Float32Array

  lastInput: Float32Array | null = null

  constructor(inFeatures: number, outFeatures: number) {
    this.inFeatures = inFeatures
    this.outFeatures = outFeatures

    const count = inFeatures * outFeatures
    this.weights = new Float32Array(count)
    this.biases = new Float32Array(outFeatures)

    this.dWeights = new Float32Array(count)
    this.dBiases = new Float32Array(outFeatures)
    this.mWeights = new Float32Array(count)
    this.vWeights = new Float32Array(count)
    this.mBiases = new Float32Array(outFeatures)
    this.vBiases = new Float32Array(outFeatures)

    // Xavier/He initialization
    const std = Math.sqrt(2.0 / inFeatures)
    for (let i = 0; i < count; i++) {
      this.weights[i] = (Math.random() * 2 - 1) * std * 1.1
    }
    this.biases.fill(0.01)
  }

  forward(input: Float32Array, isTraining = false): Float32Array {
    if (isTraining) this.lastInput = input
    const output = new Float32Array(this.outFeatures)
    const w = this.weights
    const b = this.biases
    const inF = this.inFeatures

    for (let o = 0; o < this.outFeatures; o++) {
      let sum = b[o]
      const rowOffset = o * inF
      for (let i = 0; i < inF; i++) {
        sum += input[i] * w[rowOffset + i]
      }
      output[o] = sum
    }
    return output
  }

  backward(dOutput: Float32Array): Float32Array {
    if (!this.lastInput) throw new Error("Dense backward called before forward")
    const input = this.lastInput
    const inF = this.inFeatures
    const outF = this.outFeatures
    const dInput = new Float32Array(inF)
    const w = this.weights
    const dW = this.dWeights
    const dB = this.dBiases

    for (let o = 0; o < outF; o++) {
      const dOutVal = dOutput[o]
      dB[o] += dOutVal
      const rowOffset = o * inF

      for (let i = 0; i < inF; i++) {
        dW[rowOffset + i] += dOutVal * input[i]
        dInput[i] += dOutVal * w[rowOffset + i]
      }
    }

    return dInput
  }
}

/**
 * Softmax with Numerical Stability (Subtract Max)
 */
export function softmax(logits: Float32Array): Float32Array {
  let maxVal = -Infinity
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxVal) maxVal = logits[i]
  }

  let sum = 0
  const probs = new Float32Array(logits.length)
  for (let i = 0; i < logits.length; i++) {
    const expVal = Math.exp(logits[i] - maxVal)
    probs[i] = expVal
    sum += expVal
  }

  if (sum > 0) {
    for (let i = 0; i < logits.length; i++) {
      probs[i] /= sum
    }
  }
  return probs
}

/**
 * Cross-Entropy Loss & Gradient
 */
export function crossEntropy(
  probs: Float32Array,
  targetClass: number
): { loss: number; grad: Float32Array } {
  const eps = 1e-8
  const p = Math.max(eps, Math.min(1 - eps, probs[targetClass]))
  const loss = -Math.log(p)

  const grad = new Float32Array(probs.length)
  for (let i = 0; i < probs.length; i++) {
    grad[i] = probs[i] - (i === targetClass ? 1.0 : 0.0)
  }

  return { loss, grad }
}

/**
 * Full Sketch CNN Architecture:
 * Input [1, 32, 32]
 * -> Conv2D (8 filters 3x3)
 * -> LeakyReLU
 * -> MaxPool2D (2x2) -> [8, 16, 16]
 * -> Conv2D (16 filters 3x3)
 * -> LeakyReLU
 * -> MaxPool2D (2x2) -> [16, 8, 8] = 1024 features
 * -> Dense (1024 -> hiddenDim [e.g. 48])
 * -> LeakyReLU
 * -> Dense (hiddenDim -> numClasses)
 * -> Softmax
 */
export class SketchCNN {
  name: string
  classes: string[]
  inputShape: [number, number, number] = [1, 32, 32]

  conv1: Conv2D
  act1: LeakyReLU
  pool1: MaxPool2D

  conv2: Conv2D
  act2: LeakyReLU
  pool2: MaxPool2D

  dense1: Dense
  act3: LeakyReLU
  dense2: Dense

  // Training metrics
  stepCount = 0

  constructor(name: string, classes: string[], hiddenDim = 48) {
    this.name = name
    this.classes = classes

    this.conv1 = new Conv2D(1, 8, 3, 1)
    this.act1 = new LeakyReLU(0.1)
    this.pool1 = new MaxPool2D(2, 2)

    this.conv2 = new Conv2D(8, 16, 3, 1)
    this.act2 = new LeakyReLU(0.1)
    this.pool2 = new MaxPool2D(2, 2)

    // After 2 poolings on 32x32: 32 -> 16 -> 8.
    // Flattened size = 16 * 8 * 8 = 1024.
    this.dense1 = new Dense(16 * 8 * 8, hiddenDim)
    this.act3 = new LeakyReLU(0.1)
    this.dense2 = new Dense(hiddenDim, classes.length)
  }

  /**
   * Fast forward pass for inference. Returns predicted probabilities and top candidates.
   */
  predict(inputData: Float32Array): {
    probs: Float32Array
    topClass: string
    topConfidence: number
    topCandidates: { className: string; confidence: number; classIndex: number }[]
  } {
    const input = new Tensor3D(1, 32, 32, inputData)

    // Layer 1
    const c1 = this.conv1.forward(input, false)
    const a1 = this.act1.forward(c1, false)
    const p1 = this.pool1.forward(a1, false)

    // Layer 2
    const c2 = this.conv2.forward(p1, false)
    const a2 = this.act2.forward(c2, false)
    const p2 = this.pool2.forward(a2, false)

    // Flatten & Dense 1
    const flat = p2.data
    const d1 = this.dense1.forward(flat, false)
    const a3 = this.act3.forward1D(d1, false)

    // Dense 2 (Logits)
    const logits = this.dense2.forward(a3, false)
    const probs = softmax(logits)

    // Ranked candidates
    const candidates = this.classes.map((cls, idx) => ({
      className: cls,
      confidence: probs[idx],
      classIndex: idx,
    }))
    candidates.sort((a, b) => b.confidence - a.confidence)

    return {
      probs,
      topClass: candidates[0]?.className || "UNKNOWN",
      topConfidence: candidates[0]?.confidence || 0,
      topCandidates: candidates.slice(0, 5),
    }
  }

  /**
   * Forward pass for training (preserves activations)
   */
  forwardTrain(inputData: Float32Array): Float32Array {
    const input = new Tensor3D(1, 32, 32, inputData)
    const c1 = this.conv1.forward(input, true)
    const a1 = this.act1.forward(c1, true)
    const p1 = this.pool1.forward(a1, true)

    const c2 = this.conv2.forward(p1, true)
    const a2 = this.act2.forward(c2, true)
    const p2 = this.pool2.forward(a2, true)

    const d1 = this.dense1.forward(p2.data, true)
    const a3 = this.act3.forward1D(d1, true)
    const logits = this.dense2.forward(a3, true)

    return softmax(logits)
  }

  /**
   * Backward pass computing all gradients
   */
  backward(dLogits: Float32Array): void {
    const dDense1Out = this.dense2.backward(dLogits)
    const dAct3 = this.act3.backward1D(dDense1Out)
    const dPool2Out = this.dense1.backward(dAct3)

    const pool2Tensor = new Tensor3D(16, 8, 8, dPool2Out)
    const dConv2Act = this.pool2.backward(pool2Tensor)
    const dConv2Out = this.act2.backward(dConv2Act)
    const dPool1Out = this.conv2.backward(dConv2Out)

    const dConv1Act = this.pool1.backward(dPool1Out)
    const dConv1Out = this.act1.backward(dConv1Act)
    this.conv1.backward(dConv1Out)
  }

  /**
   * Adam Optimizer Step with weight decay
   */
  stepAdam(lr: number, weightDecay = 1e-4, beta1 = 0.9, beta2 = 0.999, eps = 1e-8): void {
    this.stepCount++
    const t = this.stepCount
    const bc1 = 1 - Math.pow(beta1, t)
    const bc2 = 1 - Math.pow(beta2, t)

    const updateLayer = (
      w: Float32Array,
      dw: Float32Array,
      mw: Float32Array,
      vw: Float32Array,
      b: Float32Array,
      db: Float32Array,
      mb: Float32Array,
      vb: Float32Array
    ) => {
      // Weights update
      for (let i = 0; i < w.length; i++) {
        const grad = dw[i] + weightDecay * w[i]
        mw[i] = beta1 * mw[i] + (1 - beta1) * grad
        vw[i] = beta2 * vw[i] + (1 - beta2) * grad * grad

        const mHat = mw[i] / bc1
        const vHat = vw[i] / bc2
        w[i] -= (lr / (Math.sqrt(vHat) + eps)) * mHat
        dw[i] = 0 // reset gradient
      }

      // Biases update
      for (let i = 0; i < b.length; i++) {
        const grad = db[i]
        mb[i] = beta1 * mb[i] + (1 - beta1) * grad
        vb[i] = beta2 * vb[i] + (1 - beta2) * grad * grad

        const mHat = mb[i] / bc1
        const vHat = vb[i] / bc2
        b[i] -= (lr / (Math.sqrt(vHat) + eps)) * mHat
        db[i] = 0 // reset gradient
      }
    }

    updateLayer(
      this.conv1.weights,
      this.conv1.dWeights,
      this.conv1.mWeights,
      this.conv1.vWeights,
      this.conv1.biases,
      this.conv1.dBiases,
      this.conv1.mBiases,
      this.conv1.vBiases
    )

    updateLayer(
      this.conv2.weights,
      this.conv2.dWeights,
      this.conv2.mWeights,
      this.conv2.vWeights,
      this.conv2.biases,
      this.conv2.dBiases,
      this.conv2.mBiases,
      this.conv2.vBiases
    )

    updateLayer(
      this.dense1.weights,
      this.dense1.dWeights,
      this.dense1.mWeights,
      this.dense1.vWeights,
      this.dense1.biases,
      this.dense1.dBiases,
      this.dense1.mBiases,
      this.dense1.vBiases
    )

    updateLayer(
      this.dense2.weights,
      this.dense2.dWeights,
      this.dense2.mWeights,
      this.dense2.vWeights,
      this.dense2.biases,
      this.dense2.dBiases,
      this.dense2.mBiases,
      this.dense2.vBiases
    )
  }

  /**
   * Export model weights to JSON artifact
   */
  exportWeights(): ModelWeights {
    return {
      version: "1.0.0",
      name: this.name,
      classes: [...this.classes],
      inputShape: this.inputShape,
      layers: [
        {
          type: "conv1",
          weights: Array.from(this.conv1.weights),
          biases: Array.from(this.conv1.biases),
          inChannels: this.conv1.inChannels,
          outChannels: this.conv1.outChannels,
        },
        {
          type: "conv2",
          weights: Array.from(this.conv2.weights),
          biases: Array.from(this.conv2.biases),
          inChannels: this.conv2.inChannels,
          outChannels: this.conv2.outChannels,
        },
        {
          type: "dense1",
          weights: Array.from(this.dense1.weights),
          biases: Array.from(this.dense1.biases),
          inFeatures: this.dense1.inFeatures,
          outFeatures: this.dense1.outFeatures,
        },
        {
          type: "dense2",
          weights: Array.from(this.dense2.weights),
          biases: Array.from(this.dense2.biases),
          inFeatures: this.dense2.inFeatures,
          outFeatures: this.dense2.outFeatures,
        },
      ],
    }
  }

  /**
   * Load model weights from JSON artifact
   */
  loadWeights(data: ModelWeights): void {
    for (const l of data.layers) {
      if (l.type === "conv1" && l.weights && l.biases) {
        this.conv1.weights.set(l.weights)
        this.conv1.biases.set(l.biases)
      } else if (l.type === "conv2" && l.weights && l.biases) {
        this.conv2.weights.set(l.weights)
        this.conv2.biases.set(l.biases)
      } else if (l.type === "dense1" && l.weights && l.biases) {
        this.dense1.weights.set(l.weights)
        this.dense1.biases.set(l.biases)
      } else if (l.type === "dense2" && l.weights && l.biases) {
        this.dense2.weights.set(l.weights)
        this.dense2.biases.set(l.biases)
      }
    }
  }
}
