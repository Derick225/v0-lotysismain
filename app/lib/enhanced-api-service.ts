"use client"

import axios, { AxiosResponse } from 'axios'
import { parse, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Dexie, { Table } from 'dexie'
import { DRAW_SCHEDULE, VALID_DRAW_NAMES, type DrawResult } from './constants'
import logger from './logger'

// Interface pour les données de l'API externe
interface ExternalApiResult {
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
}

interface ExternalApiResponse {
  success: boolean
  drawsResultsWeekly: ExternalApiResult[]
  message?: string
}

// Interface pour le cache IndexedDB
interface CachedResult extends DrawResult {
  cached_at: number
  source: 'external' | 'manual' | 'imported'
}

interface CacheMetadata {
  id: string
  last_sync: number
  draw_name: string
  total_results: number
  last_result_date: string
}

// Configuration du cache
const CACHE_CONFIG = {
  DURATION_MS: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  BATCH_SIZE: 100,
  COMPRESSION_THRESHOLD: 1000, // Compresser si plus de 1000 résultats
}

// Base de données IndexedDB optimisée
class LotteryDatabase extends Dexie {
  results!: Table<CachedResult>
  metadata!: Table<CacheMetadata>

  constructor() {
    super('LotteryResultsDB')
    this.version(2).stores({
      results: '++id, draw_name, date, cached_at, source, [draw_name+date]',
      metadata: 'id, last_sync, draw_name, total_results, last_result_date'
    })
  }
}

const db = new LotteryDatabase()

export class EnhancedApiService {
  private static instance: EnhancedApiService
  private baseUrl = 'https://lotobonheur.ci/api/results'
  private isOnline = true
  private syncInProgress = false

  private constructor() {
    // Détecter le statut de connexion
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => {
        this.isOnline = true
        this.syncWhenOnline()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  static getInstance(): EnhancedApiService {
    if (!EnhancedApiService.instance) {
      EnhancedApiService.instance = new EnhancedApiService()
    }
    return EnhancedApiService.instance
  }

  // Récupération optimisée avec cache intelligent
  async fetchLotteryResults(options: {
    month?: string
    year?: string
    drawName?: string
    forceRefresh?: boolean
    useCache?: boolean
  } = {}): Promise<DrawResult[]> {
    const { month, year = '2024', drawName, forceRefresh = false, useCache = true } = options

    try {
      // Vérifier le cache d'abord si autorisé
      if (useCache && !forceRefresh) {
        const cachedResults = await this.getCachedResults(drawName, month, year)
        if (cachedResults.length > 0 && this.isCacheValid(drawName)) {
          logger.info(`Returning ${cachedResults.length} cached results`, { drawName, month, year })
          return cachedResults
        }
      }

      // Si hors ligne, retourner uniquement le cache
      if (!this.isOnline) {
        logger.warn('Offline mode: returning cached results only')
        return await this.getCachedResults(drawName, month, year)
      }

      // Récupération depuis l'API externe
      const externalResults = await this.fetchFromExternalApi(month, year, drawName)
      
      if (externalResults.length > 0) {
        // Mettre en cache les nouveaux résultats
        await this.cacheResults(externalResults, 'external')
        await this.updateCacheMetadata(drawName || 'all', externalResults)
        
        logger.info(`Fetched and cached ${externalResults.length} results from external API`)
        return externalResults
      }

      // Fallback vers le cache si l'API externe échoue
      logger.warn('External API returned no results, falling back to cache')
      return await this.getCachedResults(drawName, month, year)

    } catch (error) {
      logger.error('Error in fetchLotteryResults', error)
      
      // En cas d'erreur, retourner le cache disponible
      const fallbackResults = await this.getCachedResults(drawName, month, year)
      if (fallbackResults.length > 0) {
        logger.info(`Returning ${fallbackResults.length} cached results as fallback`)
        return fallbackResults
      }

      throw new Error('Aucune donnée disponible - API externe inaccessible et cache vide')
    }
  }

  // Récupération depuis l'API externe avec retry et validation
  private async fetchFromExternalApi(
    month?: string, 
    year?: string, 
    drawName?: string
  ): Promise<DrawResult[]> {
    let url = this.baseUrl
    const params = new URLSearchParams()

    if (month && year) {
      params.append('month', month)
      params.append('year', year)
    }
    if (drawName) {
      params.append('draw', drawName)
    }

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= CACHE_CONFIG.MAX_RETRIES; attempt++) {
      try {
        logger.info(`Fetching from external API (attempt ${attempt}/${CACHE_CONFIG.MAX_RETRIES})`, { url })

        const response: AxiosResponse<ExternalApiResponse> = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://lotobonheur.ci/resultats',
          },
          timeout: 15000,
        })

        if (!response.data.success) {
          throw new Error(`API externe a retourné une erreur: ${response.data.message || 'Erreur inconnue'}`)
        }

        const rawResults = response.data.drawsResultsWeekly || []
        return this.validateAndFormatResults(rawResults)

      } catch (error) {
        lastError = error as Error
        logger.warn(`Attempt ${attempt} failed`, { error: lastError.message, url })

        if (attempt < CACHE_CONFIG.MAX_RETRIES) {
          await this.delay(CACHE_CONFIG.RETRY_DELAY_MS * attempt)
        }
      }
    }

    throw lastError || new Error('Échec de récupération après tous les essais')
  }

  // Validation et formatage des résultats
  private validateAndFormatResults(rawResults: ExternalApiResult[]): DrawResult[] {
    const validResults: DrawResult[] = []

    for (const result of rawResults) {
      try {
        // Valider le nom du tirage
        if (!VALID_DRAW_NAMES.has(result.draw_name)) {
          logger.warn(`Invalid draw name: ${result.draw_name}`)
          continue
        }

        // Valider et formater la date
        let formattedDate: string
        try {
          const parsedDate = parse(result.date, 'dd/MM/yyyy', new Date(), { locale: fr })
          formattedDate = format(parsedDate, 'yyyy-MM-dd')
        } catch {
          logger.warn(`Invalid date format: ${result.date}`)
          continue
        }

        // Valider les numéros gagnants
        if (!Array.isArray(result.gagnants) || result.gagnants.length !== 5) {
          logger.warn(`Invalid gagnants array: ${result.gagnants}`)
          continue
        }

        const validGagnants = result.gagnants.every(num => 
          Number.isInteger(num) && num >= 1 && num <= 90
        )
        if (!validGagnants) {
          logger.warn(`Invalid gagnants numbers: ${result.gagnants}`)
          continue
        }

        // Valider les numéros machine (optionnel)
        let validMachine: number[] | undefined
        if (result.machine) {
          if (Array.isArray(result.machine) && result.machine.length === 5) {
            const validMachineNumbers = result.machine.every(num => 
              Number.isInteger(num) && num >= 1 && num <= 90
            )
            if (validMachineNumbers) {
              validMachine = result.machine.sort((a, b) => a - b)
            }
          }
        }

        validResults.push({
          id: 0, // Sera assigné par la base de données
          draw_name: result.draw_name,
          date: formattedDate,
          gagnants: result.gagnants.sort((a, b) => a - b),
          machine: validMachine,
          created_at: new Date().toISOString(),
        })

      } catch (error) {
        logger.warn(`Error processing result: ${error}`, { result })
      }
    }

    logger.info(`Validated ${validResults.length}/${rawResults.length} results`)
    return validResults
  }

  // Gestion du cache IndexedDB optimisée
  private async cacheResults(results: DrawResult[], source: 'external' | 'manual' | 'imported'): Promise<void> {
    if (results.length === 0) return

    try {
      const now = Date.now()
      const cachedResults: CachedResult[] = results.map(result => ({
        ...result,
        cached_at: now,
        source,
      }))

      // Utiliser une transaction pour l'efficacité
      await db.transaction('rw', db.results, async () => {
        // Supprimer les anciens résultats pour éviter les doublons
        for (const result of cachedResults) {
          await db.results
            .where('[draw_name+date]')
            .equals([result.draw_name, result.date])
            .delete()
        }

        // Insérer les nouveaux résultats par batch
        for (let i = 0; i < cachedResults.length; i += CACHE_CONFIG.BATCH_SIZE) {
          const batch = cachedResults.slice(i, i + CACHE_CONFIG.BATCH_SIZE)
          await db.results.bulkAdd(batch)
        }
      })

      logger.info(`Cached ${results.length} results with source: ${source}`)
    } catch (error) {
      logger.error('Error caching results', error)
    }
  }

  // Récupération depuis le cache avec filtres optimisés
  private async getCachedResults(drawName?: string, month?: string, year?: string): Promise<DrawResult[]> {
    try {
      let query = db.results.orderBy('date').reverse()

      if (drawName) {
        query = db.results.where('draw_name').equals(drawName).reverse()
      }

      const results = await query.toArray()

      // Filtrer par date si spécifié
      if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`
        const endDate = `${year}-${month.padStart(2, '0')}-31`
        
        return results.filter(result => 
          result.date >= startDate && result.date <= endDate
        )
      }

      return results
    } catch (error) {
      logger.error('Error retrieving cached results', error)
      return []
    }
  }

  // Vérification de la validité du cache
  private async isCacheValid(drawName?: string): Promise<boolean> {
    try {
      const metadataId = drawName || 'all'
      const metadata = await db.metadata.get(metadataId)
      
      if (!metadata) return false

      const now = Date.now()
      const cacheAge = now - metadata.last_sync
      
      return cacheAge < CACHE_CONFIG.DURATION_MS
    } catch (error) {
      logger.error('Error checking cache validity', error)
      return false
    }
  }

  // Mise à jour des métadonnées du cache
  private async updateCacheMetadata(drawName: string, results: DrawResult[]): Promise<void> {
    try {
      const now = Date.now()
      const latestDate = results.reduce((latest, result) => 
        result.date > latest ? result.date : latest, 
        results[0]?.date || ''
      )

      await db.metadata.put({
        id: drawName,
        last_sync: now,
        draw_name: drawName,
        total_results: results.length,
        last_result_date: latestDate,
      })
    } catch (error) {
      logger.error('Error updating cache metadata', error)
    }
  }

  // Synchronisation automatique quand la connexion revient
  private async syncWhenOnline(): Promise<void> {
    if (this.syncInProgress) return

    this.syncInProgress = true
    try {
      logger.info('Connection restored, syncing data...')
      
      // Synchroniser pour chaque tirage
      for (const drawName of VALID_DRAW_NAMES) {
        try {
          await this.fetchLotteryResults({ 
            drawName, 
            forceRefresh: true, 
            useCache: false 
          })
          await this.delay(100) // Éviter de surcharger l'API
        } catch (error) {
          logger.warn(`Failed to sync ${drawName}`, error)
        }
      }
      
      logger.info('Data synchronization completed')
    } catch (error) {
      logger.error('Error during sync', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Nettoyage du cache ancien
  async cleanupOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffTime = Date.now() - maxAgeMs
      const deletedCount = await db.results
        .where('cached_at')
        .below(cutoffTime)
        .delete()
      
      logger.info(`Cleaned up ${deletedCount} old cached results`)
    } catch (error) {
      logger.error('Error cleaning up cache', error)
    }
  }

  // Statistiques du cache
  async getCacheStats(): Promise<{
    totalResults: number
    bySource: Record<string, number>
    byDrawName: Record<string, number>
    oldestEntry: string | null
    newestEntry: string | null
    cacheSize: number
  }> {
    try {
      const allResults = await db.results.toArray()
      
      const bySource: Record<string, number> = {}
      const byDrawName: Record<string, number> = {}
      let oldestDate = ''
      let newestDate = ''

      for (const result of allResults) {
        bySource[result.source] = (bySource[result.source] || 0) + 1
        byDrawName[result.draw_name] = (byDrawName[result.draw_name] || 0) + 1
        
        if (!oldestDate || result.date < oldestDate) oldestDate = result.date
        if (!newestDate || result.date > newestDate) newestDate = result.date
      }

      return {
        totalResults: allResults.length,
        bySource,
        byDrawName,
        oldestEntry: oldestDate || null,
        newestEntry: newestDate || null,
        cacheSize: JSON.stringify(allResults).length, // Approximation de la taille
      }
    } catch (error) {
      logger.error('Error getting cache stats', error)
      return {
        totalResults: 0,
        bySource: {},
        byDrawName: {},
        oldestEntry: null,
        newestEntry: null,
        cacheSize: 0,
      }
    }
  }

  // Utilitaire pour les délais
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Export des données pour sauvegarde
  async exportCacheData(): Promise<string> {
    try {
      const results = await db.results.toArray()
      const metadata = await db.metadata.toArray()
      
      return JSON.stringify({
        results,
        metadata,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }, null, 2)
    } catch (error) {
      logger.error('Error exporting cache data', error)
      throw error
    }
  }

  // Import des données depuis une sauvegarde
  async importCacheData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.results && Array.isArray(data.results)) {
        await db.transaction('rw', [db.results, db.metadata], async () => {
          await db.results.clear()
          await db.results.bulkAdd(data.results)
          
          if (data.metadata && Array.isArray(data.metadata)) {
            await db.metadata.clear()
            await db.metadata.bulkAdd(data.metadata)
          }
        })
        
        logger.info(`Imported ${data.results.length} cached results`)
      }
    } catch (error) {
      logger.error('Error importing cache data', error)
      throw error
    }
  }
}

// Instance singleton
export const enhancedApiService = EnhancedApiService.getInstance()

// Export des types pour utilisation externe
export type { CachedResult, CacheMetadata, ExternalApiResult, ExternalApiResponse }
