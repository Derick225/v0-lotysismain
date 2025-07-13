"use client"

import * as tf from "@tensorflow/tfjs"
import { CompressionService } from "./compression-service"
import { WebGLCompressionService } from "./webgl-compression-service"

interface EnhancedCompressionOptions {
  level: "fast" | "balanced" | "maximum"
  quantization: boolean
  pruning: boolean
  weightSharing: boolean
  useGPU: boolean
  parallelProcessing: boolean
  streamingCompression: boolean
}

interface CompressionBenchmark {
  cpuTime: number
  gpuTime: number
  speedup: number
  memoryUsage: {
    cpu: number
    gpu: number
  }
  compressionRatio: number
  qualityLoss: number
}

export class EnhancedCompressionService {
  private static instance: EnhancedCompressionService
  private cpuService: CompressionService
  private gpuService: WebGLCompressionService
  private benchmarkData: Map<string, CompressionBenchmark> = new Map()

  private constructor() {
    this.cpuService = CompressionService.getInstance()
    this.gpuService = WebGLCompressionService.getInstance()
  }

  static getInstance(): EnhancedCompressionService {
    if (!EnhancedCompressionService.instance) {
      EnhancedCompressionService.instance = new EnhancedCompressionService()
    }
    return EnhancedCompressionService.instance
  }

  async initialize(): Promise<void> {
    // Initialiser le service GPU
    const gpuAvailable = await this.gpuService.initialize()

    if (gpuAvailable) {
      console.log("Compression GPU activée")
      console.log("Capacités WebGL:", this.gpuService.getCapabilities())
    } else {
      console.log("Compression CPU uniquement")
    }
  }

  async compressModelAdaptive(
    model: tf.LayersModel,
    options: EnhancedCompressionOptions,
  ): Promise<{
    compressedModel: tf.LayersModel
    compressionResult: any
    benchmark: CompressionBenchmark
  }> {
    // Analyser le modèle pour choisir la meilleure stratégie
    const modelAnalysis = await this.analyzeModelForCompression(model)

    // Décider d'utiliser GPU ou CPU
    const useGPU = options.useGPU && this.gpuService.isWebGLAvailable() && modelAnalysis.gpuSuitable

    console.log(`Compression ${useGPU ? "GPU" : "CPU"} sélectionnée pour le modèle`)

    let compressionResult: any
    let benchmark: CompressionBenchmark

    if (useGPU) {
      // Compression GPU
      const result = await this.compressWithGPU(model, options, modelAnalysis)
      compressionResult = result.compressionResult
      benchmark = result.benchmark
    } else {
      // Compression CPU avec fallback
      const result = await this.compressWithCPU(model, options, modelAnalysis)
      compressionResult = result.compressionResult
      benchmark = result.benchmark
    }

    // Reconstruire le modèle compressé
    const compressedModel = await this.reconstructCompressedModel(compressionResult)

    // Sauvegarder les données de benchmark
    this.benchmarkData.set(model.name || "unnamed", benchmark)

    return {
      compressedModel,
      compressionResult,
      benchmark,
    }
  }

  private async analyzeModelForCompression(model: tf.LayersModel): Promise<{
    totalWeights: number
    averageLayerSize: number
    sparsity: number
    gpuSuitable: boolean
    recommendedStrategy: string
  }> {
    let totalWeights = 0
    let totalElements = 0
    let zeroWeights = 0

    for (const layer of model.layers) {
      const weights = layer.getWeights()
      for (const weight of weights) {
        const data = await weight.data()
        totalWeights += weight.size
        totalElements += data.length

        // Compter les poids proches de zéro
        for (const value of data) {
          if (Math.abs(value) < 1e-6) {
            zeroWeights++
          }
        }
      }
    }

    const averageLayerSize = totalWeights / model.layers.length
    const sparsity = zeroWeights / totalElements

    // Déterminer si le GPU est approprié
    const gpuSuitable = totalWeights > 10000 && averageLayerSize > 1000

    let recommendedStrategy = "cpu"
    if (gpuSuitable && this.gpuService.isWebGLAvailable()) {
      recommendedStrategy = "gpu"
    }

    return {
      totalWeights,
      averageLayerSize,
      sparsity,
      gpuSuitable,
      recommendedStrategy,
    }
  }

  private async compressWithGPU(
    model: tf.LayersModel,
    options: EnhancedCompressionOptions,
    analysis: any,
  ): Promise<{ compressionResult: any; benchmark: CompressionBenchmark }> {
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()

    try {
      // Compression GPU avec options optimisées
      const gpuResult = await this.gpuService.compressModelGPU(model, {
        quantizationBits: options.level === "fast" ? 16 : options.level === "balanced" ? 8 : 4,
        pruningThreshold: options.level === "fast" ? 0.1 : options.level === "balanced" ? 0.05 : 0.01,
        useParallelProcessing: options.parallelProcessing,
      })

      const gpuTime = performance.now() - startTime
      const gpuMemory = this.getMemoryUsage() - startMemory

      // Compression CPU pour comparaison (échantillon)
      const cpuStartTime = performance.now()
      const sampleLayer = model.layers[0]
      if (sampleLayer.getWeights().length > 0) {
        await this.cpuService.compressModel(tf.sequential({ layers: [sampleLayer] }), {
          level: options.level,
          quantization: options.quantization,
          pruning: options.pruning,
          weightSharing: options.weightSharing,
        })
      }
      const cpuSampleTime = performance.now() - cpuStartTime

      // Estimer le temps CPU total
      const estimatedCpuTime = cpuSampleTime * model.layers.length

      const benchmark: CompressionBenchmark = {
        cpuTime: estimatedCpuTime,
        gpuTime,
        speedup: estimatedCpuTime / gpuTime,
        memoryUsage: {
          cpu: 0,
          gpu: gpuResult.gpuMemoryUsed,
        },
        compressionRatio: analysis.totalWeights / (gpuResult.compressedData.byteLength / 4),
        qualityLoss: this.estimateQualityLoss(options),
      }

      return {
        compressionResult: {
          type: "gpu",
          data: gpuResult.compressedData,
          metadata: {
            originalSize: analysis.totalWeights * 4,
            compressedSize: gpuResult.compressedData.byteLength,
            parallelOps: gpuResult.parallelOps,
            compressionTime: gpuTime,
          },
        },
        benchmark,
      }
    } catch (error) {
      console.error("Erreur compression GPU, fallback vers CPU:", error)
      return this.compressWithCPU(model, options, analysis)
    }
  }

  private async compressWithCPU(
    model: tf.LayersModel,
    options: EnhancedCompressionOptions,
    analysis: any,
  ): Promise<{ compressionResult: any; benchmark: CompressionBenchmark }> {
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()

    const cpuResult = await this.cpuService.compressModel(model, {
      level: options.level,
      quantization: options.quantization,
      pruning: options.pruning,
      weightSharing: options.weightSharing,
    })

    const cpuTime = performance.now() - startTime
    const cpuMemory = this.getMemoryUsage() - startMemory

    const benchmark: CompressionBenchmark = {
      cpuTime,
      gpuTime: 0,
      speedup: 1,
      memoryUsage: {
        cpu: cpuMemory,
        gpu: 0,
      },
      compressionRatio: cpuResult.result.compressionRatio,
      qualityLoss: this.estimateQualityLoss(options),
    }

    // Sérialiser le modèle compressé
    const serializedData = await this.serializeModel(cpuResult.compressedModel)

    return {
      compressionResult: {
        type: "cpu",
        data: serializedData,
        metadata: {
          originalSize: cpuResult.result.originalSize,
          compressedSize: cpuResult.result.compressedSize,
          compressionTime: cpuTime,
          method: cpuResult.result.method,
        },
      },
      benchmark,
    }
  }

  private async reconstructCompressedModel(compressionResult: any): Promise<tf.LayersModel> {
    if (compressionResult.type === "gpu") {
      return await this.gpuService.decompressModelGPU(compressionResult.data)
    } else {
      return await this.deserializeModel(compressionResult.data)
    }
  }

  async decompressModelAdaptive(compressionResult: any): Promise<tf.LayersModel> {
    const startTime = performance.now()

    let model: tf.LayersModel

    if (compressionResult.type === "gpu" && this.gpuService.isWebGLAvailable()) {
      console.log("Décompression GPU")
      model = await this.gpuService.decompressModelGPU(compressionResult.data)
    } else {
      console.log("Décompression CPU")
      model = await this.deserializeModel(compressionResult.data)
    }

    const decompressionTime = performance.now() - startTime
    console.log(`Décompression terminée en ${decompressionTime.toFixed(2)}ms`)

    return model
  }

  async benchmarkCompressionMethods(model: tf.LayersModel): Promise<{
    cpu: CompressionBenchmark
    gpu: CompressionBenchmark | null
    recommendation: string
  }> {
    console.log("Benchmark des méthodes de compression...")

    // Test CPU
    const cpuResult = await this.compressWithCPU(
      model,
      {
        level: "balanced",
        quantization: true,
        pruning: true,
        weightSharing: false,
        useGPU: false,
        parallelProcessing: false,
        streamingCompression: false,
      },
      await this.analyzeModelForCompression(model),
    )

    let gpuResult: { compressionResult: any; benchmark: CompressionBenchmark } | null = null

    // Test GPU si disponible
    if (this.gpuService.isWebGLAvailable()) {
      try {
        gpuResult = await this.compressWithGPU(
          model,
          {
            level: "balanced",
            quantization: true,
            pruning: true,
            weightSharing: false,
            useGPU: true,
            parallelProcessing: true,
            streamingCompression: false,
          },
          await this.analyzeModelForCompression(model),
        )
      } catch (error) {
        console.warn("Benchmark GPU échoué:", error)
      }
    }

    // Recommandation
    let recommendation = "cpu"
    if (gpuResult && gpuResult.benchmark.speedup > 1.5) {
      recommendation = "gpu"
    }

    return {
      cpu: cpuResult.benchmark,
      gpu: gpuResult?.benchmark || null,
      recommendation,
    }
  }

  private async serializeModel(model: tf.LayersModel): Promise<ArrayBuffer> {
    const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => {
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON'
        },
        ...artifacts
      }
    }))
    const jsonString = JSON.stringify(saveResult)
    return new TextEncoder().encode(jsonString).buffer as ArrayBuffer
  }

  private async deserializeModel(data: ArrayBuffer): Promise<tf.LayersModel> {
    const jsonString = new TextDecoder().decode(data)
    const artifacts = JSON.parse(jsonString)
    return await tf.loadLayersModel(tf.io.fromMemory(artifacts))
  }

  private estimateQualityLoss(options: EnhancedCompressionOptions): number {
    let qualityLoss = 0

    if (options.quantization) {
      qualityLoss += options.level === "fast" ? 0.02 : options.level === "balanced" ? 0.05 : 0.1
    }

    if (options.pruning) {
      qualityLoss += options.level === "fast" ? 0.01 : options.level === "balanced" ? 0.03 : 0.08
    }

    if (options.weightSharing) {
      qualityLoss += 0.02
    }

    return Math.min(qualityLoss, 0.2) // Limiter à 20% max
  }

  private getMemoryUsage(): number {
    // Estimation de l'utilisation mémoire
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  getBenchmarkData(): Map<string, CompressionBenchmark> {
    return this.benchmarkData
  }

  getCompressionCapabilities(): {
    cpu: boolean
    gpu: boolean
    webgl2: boolean
    parallelProcessing: boolean
  } {
    return {
      cpu: true,
      gpu: this.gpuService.isWebGLAvailable(),
      webgl2: this.gpuService.getCapabilities()?.webgl2 || false,
      parallelProcessing: this.gpuService.getCapabilities()?.parallelProcessing || false,
    }
  }

  dispose(): void {
    this.gpuService.dispose()
    this.benchmarkData.clear()
  }
}
