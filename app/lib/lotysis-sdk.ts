/**
 * SDK Lotysis - Client JavaScript/TypeScript
 * Facilite l'intégration avec l'API Lotysis
 */

export interface LotysisSDKConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retries?: number
  debug?: boolean
}

export interface PredictionData {
  drawName: string
  algorithm: string
  numbers: number[]
  confidence: number
  reasoning?: string[]
  metadata?: Record<string, any>
}

export interface DrawResultData {
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
}

export interface AnalyticsData {
  totalPredictions: number
  averageAccuracy: number
  bestStreak: number
  trendsDetected: number
  lastUpdate: string
}

export interface TrendData {
  type: string
  description: string
  confidence: number
  numbers: number[]
  drawName: string
}

export interface SuggestionData {
  type: string
  title: string
  description: string
  confidence: number
  priority: 'low' | 'medium' | 'high'
  numbers?: number[]
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: string | null
  syncInProgress: boolean
  pendingChanges: number
  conflictsDetected: number
}

export interface APIError extends Error {
  code: string
  statusCode: number
  details?: any
}

export class LotysisSDK {
  private config: Required<LotysisSDKConfig>
  private cache: Map<string, { data: any; expires: number }> = new Map()

  constructor(config: LotysisSDKConfig) {
    this.config = {
      baseUrl: 'https://api.lotysis.com/v1',
      timeout: 10000,
      retries: 3,
      debug: false,
      ...config
    }

    if (!this.config.apiKey) {
      throw new Error('Clé API requise')
    }

    if (this.config.debug) {
      console.log('🔧 SDK Lotysis initialisé:', {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retries: this.config.retries
      })
    }
  }

  /**
   * Effectuer une requête HTTP
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/${endpoint.replace(/^\//, '')}`
    const cacheKey = `${method}:${url}:${JSON.stringify(data || {})}`

    // Vérifier le cache pour les requêtes GET
    if (method === 'GET' && options.cache) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expires > Date.now()) {
        if (this.config.debug) {
          console.log('📦 Réponse depuis le cache:', endpoint)
        }
        return cached.data
      }
    }

    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        if (this.config.debug) {
          console.log(`🌐 ${method} ${endpoint} (tentative ${attempt}/${this.config.retries})`)
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'LotysisSDK/1.0'
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const error = new Error(errorData.error?.message || `HTTP ${response.status}`) as APIError
          error.code = errorData.error?.code || 'HTTP_ERROR'
          error.statusCode = response.status
          error.details = errorData.error?.details
          throw error
        }

        const result = await response.json()

        // Mettre en cache les réponses GET réussies
        if (method === 'GET' && options.cache && result.success) {
          const ttl = options.cacheTTL || 300000 // 5 minutes par défaut
          this.cache.set(cacheKey, {
            data: result.data,
            expires: Date.now() + ttl
          })
        }

        if (this.config.debug) {
          console.log('✅ Réponse reçue:', result)
        }

        return result.data

      } catch (error) {
        lastError = error as Error
        
        if (this.config.debug) {
          console.warn(`❌ Tentative ${attempt} échouée:`, error)
        }

        // Ne pas retry pour certaines erreurs
        if (error instanceof Error && 'statusCode' in error) {
          const apiError = error as APIError
          if (apiError.statusCode === 401 || apiError.statusCode === 403) {
            throw error // Erreurs d'authentification
          }
        }

        // Attendre avant de retry (backoff exponentiel)
        if (attempt < this.config.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Toutes les tentatives ont échoué')
  }

  /**
   * PRÉDICTIONS
   */

  /**
   * Obtenir la liste des prédictions
   */
  async getPredictions(options: {
    page?: number
    limit?: number
    drawName?: string
  } = {}): Promise<{ items: PredictionData[]; pagination: any }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', options.page.toString())
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.drawName) params.set('drawName', options.drawName)

    return this.request('GET', `predictions/list?${params}`, undefined, { cache: true, cacheTTL: 60000 })
  }

  /**
   * Obtenir les dernières prédictions
   */
  async getLatestPredictions(limit: number = 10): Promise<PredictionData[]> {
    return this.request('GET', `predictions/latest?limit=${limit}`, undefined, { cache: true, cacheTTL: 30000 })
  }

  /**
   * Créer une nouvelle prédiction
   */
  async createPrediction(prediction: {
    drawName: string
    algorithm: string
    numbers: number[]
    confidence: number
    reasoning?: string[]
    metadata?: Record<string, any>
  }): Promise<PredictionData> {
    return this.request('POST', 'predictions/create', prediction)
  }

  /**
   * RÉSULTATS
   */

  /**
   * Obtenir la liste des résultats
   */
  async getResults(options: {
    page?: number
    limit?: number
    drawName?: string
  } = {}): Promise<{ items: DrawResultData[]; pagination: any }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', options.page.toString())
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.drawName) params.set('drawName', options.drawName)

    return this.request('GET', `results/list?${params}`, undefined, { cache: true, cacheTTL: 300000 })
  }

  /**
   * Obtenir les derniers résultats
   */
  async getLatestResults(limit: number = 10): Promise<DrawResultData[]> {
    return this.request('GET', `results/latest?limit=${limit}`, undefined, { cache: true, cacheTTL: 60000 })
  }

  /**
   * ANALYTICS
   */

  /**
   * Obtenir les statistiques globales
   */
  async getStats(): Promise<AnalyticsData> {
    return this.request('GET', 'analytics/stats', undefined, { cache: true, cacheTTL: 300000 })
  }

  /**
   * Détecter les tendances
   */
  async getTrends(drawName: string): Promise<TrendData[]> {
    return this.request('GET', `analytics/trends?drawName=${encodeURIComponent(drawName)}`, undefined, { cache: true, cacheTTL: 600000 })
  }

  /**
   * Obtenir des suggestions intelligentes
   */
  async getSuggestions(drawName: string): Promise<SuggestionData[]> {
    return this.request('GET', `analytics/suggestions?drawName=${encodeURIComponent(drawName)}`, undefined, { cache: true, cacheTTL: 300000 })
  }

  /**
   * SYNCHRONISATION
   */

  /**
   * Obtenir le statut de synchronisation
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return this.request('GET', 'sync/status', undefined, { cache: true, cacheTTL: 10000 })
  }

  /**
   * Déclencher une synchronisation
   */
  async triggerSync(): Promise<{ success: boolean }> {
    return this.request('POST', 'sync/trigger')
  }

  /**
   * UTILITAIRES
   */

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.cache.clear()
    if (this.config.debug) {
      console.log('🗑️ Cache vidé')
    }
  }

  /**
   * Obtenir les informations de cache
   */
  getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Tester la connexion API
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      await this.getStats()
      return {
        success: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }

  /**
   * Obtenir la version du SDK
   */
  getVersion(): string {
    return '1.0.0'
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): Omit<LotysisSDKConfig, 'apiKey'> {
    const { apiKey, ...config } = this.config
    return config
  }
}

/**
 * Factory function pour créer une instance du SDK
 */
export function createLotysisSDK(config: LotysisSDKConfig): LotysisSDK {
  return new LotysisSDK(config)
}

/**
 * SDK avec configuration par défaut pour le développement
 */
export function createDevSDK(apiKey: string): LotysisSDK {
  return new LotysisSDK({
    apiKey,
    baseUrl: 'http://localhost:3000/api/v1',
    debug: true,
    timeout: 5000,
    retries: 1
  })
}

/**
 * SDK avec configuration par défaut pour la production
 */
export function createProdSDK(apiKey: string): LotysisSDK {
  return new LotysisSDK({
    apiKey,
    baseUrl: 'https://api.lotysis.com/v1',
    debug: false,
    timeout: 10000,
    retries: 3
  })
}

// Export par défaut
export default LotysisSDK
