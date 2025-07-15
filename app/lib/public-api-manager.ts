'use client'

/**
 * Gestionnaire d'API publique pour Lotysis
 * Fournit une interface REST et SDK pour l'intégration externe
 */

import { indexedDBCache } from './indexeddb-cache'
import { predictionHistory, type PredictionRecord } from './prediction-history'
import { advancedAnalytics } from './advanced-analytics'
import { cloudSyncManager } from './cloud-sync-manager'
import type { DrawResult } from './constants'

export interface APIKey {
  id: string
  name: string
  key: string
  permissions: APIPermission[]
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  usage: {
    totalRequests: number
    requestsToday: number
    lastUsed: string | null
  }
  status: 'active' | 'suspended' | 'revoked'
  createdAt: string
  expiresAt: string | null
}

export interface APIPermission {
  resource: 'predictions' | 'results' | 'analytics' | 'sync' | 'notifications'
  actions: ('read' | 'write' | 'delete')[]
  scope: 'own' | 'public' | 'all'
}

export interface APIRequest {
  id: string
  apiKeyId: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  parameters: Record<string, any>
  timestamp: string
  responseTime: number
  statusCode: number
  userAgent?: string
  ipAddress?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
    rateLimit: {
      remaining: number
      resetAt: string
    }
    pagination?: {
      page: number
      limit: number
      total: number
      hasNext: boolean
    }
  }
}

export interface SDKConfig {
  apiKey: string
  baseUrl: string
  timeout: number
  retries: number
  rateLimit: boolean
  cache: boolean
  debug: boolean
}

class PublicAPIManager {
  private apiKeys: APIKey[] = []
  private requests: APIRequest[] = []
  private rateLimitCache: Map<string, { count: number; resetAt: number }> = new Map()

  constructor() {
    this.initialize()
  }

  /**
   * Initialiser le gestionnaire d'API
   */
  private async initialize() {
    try {
      await this.loadAPIKeys()
      await this.loadRequests()

      // Nettoyer les anciennes requêtes
      this.cleanupOldRequests()

      console.log('✅ Gestionnaire d\'API publique initialisé')
    } catch (error) {
      console.error('❌ Erreur initialisation API publique:', error)
    }
  }

  /**
   * Créer une nouvelle clé API
   */
  async createAPIKey(config: {
    name: string
    permissions: APIPermission[]
    rateLimit?: Partial<APIKey['rateLimit']>
    expiresIn?: number // jours
  }): Promise<APIKey> {
    const apiKey: APIKey = {
      id: this.generateAPIKeyId(),
      name: config.name,
      key: this.generateAPIKey(),
      permissions: config.permissions,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        ...config.rateLimit
      },
      usage: {
        totalRequests: 0,
        requestsToday: 0,
        lastUsed: null
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: config.expiresIn ?
        new Date(Date.now() + config.expiresIn * 24 * 60 * 60 * 1000).toISOString() :
        null
    }

    this.apiKeys.push(apiKey)
    await this.saveAPIKeys()

    return apiKey
  }

  /**
   * Valider une clé API
   */
  validateAPIKey(key: string): APIKey | null {
    const apiKey = this.apiKeys.find(k => k.key === key)

    if (!apiKey) return null
    if (apiKey.status !== 'active') return null
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null

    return apiKey
  }

  /**
   * Vérifier les limites de taux
   */
  checkRateLimit(apiKey: APIKey): { allowed: boolean; remaining: number; resetAt: string } {
    const now = Date.now()
    const minuteKey = `${apiKey.id}:${Math.floor(now / 60000)}`
    const hourKey = `${apiKey.id}:${Math.floor(now / 3600000)}`
    const dayKey = `${apiKey.id}:${Math.floor(now / 86400000)}`

    // Vérifier limite par minute
    const minuteLimit = this.rateLimitCache.get(minuteKey) || { count: 0, resetAt: now + 60000 }
    if (minuteLimit.count >= apiKey.rateLimit.requestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(minuteLimit.resetAt).toISOString()
      }
    }

    // Vérifier limite par heure
    const hourLimit = this.rateLimitCache.get(hourKey) || { count: 0, resetAt: now + 3600000 }
    if (hourLimit.count >= apiKey.rateLimit.requestsPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(hourLimit.resetAt).toISOString()
      }
    }

    // Vérifier limite par jour
    if (apiKey.usage.requestsToday >= apiKey.rateLimit.requestsPerDay) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      return {
        allowed: false,
        remaining: 0,
        resetAt: tomorrow.toISOString()
      }
    }

    return {
      allowed: true,
      remaining: apiKey.rateLimit.requestsPerMinute - minuteLimit.count,
      resetAt: new Date(minuteLimit.resetAt).toISOString()
    }
  }

  /**
   * Enregistrer une requête API
   */
  async recordRequest(apiKey: APIKey, request: Omit<APIRequest, 'id' | 'apiKeyId' | 'timestamp'>): Promise<void> {
    const apiRequest: APIRequest = {
      id: this.generateRequestId(),
      apiKeyId: apiKey.id,
      timestamp: new Date().toISOString(),
      ...request
    }

    // Enregistrer la requête
    this.requests.push(apiRequest)

    // Mettre à jour les statistiques d'usage
    apiKey.usage.totalRequests++
    apiKey.usage.requestsToday++
    apiKey.usage.lastUsed = apiRequest.timestamp

    // Mettre à jour les limites de taux
    const now = Date.now()
    const minuteKey = `${apiKey.id}:${Math.floor(now / 60000)}`
    const hourKey = `${apiKey.id}:${Math.floor(now / 3600000)}`

    this.rateLimitCache.set(minuteKey, {
      count: (this.rateLimitCache.get(minuteKey)?.count || 0) + 1,
      resetAt: now + 60000
    })

    this.rateLimitCache.set(hourKey, {
      count: (this.rateLimitCache.get(hourKey)?.count || 0) + 1,
      resetAt: now + 3600000
    })

    // Sauvegarder
    await this.saveAPIKeys()
    await this.saveRequests()
  }

  /**
   * Traiter une requête API
   */
  async processAPIRequest(
    method: string,
    endpoint: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<APIResponse> {
    const startTime = Date.now()
    let statusCode = 200
    let response: APIResponse

    try {
      // Vérifier les permissions
      if (!this.hasPermission(apiKey, endpoint, method)) {
        statusCode = 403
        throw new Error('Permission insuffisante')
      }

      // Router vers la bonne méthode
      const data = await this.routeRequest(method, endpoint, parameters, apiKey)

      response = {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          rateLimit: this.checkRateLimit(apiKey)
        }
      }

    } catch (error) {
      statusCode = statusCode === 200 ? 500 : statusCode
      response = {
        success: false,
        error: {
          code: statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          rateLimit: this.checkRateLimit(apiKey)
        }
      }
    }

    // Enregistrer la requête
    await this.recordRequest(apiKey, {
      method: method as any,
      endpoint,
      parameters,
      responseTime: Date.now() - startTime,
      statusCode
    })

    return response
  }

  /**
   * Router les requêtes vers les bonnes méthodes
   */
  private async routeRequest(
    method: string,
    endpoint: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<any> {
    const [resource, action] = endpoint.split('/').filter(Boolean)

    switch (resource) {
      case 'predictions':
        return this.handlePredictionsRequest(method, action, parameters, apiKey)

      case 'results':
        return this.handleResultsRequest(method, action, parameters, apiKey)

      case 'analytics':
        return this.handleAnalyticsRequest(method, action, parameters, apiKey)

      case 'sync':
        return this.handleSyncRequest(method, action, parameters, apiKey)

      default:
        throw new Error(`Endpoint non supporté: ${endpoint}`)
    }
  }

  /**
   * Gérer les requêtes de prédictions
   */
  private async handlePredictionsRequest(
    method: string,
    action: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<any> {
    switch (method) {
      case 'GET':
        if (action === 'list') {
          const predictions = await predictionHistory.getHistory()
          return this.paginateResults(predictions, parameters)
        } else if (action === 'latest') {
          const predictions = await predictionHistory.getHistory()
          return predictions.slice(0, parameters.limit || 10)
        }
        break

      case 'POST':
        if (action === 'create') {
          // Créer une nouvelle prédiction via API
          const { drawName, algorithm, numbers, confidence } = parameters

          const prediction = await predictionHistory.savePrediction({
            drawName,
            algorithm,
            algorithmVersion: '1.0',
            predictions: numbers,
            confidence,
            reasoning: ['Créé via API'],
            metadata: { apiKey: apiKey.id }
          })

          return prediction
        }
        break

      default:
        throw new Error(`Méthode non supportée: ${method}`)
    }

    throw new Error(`Action non supportée: ${action}`)
  }

  /**
   * Gérer les requêtes de résultats
   */
  private async handleResultsRequest(
    method: string,
    action: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<any> {
    switch (method) {
      case 'GET':
        if (action === 'list') {
          const results = await indexedDBCache.get<DrawResult[]>('draw_results') || []
          return this.paginateResults(results, parameters)
        } else if (action === 'latest') {
          const results = await indexedDBCache.get<DrawResult[]>('draw_results') || []
          return results.slice(0, parameters.limit || 10)
        }
        break

      default:
        throw new Error(`Méthode non supportée: ${method}`)
    }

    throw new Error(`Action non supportée: ${action}`)
  }

  /**
   * Gérer les requêtes d'analytics
   */
  private async handleAnalyticsRequest(
    method: string,
    action: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<any> {
    switch (method) {
      case 'GET':
        if (action === 'stats') {
          return await advancedAnalytics.getGlobalStats()
        } else if (action === 'trends') {
          const { drawName } = parameters
          return await advancedAnalytics.detectTrends(drawName)
        } else if (action === 'suggestions') {
          const { drawName } = parameters
          return await advancedAnalytics.generateSmartSuggestions(drawName)
        }
        break

      default:
        throw new Error(`Méthode non supportée: ${method}`)
    }

    throw new Error(`Action non supportée: ${action}`)
  }

  /**
   * Gérer les requêtes de synchronisation
   */
  private async handleSyncRequest(
    method: string,
    action: string,
    parameters: Record<string, any>,
    apiKey: APIKey
  ): Promise<any> {
    switch (method) {
      case 'GET':
        if (action === 'status') {
          return cloudSyncManager.getStatus()
        }
        break

      case 'POST':
        if (action === 'trigger') {
          const success = await cloudSyncManager.forcSync()
          return { success }
        }
        break

      default:
        throw new Error(`Méthode non supportée: ${method}`)
    }

    throw new Error(`Action non supportée: ${action}`)
  }

  /**
   * Paginer les résultats
   */
  private paginateResults(data: any[], parameters: Record<string, any>) {
    const page = Math.max(1, parseInt(parameters.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(parameters.limit) || 20))
    const offset = (page - 1) * limit

    const paginatedData = data.slice(offset, offset + limit)

    return {
      items: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        hasNext: offset + limit < data.length
      }
    }
  }

  /**
   * Vérifier les permissions
   */
  private hasPermission(apiKey: APIKey, endpoint: string, method: string): boolean {
    const [resource] = endpoint.split('/').filter(Boolean)
    const permission = apiKey.permissions.find(p => p.resource === resource)

    if (!permission) return false

    const actionMap: Record<string, 'read' | 'write' | 'delete'> = {
      'GET': 'read',
      'POST': 'write',
      'PUT': 'write',
      'DELETE': 'delete'
    }

    const requiredAction = actionMap[method]
    return permission.actions.includes(requiredAction)
  }

  /**
   * Générer un ID de clé API
   */
  private generateAPIKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Générer une clé API
   */
  private generateAPIKey(): string {
    const prefix = 'lty_'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix

    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  /**
   * Générer un ID de requête
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Charger les clés API
   */
  private async loadAPIKeys() {
    try {
      const keys = await indexedDBCache.get<APIKey[]>('api_keys') || []
      this.apiKeys = keys
    } catch (error) {
      console.warn('Erreur chargement clés API:', error)
    }
  }

  /**
   * Sauvegarder les clés API
   */
  private async saveAPIKeys() {
    try {
      await indexedDBCache.set('api_keys', this.apiKeys)
    } catch (error) {
      console.error('Erreur sauvegarde clés API:', error)
    }
  }

  /**
   * Charger les requêtes
   */
  private async loadRequests() {
    try {
      const requests = await indexedDBCache.get<APIRequest[]>('api_requests') || []
      this.requests = requests
    } catch (error) {
      console.warn('Erreur chargement requêtes API:', error)
    }
  }

  /**
   * Sauvegarder les requêtes
   */
  private async saveRequests() {
    try {
      // Garder seulement les 10000 dernières requêtes
      const recentRequests = this.requests.slice(-10000)
      await indexedDBCache.set('api_requests', recentRequests)
      this.requests = recentRequests
    } catch (error) {
      console.error('Erreur sauvegarde requêtes API:', error)
    }
  }

  /**
   * Nettoyer les anciennes requêtes
   */
  private cleanupOldRequests() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    this.requests = this.requests.filter(req =>
      new Date(req.timestamp) > thirtyDaysAgo
    )

    this.saveRequests()
  }

  /**
   * API publique
   */

  // Obtenir toutes les clés API
  getAPIKeys(): APIKey[] {
    return [...this.apiKeys]
  }

  // Obtenir une clé API par ID
  getAPIKeyById(id: string): APIKey | null {
    return this.apiKeys.find(key => key.id === id) || null
  }

  // Révoquer une clé API
  async revokeAPIKey(id: string): Promise<boolean> {
    const key = this.apiKeys.find(k => k.id === id)
    if (!key) return false

    key.status = 'revoked'
    await this.saveAPIKeys()
    return true
  }

  // Obtenir les statistiques d'usage
  getUsageStats(apiKeyId?: string): any {
    const requests = apiKeyId ?
      this.requests.filter(r => r.apiKeyId === apiKeyId) :
      this.requests

    const today = new Date().toDateString()
    const requestsToday = requests.filter(r =>
      new Date(r.timestamp).toDateString() === today
    )

    return {
      totalRequests: requests.length,
      requestsToday: requestsToday.length,
      averageResponseTime: requests.length > 0 ?
        requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length : 0,
      errorRate: requests.length > 0 ?
        requests.filter(r => r.statusCode >= 400).length / requests.length * 100 : 0,
      topEndpoints: this.getTopEndpoints(requests),
      requestsByHour: this.getRequestsByHour(requests)
    }
  }

  // Obtenir les endpoints les plus utilisés
  private getTopEndpoints(requests: APIRequest[]): Array<{ endpoint: string; count: number }> {
    const endpointCounts: Record<string, number> = {}

    requests.forEach(req => {
      endpointCounts[req.endpoint] = (endpointCounts[req.endpoint] || 0) + 1
    })

    return Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  // Obtenir les requêtes par heure
  private getRequestsByHour(requests: APIRequest[]): Array<{ hour: string; count: number }> {
    const hourCounts: Record<string, number> = {}

    requests.forEach(req => {
      const hour = new Date(req.timestamp).getHours().toString().padStart(2, '0')
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i.toString().padStart(2, '0'),
      count: hourCounts[i.toString().padStart(2, '0')] || 0
    }))
  }
}

// Instance singleton
export const publicAPIManager = new PublicAPIManager()

// Types exportés
export type { APIKey, APIPermission, APIRequest, APIResponse, SDKConfig }