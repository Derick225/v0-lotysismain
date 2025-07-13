"use client"

import * as tf from "@tensorflow/tfjs"

interface CompressionOptions {
  level: "fast" | "balanced" | "maximum"
  quantization: boolean
  pruning: boolean
  weightSharing: boolean
}

interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  method: string
  metadata: {
    quantizationBits?: number
    prunedWeights?: number
    sharedWeights?: number
  }
}

export class CompressionService {
  private static instance: CompressionService

  private constructor() {}

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService()
    }
    return CompressionService.instance
  }

  async compressModel(
    model: tf.LayersModel,
    options: CompressionOptions = { level: "balanced", quantization: true, pruning: true, weightSharing: false },
  ): Promise<{ compressedModel: tf.LayersModel; result: CompressionResult }> {
    const startTime = performance.now()
    let compressedModel = model
    const metadata: any = {}

    // 1. Quantification des poids
    if (options.quantization) {
      const quantizationResult = await this.quantizeModel(compressedModel, options.level)
      compressedModel = quantizationResult.model
      metadata.quantizationBits = quantizationResult.bits
    }

    // 2. Pruning (élagage) des connexions faibles
    if (options.pruning) {
      const pruningResult = await this.pruneModel(compressedModel, options.level)
      compressedModel = pruningResult.model
      metadata.prunedWeights = pruningResult.prunedCount
    }

    // 3. Partage de poids (weight sharing)
    if (options.weightSharing) {
      const sharingResult = await this.shareWeights(compressedModel, options.level)
      compressedModel = sharingResult.model
      metadata.sharedWeights = sharingResult.sharedCount
    }

    // Calculer les tailles
    const originalSize = await this.getModelSize(model)
    const compressedSize = await this.getModelSize(compressedModel)

    const result: CompressionResult = {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      method: this.getCompressionMethodName(options),
      metadata,
    }

    console.log(`Compression terminée en ${performance.now() - startTime}ms`)
    console.log(`Taille originale: ${this.formatSize(originalSize)}`)
    console.log(`Taille compressée: ${this.formatSize(compressedSize)}`)
    console.log(`Ratio de compression: ${result.compressionRatio.toFixed(2)}x`)

    return { compressedModel, result }
  }

  private async quantizeModel(
    model: tf.LayersModel,
    level: "fast" | "balanced" | "maximum",
  ): Promise<{ model: tf.LayersModel; bits: number }> {
    // Déterminer le niveau de quantification
    const bits = level === "fast" ? 16 : level === "balanced" ? 8 : 4

    try {
      // Quantification manuelle car tf.quantization n'est pas disponible dans cette version
      // Simuler la quantification en réduisant la précision des poids
      const quantizedModel = tf.sequential()
      
      for (const layer of model.layers) {
        if (layer.getWeights().length > 0) {
          const weights = layer.getWeights()
          const quantizedWeights = weights.map(weight => {
            return tf.tidy(() => {
              // Quantification simple par arrondi selon le niveau de bits
              const scale = Math.pow(2, bits - 1) - 1
              const quantized = tf.round(tf.mul(weight, scale)).div(scale)
              return quantized
            })
          })
          
          // Cloner la couche avec les nouveaux poids
          const newLayer = this.cloneLayerWithWeights(layer, quantizedWeights)
          quantizedModel.add(newLayer)
          
          // Nettoyer
          quantizedWeights.forEach(w => w.dispose())
        } else {
          quantizedModel.add(layer)
        }
      }
      
      // Compiler le modèle quantifié
      quantizedModel.compile({
        optimizer: model.optimizer || "adam",
        loss: model.loss || "meanSquaredError",
        metrics: model.metrics || [],
      })

      return { model: quantizedModel, bits }
    } catch (error) {
      console.warn("Quantification échouée, utilisation du modèle original:", error)
      return { model, bits: 32 }
    }
  }

  private async pruneModel(
    model: tf.LayersModel,
    level: "fast" | "balanced" | "maximum",
  ): Promise<{ model: tf.LayersModel; prunedCount: number }> {
    // Déterminer le seuil de pruning
    const threshold = level === "fast" ? 0.1 : level === "balanced" ? 0.05 : 0.01

    let prunedCount = 0

    try {
      // Créer un nouveau modèle avec les poids élagués
      const prunedModel = tf.sequential()

      for (let i = 0; i < model.layers.length; i++) {
        const layer = model.layers[i]

        if (layer.getWeights().length > 0) {
          // Élaguer les poids de cette couche
          const weights = layer.getWeights()
          const prunedWeights = weights.map((weight) => {
            return tf.tidy(() => {
              const absWeight = tf.abs(weight)
              const maxWeight = tf.max(absWeight)
              const thresholdValue = tf.mul(maxWeight, threshold)
              const mask = tf.greater(absWeight, thresholdValue)

              // Compter les poids élagués
              const totalElements = weight.size
              const remainingElements = tf.sum(tf.cast(mask, "int32")).dataSync()[0]
              prunedCount += totalElements - remainingElements

              return tf.mul(weight, tf.cast(mask, weight.dtype))
            })
          })

          // Créer une nouvelle couche avec les poids élagués
          const newLayer = this.cloneLayerWithWeights(layer, prunedWeights)
          prunedModel.add(newLayer)

          // Nettoyer les tenseurs temporaires
          prunedWeights.forEach((w) => w.dispose())
        } else {
          // Couche sans poids, ajouter telle quelle
          prunedModel.add(layer)
        }
      }

      // Compiler le modèle élagué
      prunedModel.compile({
        optimizer: model.optimizer || "adam",
        loss: model.loss || "meanSquaredError",
        metrics: model.metrics || [],
      })

      return { model: prunedModel, prunedCount }
    } catch (error) {
      console.warn("Pruning échoué, utilisation du modèle original:", error)
      return { model, prunedCount: 0 }
    }
  }

  private async shareWeights(
    model: tf.LayersModel,
    level: "fast" | "balanced" | "maximum",
  ): Promise<{ model: tf.LayersModel; sharedCount: number }> {
    // Clustering des poids similaires
    const clusters = level === "fast" ? 256 : level === "balanced" ? 128 : 64

    let sharedCount = 0

    try {
      // Implémenter le partage de poids par clustering k-means
      const sharedModel = tf.sequential()

      for (let i = 0; i < model.layers.length; i++) {
        const layer = model.layers[i]

        if (layer.getWeights().length > 0) {
          const weights = layer.getWeights()
          const sharedWeights = weights.map((weight) => {
            return tf.tidy(() => {
              // Simplification: quantification uniforme au lieu de k-means complet
              const min = tf.min(weight)
              const max = tf.max(weight)
              const range = tf.sub(max, min)
              const step = tf.div(range, clusters)

              const quantized = tf.round(tf.div(tf.sub(weight, min), step))
              const shared = tf.add(tf.mul(quantized, step), min)

              sharedCount += weight.size - clusters

              return shared
            })
          })

          const newLayer = this.cloneLayerWithWeights(layer, sharedWeights)
          sharedModel.add(newLayer)

          sharedWeights.forEach((w) => w.dispose())
        } else {
          sharedModel.add(layer)
        }
      }

      sharedModel.compile({
        optimizer: model.optimizer || "adam",
        loss: model.loss || "meanSquaredError",
        metrics: model.metrics || [],
      })

      return { model: sharedModel, sharedCount }
    } catch (error) {
      console.warn("Weight sharing échoué, utilisation du modèle original:", error)
      return { model, sharedCount: 0 }
    }
  }

  private cloneLayerWithWeights(originalLayer: tf.layers.Layer, newWeights: tf.Tensor[]): tf.layers.Layer {
    // Créer une nouvelle couche similaire avec les nouveaux poids
    const config = originalLayer.getConfig() as any

    // Créer la nouvelle couche
    let newLayer: tf.layers.Layer

    switch (originalLayer.getClassName()) {
      case "Dense":
        newLayer = tf.layers.dense({
          units: config.units,
          activation: config.activation,
          useBias: config.useBias,
          ...config
        })
        break
      case "LSTM":
        newLayer = tf.layers.lstm({
          units: config.units,
          returnSequences: config.returnSequences,
          ...config
        })
        break
      case "Conv2D":
        newLayer = tf.layers.conv2d({
          filters: config.filters,
          kernelSize: config.kernelSize,
          ...config
        })
        break
      case "Dropout":
        newLayer = tf.layers.dropout({
          rate: config.rate || 0.5,
          ...config
        })
        break
      default:
        // Pour les autres types de couches, essayer de les créer dynamiquement
        newLayer = (tf.layers as any)[originalLayer.getClassName().toLowerCase()](config)
    }

    // Définir les poids si la couche en a
    if (newWeights.length > 0) {
      newLayer.setWeights(newWeights)
    }

    return newLayer
  }

  async compressData(data: any): Promise<{ compressed: ArrayBuffer; originalSize: number; compressedSize: number }> {
    const jsonString = JSON.stringify(data)
    const originalSize = new TextEncoder().encode(jsonString).length

    try {
      // Utiliser la compression gzip native du navigateur
      const stream = new CompressionStream("gzip")
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Écrire les données
      await writer.write(new TextEncoder().encode(jsonString))
      await writer.close()

      // Lire les données compressées
      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          chunks.push(value)
        }
      }

      // Combiner les chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const compressed = new Uint8Array(totalLength)
      let offset = 0

      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }

      return {
        compressed: compressed.buffer as ArrayBuffer,
        originalSize,
        compressedSize: compressed.length,
      }
    } catch (error) {
      console.warn("Compression gzip échouée, utilisation des données non compressées:", error)
      const buffer = new TextEncoder().encode(jsonString).buffer
      return {
        compressed: buffer as ArrayBuffer,
        originalSize,
        compressedSize: buffer.byteLength,
      }
    }
  }

  async decompressData(compressedData: ArrayBuffer): Promise<any> {
    try {
      // Utiliser la décompression gzip native du navigateur
      const stream = new DecompressionStream("gzip")
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      // Écrire les données compressées
      await writer.write(new Uint8Array(compressedData))
      await writer.close()

      // Lire les données décompressées
      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          chunks.push(value)
        }
      }

      // Combiner les chunks et décoder
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const decompressed = new Uint8Array(totalLength)
      let offset = 0

      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }

      const jsonString = new TextDecoder().decode(decompressed)
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn("Décompression gzip échouée, tentative de lecture directe:", error)
      const jsonString = new TextDecoder().decode(compressedData)
      return JSON.parse(jsonString)
    }
  }

  private async getModelSize(model: tf.LayersModel): Promise<number> {
    // Calculer la taille approximative du modèle en bytes
    let totalSize = 0

    for (const layer of model.layers) {
      const weights = layer.getWeights()
      for (const weight of weights) {
        totalSize += weight.size * 4 // 4 bytes par float32
      }
    }

    return totalSize
  }

  private getCompressionMethodName(options: CompressionOptions): string {
    const methods = []
    if (options.quantization) methods.push("Quantization")
    if (options.pruning) methods.push("Pruning")
    if (options.weightSharing) methods.push("Weight Sharing")
    return methods.join(" + ") || "None"
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Compression différentielle pour les mises à jour
  async createDifferentialUpdate(
    oldModel: tf.LayersModel,
    newModel: tf.LayersModel,
  ): Promise<{ delta: ArrayBuffer; compressionRatio: number }> {
    try {
      const oldWeights = this.extractAllWeights(oldModel)
      const newWeights = this.extractAllWeights(newModel)

      // Calculer les différences
      const deltas = newWeights.map((newWeight, index) => {
        if (index < oldWeights.length) {
          return tf.sub(newWeight, oldWeights[index])
        }
        return newWeight
      })

      // Sérialiser et compresser les deltas
      const deltaData = await this.serializeWeights(deltas)
      const compressed = await this.compressData(deltaData)

      // Nettoyer les tenseurs temporaires
      deltas.forEach((delta) => delta.dispose())
      oldWeights.forEach((weight) => weight.dispose())
      newWeights.forEach((weight) => weight.dispose())

      const originalSize = await this.getModelSize(newModel)
      const compressionRatio = originalSize / compressed.compressedSize

      return {
        delta: compressed.compressed,
        compressionRatio,
      }
    } catch (error) {
      console.error("Erreur lors de la création de la mise à jour différentielle:", error)
      throw error
    }
  }

  private extractAllWeights(model: tf.LayersModel): tf.Tensor[] {
    const allWeights: tf.Tensor[] = []

    for (const layer of model.layers) {
      const weights = layer.getWeights()
      allWeights.push(...weights)
    }

    return allWeights
  }

  private async serializeWeights(weights: tf.Tensor[]): Promise<any> {
    const serialized = []

    for (const weight of weights) {
      const data = await weight.data()
      serialized.push({
        shape: weight.shape,
        data: Array.from(data),
        dtype: weight.dtype,
      })
    }

    return serialized
  }

  // Analyse de la compressibilité d'un modèle
  async analyzeCompressibility(model: tf.LayersModel): Promise<{
    sparsity: number
    redundancy: number
    quantizationPotential: number
    recommendedLevel: "fast" | "balanced" | "maximum"
  }> {
    let totalWeights = 0
    let zeroWeights = 0
    const uniqueValues = new Set<number>()

    for (const layer of model.layers) {
      const weights = layer.getWeights()
      for (const weight of weights) {
        const data = await weight.data()
        totalWeights += data.length

        for (const value of data) {
          if (Math.abs(value) < 1e-6) {
            zeroWeights++
          }
          uniqueValues.add(Math.round(value * 1000) / 1000) // Arrondir pour détecter la redondance
        }
      }
    }

    const sparsity = zeroWeights / totalWeights
    const redundancy = 1 - uniqueValues.size / totalWeights
    const quantizationPotential = redundancy * 0.7 + sparsity * 0.3

    let recommendedLevel: "fast" | "balanced" | "maximum"
    if (quantizationPotential > 0.7) {
      recommendedLevel = "maximum"
    } else if (quantizationPotential > 0.4) {
      recommendedLevel = "balanced"
    } else {
      recommendedLevel = "fast"
    }

    return {
      sparsity,
      redundancy,
      quantizationPotential,
      recommendedLevel,
    }
  }
}
