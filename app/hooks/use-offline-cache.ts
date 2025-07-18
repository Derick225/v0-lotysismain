'use client'

import { useState, useEffect, useCallback } from 'react'
import { indexedDBCache, type CacheStats, type SyncStatus } from '../lib/indexeddb-cache'
import { DrawResult } from '../lib/constants'

interface UseOfflineCacheReturn {
  isOnline: boolean
  cacheReady: boolean
  cacheStats: CacheStats | null
  syncStatus: SyncStatus
  getCachedDrawResults: (drawName: string) => Promise<DrawResult[] | null>
  setCachedDrawResults: (drawName: string, results: DrawResult[]) => Promise<void>
  getCachedPredictions: (drawName: string) => Promise<any[] | null>
  setCachedPredictions: (drawName: string, predictions: any[]) => Promise<void>
  clearCache: () => Promise<void>
  cleanupCache: () => Promise<number>
  refreshStats: () => Promise<void>
  startSync: () => void
  endSync: (success: boolean, error?: string) => void
  isDataStale: (timestamp: number, maxAge?: number) => boolean
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (online && syncStatus.pendingSync) {
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
    }, 60 * 60 * 1000)

    return () => clearInterval(cleanupInterval)
  }, [cacheReady])

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

  const startSync = useCallback((): void => {
    indexedDBCache.startSync()
    setSyncStatus(indexedDBCache.getSyncStatus())
  }, [])

  const endSync = useCallback((success: boolean, error?: string): void => {
    indexedDBCache.endSync(success, error)
    setSyncStatus(indexedDBCache.getSyncStatus())
  }, [])

  const isDataStale = useCallback((timestamp: number, maxAge: number = 5 * 60 * 1000): boolean => {
    return Date.now() - timestamp > maxAge
  }, [])

  return {
    isOnline,
    cacheReady,
    cacheStats,
    syncStatus,
    getCachedDrawResults,
    setCachedDrawResults,
    getCachedPredictions,
    setCachedPredictions,
    clearCache,
    cleanupCache,
    refreshStats,
    startSync,
    endSync,
    isDataStale
  }
}

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

    const interval = setInterval(updateStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return { stats, loading }
}
