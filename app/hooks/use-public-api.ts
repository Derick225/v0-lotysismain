'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  publicAPIManager, 
  type APIKey, 
  type APIRequest, 
  type APIPermission 
} from '../lib/public-api-manager'
import { LotysisSDK, type LotysisSDKConfig } from '../lib/lotysis-sdk'
import { useScreenReaderAnnouncements } from './use-accessibility'

interface UsePublicAPIReturn {
  // État des clés API
  apiKeys: APIKey[]
  requests: APIRequest[]
  
  // Actions de gestion des clés
  createAPIKey: (config: any) => Promise<APIKey | null>
  revokeAPIKey: (id: string) => Promise<boolean>
  getAPIKeyById: (id: string) => APIKey | null
  
  // Statistiques
  usageStats: any
  
  // SDK
  createSDK: (apiKey: string, config?: Partial<LotysisSDKConfig>) => LotysisSDK
  testAPIKey: (apiKey: string) => Promise<{ success: boolean; latency: number; error?: string }>
  
  // État
  isLoading: boolean
  error: string | null
}

export function usePublicAPI(): UsePublicAPIReturn {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([])
  const [requests, setRequests] = useState<APIRequest[]>([])
  const [usageStats, setUsageStats] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { announce } = useScreenReaderAnnouncements()

  // Charger les données initiales
  useEffect(() => {
    const loadData = () => {
      setAPIKeys(publicAPIManager.getAPIKeys())
      setUsageStats(publicAPIManager.getUsageStats())
    }

    loadData()

    // Actualiser périodiquement
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Créer une nouvelle clé API
  const createAPIKey = useCallback(async (config: {
    name: string
    permissions: APIPermission[]
    rateLimit?: Partial<APIKey['rateLimit']>
    expiresIn?: number
  }): Promise<APIKey | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const apiKey = await publicAPIManager.createAPIKey(config)
      setAPIKeys(publicAPIManager.getAPIKeys())
      
      announce(`Clé API "${config.name}" créée avec succès`)
      return apiKey
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
      
    } finally {
      setIsLoading(false)
    }
  }, [announce])

  // Révoquer une clé API
  const revokeAPIKey = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await publicAPIManager.revokeAPIKey(id)
      
      if (success) {
        setAPIKeys(publicAPIManager.getAPIKeys())
        announce('Clé API révoquée avec succès')
      } else {
        announce('Erreur lors de la révocation de la clé API', 'assertive')
      }
      
      return success
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la révocation'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return false
      
    } finally {
      setIsLoading(false)
    }
  }, [announce])

  // Obtenir une clé API par ID
  const getAPIKeyById = useCallback((id: string): APIKey | null => {
    return publicAPIManager.getAPIKeyById(id)
  }, [])

  // Créer une instance du SDK
  const createSDK = useCallback((apiKey: string, config: Partial<LotysisSDKConfig> = {}): LotysisSDK => {
    return new LotysisSDK({
      apiKey,
      baseUrl: window.location.origin + '/api/v1',
      ...config
    })
  }, [])

  // Tester une clé API
  const testAPIKey = useCallback(async (apiKey: string): Promise<{ success: boolean; latency: number; error?: string }> => {
    try {
      const sdk = createSDK(apiKey)
      return await sdk.testConnection()
    } catch (error) {
      return {
        success: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Erreur de test'
      }
    }
  }, [createSDK])

  return {
    // État
    apiKeys,
    requests,
    usageStats,
    
    // Actions
    createAPIKey,
    revokeAPIKey,
    getAPIKeyById,
    
    // SDK
    createSDK,
    testAPIKey,
    
    // État
    isLoading,
    error
  }
}

// Hook simplifié pour les développeurs
export function useAPIKey(keyId?: string) {
  const { apiKeys, getAPIKeyById, revokeAPIKey, usageStats } = usePublicAPI()
  
  const apiKey = keyId ? getAPIKeyById(keyId) : null
  const keyStats = keyId ? publicAPIManager.getUsageStats(keyId) : null
  
  const isActive = apiKey?.status === 'active'
  const isExpired = apiKey?.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false
  const isValid = isActive && !isExpired
  
  return {
    apiKey,
    keyStats,
    isActive,
    isExpired,
    isValid,
    revokeKey: () => keyId ? revokeAPIKey(keyId) : Promise.resolve(false)
  }
}

// Hook pour les permissions d'API
export function useAPIPermissions() {
  const availablePermissions: APIPermission[] = [
    {
      resource: 'predictions',
      actions: ['read'],
      scope: 'own'
    },
    {
      resource: 'predictions',
      actions: ['read', 'write'],
      scope: 'own'
    },
    {
      resource: 'results',
      actions: ['read'],
      scope: 'public'
    },
    {
      resource: 'analytics',
      actions: ['read'],
      scope: 'public'
    },
    {
      resource: 'sync',
      actions: ['read'],
      scope: 'own'
    },
    {
      resource: 'sync',
      actions: ['read', 'write'],
      scope: 'own'
    }
  ]

  const getPermissionDescription = (permission: APIPermission): string => {
    const resourceNames: Record<string, string> = {
      predictions: 'Prédictions',
      results: 'Résultats',
      analytics: 'Analytics',
      sync: 'Synchronisation',
      notifications: 'Notifications'
    }

    const actionNames: Record<string, string> = {
      read: 'Lecture',
      write: 'Écriture',
      delete: 'Suppression'
    }

    const scopeNames: Record<string, string> = {
      own: 'Propres données',
      public: 'Données publiques',
      all: 'Toutes les données'
    }

    const resource = resourceNames[permission.resource] || permission.resource
    const actions = permission.actions.map(a => actionNames[a] || a).join(', ')
    const scope = scopeNames[permission.scope] || permission.scope

    return `${resource}: ${actions} (${scope})`
  }

  const createPermissionSet = (level: 'basic' | 'advanced' | 'full'): APIPermission[] => {
    switch (level) {
      case 'basic':
        return [
          { resource: 'predictions', actions: ['read'], scope: 'own' },
          { resource: 'results', actions: ['read'], scope: 'public' }
        ]
      
      case 'advanced':
        return [
          { resource: 'predictions', actions: ['read', 'write'], scope: 'own' },
          { resource: 'results', actions: ['read'], scope: 'public' },
          { resource: 'analytics', actions: ['read'], scope: 'public' },
          { resource: 'sync', actions: ['read'], scope: 'own' }
        ]
      
      case 'full':
        return [
          { resource: 'predictions', actions: ['read', 'write', 'delete'], scope: 'own' },
          { resource: 'results', actions: ['read'], scope: 'public' },
          { resource: 'analytics', actions: ['read'], scope: 'public' },
          { resource: 'sync', actions: ['read', 'write'], scope: 'own' },
          { resource: 'notifications', actions: ['read', 'write'], scope: 'own' }
        ]
      
      default:
        return []
    }
  }

  return {
    availablePermissions,
    getPermissionDescription,
    createPermissionSet
  }
}

// Hook pour les statistiques d'API
export function useAPIStats(apiKeyId?: string) {
  const [stats, setStats] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = () => {
      setIsLoading(true)
      try {
        const apiStats = publicAPIManager.getUsageStats(apiKeyId)
        setStats(apiStats)
      } catch (error) {
        console.error('Erreur chargement stats API:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()

    // Actualiser toutes les minutes
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [apiKeyId])

  const getHealthScore = useCallback(() => {
    if (!stats.totalRequests) return 100

    let score = 100
    
    // Pénalité pour le taux d'erreur
    score -= stats.errorRate * 2
    
    // Bonus pour un temps de réponse rapide
    if (stats.averageResponseTime < 500) score += 5
    else if (stats.averageResponseTime > 2000) score -= 10
    
    // Pénalité pour une utilisation excessive
    if (stats.requestsToday > 5000) score -= 5
    
    return Math.max(0, Math.min(100, score))
  }, [stats])

  const getUsageLevel = useCallback(() => {
    if (!stats.requestsToday) return 'low'
    if (stats.requestsToday < 100) return 'low'
    if (stats.requestsToday < 1000) return 'medium'
    return 'high'
  }, [stats])

  return {
    stats,
    isLoading,
    healthScore: getHealthScore(),
    usageLevel: getUsageLevel(),
    hasData: stats.totalRequests > 0
  }
}

// Hook pour la documentation de l'API
export function useAPIDocumentation() {
  const endpoints = [
    {
      method: 'GET',
      path: '/predictions/list',
      description: 'Obtenir la liste des prédictions',
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Numéro de page' },
        { name: 'limit', type: 'number', required: false, description: 'Nombre d\'éléments par page' },
        { name: 'drawName', type: 'string', required: false, description: 'Filtrer par nom de tirage' }
      ],
      response: {
        items: 'PredictionData[]',
        pagination: 'PaginationInfo'
      }
    },
    {
      method: 'GET',
      path: '/predictions/latest',
      description: 'Obtenir les dernières prédictions',
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'Nombre de prédictions à retourner' }
      ],
      response: 'PredictionData[]'
    },
    {
      method: 'POST',
      path: '/predictions/create',
      description: 'Créer une nouvelle prédiction',
      parameters: [
        { name: 'drawName', type: 'string', required: true, description: 'Nom du tirage' },
        { name: 'algorithm', type: 'string', required: true, description: 'Algorithme utilisé' },
        { name: 'numbers', type: 'number[]', required: true, description: 'Numéros prédits' },
        { name: 'confidence', type: 'number', required: true, description: 'Niveau de confiance (0-100)' }
      ],
      response: 'PredictionData'
    },
    {
      method: 'GET',
      path: '/results/list',
      description: 'Obtenir la liste des résultats',
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Numéro de page' },
        { name: 'limit', type: 'number', required: false, description: 'Nombre d\'éléments par page' },
        { name: 'drawName', type: 'string', required: false, description: 'Filtrer par nom de tirage' }
      ],
      response: {
        items: 'DrawResultData[]',
        pagination: 'PaginationInfo'
      }
    },
    {
      method: 'GET',
      path: '/analytics/stats',
      description: 'Obtenir les statistiques globales',
      parameters: [],
      response: 'AnalyticsData'
    },
    {
      method: 'GET',
      path: '/analytics/trends',
      description: 'Détecter les tendances pour un tirage',
      parameters: [
        { name: 'drawName', type: 'string', required: true, description: 'Nom du tirage' }
      ],
      response: 'TrendData[]'
    },
    {
      method: 'GET',
      path: '/sync/status',
      description: 'Obtenir le statut de synchronisation',
      parameters: [],
      response: 'SyncStatus'
    }
  ]

  const getEndpointsByResource = (resource: string) => {
    return endpoints.filter(endpoint => endpoint.path.startsWith(`/${resource}`))
  }

  const generateCurlExample = (endpoint: any, apiKey: string = 'YOUR_API_KEY') => {
    let curl = `curl -X ${endpoint.method} \\\n`
    curl += `  -H "Authorization: Bearer ${apiKey}" \\\n`
    curl += `  -H "Content-Type: application/json" \\\n`
    
    if (endpoint.method === 'POST') {
      curl += `  -d '{"key": "value"}' \\\n`
    }
    
    curl += `  "${window.location.origin}/api/v1${endpoint.path}"`
    
    return curl
  }

  const generateJSExample = (endpoint: any) => {
    return `const sdk = new LotysisSDK({ apiKey: 'YOUR_API_KEY' });
const result = await sdk.${endpoint.path.replace(/\//g, '').replace(/([A-Z])/g, (match, p1) => p1.toLowerCase())}();
console.log(result);`
  }

  return {
    endpoints,
    getEndpointsByResource,
    generateCurlExample,
    generateJSExample
  }
}
