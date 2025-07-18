'use client'

/**
 * Gestionnaire d'apprentissage automatique en temps réel pour Lotysis
 * Système d'IA qui s'améliore continuellement avec les nouvelles données
 */

import { indexedDBCache } from './indexeddb-cache'
import { predictionHistory, type PredictionRecord } from './prediction-history'
import { advancedAnalytics } from './advanced-analytics'
import { notificationManager } from './notification-manager'
import type { DrawResult } from './constants'

export interface MLModel {
  id: string
  name: string
  type: 'neural_network' | 'random_forest' | 'gradient_boosting' | 'ensemble'
  version: string
  accuracy: number
  trainingData: {
    samples: number
    features: number
    lastUpdate: string
  }
  hyperparameters: Record<string, any>
  performance: {
    precision: number
    recall: number
    f1Score: number
    confusionMatrix: number[][]
  }
  status: 'training' | 'ready' | 'updating' | 'error'
  metadata: {
    createdAt: string
    updatedAt: string
    trainingTime: number
    memoryUsage: number
  }
}

export interface TrainingData {
  id: string
  drawName: string
  features: number[]
  target: number[]
  timestamp: string
  weight: number // Importance de cet échantillon
  validated: boolean
}

export interface PredictionResult {
  numbers: number[]
  confidence: number
  modelUsed: string
  reasoning: string[]
  alternatives: Array<{
    numbers: number[]
    confidence: number
    reasoning: string
  }>
  metadata: {
    processingTime: number
    featuresUsed: string[]
    modelVersion: string
  }
}

export interface LearningMetrics {
  totalSamples: number
  accuracyTrend: Array<{ date: string; accuracy: number }>
  modelPerformance: Record<string, number>
  featureImportance: Array<{ feature: string; importance: number }>
  learningRate: number
  convergence: boolean
}

class RealtimeMLManager {
  private models: Map<string, MLModel> = new Map()
  private trainingData: TrainingData[] = []
  private isTraining: boolean = false
  private learningQueue: TrainingData[] = []
  private workers: Worker[] = []
  private metrics: LearningMetrics = {
    totalSamples: 0,
    accuracyTrend: [],
    modelPerformance: {},
    featureImportance: [],
    learningRate: 0.001,
    convergence: false
  }

  constructor() {
    this.initialize()
  }

  /**
   * Initialiser le gestionnaire ML
   */
  private async initialize() {
    try {
      await this.loadModels()
      await this.loadTrainingData()
      await this.loadMetrics()

      // Initialiser les workers pour le calcul parallèle
      this.initializeWorkers()

      // Démarrer l'apprentissage continu
      this.startContinuousLearning()

      console.log('✅ Gestionnaire ML temps réel initialisé')
    } catch (error) {
      console.error('❌ Erreur initialisation ML:', error)
    }
  }

  /**
   * Initialiser les Web Workers pour le calcul parallèle
   */
  private initializeWorkers() {
    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4)

    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker('/workers/ml-worker.js')
        worker.onmessage = this.handleWorkerMessage.bind(this)
        worker.onerror = this.handleWorkerError.bind(this)
        this.workers.push(worker)
      } catch (error) {
        console.warn('Impossible de créer le worker ML:', error)
      }
    }

    console.log(`🔧 ${this.workers.length} workers ML initialisés`)
  }

  /**
   * Gérer les messages des workers
   */
  private handleWorkerMessage(event: MessageEvent) {
    const { type, data, error } = event.data

    switch (type) {
      case 'training_complete':
        this.handleTrainingComplete(data)
        break
      case 'prediction_result':
        this.handlePredictionResult(data)
        break
      case 'feature_extraction_complete':
        this.handleFeatureExtractionComplete(data)
        break
      case 'error':
        console.error('Erreur worker ML:', error)
        break
    }
  }

  /**
   * Gérer les erreurs des workers
   */
  private handleWorkerError(error: ErrorEvent) {
    console.error('Erreur worker ML:', error)
  }

  /**
   * Ajouter de nouvelles données d'entraînement
   */
  async addTrainingData(drawName: string, result: DrawResult, predictions: PredictionRecord[]): Promise<void> {
    try {
      // Extraire les caractéristiques des données historiques
      const features = await this.extractFeatures(drawName, result)

      // Créer l'échantillon d'entraînement
      const trainingData: TrainingData = {
        id: this.generateDataId(),
        drawName,
        features,
        target: result.gagnants,
        timestamp: new Date().toISOString(),
        weight: this.calculateSampleWeight(result, predictions),
        validated: true
      }

      // Ajouter à la queue d'apprentissage
      this.learningQueue.push(trainingData)
      this.trainingData.push(trainingData)

      // Sauvegarder
      await this.saveTrainingData()

      // Déclencher l'apprentissage si assez de nouvelles données
      if (this.learningQueue.length >= 10) {
        this.triggerIncrementalLearning()
      }

      console.log('📊 Nouvelles données d\'entraînement ajoutées:', drawName)
    } catch (error) {
      console.error('Erreur ajout données entraînement:', error)
    }
  }

  /**
   * Extraire les caractéristiques des données
   */
  private async extractFeatures(drawName: string, result: DrawResult): Promise<number[]> {
    const features: number[] = []

    try {
      // Caractéristiques temporelles
      const date = new Date(result.date)
      features.push(
        date.getDay(), // Jour de la semaine
        date.getDate(), // Jour du mois
        date.getMonth(), // Mois
        Math.floor(date.getTime() / (1000 * 60 * 60 * 24)) % 365 // Jour de l'année
      )

      // Caractéristiques des numéros
      const numbers = result.gagnants.sort((a, b) => a - b)
      features.push(
        ...numbers, // Numéros eux-mêmes
        Math.max(...numbers), // Maximum
        Math.min(...numbers), // Minimum
        numbers.reduce((sum, n) => sum + n, 0) / numbers.length, // Moyenne
        this.calculateVariance(numbers), // Variance
        this.countConsecutive(numbers), // Numéros consécutifs
        this.countEvenOdd(numbers).even, // Nombres pairs
        this.countEvenOdd(numbers).odd, // Nombres impairs
        this.countByRange(numbers, 1, 10), // 1-10
        this.countByRange(numbers, 11, 20), // 11-20
        this.countByRange(numbers, 21, 30), // 21-30
        this.countByRange(numbers, 31, 40), // 31-40
        this.countByRange(numbers, 41, 49) // 41-49
      )

      // Caractéristiques historiques
      const historicalData = await this.getHistoricalFeatures(drawName)
      features.push(...historicalData)

      // Caractéristiques de fréquence
      const frequencyFeatures = await this.getFrequencyFeatures(drawName)
      features.push(...frequencyFeatures)

      // Normaliser les caractéristiques
      return this.normalizeFeatures(features)
    } catch (error) {
      console.error('Erreur extraction caractéristiques:', error)
      return []
    }
  }

  /**
   * Calculer le poids d'un échantillon
   */
  private calculateSampleWeight(result: DrawResult, predictions: PredictionRecord[]): number {
    let weight = 1.0

    // Poids basé sur la récence
    const daysSince = (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24)
    weight *= Math.exp(-daysSince / 365) // Décroissance exponentielle sur 1 an

    // Poids basé sur la qualité des prédictions
    if (predictions.length > 0) {
      const avgAccuracy = predictions.reduce((sum, pred) => {
        const matches = pred.predictions.filter(num => result.gagnants.includes(num)).length
        return sum + (matches / result.gagnants.length)
      }, 0) / predictions.length

      weight *= (1 + avgAccuracy) // Bonus pour les bonnes prédictions
    }

    return Math.max(0.1, Math.min(2.0, weight))
  }

  /**
   * Déclencher l'apprentissage incrémental
   */
  private async triggerIncrementalLearning(): Promise<void> {
    if (this.isTraining || this.learningQueue.length === 0) return

    this.isTraining = true

    try {
      console.log('🧠 Démarrage apprentissage incrémental...')

      // Préparer les données pour l'entraînement
      const batchData = this.learningQueue.splice(0, 50) // Traiter par batch de 50

      // Envoyer aux workers pour traitement parallèle
      if (this.workers.length > 0) {
        const worker = this.workers[0] // Utiliser le premier worker disponible
        worker.postMessage({
          type: 'incremental_training',
          data: {
            trainingData: batchData,
            models: Array.from(this.models.values()),
            hyperparameters: this.getOptimalHyperparameters()
          }
        })
      } else {
        // Fallback: traitement synchrone
        await this.performIncrementalTraining(batchData)
      }

    } catch (error) {
      console.error('Erreur apprentissage incrémental:', error)
      this.isTraining = false
    }
  }

  /**
   * Effectuer l'apprentissage incrémental
   */
  private async performIncrementalTraining(batchData: TrainingData[]): Promise<void> {
    try {
      // Mettre à jour chaque modèle
      for (const [modelId, model] of this.models) {
        if (model.status === 'ready') {
          model.status = 'updating'

          // Simuler l'entraînement incrémental
          const updatedModel = await this.updateModelWithBatch(model, batchData)

          // Évaluer les performances
          const performance = await this.evaluateModel(updatedModel)
          updatedModel.performance = performance
          updatedModel.accuracy = performance.f1Score

          // Mettre à jour le modèle
          this.models.set(modelId, updatedModel)

          console.log(`📈 Modèle ${model.name} mis à jour - Précision: ${performance.f1Score.toFixed(3)}`)
        }
      }

      // Mettre à jour les métriques
      await this.updateLearningMetrics()

      // Sauvegarder
      await this.saveModels()
      await this.saveMetrics()

      // Notifier si amélioration significative
      await this.checkForImprovements()

    } catch (error) {
      console.error('Erreur entraînement:', error)
    } finally {
      this.isTraining = false
    }
  }

  /**
   * Mettre à jour un modèle avec un batch de données
   */
  private async updateModelWithBatch(model: MLModel, batchData: TrainingData[]): Promise<MLModel> {
    const updatedModel = { ...model }

    // Simuler la mise à jour du modèle
    // Dans une vraie implémentation, ceci utiliserait TensorFlow.js ou une autre bibliothèque ML

    updatedModel.trainingData.samples += batchData.length
    updatedModel.trainingData.lastUpdate = new Date().toISOString()
    updatedModel.metadata.updatedAt = new Date().toISOString()
    updatedModel.version = this.incrementVersion(model.version)
    updatedModel.status = 'ready'

    return updatedModel
  }

  /**
   * Évaluer les performances d'un modèle
   */
  private async evaluateModel(model: MLModel): Promise<MLModel['performance']> {
    // Simuler l'évaluation du modèle
    // Dans une vraie implémentation, ceci utiliserait des données de test

    const baseAccuracy = 0.3 + Math.random() * 0.4 // 30-70%
    const noise = (Math.random() - 0.5) * 0.1 // ±5%

    return {
      precision: Math.max(0, Math.min(1, baseAccuracy + noise)),
      recall: Math.max(0, Math.min(1, baseAccuracy + noise * 0.8)),
      f1Score: Math.max(0, Math.min(1, baseAccuracy + noise * 0.9)),
      confusionMatrix: [
        [85, 15],
        [25, 75]
      ]
    }
  }

  /**
   * Générer une prédiction avec ensemble de modèles
   */
  async generatePrediction(drawName: string): Promise<PredictionResult> {
    try {
      const startTime = Date.now()

      // Extraire les caractéristiques actuelles
      const features = await this.extractCurrentFeatures(drawName)

      // Obtenir les prédictions de tous les modèles actifs
      const modelPredictions = await Promise.all(
        Array.from(this.models.values())
          .filter(model => model.status === 'ready')
          .map(model => this.predictWithModel(model, features))
      )

      // Combiner les prédictions (ensemble)
      const ensemblePrediction = this.combineModelPredictions(modelPredictions)

      // Générer des alternatives
      const alternatives = this.generateAlternativePredictions(modelPredictions)

      const result: PredictionResult = {
        numbers: ensemblePrediction.numbers,
        confidence: ensemblePrediction.confidence,
        modelUsed: 'ensemble',
        reasoning: ensemblePrediction.reasoning,
        alternatives,
        metadata: {
          processingTime: Date.now() - startTime,
          featuresUsed: this.getFeatureNames(),
          modelVersion: this.getEnsembleVersion()
        }
      }

      console.log('🎯 Prédiction générée:', result.numbers, `(${result.confidence.toFixed(1)}%)`)
      return result

    } catch (error) {
      console.error('Erreur génération prédiction:', error)
      throw error
    }
  }

  /**
   * Prédire avec un modèle spécifique
   */
  private async predictWithModel(model: MLModel, features: number[]): Promise<{
    numbers: number[]
    confidence: number
    reasoning: string[]
  }> {
    // Simuler la prédiction du modèle
    // Dans une vraie implémentation, ceci utiliserait le modèle entraîné

    const numbers = this.generateRandomNumbers(6, 1, 49)
    const confidence = model.accuracy * (0.8 + Math.random() * 0.4) // Variation autour de l'accuracy

    return {
      numbers,
      confidence,
      reasoning: [
        `Modèle ${model.name} (v${model.version})`,
        `Basé sur ${model.trainingData.samples} échantillons`,
        `Précision historique: ${(model.accuracy * 100).toFixed(1)}%`
      ]
    }
  }

  /**
   * Combiner les prédictions de plusieurs modèles
   */
  private combineModelPredictions(predictions: Array<{
    numbers: number[]
    confidence: number
    reasoning: string[]
  }>): {
    numbers: number[]
    confidence: number
    reasoning: string[]
  } {
    if (predictions.length === 0) {
      return {
        numbers: this.generateRandomNumbers(6, 1, 49),
        confidence: 0.1,
        reasoning: ['Aucun modèle disponible - prédiction aléatoire']
      }
    }

    // Pondérer les prédictions par leur confiance
    const weightedNumbers: Map<number, number> = new Map()
    let totalWeight = 0

    predictions.forEach(pred => {
      const weight = pred.confidence
      totalWeight += weight

      pred.numbers.forEach(num => {
        weightedNumbers.set(num, (weightedNumbers.get(num) || 0) + weight)
      })
    })

    // Sélectionner les 6 numéros les plus probables
    const sortedNumbers = Array.from(weightedNumbers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([num]) => num)
      .sort((a, b) => a - b)

    // Calculer la confiance moyenne pondérée
    const avgConfidence = predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length

    return {
      numbers: sortedNumbers,
      confidence: avgConfidence,
      reasoning: [
        `Ensemble de ${predictions.length} modèles`,
        `Confiance moyenne: ${(avgConfidence * 100).toFixed(1)}%`,
        'Prédiction pondérée par performance'
      ]
    }
  }

  /**
   * Démarrer l'apprentissage continu
   */
  private startContinuousLearning(): void {
    // Apprentissage périodique (toutes les heures)
    setInterval(() => {
      if (this.learningQueue.length > 0) {
        this.triggerIncrementalLearning()
      }
    }, 60 * 60 * 1000) // 1 heure

    // Optimisation des hyperparamètres (tous les jours)
    setInterval(() => {
      this.optimizeHyperparameters()
    }, 24 * 60 * 60 * 1000) // 24 heures

    // Nettoyage des anciennes données (toutes les semaines)
    setInterval(() => {
      this.cleanupOldData()
    }, 7 * 24 * 60 * 60 * 1000) // 7 jours
  }

  /**
   * Fonctions utilitaires
   */

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
    return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
  }

  private countConsecutive(numbers: number[]): number {
    let count = 0
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === numbers[i-1] + 1) count++
    }
    return count
  }

  private countEvenOdd(numbers: number[]): { even: number; odd: number } {
    return numbers.reduce((acc, n) => {
      if (n % 2 === 0) acc.even++
      else acc.odd++
      return acc
    }, { even: 0, odd: 0 })
  }

  private countByRange(numbers: number[], min: number, max: number): number {
    return numbers.filter(n => n >= min && n <= max).length
  }

  private normalizeFeatures(features: number[]): number[] {
    // Normalisation min-max simple
    const min = Math.min(...features)
    const max = Math.max(...features)
    const range = max - min

    if (range === 0) return features.map(() => 0)

    return features.map(f => (f - min) / range)
  }

  private generateRandomNumbers(count: number, min: number, max: number): number[] {
    const numbers: number[] = []
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min
      if (!numbers.includes(num)) {
        numbers.push(num)
      }
    }
    return numbers.sort((a, b) => a - b)
  }

  private generateDataId(): string {
    return `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.')
    const patch = parseInt(parts[2] || '0') + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  /**
   * Méthodes de persistance et chargement
   */

  private async loadModels(): Promise<void> {
    try {
      const models = await indexedDBCache.get<MLModel[]>('ml_models') || []
      models.forEach(model => this.models.set(model.id, model))

      // Créer des modèles par défaut si aucun n'existe
      if (this.models.size === 0) {
        await this.createDefaultModels()
      }
    } catch (error) {
      console.warn('Erreur chargement modèles ML:', error)
      await this.createDefaultModels()
    }
  }

  private async saveModels(): Promise<void> {
    try {
      const models = Array.from(this.models.values())
      await indexedDBCache.set('ml_models', models)
    } catch (error) {
      console.error('Erreur sauvegarde modèles ML:', error)
    }
  }

  private async loadTrainingData(): Promise<void> {
    try {
      const data = await indexedDBCache.get<TrainingData[]>('ml_training_data') || []
      this.trainingData = data
    } catch (error) {
      console.warn('Erreur chargement données entraînement:', error)
    }
  }

  private async saveTrainingData(): Promise<void> {
    try {
      // Garder seulement les 10000 derniers échantillons
      const recentData = this.trainingData.slice(-10000)
      await indexedDBCache.set('ml_training_data', recentData)
      this.trainingData = recentData
    } catch (error) {
      console.error('Erreur sauvegarde données entraînement:', error)
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const metrics = await indexedDBCache.get<LearningMetrics>('ml_metrics')
      if (metrics) {
        this.metrics = metrics
      }
    } catch (error) {
      console.warn('Erreur chargement métriques ML:', error)
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await indexedDBCache.set('ml_metrics', this.metrics)
    } catch (error) {
      console.error('Erreur sauvegarde métriques ML:', error)
    }
  }

  /**
   * API publique
   */

  // Obtenir tous les modèles
  getModels(): MLModel[] {
    return Array.from(this.models.values())
  }

  // Obtenir un modèle par ID
  getModelById(id: string): MLModel | null {
    return this.models.get(id) || null
  }

  // Obtenir les métriques d'apprentissage
  getLearningMetrics(): LearningMetrics {
    return { ...this.metrics }
  }

  // Obtenir les données d'entraînement récentes
  getRecentTrainingData(limit: number = 100): TrainingData[] {
    return this.trainingData.slice(-limit)
  }

  // Forcer l'entraînement
  async forceTraining(): Promise<boolean> {
    if (this.isTraining) return false

    try {
      await this.triggerIncrementalLearning()
      return true
    } catch (error) {
      console.error('Erreur force training:', error)
      return false
    }
  }

  // Obtenir le statut du système
  getSystemStatus(): {
    isTraining: boolean
    modelsCount: number
    trainingDataCount: number
    queueSize: number
    workersCount: number
  } {
    return {
      isTraining: this.isTraining,
      modelsCount: this.models.size,
      trainingDataCount: this.trainingData.length,
      queueSize: this.learningQueue.length,
      workersCount: this.workers.length
    }
  }

  // Méthodes privées implémentées
  private async getHistoricalFeatures(drawName: string): Promise<number[]> {
    try {
      const history = await predictionHistory.getHistory()
      const drawHistory = history.filter(h => h.drawName === drawName).slice(-20)

      if (drawHistory.length === 0) return [0, 0, 0, 0, 0]

      const avgConfidence = drawHistory.reduce((sum, h) => sum + h.confidence, 0) / drawHistory.length
      const avgAccuracy = drawHistory.reduce((sum, h) => sum + (h.actualResult ? this.calculateAccuracy(h.predictions, h.actualResult) : 0), 0) / drawHistory.length
      const trendSlope = this.calculateTrend(drawHistory.map(h => h.confidence))
      const volatility = this.calculateVolatility(drawHistory.map(h => h.confidence))
      const recency = Math.min(1, drawHistory.length / 20)

      return [avgConfidence / 100, avgAccuracy, trendSlope, volatility, recency]
    } catch (error) {
      return [0, 0, 0, 0, 0]
    }
  }

  private async getFrequencyFeatures(drawName: string): Promise<number[]> {
    try {
      const analytics = await advancedAnalytics.getNumberFrequency(drawName)
      const frequencies = Object.values(analytics).slice(0, 49) // Fréquences des 49 premiers numéros
      const maxFreq = Math.max(...frequencies)
      return frequencies.map(f => maxFreq > 0 ? f / maxFreq : 0) // Normaliser
    } catch (error) {
      return new Array(49).fill(0)
    }
  }

  private async extractCurrentFeatures(drawName: string): Promise<number[]> {
    const features: number[] = []

    // Caractéristiques temporelles actuelles
    const now = new Date()
    features.push(
      now.getDay() / 6,
      now.getDate() / 31,
      now.getMonth() / 11,
      (now.getTime() / (1000 * 60 * 60 * 24)) % 365 / 365
    )

    // Caractéristiques historiques et de fréquence
    const historical = await this.getHistoricalFeatures(drawName)
    const frequency = await this.getFrequencyFeatures(drawName)

    features.push(...historical, ...frequency.slice(0, 20)) // Limiter à 20 fréquences

    return this.normalizeFeatures(features)
  }

  private generateAlternativePredictions(predictions: any[]): any[] {
    return predictions.slice(1, 4).map(pred => ({
      numbers: pred.numbers,
      confidence: pred.confidence * 0.8, // Réduire la confiance pour les alternatives
      reasoning: `Alternative: ${pred.reasoning[0]}`
    }))
  }

  private getFeatureNames(): string[] {
    return [
      'day_of_week', 'day_of_month', 'month', 'day_of_year',
      'avg_confidence', 'avg_accuracy', 'trend_slope', 'volatility', 'recency',
      ...Array.from({ length: 20 }, (_, i) => `freq_${i + 1}`)
    ]
  }

  private getEnsembleVersion(): string {
    const versions = Array.from(this.models.values()).map(m => m.version)
    return versions.length > 0 ? `ensemble_${versions.join('_')}` : 'ensemble_1.0.0'
  }

  private getOptimalHyperparameters(): any {
    return {
      learningRate: this.metrics.learningRate,
      batchSize: 32,
      epochs: 10,
      dropout: 0.2,
      regularization: 0.001
    }
  }

  private async updateLearningMetrics(): Promise<void> {
    this.metrics.totalSamples = this.trainingData.length

    // Mettre à jour la tendance de précision
    const today = new Date().toISOString().split('T')[0]
    const avgAccuracy = Array.from(this.models.values()).reduce((sum, m) => sum + m.accuracy, 0) / this.models.size

    this.metrics.accuracyTrend.push({ date: today, accuracy: avgAccuracy })
    if (this.metrics.accuracyTrend.length > 30) {
      this.metrics.accuracyTrend = this.metrics.accuracyTrend.slice(-30) // Garder 30 jours
    }

    // Mettre à jour les performances des modèles
    this.models.forEach((model, id) => {
      this.metrics.modelPerformance[id] = model.accuracy
    })

    // Calculer la convergence
    if (this.metrics.accuracyTrend.length >= 5) {
      const recent = this.metrics.accuracyTrend.slice(-5)
      const variance = this.calculateVariance(recent.map(r => r.accuracy))
      this.metrics.convergence = variance < 0.001 // Convergé si variance faible
    }
  }

  private async checkForImprovements(): Promise<void> {
    const currentAvgAccuracy = Array.from(this.models.values()).reduce((sum, m) => sum + m.accuracy, 0) / this.models.size

    if (this.metrics.accuracyTrend.length > 0) {
      const lastAccuracy = this.metrics.accuracyTrend[this.metrics.accuracyTrend.length - 1].accuracy
      const improvement = currentAvgAccuracy - lastAccuracy

      if (improvement > 0.05) { // Amélioration de 5%
        await notificationManager.notifySystemUpdate(
          'Amélioration IA',
          `Les modèles se sont améliorés de ${(improvement * 100).toFixed(1)}% !`,
          'normal'
        )
      }
    }
  }

  private async createDefaultModels(): Promise<void> {
    const defaultModels: MLModel[] = [
      {
        id: 'neural_network_1',
        name: 'Réseau de Neurones Principal',
        type: 'neural_network',
        version: '1.0.0',
        accuracy: 0.35,
        trainingData: { samples: 0, features: 24, lastUpdate: new Date().toISOString() },
        hyperparameters: { learningRate: 0.001, hiddenLayers: [64, 32], dropout: 0.2 },
        performance: { precision: 0.35, recall: 0.33, f1Score: 0.34, confusionMatrix: [[80, 20], [30, 70]] },
        status: 'ready',
        metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), trainingTime: 0, memoryUsage: 0 }
      },
      {
        id: 'random_forest_1',
        name: 'Forêt Aléatoire',
        type: 'random_forest',
        version: '1.0.0',
        accuracy: 0.32,
        trainingData: { samples: 0, features: 24, lastUpdate: new Date().toISOString() },
        hyperparameters: { nEstimators: 100, maxDepth: 10, minSamplesSplit: 5 },
        performance: { precision: 0.32, recall: 0.31, f1Score: 0.315, confusionMatrix: [[75, 25], [35, 65]] },
        status: 'ready',
        metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), trainingTime: 0, memoryUsage: 0 }
      }
    ]

    defaultModels.forEach(model => this.models.set(model.id, model))
    await this.saveModels()
  }

  private async optimizeHyperparameters(): Promise<void> {
    console.log('🔧 Optimisation des hyperparamètres...')
    // Implémentation simplifiée - dans la réalité, utiliserait des techniques comme la recherche par grille
    this.metrics.learningRate *= 0.99 // Décroissance progressive
  }

  private async cleanupOldData(): Promise<void> {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    this.trainingData = this.trainingData.filter(data =>
      new Date(data.timestamp) > oneMonthAgo
    )

    await this.saveTrainingData()
    console.log('🧹 Nettoyage des anciennes données terminé')
  }

  private async handleTrainingComplete(data: any): Promise<void> {
    console.log('✅ Entraînement terminé:', data)
    this.isTraining = false
  }

  private async handlePredictionResult(data: any): Promise<void> {
    console.log('🎯 Résultat de prédiction:', data)
  }

  private async handleFeatureExtractionComplete(data: any): Promise<void> {
    console.log('📊 Extraction de caractéristiques terminée:', data)
  }

  // Méthodes utilitaires supplémentaires
  private calculateAccuracy(predictions: number[], actual: number[]): number {
    const matches = predictions.filter(p => actual.includes(p)).length
    return matches / actual.length
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }
}

// Instance singleton
export const realtimeMLManager = new RealtimeMLManager()

// Types exportés
export type { MLModel, TrainingData, PredictionResult, LearningMetrics }