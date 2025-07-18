'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  predictionHistory, 
  type PredictionRecord, 
  type PredictionPerformance, 
  type HistoryAnalytics 
} from '../lib/prediction-history'
import { DrawResult } from '../lib/constants'
import { useScreenReaderAnnouncements } from './use-accessibility'

interface UsePredictionHistoryReturn {
  // État
  history: PredictionRecord[]
  analytics: HistoryAnalytics | null
  loading: boolean
  error: string | null
  
  // Actions
  savePrediction: (prediction: Omit<PredictionRecord, 'id' | 'timestamp' | 'verified'>) => Promise<string | null>
  verifyPrediction: (predictionId: string, actualResult: number[]) => Promise<PredictionPerformance | null>
  autoVerifyPredictions: (drawResults: DrawResult[]) => Promise<number>
  deletePrediction: (predictionId: string) => Promise<boolean>
  refreshHistory: () => Promise<void>
  refreshAnalytics: () => Promise<void>
  exportHistory: (format?: 'json' | 'csv') => Promise<string | null>
  cleanupHistory: (olderThanDays?: number) => Promise<number>
  
  // Filtres
  applyFilters: (filters: {
    drawName?: string
    algorithm?: string
    verified?: boolean
    dateFrom?: string
    dateTo?: string
    limit?: number
  }) => void
  clearFilters: () => void
  
  // Statistiques
  getAlgorithmPerformance: (algorithm: string) => {
    count: number
    averageAccuracy: number
    bestScore: number
    successRate: number
  } | null
  getRecentPerformance: (days?: number) => {
    predictions: number
    accuracy: number
    trend: 'improving' | 'declining' | 'stable'
  }
  
  // État des filtres
  activeFilters: Record<string, any>
  hasFilters: boolean
}

export function usePredictionHistory(): UsePredictionHistoryReturn {
  const [history, setHistory] = useState<PredictionRecord[]>([])
  const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const { announce } = useScreenReaderAnnouncements()

  // Charger l'historique initial
  useEffect(() => {
    refreshHistory()
    refreshAnalytics()
  }, [])

  // Rafraîchir l'historique
  const refreshHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const historyData = await predictionHistory.getHistory(activeFilters)
      setHistory(historyData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'historique'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
    } finally {
      setLoading(false)
    }
  }, [activeFilters, announce])

  // Rafraîchir les analytics
  const refreshAnalytics = useCallback(async () => {
    try {
      const analyticsData = await predictionHistory.getAnalytics()
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Erreur chargement analytics:', err)
    }
  }, [])

  // Sauvegarder une prédiction
  const savePrediction = useCallback(async (
    prediction: Omit<PredictionRecord, 'id' | 'timestamp' | 'verified'>
  ): Promise<string | null> => {
    setError(null)
    
    try {
      const predictionId = await predictionHistory.savePrediction(prediction)
      await refreshHistory()
      await refreshAnalytics()
      
      announce(`Prédiction sauvegardée avec succès pour ${prediction.drawName}`)
      return predictionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
    }
  }, [refreshHistory, refreshAnalytics, announce])

  // Vérifier une prédiction
  const verifyPrediction = useCallback(async (
    predictionId: string, 
    actualResult: number[]
  ): Promise<PredictionPerformance | null> => {
    setError(null)
    
    try {
      const performance = await predictionHistory.verifyPrediction(predictionId, actualResult)
      await refreshHistory()
      await refreshAnalytics()
      
      announce(`Prédiction vérifiée: ${performance.accuracy.toFixed(1)}% de précision`)
      return performance
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
    }
  }, [refreshHistory, refreshAnalytics, announce])

  // Vérification automatique
  const autoVerifyPredictions = useCallback(async (drawResults: DrawResult[]): Promise<number> => {
    setError(null)
    
    try {
      const verifiedCount = await predictionHistory.autoVerifyPredictions(drawResults)
      
      if (verifiedCount > 0) {
        await refreshHistory()
        await refreshAnalytics()
        announce(`${verifiedCount} prédiction(s) vérifiée(s) automatiquement`)
      }
      
      return verifiedCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification automatique'
      setError(errorMessage)
      return 0
    }
  }, [refreshHistory, refreshAnalytics, announce])

  // Supprimer une prédiction
  const deletePrediction = useCallback(async (predictionId: string): Promise<boolean> => {
    setError(null)
    
    try {
      const success = await predictionHistory.deletePrediction(predictionId)
      
      if (success) {
        await refreshHistory()
        await refreshAnalytics()
        announce('Prédiction supprimée avec succès')
      } else {
        announce('Prédiction non trouvée', 'assertive')
      }
      
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return false
    }
  }, [refreshHistory, refreshAnalytics, announce])

  // Exporter l'historique
  const exportHistory = useCallback(async (format: 'json' | 'csv' = 'json'): Promise<string | null> => {
    setError(null)
    
    try {
      const exportData = await predictionHistory.exportHistory(format)
      announce(`Historique exporté au format ${format.toUpperCase()}`)
      return exportData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'export'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
    }
  }, [announce])

  // Nettoyer l'historique
  const cleanupHistory = useCallback(async (olderThanDays: number = 90): Promise<number> => {
    setError(null)
    
    try {
      const deletedCount = await predictionHistory.cleanupHistory(olderThanDays)
      
      if (deletedCount > 0) {
        await refreshHistory()
        await refreshAnalytics()
        announce(`${deletedCount} prédiction(s) ancienne(s) supprimée(s)`)
      }
      
      return deletedCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du nettoyage'
      setError(errorMessage)
      return 0
    }
  }, [refreshHistory, refreshAnalytics, announce])

  // Appliquer des filtres
  const applyFilters = useCallback((filters: Record<string, any>) => {
    setActiveFilters(filters)
  }, [])

  // Effacer les filtres
  const clearFilters = useCallback(() => {
    setActiveFilters({})
  }, [])

  // Rafraîchir quand les filtres changent
  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  // Obtenir les performances d'un algorithme
  const getAlgorithmPerformance = useCallback((algorithm: string) => {
    if (!analytics || !analytics.algorithmStats[algorithm]) {
      return null
    }
    
    return analytics.algorithmStats[algorithm]
  }, [analytics])

  // Obtenir les performances récentes
  const getRecentPerformance = useCallback((days: number = 30) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const recentPredictions = history.filter(p => 
      p.verified && new Date(p.timestamp) > cutoffDate
    )
    
    if (recentPredictions.length === 0) {
      return { predictions: 0, accuracy: 0, trend: 'stable' as const }
    }
    
    const totalAccuracy = recentPredictions.reduce((sum, p) => 
      sum + (p.performance?.accuracy || 0), 0
    )
    const averageAccuracy = totalAccuracy / recentPredictions.length
    
    // Calculer la tendance (comparer première et seconde moitié)
    const midPoint = Math.floor(recentPredictions.length / 2)
    const firstHalf = recentPredictions.slice(0, midPoint)
    const secondHalf = recentPredictions.slice(midPoint)
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAccuracy = firstHalf.reduce((sum, p) => 
        sum + (p.performance?.accuracy || 0), 0
      ) / firstHalf.length
      
      const secondHalfAccuracy = secondHalf.reduce((sum, p) => 
        sum + (p.performance?.accuracy || 0), 0
      ) / secondHalf.length
      
      const difference = secondHalfAccuracy - firstHalfAccuracy
      
      if (difference > 5) trend = 'improving'
      else if (difference < -5) trend = 'declining'
    }
    
    return {
      predictions: recentPredictions.length,
      accuracy: Math.round(averageAccuracy * 100) / 100,
      trend
    }
  }, [history])

  return {
    // État
    history,
    analytics,
    loading,
    error,
    
    // Actions
    savePrediction,
    verifyPrediction,
    autoVerifyPredictions,
    deletePrediction,
    refreshHistory,
    refreshAnalytics,
    exportHistory,
    cleanupHistory,
    
    // Filtres
    applyFilters,
    clearFilters,
    activeFilters,
    hasFilters: Object.keys(activeFilters).length > 0,
    
    // Statistiques
    getAlgorithmPerformance,
    getRecentPerformance
  }
}

// Hook simplifié pour sauvegarder rapidement une prédiction
export function useQuickPredictionSave() {
  const { savePrediction } = usePredictionHistory()
  
  const saveQuick = useCallback(async (
    drawName: string,
    algorithm: string,
    predictions: number[],
    confidence: number,
    reasoning: string[] = []
  ) => {
    return await savePrediction({
      drawName,
      algorithm,
      algorithmVersion: '1.0',
      predictions,
      confidence,
      reasoning,
      metadata: {
        dataSize: 0,
        processingTime: 0
      }
    })
  }, [savePrediction])
  
  return { saveQuick }
}

// Hook pour les statistiques en temps réel
export function usePredictionStats() {
  const { analytics, getRecentPerformance } = usePredictionHistory()
  
  const stats = {
    total: analytics?.totalPredictions || 0,
    verified: analytics?.verifiedPredictions || 0,
    averageAccuracy: analytics?.averageAccuracy || 0,
    verificationRate: analytics?.totalPredictions ? 
      (analytics.verifiedPredictions / analytics.totalPredictions) * 100 : 0,
    recent: getRecentPerformance(30)
  }
  
  return stats
}
