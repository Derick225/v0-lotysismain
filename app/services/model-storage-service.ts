"use client"

import { CompressionService } from "./compression-service"

// Dynamic import for TensorFlow.js to avoid webpack issues
let tf: any = null;

const loadTensorFlow = async () => {
  if (!tf) {
    try {
      tf = await import("@tensorflow/tfjs");
    } catch (error) {
      console.warn("TensorFlow.js not available:", error);
      return null;
    }
  }
  return tf;
};

interface ModelData {
    lstm?: tf.LayersModel
    cnn?: tf.LayersModel
    ensemble?: tf.LayersModel[]
    scaler?: { min: number[]; max: number[] }
    version: string
    drawName: string
    trainingDataHash: string
    createdAt: number
    lastUsed: number
    performance?: {
        accuracy: number
        loss: number
        trainingTime: number
    }
    compression?: {
        originalSize: number
        compressedSize: number
        compressionRatio: number
        method: string
        level: "fast" | "balanced" | "maximum"
    }
}

interface ModelMetadata {
    drawName: string
    version: string
    size: number
    originalSize?: number
    compressionRatio?: number
    createdAt: number
    lastUsed: number
    performance?: {
        accuracy: number
        loss: number
        trainingTime: number
    }
    compression?: {
        method: string
        level: string
        savings: number
    }
}

export class ModelStorageService {
    private static instance: ModelStorageService
    private dbName = "lottery-ml-models"
    private dbVersion = 2 // Incrémenté pour la compression
    private db: IDBDatabase | null = null
    private compressionService: CompressionService

    private constructor() {
        this.compressionService = CompressionService.getInstance()
    }

    static getInstance(): ModelStorageService {
        if (!ModelStorageService.instance) {
            ModelStorageService.instance = new ModelStorageService()
        }
        return ModelStorageService.instance
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                // Store pour les modèles
                if (!db.objectStoreNames.contains("models")) {
                    const modelStore = db.createObjectStore("models", { keyPath: "drawName" })
                    modelStore.createIndex("version", "version", { unique: false })
                    modelStore.createIndex("createdAt", "createdAt", { unique: false })
                    modelStore.createIndex("compressionRatio", "compression.compressionRatio", { unique: false })
                }

                // Store pour les métadonnées
                if (!db.objectStoreNames.contains("metadata")) {
                    const metadataStore = db.createObjectStore("metadata", { keyPath: "drawName" })
                    metadataStore.createIndex("lastUsed", "lastUsed", { unique: false })
                    metadataStore.createIndex("compressionRatio", "compressionRatio", { unique: false })
                }

                // Store pour les données compressées
                if (!db.objectStoreNames.contains("compressed-data")) {
                    const compressedStore = db.createObjectStore("compressed-data", { keyPath: "key" })
                    compressedStore.createIndex("drawName", "drawName", { unique: false })
                }
            }
        })
    }

    async saveModels(
        drawName: string,
        modelData: Partial<ModelData>,
        compressionLevel: "fast" | "balanced" | "maximum" = "balanced",
    ): Promise<void> {
        if (!this.db) {
            await this.initialize()
        }

        const transaction = this.db!.transaction(["models", "metadata", "compressed-data"], "readwrite")
        const modelStore = transaction.objectStore("models")
        const metadataStore = transaction.objectStore("metadata")
        const compressedStore = transaction.objectStore("compressed-data")

        try {
            let totalOriginalSize = 0
            let totalCompressedSize = 0
            const compressionResults: Array<{
                type: string
                method: string
                originalSize: number
                compressedSize: number
                compressionRatio: number
            }> = []

            // Sauvegarder et compresser les modèles TensorFlow.js
            const modelUrls: { [key: string]: string | string[] } = {}

            if (modelData.lstm) {
                // Analyser la compressibilité
                const analysis = await this.compressionService.analyzeCompressibility(modelData.lstm)
                console.log(
                    `Analyse LSTM - Sparsity: ${(analysis.sparsity * 100).toFixed(1)}%, Recommandé: ${analysis.recommendedLevel}`,
                )

                // Compresser le modèle
                const { compressedModel, result } = await this.compressionService.compressModel(modelData.lstm, {
                    level: compressionLevel,
                    quantization: true,
                    pruning: analysis.sparsity > 0.1,
                    weightSharing: analysis.redundancy > 0.3,
                })

                const lstmUrl = `indexeddb://lstm-compressed-${drawName}`
                await compressedModel.save(lstmUrl)
                modelUrls.lstm = lstmUrl

                totalOriginalSize += result.originalSize
                totalCompressedSize += result.compressedSize
                compressionResults.push({ type: "LSTM", ...result })
            }

            if (modelData.cnn) {
                const analysis = await this.compressionService.analyzeCompressibility(modelData.cnn)
                console.log(
                    `Analyse CNN - Sparsity: ${(analysis.sparsity * 100).toFixed(1)}%, Recommandé: ${analysis.recommendedLevel}`,
                )

                const { compressedModel, result } = await this.compressionService.compressModel(modelData.cnn, {
                    level: compressionLevel,
                    quantization: true,
                    pruning: analysis.sparsity > 0.1,
                    weightSharing: analysis.redundancy > 0.3,
                })

                const cnnUrl = `indexeddb://cnn-compressed-${drawName}`
                await compressedModel.save(cnnUrl)
                modelUrls.cnn = cnnUrl

                totalOriginalSize += result.originalSize
                totalCompressedSize += result.compressedSize
                compressionResults.push({ type: "CNN", ...result })
            }

            if (modelData.ensemble && modelData.ensemble.length > 0) {
                modelUrls.ensemble = []
                for (let i = 0; i < modelData.ensemble.length; i++) {
                    const analysis = await this.compressionService.analyzeCompressibility(modelData.ensemble[i])

                    const { compressedModel, result } = await this.compressionService.compressModel(modelData.ensemble[i], {
                        level: compressionLevel,
                        quantization: true,
                        pruning: analysis.sparsity > 0.05,
                        weightSharing: false, // Désactivé pour les modèles d'ensemble
                    })

                    const ensembleUrl = `indexeddb://ensemble-compressed-${i}-${drawName}`
                    await compressedModel.save(ensembleUrl)
                        ; (modelUrls.ensemble as string[]).push(ensembleUrl)

                    totalOriginalSize += result.originalSize
                    totalCompressedSize += result.compressedSize
                    compressionResults.push({ type: `Ensemble-${i}`, ...result })
                }
            }

            // Compresser les métadonnées et le scaler
            const additionalData = {
                scaler: modelData.scaler,
                trainingDataHash: modelData.trainingDataHash,
                performance: modelData.performance,
                compressionResults,
            }

            const compressedAdditionalData = await this.compressionService.compressData(additionalData)

            // Sauvegarder les données compressées séparément
            await new Promise<void>((resolve, reject) => {
                const request = compressedStore.put({
                    key: `additional-${drawName}`,
                    drawName,
                    data: compressedAdditionalData.compressed,
                    originalSize: compressedAdditionalData.originalSize,
                    compressedSize: compressedAdditionalData.compressedSize,
                })
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            // Calculer les statistiques de compression globales
            const overallCompressionRatio = totalOriginalSize / totalCompressedSize
            const compressionMethod = compressionResults.map((r) => r.method).join(", ")

            // Sauvegarder les métadonnées du modèle
            const now = Date.now()
            const storedData = {
                drawName,
                version: modelData.version || now.toString(),
                modelUrls,
                createdAt: now,
                lastUsed: now,
                compression: {
                    originalSize: totalOriginalSize,
                    compressedSize: totalCompressedSize,
                    compressionRatio: overallCompressionRatio,
                    method: compressionMethod,
                    level: compressionLevel,
                },
            }

            await new Promise<void>((resolve, reject) => {
                const request = modelStore.put(storedData)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            // Sauvegarder les métadonnées pour les requêtes rapides
            const metadata: ModelMetadata = {
                drawName,
                version: storedData.version,
                size: totalCompressedSize,
                originalSize: totalOriginalSize,
                compressionRatio: overallCompressionRatio,
                createdAt: now,
                lastUsed: now,
                performance: modelData.performance,
                compression: {
                    method: compressionMethod,
                    level: compressionLevel,
                    savings: totalOriginalSize - totalCompressedSize,
                },
            }

            await new Promise<void>((resolve, reject) => {
                const request = metadataStore.put(metadata)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            console.log(`Modèles compressés et sauvegardés pour ${drawName}`)
            console.log(`Taille originale: ${this.formatSize(totalOriginalSize)}`)
            console.log(`Taille compressée: ${this.formatSize(totalCompressedSize)}`)
            console.log(`Ratio de compression: ${overallCompressionRatio.toFixed(2)}x`)
            console.log(`Économie d'espace: ${this.formatSize(totalOriginalSize - totalCompressedSize)}`)
        } catch (error) {
            console.error("Erreur lors de la sauvegarde compressée:", error)
            throw error
        }
    }

    async loadModels(drawName: string): Promise<ModelData | null> {
        if (!this.db) {
            await this.initialize()
        }

        const transaction = this.db!.transaction(["models", "compressed-data"], "readonly")
        const modelStore = transaction.objectStore("models")
        const compressedStore = transaction.objectStore("compressed-data")

        try {
            const storedData = await new Promise<any>((resolve, reject) => {
                const request = modelStore.get(drawName)
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })

            if (!storedData) {
                return null
            }

            // Charger les données compressées additionnelles
            const compressedAdditionalData = await new Promise<{
                data: ArrayBuffer
                originalSize: number
                compressedSize: number
            } | null>((resolve, reject) => {
                const request = compressedStore.get(`additional-${drawName}`)
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })

            let additionalData: {
                scaler?: { min: number[]; max: number[] }
                trainingDataHash?: string
                performance?: {
                    accuracy: number
                    loss: number
                    trainingTime: number
                }
                compressionResults?: Array<{
                    type: string
                    method: string
                    originalSize: number
                    compressedSize: number
                    compressionRatio: number
                }>
            } = {}
            if (compressedAdditionalData) {
                additionalData = await this.compressionService.decompressData(compressedAdditionalData.data)
            }

            // Charger les modèles TensorFlow.js compressés
            const modelData: ModelData = {
                version: storedData.version,
                drawName: storedData.drawName,
                trainingDataHash: additionalData.trainingDataHash || "",
                createdAt: storedData.createdAt,
                lastUsed: Date.now(),
                scaler: additionalData.scaler,
                performance: additionalData.performance,
                compression: storedData.compression,
            }

            if (storedData.modelUrls.lstm) {
                modelData.lstm = await tf.loadLayersModel(storedData.modelUrls.lstm)
            }

            if (storedData.modelUrls.cnn) {
                modelData.cnn = await tf.loadLayersModel(storedData.modelUrls.cnn)
            }

            if (storedData.modelUrls.ensemble && Array.isArray(storedData.modelUrls.ensemble)) {
                modelData.ensemble = []
                for (const url of storedData.modelUrls.ensemble) {
                    const model = await tf.loadLayersModel(url)
                    modelData.ensemble.push(model)
                }
            }

            // Mettre à jour la date de dernière utilisation
            await this.updateLastUsed(drawName)

            console.log(`Modèles décompressés chargés pour ${drawName}`)
            if (modelData.compression) {
                console.log(`Ratio de compression: ${modelData.compression.compressionRatio.toFixed(2)}x`)
                console.log(`Méthode: ${modelData.compression.method}`)
            }

            return modelData
        } catch (error) {
            console.error("Erreur lors du chargement compressé:", error)
            return null
        }
    }

    async hasModels(drawName: string): Promise<boolean> {
        if (!this.db) {
            await this.initialize()
        }

        const transaction = this.db!.transaction(["metadata"], "readonly")
        const store = transaction.objectStore("metadata")

        try {
            const result = await new Promise<any>((resolve, reject) => {
                const request = store.get(drawName)
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })

            return !!result
        } catch (error) {
            console.error("Erreur lors de la vérification:", error)
            return false
        }
    }

    async getAllModelMetadata(): Promise<ModelMetadata[]> {
        if (!this.db) {
            await this.initialize()
        }

        const transaction = this.db!.transaction(["metadata"], "readonly")
        const store = transaction.objectStore("metadata")

        try {
            return new Promise<ModelMetadata[]>((resolve, reject) => {
                const request = store.getAll()
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })
        } catch (error) {
            console.error("Erreur lors de la récupération des métadonnées:", error)
            return []
        }
    }

    async deleteModels(drawName: string): Promise<void> {
        if (!this.db) {
            await this.initialize()
        }

        const transaction = this.db!.transaction(["models", "metadata", "compressed-data"], "readwrite")
        const modelStore = transaction.objectStore("models")
        const metadataStore = transaction.objectStore("metadata")
        const compressedStore = transaction.objectStore("compressed-data")

        try {
            // Récupérer les URLs des modèles avant suppression
            const storedData = await new Promise<any>((resolve, reject) => {
                const request = modelStore.get(drawName)
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })

            if (storedData && storedData.modelUrls) {
                // Supprimer les modèles TensorFlow.js compressés
                if (storedData.modelUrls.lstm) {
                    await tf.io.removeModel(storedData.modelUrls.lstm)
                }
                if (storedData.modelUrls.cnn) {
                    await tf.io.removeModel(storedData.modelUrls.cnn)
                }
                if (storedData.modelUrls.ensemble && Array.isArray(storedData.modelUrls.ensemble)) {
                    for (const url of storedData.modelUrls.ensemble) {
                        await tf.io.removeModel(url)
                    }
                }
            }

            // Supprimer les données compressées additionnelles
            await new Promise<void>((resolve, reject) => {
                const request = compressedStore.delete(`additional-${drawName}`)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            // Supprimer les entrées de la base de données
            await new Promise<void>((resolve, reject) => {
                const request = modelStore.delete(drawName)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            await new Promise<void>((resolve, reject) => {
                const request = metadataStore.delete(drawName)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })

            console.log(`Modèles compressés supprimés pour ${drawName}`)
        } catch (error) {
            console.error("Erreur lors de la suppression:", error)
            throw error
        }
    }

    async exportModels(drawName: string): Promise<Blob | null> {
        try {
            const modelData = await this.loadModels(drawName)
            if (!modelData) {
                return null
            }

            // Créer un objet d'export avec les modèles sérialisés et compressés
            const exportData = {
                drawName: modelData.drawName,
                version: modelData.version,
                scaler: modelData.scaler,
                trainingDataHash: modelData.trainingDataHash,
                createdAt: modelData.createdAt,
                performance: modelData.performance,
                compression: modelData.compression,
                models: {} as any,
            }

            // Sérialiser les modèles compressés
            if (modelData.lstm) {
                exportData.models.lstm = await this.serializeModel(modelData.lstm)
            }
            if (modelData.cnn) {
                exportData.models.cnn = await this.serializeModel(modelData.cnn)
            }
            if (modelData.ensemble) {
                exportData.models.ensemble = []
                for (const model of modelData.ensemble) {
                    exportData.models.ensemble.push(await this.serializeModel(model))
                }
            }

            // Compresser l'export final
            const compressed = await this.compressionService.compressData(exportData)
            return new Blob([compressed.compressed], { type: "application/octet-stream" })
        } catch (error) {
            console.error("Erreur lors de l'export compressé:", error)
            return null
        }
    }

    async importModels(file: File): Promise<string | null> {
        try {
            const arrayBuffer = await file.arrayBuffer()

            // Essayer de décompresser
            let importData: any
            try {
                importData = await this.compressionService.decompressData(arrayBuffer)
            } catch {
                // Si la décompression échoue, essayer de lire comme JSON
                const text = new TextDecoder().decode(arrayBuffer)
                importData = JSON.parse(text)
            }

            // Valider la structure des données
            if (!importData.drawName || !importData.version) {
                throw new Error("Format de fichier invalide")
            }

            // Désérialiser et sauvegarder les modèles
            const modelData: Partial<ModelData> = {
                version: importData.version,
                drawName: importData.drawName,
                trainingDataHash: importData.trainingDataHash,
                scaler: importData.scaler,
                performance: importData.performance,
            }

            if (importData.models.lstm) {
                modelData.lstm = await this.deserializeModel(importData.models.lstm)
            }
            if (importData.models.cnn) {
                modelData.cnn = await this.deserializeModel(importData.models.cnn)
            }
            if (importData.models.ensemble) {
                modelData.ensemble = []
                for (const serializedModel of importData.models.ensemble) {
                    modelData.ensemble.push(await this.deserializeModel(serializedModel))
                }
            }

            // Sauvegarder avec compression
            const compressionLevel = importData.compression?.level || "balanced"
            await this.saveModels(importData.drawName, modelData, compressionLevel)
            return importData.drawName
        } catch (error) {
            console.error("Erreur lors de l'import compressé:", error)
            return null
        }
    }

    private async serializeModel(model: tf.LayersModel): Promise<tf.io.ModelArtifacts> {
        const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => {
            return {
                modelArtifactsInfo: {
                    dateSaved: new Date(),
                    modelTopologyType: 'JSON'
                },
                ...artifacts
            }
        }))
        return saveResult
    }

    private async deserializeModel(serializedModel: tf.io.ModelArtifacts): Promise<tf.LayersModel> {
        return await tf.loadLayersModel(tf.io.fromMemory(serializedModel))
    }

    private async updateLastUsed(drawName: string): Promise<void> {
        if (!this.db) return

        const transaction = this.db.transaction(["metadata"], "readwrite")
        const store = transaction.objectStore("metadata")

        try {
            const metadata = await new Promise<ModelMetadata>((resolve, reject) => {
                const request = store.get(drawName)
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })

            if (metadata) {
                metadata.lastUsed = Date.now()
                await new Promise<void>((resolve, reject) => {
                    const request = store.put(metadata)
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                })
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour de lastUsed:", error)
        }
    }

    async getStorageStats(): Promise<{
        totalModels: number
        totalSize: number
        totalOriginalSize: number
        totalSavings: number
        averageCompressionRatio: number
        oldestModel: string | null
        newestModel: string | null
    }> {
        const metadata = await this.getAllModelMetadata()

        const totalModels = metadata.length
        const totalSize = metadata.reduce((sum, meta) => sum + meta.size, 0)
        const totalOriginalSize = metadata.reduce((sum, meta) => sum + (meta.originalSize || meta.size), 0)
        const totalSavings = totalOriginalSize - totalSize
        const averageCompressionRatio =
            metadata.reduce((sum, meta) => sum + (meta.compressionRatio || 1), 0) / Math.max(metadata.length, 1)

        let oldestModel: string | null = null
        let newestModel: string | null = null

        if (metadata.length > 0) {
            const sorted = metadata.sort((a, b) => a.createdAt - b.createdAt)
            oldestModel = sorted[0].drawName
            newestModel = sorted[sorted.length - 1].drawName
        }

        return {
            totalModels,
            totalSize,
            totalOriginalSize,
            totalSavings,
            averageCompressionRatio,
            oldestModel,
            newestModel,
        }
    }

    async cleanupOldModels(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
        const metadata = await this.getAllModelMetadata()
        const now = Date.now()
        let deletedCount = 0

        for (const meta of metadata) {
            if (now - meta.lastUsed > maxAge) {
                await this.deleteModels(meta.drawName)
                deletedCount++
            }
        }

        return deletedCount
    }

    private formatSize(bytes: number): string {
        if (bytes === 0) return "0 B"
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }
}
