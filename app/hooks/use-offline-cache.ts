'use client'

import { useState, useEffect, useCallback } from 'react'
import { indexedDBCache, type CacheStats, type SyncStatus } from '../lib/indexeddb-cache'
import { DrawResult } from '../lib/constants'

interface UseOfflineCacheReturn {
  // État du cache
  isOnline: boolean
  cacheReady: boolean
  cacheStats: CacheStats | null
  syncStatus: SyncStatus
  
  // Méthodes de cache
  getCachedDrawResults: (drawName: string) => Promise<DrawResult[] | null>
  setCachedDrawResults: (drawName: string, results: DrawResult[]) => Promise<void>
  getCachedPredictions: (drawName: string) => Promise<any[] | null>
  setCachedPredictions: (drawName: string, predictions: any[]) => Promise<void>
  
  // Gestion du cache
  clearCache: () => Promise<void>
  cleanupCache: () => Promise<number>
  refreshStats: () => Promise<void>
  
  // Synchronisation
  startSync: () => void
  endSync: (success: boolean, error?: string) => void
  
  // Utilitaires
  isDataStale: (timestamp: number, maxAge?: number) => boolean
  getOfflineIndicator: () => React.ReactNode
}

export function useOfflineCache(): UseOfflineCacheReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [cacheReady, setCacheReady] = useState(false)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingSync: false,
    syncErrors: [],
    totalSynced: 0
  })

  // Initialiser le cache au montage
  useEffect(() => {
    const initCache = async () => {
      try {
        await indexedDBCache.initialize()
        setCacheReady(true)
        await refreshStats()
        setSyncStatus(indexedDBCache.getSyncStatus())
      } catch (error) {
        console.error('Erreur initialisation cache:', error)
      }
    }

    initCache()
  }, [])

  // Détecter le statut de connexion
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (online && syncStatus.pendingSync) {
        // Déclencher une synchronisation automatique si nécessaire
        console.log('Connexion rétablie, synchronisation en attente')
      }
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [syncStatus.pendingSync])

  // Nettoyer automatiquement le cache périodiquement
  useEffect(() => {
    if (!cacheReady) return

    const cleanupInterval = setInterval(async () => {
      try {
        const deletedCount = await indexedDBCache.cleanup()
        if (deletedCount > 0) {
          console.log(`Cache nettoyé: ${deletedCount} entrées supprimées`)
          await refreshStats()
        }
      } catch (error) {
        console.error('Erreur nettoyage automatique:', error)
      }
    }, 60 * 60 * 1000) // Toutes les heures

    return () => clearInterval(cleanupInterval)
  }, [cacheReady])

  // Méthodes de cache pour les résultats de tirage
  const getCachedDrawResults = useCallback(async (drawName: string): Promise<DrawResult[] | null> => {
    if (!cacheReady) return null
    
    try {
      return await indexedDBCache.getDrawResults(drawName)
    } catch (error) {
      console.error('Erreur lecture cache résultats:', error)
      return null
    }
  }, [cacheReady])

  const setCachedDrawResults = useCallback(async (drawName: string, results: DrawResult[]): Promise<void> => {
    if (!cacheReady) return
    
    try {
      await indexedDBCache.setDrawResults(drawName, results)
      await refreshStats()
    } catch (error) {
      console.error('Erreur écriture cache résultats:', error)
    }
  }, [cacheReady])

  // Méthodes de cache pour les prédictions
  const getCachedPredictions = useCallback(async (drawName: string): Promise<any[] | null> => {
    if (!cacheReady) return null
    
    try {
      return await indexedDBCache.getPredictions(drawName)
    } catch (error) {
      console.error('Erreur lecture cache prédictions:', error)
      return null
    }
  }, [cacheReady])

  const setCachedPredictions = useCallback(async (drawName: string, predictions: any[]): Promise<void> => {
    if (!cacheReady) return
    
    try {
      await indexedDBCache.setPredictions(drawName, predictions)
      await refreshStats()
    } catch (error) {
      console.error('Erreur écriture cache prédictions:', error)
    }
  }, [cacheReady])

  // Gestion du cache
  const clearCache = useCallback(async (): Promise<void> => {
    if (!cacheReady) return
    
    try {
      await indexedDBCache.clear()
      await refreshStats()
      console.log('Cache vidé avec succès')
    } catch (error) {
      console.error('Erreur vidage cache:', error)
    }
  }, [cacheReady])

  const cleanupCache = useCallback(async (): Promise<number> => {
    if (!cacheReady) return 0
    
    try {
      const deletedCount = await indexedDBCache.cleanup()
      await refreshStats()
      return deletedCount
    } catch (error) {
      console.error('Erreur nettoyage cache:', error)
      return 0
    }
  }, [cacheReady])

  const refreshStats = useCallback(async (): Promise<void> => {
    if (!cacheReady) return
    
    try {
      const stats = await indexedDBCache.getStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Erreur lecture stats cache:', error)
    }
  }, [cacheReady])

  // Synchronisation
  const startSync = useCallback((): void => {
    indexedDBCache.startSync()
    setSyncStatus(indexedDBCache.getSyncStatus())
  }, [])

  const endSync = useCallback((success: boolean, error?: string): void => {
    indexedDBCache.endSync(success, error)
    setSyncStatus(indexedDBCache.getSyncStatus())
  }, [])

  // Utilitaires
  const isDataStale = useCallback((timestamp: number, maxAge: number = 5 * 60 * 1000): boolean => {
    return Date.now() - timestamp > maxAge
  }, [])

  const getOfflineIndicator = useCallback((): React.ReactNode => {
    if (isOnline) return null

    return (
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50">
        <span className="text-sm font-medium">
          📡 Mode hors ligne - Les données peuvent ne pas être à jour
        </span>
      </div>
    )
  }, [isOnline])

  return {
    // État
    isOnline,
    cacheReady,
    cacheStats,
    syncStatus,
    
    // Méthodes de cache
    getCachedDrawResults,
    setCachedDrawResults,
    getCachedPredictions,
    setCachedPredictions,
    
    // Gestion
    clearCache,
    cleanupCache,
    refreshStats,
    
    // Synchronisation
    startSync,
    endSync,
    
    // Utilitaires
    isDataStale,
    getOfflineIndicator
  }
}

// Hook simplifié pour les composants qui ont juste besoin de vérifier le statut hors ligne
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => setIsOnline(navigator.onLine)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return isOnline
}

// Hook pour les statistiques de cache en temps réel
export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateStats = async () => {
      try {
        await indexedDBCache.initialize()
        const cacheStats = await indexedDBCache.getStats()
        setStats(cacheStats)
      } catch (error) {
        console.error('Erreur lecture stats:', error)
      } finally {
        setLoading(false)
      }
    }

    updateStats()

    // Mettre à jour les stats toutes les 30 secondes
    const interval = setInterval(updateStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return { stats, loading }
}
