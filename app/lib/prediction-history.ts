'use client'

/**
 * Système de gestion de l'historique des prédictions
 * Stockage, analyse et calcul des taux de réussite
 */

import { indexedDBCache } from './indexeddb-cache'
import { DrawResult } from './constants'

export interface PredictionRecord {
  id: string
  timestamp: string
  drawName: string
  algorithm: string
  algorithmVersion: string
  predictions: number[]
  confidence: number
  reasoning: string[]
  metadata: {
    modelParameters?: Record<string, any>
    dataSize: number
    processingTime: number
    userInput?: Record<string, any>
  }
  // Résultats après vérification
  actualResult?: number[]
  verified: boolean
  verificationDate?: string
  performance?: PredictionPerformance
}

export interface PredictionPerformance {
  exactMatches: number // Nombre de numéros exacts prédits
  partialMatches: number // Nombre de numéros partiellement corrects
  totalPredicted: number // Nombre total de numéros prédits
  totalActual: number // Nombre total de numéros dans le résultat réel
  accuracy: number // Pourcentage de précision (0-100)
  score: number // Score global de performance (0-100)
  rank: 'excellent' | 'good' | 'average' | 'poor'
}

export interface HistoryAnalytics {
  totalPredictions: number
  verifiedPredictions: number
  averageAccuracy: number
  bestPerformance: PredictionPerformance | null
  worstPerformance: PredictionPerformance | null
  algorithmStats: Record<string, {
    count: number
    averageAccuracy: number
    bestScore: number
    successRate: number
  }>
  timelineStats: {
    daily: Record<string, number>
    weekly: Record<string, number>
    monthly: Record<string, number>
  }
  confidenceCorrelation: {
    highConfidence: { predictions: number, accuracy: number }
    mediumConfidence: { predictions: number, accuracy: number }
    lowConfidence: { predictions: number, accuracy: number }
  }
}

class PredictionHistoryManager {
  private readonly CACHE_KEY = 'prediction_history'
  private readonly ANALYTICS_CACHE_KEY = 'prediction_analytics'
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 heures

  /**
   * Sauvegarder une nouvelle prédiction
   */
  async savePrediction(prediction: Omit<PredictionRecord, 'id' | 'timestamp' | 'verified'>): Promise<string> {
    const record: PredictionRecord = {
      ...prediction,
      id: this.generatePredictionId(),
      timestamp: new Date().toISOString(),
      verified: false
    }

    try {
      // Récupérer l'historique existant
      const history = await this.getHistory()
      
      // Ajouter la nouvelle prédiction
      history.unshift(record)
      
      // Limiter à 1000 prédictions maximum
      if (history.length > 1000) {
        history.splice(1000)
      }
      
      // Sauvegarder dans IndexedDB
      await indexedDBCache.set(this.CACHE_KEY, history, this.CACHE_EXPIRY)
      
      // Invalider le cache des analytics
      await indexedDBCache.delete(this.ANALYTICS_CACHE_KEY)
      
      return record.id
    } catch (error) {
      console.error('Erreur sauvegarde prédiction:', error)
      throw new Error('Impossible de sauvegarder la prédiction')
    }
  }

  /**
   * Vérifier une prédiction avec le résultat réel
   */
  async verifyPrediction(predictionId: string, actualResult: number[]): Promise<PredictionPerformance> {
    try {
      const history = await this.getHistory()
      const predictionIndex = history.findIndex(p => p.id === predictionId)
      
      if (predictionIndex === -1) {
        throw new Error('Prédiction non trouvée')
      }
      
      const prediction = history[predictionIndex]
      
      // Calculer les performances
      const performance = this.calculatePerformance(prediction.predictions, actualResult)
      
      // Mettre à jour la prédiction
      prediction.actualResult = actualResult
      prediction.verified = true
      prediction.verificationDate = new Date().toISOString()
      prediction.performance = performance
      
      // Sauvegarder les modifications
      await indexedDBCache.set(this.CACHE_KEY, history, this.CACHE_EXPIRY)
      
      // Invalider le cache des analytics
      await indexedDBCache.delete(this.ANALYTICS_CACHE_KEY)
      
      return performance
    } catch (error) {
      console.error('Erreur vérification prédiction:', error)
      throw new Error('Impossible de vérifier la prédiction')
    }
  }

  /**
   * Vérification automatique avec les résultats de tirage
   */
  async autoVerifyPredictions(drawResults: DrawResult[]): Promise<number> {
    try {
      const history = await this.getHistory()
      let verifiedCount = 0
      
      for (const prediction of history) {
        if (prediction.verified) continue
        
        // Chercher un résultat correspondant
        const matchingResult = drawResults.find(result => 
          result.draw_name === prediction.drawName &&
          new Date(result.date) > new Date(prediction.timestamp)
        )
        
        if (matchingResult) {
          await this.verifyPrediction(prediction.id, matchingResult.gagnants)
          verifiedCount++
        }
      }
      
      return verifiedCount
    } catch (error) {
      console.error('Erreur vérification automatique:', error)
      return 0
    }
  }

  /**
   * Récupérer l'historique des prédictions
   */
  async getHistory(filters?: {
    drawName?: string
    algorithm?: string
    verified?: boolean
    dateFrom?: string
    dateTo?: string
    limit?: number
  }): Promise<PredictionRecord[]> {
    try {
      let history = await indexedDBCache.get<PredictionRecord[]>(this.CACHE_KEY) || []
      
      // Appliquer les filtres
      if (filters) {
        if (filters.drawName) {
          history = history.filter(p => p.drawName === filters.drawName)
        }
        
        if (filters.algorithm) {
          history = history.filter(p => p.algorithm === filters.algorithm)
        }
        
        if (filters.verified !== undefined) {
          history = history.filter(p => p.verified === filters.verified)
        }
        
        if (filters.dateFrom) {
          history = history.filter(p => p.timestamp >= filters.dateFrom!)
        }
        
        if (filters.dateTo) {
          history = history.filter(p => p.timestamp <= filters.dateTo!)
        }
        
        if (filters.limit) {
          history = history.slice(0, filters.limit)
        }
      }
      
      return history
    } catch (error) {
      console.error('Erreur récupération historique:', error)
      return []
    }
  }

  /**
   * Calculer les analytics de l'historique
   */
  async getAnalytics(): Promise<HistoryAnalytics> {
    try {
      // Vérifier le cache
      const cached = await indexedDBCache.get<HistoryAnalytics>(this.ANALYTICS_CACHE_KEY)
      if (cached) return cached
      
      const history = await this.getHistory()
      const verifiedHistory = history.filter(p => p.verified)
      
      const analytics: HistoryAnalytics = {
        totalPredictions: history.length,
        verifiedPredictions: verifiedHistory.length,
        averageAccuracy: 0,
        bestPerformance: null,
        worstPerformance: null,
        algorithmStats: {},
        timelineStats: {
          daily: {},
          weekly: {},
          monthly: {}
        },
        confidenceCorrelation: {
          highConfidence: { predictions: 0, accuracy: 0 },
          mediumConfidence: { predictions: 0, accuracy: 0 },
          lowConfidence: { predictions: 0, accuracy: 0 }
        }
      }
      
      if (verifiedHistory.length === 0) {
        await indexedDBCache.set(this.ANALYTICS_CACHE_KEY, analytics, this.CACHE_EXPIRY)
        return analytics
      }
      
      // Calculer la précision moyenne
      const totalAccuracy = verifiedHistory.reduce((sum, p) => sum + (p.performance?.accuracy || 0), 0)
      analytics.averageAccuracy = totalAccuracy / verifiedHistory.length
      
      // Trouver les meilleures et pires performances
      const sortedByScore = verifiedHistory
        .filter(p => p.performance)
        .sort((a, b) => (b.performance!.score) - (a.performance!.score))
      
      if (sortedByScore.length > 0) {
        analytics.bestPerformance = sortedByScore[0].performance!
        analytics.worstPerformance = sortedByScore[sortedByScore.length - 1].performance!
      }
      
      // Statistiques par algorithme
      for (const prediction of verifiedHistory) {
        const algo = prediction.algorithm
        if (!analytics.algorithmStats[algo]) {
          analytics.algorithmStats[algo] = {
            count: 0,
            averageAccuracy: 0,
            bestScore: 0,
            successRate: 0
          }
        }
        
        const stats = analytics.algorithmStats[algo]
        stats.count++
        stats.averageAccuracy += prediction.performance?.accuracy || 0
        stats.bestScore = Math.max(stats.bestScore, prediction.performance?.score || 0)
      }
      
      // Finaliser les moyennes des algorithmes
      Object.values(analytics.algorithmStats).forEach(stats => {
        stats.averageAccuracy /= stats.count
        stats.successRate = (stats.averageAccuracy / 100) * 100 // Convertir en pourcentage
      })
      
      // Statistiques temporelles
      for (const prediction of history) {
        const date = new Date(prediction.timestamp)
        const dayKey = date.toISOString().split('T')[0]
        const weekKey = this.getWeekKey(date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        analytics.timelineStats.daily[dayKey] = (analytics.timelineStats.daily[dayKey] || 0) + 1
        analytics.timelineStats.weekly[weekKey] = (analytics.timelineStats.weekly[weekKey] || 0) + 1
        analytics.timelineStats.monthly[monthKey] = (analytics.timelineStats.monthly[monthKey] || 0) + 1
      }
      
      // Corrélation confiance/précision
      for (const prediction of verifiedHistory) {
        const confidence = prediction.confidence
        const accuracy = prediction.performance?.accuracy || 0
        
        if (confidence >= 80) {
          analytics.confidenceCorrelation.highConfidence.predictions++
          analytics.confidenceCorrelation.highConfidence.accuracy += accuracy
        } else if (confidence >= 50) {
          analytics.confidenceCorrelation.mediumConfidence.predictions++
          analytics.confidenceCorrelation.mediumConfidence.accuracy += accuracy
        } else {
          analytics.confidenceCorrelation.lowConfidence.predictions++
          analytics.confidenceCorrelation.lowConfidence.accuracy += accuracy
        }
      }
      
      // Finaliser les moyennes de confiance
      Object.values(analytics.confidenceCorrelation).forEach(conf => {
        if (conf.predictions > 0) {
          conf.accuracy /= conf.predictions
        }
      })
      
      // Mettre en cache
      await indexedDBCache.set(this.ANALYTICS_CACHE_KEY, analytics, this.CACHE_EXPIRY)
      
      return analytics
    } catch (error) {
      console.error('Erreur calcul analytics:', error)
      throw new Error('Impossible de calculer les analytics')
    }
  }

  /**
   * Supprimer une prédiction
   */
  async deletePrediction(predictionId: string): Promise<boolean> {
    try {
      const history = await this.getHistory()
      const filteredHistory = history.filter(p => p.id !== predictionId)
      
      if (filteredHistory.length === history.length) {
        return false // Prédiction non trouvée
      }
      
      await indexedDBCache.set(this.CACHE_KEY, filteredHistory, this.CACHE_EXPIRY)
      await indexedDBCache.delete(this.ANALYTICS_CACHE_KEY)
      
      return true
    } catch (error) {
      console.error('Erreur suppression prédiction:', error)
      return false
    }
  }

  /**
   * Nettoyer l'historique (supprimer les anciennes prédictions)
   */
  async cleanupHistory(olderThanDays: number = 90): Promise<number> {
    try {
      const history = await this.getHistory()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      
      const filteredHistory = history.filter(p => 
        new Date(p.timestamp) > cutoffDate
      )
      
      const deletedCount = history.length - filteredHistory.length
      
      if (deletedCount > 0) {
        await indexedDBCache.set(this.CACHE_KEY, filteredHistory, this.CACHE_EXPIRY)
        await indexedDBCache.delete(this.ANALYTICS_CACHE_KEY)
      }
      
      return deletedCount
    } catch (error) {
      console.error('Erreur nettoyage historique:', error)
      return 0
    }
  }

  /**
   * Exporter l'historique
   */
  async exportHistory(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const history = await this.getHistory()
      
      if (format === 'csv') {
        return this.convertToCSV(history)
      }
      
      return JSON.stringify(history, null, 2)
    } catch (error) {
      console.error('Erreur export historique:', error)
      throw new Error('Impossible d\'exporter l\'historique')
    }
  }

  /**
   * Méthodes privées
   */
  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculatePerformance(predicted: number[], actual: number[]): PredictionPerformance {
    const exactMatches = predicted.filter(num => actual.includes(num)).length
    const partialMatches = exactMatches // Pour l'instant, exact = partial
    
    const accuracy = (exactMatches / Math.max(predicted.length, actual.length)) * 100
    
    // Score basé sur plusieurs facteurs
    let score = accuracy * 0.7 // 70% basé sur la précision
    
    // Bonus pour les correspondances exactes
    if (exactMatches === predicted.length && exactMatches === actual.length) {
      score += 30 // Bonus de 30 points pour une prédiction parfaite
    } else if (exactMatches >= Math.min(predicted.length, actual.length) * 0.8) {
      score += 15 // Bonus de 15 points pour une très bonne prédiction
    }
    
    score = Math.min(100, Math.max(0, score))
    
    let rank: PredictionPerformance['rank']
    if (score >= 90) rank = 'excellent'
    else if (score >= 70) rank = 'good'
    else if (score >= 50) rank = 'average'
    else rank = 'poor'
    
    return {
      exactMatches,
      partialMatches,
      totalPredicted: predicted.length,
      totalActual: actual.length,
      accuracy: Math.round(accuracy * 100) / 100,
      score: Math.round(score * 100) / 100,
      rank
    }
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const week = this.getWeekNumber(date)
    return `${year}-W${String(week).padStart(2, '0')}`
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  private convertToCSV(history: PredictionRecord[]): string {
    const headers = [
      'ID', 'Date', 'Tirage', 'Algorithme', 'Prédictions', 'Confiance',
      'Vérifié', 'Résultat Réel', 'Précision', 'Score', 'Rang'
    ]
    
    const rows = history.map(p => [
      p.id,
      p.timestamp,
      p.drawName,
      p.algorithm,
      p.predictions.join(';'),
      p.confidence,
      p.verified ? 'Oui' : 'Non',
      p.actualResult?.join(';') || '',
      p.performance?.accuracy || '',
      p.performance?.score || '',
      p.performance?.rank || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

// Instance singleton
export const predictionHistory = new PredictionHistoryManager()

// Types exportés
export type { PredictionRecord, PredictionPerformance, HistoryAnalytics }
