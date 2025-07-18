'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  realtimeMLManager, 
  type MLModel, 
  type TrainingData, 
  type PredictionResult, 
  type LearningMetrics 
} from '../lib/realtime-ml-manager'
import { useScreenReaderAnnouncements } from './use-accessibility'
import type { PredictionRecord } from '../lib/prediction-history'
import type { DrawResult } from '../lib/constants'

interface UseRealtimeMLReturn {
  // État des modèles
  models: MLModel[]
  metrics: LearningMetrics
  systemStatus: any
  
  // Actions
  generatePrediction: (drawName: string) => Promise<PredictionResult | null>
  addTrainingData: (drawName: string, result: DrawResult, predictions: PredictionRecord[]) => Promise<void>
  forceTraining: () => Promise<boolean>
  
  // Modèles individuels
  getModelById: (id: string) => MLModel | null
  getBestModel: () => MLModel | null
  getModelPerformance: (id: string) => any
  
  // Métriques et statistiques
  getAccuracyTrend: () => Array<{ date: string; accuracy: number }>
  getLearningProgress: () => number
  getTrainingDataCount: () => number
  
  // État
  isTraining: boolean
  isPredicting: boolean
  error: string | null
}

export function useRealtimeML(): UseRealtimeMLReturn {
  const [models, setModels] = useState<MLModel[]>([])
  const [metrics, setMetrics] = useState<LearningMetrics>({
    totalSamples: 0,
    accuracyTrend: [],
    modelPerformance: {},
    featureImportance: [],
    learningRate: 0.001,
    convergence: false
  })
  const [systemStatus, setSystemStatus] = useState<any>({})
  const [isPredicting, setIsPredicting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { announce } = useScreenReaderAnnouncements()

  // Charger les données initiales
  useEffect(() => {
    const loadData = () => {
      setModels(realtimeMLManager.getModels())
      setMetrics(realtimeMLManager.getLearningMetrics())
      setSystemStatus(realtimeMLManager.getSystemStatus())
    }

    loadData()

    // Actualiser périodiquement
    const interval = setInterval(loadData, 10000) // Toutes les 10 secondes
    return () => clearInterval(interval)
  }, [])

  // Générer une prédiction
  const generatePrediction = useCallback(async (drawName: string): Promise<PredictionResult | null> => {
    setIsPredicting(true)
    setError(null)
    
    try {
      const prediction = await realtimeMLManager.generatePrediction(drawName)
      
      announce(`Prédiction IA générée pour ${drawName}: ${prediction.numbers.join(', ')} (${prediction.confidence.toFixed(1)}% confiance)`)
      return prediction
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la prédiction'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
      
    } finally {
      setIsPredicting(false)
    }
  }, [announce])

  // Ajouter des données d'entraînement
  const addTrainingData = useCallback(async (
    drawName: string, 
    result: DrawResult, 
    predictions: PredictionRecord[]
  ): Promise<void> => {
    try {
      await realtimeMLManager.addTrainingData(drawName, result, predictions)
      
      // Mettre à jour l'état local
      setModels(realtimeMLManager.getModels())
      setMetrics(realtimeMLManager.getLearningMetrics())
      setSystemStatus(realtimeMLManager.getSystemStatus())
      
      announce(`Nouvelles données d'entraînement ajoutées pour ${drawName}`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'ajout des données'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
    }
  }, [announce])

  // Forcer l'entraînement
  const forceTraining = useCallback(async (): Promise<boolean> => {
    try {
      const success = await realtimeMLManager.forceTraining()
      
      if (success) {
        // Mettre à jour l'état après l'entraînement
        setTimeout(() => {
          setModels(realtimeMLManager.getModels())
          setMetrics(realtimeMLManager.getLearningMetrics())
          setSystemStatus(realtimeMLManager.getSystemStatus())
        }, 1000)
        
        announce('Entraînement forcé démarré')
      } else {
        announce('Impossible de démarrer l\'entraînement (déjà en cours)', 'assertive')
      }
      
      return success
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'entraînement'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return false
    }
  }, [announce])

  // Obtenir un modèle par ID
  const getModelById = useCallback((id: string): MLModel | null => {
    return realtimeMLManager.getModelById(id)
  }, [])

  // Obtenir le meilleur modèle
  const getBestModel = useCallback((): MLModel | null => {
    if (models.length === 0) return null
    
    return models.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    )
  }, [models])

  // Obtenir les performances d'un modèle
  const getModelPerformance = useCallback((id: string) => {
    const model = getModelById(id)
    if (!model) return null
    
    return {
      accuracy: model.accuracy,
      precision: model.performance.precision,
      recall: model.performance.recall,
      f1Score: model.performance.f1Score,
      trainingData: model.trainingData.samples,
      lastUpdate: model.trainingData.lastUpdate,
      status: model.status
    }
  }, [getModelById])

  // Obtenir la tendance de précision
  const getAccuracyTrend = useCallback(() => {
    return metrics.accuracyTrend
  }, [metrics.accuracyTrend])

  // Obtenir le progrès d'apprentissage
  const getLearningProgress = useCallback((): number => {
    if (models.length === 0) return 0
    
    const avgAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0) / models.length
    return Math.min(100, avgAccuracy * 100)
  }, [models])

  // Obtenir le nombre de données d'entraînement
  const getTrainingDataCount = useCallback((): number => {
    return metrics.totalSamples
  }, [metrics.totalSamples])

  return {
    // État
    models,
    metrics,
    systemStatus,
    
    // Actions
    generatePrediction,
    addTrainingData,
    forceTraining,
    
    // Modèles
    getModelById,
    getBestModel,
    getModelPerformance,
    
    // Métriques
    getAccuracyTrend,
    getLearningProgress,
    getTrainingDataCount,
    
    // État
    isTraining: systemStatus.isTraining || false,
    isPredicting,
    error
  }
}

// Hook simplifié pour les prédictions IA
export function useAIPredictions() {
  const { generatePrediction, isPredicting, getBestModel } = useRealtimeML()
  
  const predictNumbers = useCallback(async (drawName: string) => {
    const prediction = await generatePrediction(drawName)
    return prediction ? {
      numbers: prediction.numbers,
      confidence: prediction.confidence,
      algorithm: 'AI_Ensemble',
      reasoning: prediction.reasoning
    } : null
  }, [generatePrediction])
  
  const bestModel = getBestModel()
  
  return {
    predictNumbers,
    isPredicting,
    bestModelAccuracy: bestModel?.accuracy || 0,
    isAvailable: !!bestModel
  }
}

// Hook pour les métriques ML
export function useMLMetrics() {
  const { models, metrics, getAccuracyTrend, getLearningProgress, getTrainingDataCount } = useRealtimeML()
  
  const modelStats = {
    totalModels: models.length,
    activeModels: models.filter(m => m.status === 'ready').length,
    trainingModels: models.filter(m => m.status === 'training' || m.status === 'updating').length,
    avgAccuracy: models.length > 0 ? models.reduce((sum, m) => sum + m.accuracy, 0) / models.length : 0,
    bestAccuracy: models.length > 0 ? Math.max(...models.map(m => m.accuracy)) : 0
  }
  
  const learningStats = {
    totalSamples: getTrainingDataCount(),
    learningProgress: getLearningProgress(),
    accuracyTrend: getAccuracyTrend(),
    isConverged: metrics.convergence,
    learningRate: metrics.learningRate
  }
  
  const getHealthScore = useCallback(() => {
    let score = 0
    
    // Score basé sur le nombre de modèles actifs
    score += Math.min(30, modelStats.activeModels * 10)
    
    // Score basé sur la précision moyenne
    score += modelStats.avgAccuracy * 40
    
    // Score basé sur les données d'entraînement
    score += Math.min(20, learningStats.totalSamples / 100)
    
    // Score basé sur la convergence
    if (learningStats.isConverged) score += 10
    
    return Math.min(100, score)
  }, [modelStats, learningStats])
  
  return {
    modelStats,
    learningStats,
    healthScore: getHealthScore(),
    hasData: models.length > 0
  }
}

// Hook pour l'entraînement automatique
export function useAutoTraining() {
  const { addTrainingData, systemStatus } = useRealtimeML()
  
  const handleNewResult = useCallback(async (
    drawName: string, 
    result: DrawResult, 
    predictions: PredictionRecord[]
  ) => {
    // Ajouter automatiquement les nouvelles données
    await addTrainingData(drawName, result, predictions)
  }, [addTrainingData])
  
  const isTrainingActive = systemStatus.isTraining
  const queueSize = systemStatus.queueSize || 0
  const canTrain = !isTrainingActive && queueSize > 0
  
  return {
    handleNewResult,
    isTrainingActive,
    queueSize,
    canTrain
  }
}

// Hook pour la comparaison de modèles
export function useModelComparison() {
  const { models, getModelPerformance } = useRealtimeML()
  
  const compareModels = useCallback((modelIds: string[]) => {
    return modelIds.map(id => {
      const model = models.find(m => m.id === id)
      const performance = getModelPerformance(id)
      
      return {
        id,
        name: model?.name || 'Inconnu',
        type: model?.type || 'unknown',
        performance,
        rank: 0 // Sera calculé après tri
      }
    }).sort((a, b) => (b.performance?.accuracy || 0) - (a.performance?.accuracy || 0))
      .map((model, index) => ({ ...model, rank: index + 1 }))
  }, [models, getModelPerformance])
  
  const getBestModelByType = useCallback((type: MLModel['type']) => {
    const modelsOfType = models.filter(m => m.type === type)
    if (modelsOfType.length === 0) return null
    
    return modelsOfType.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    )
  }, [models])
  
  return {
    compareModels,
    getBestModelByType,
    availableTypes: [...new Set(models.map(m => m.type))]
  }
}
