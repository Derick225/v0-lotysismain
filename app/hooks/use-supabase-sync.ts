"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseSyncService, type SyncResult, type SyncOptions } from '../lib/supabase-sync-service'
import { testSupabaseConnection } from '@/lib/supabase'
import logger from '../lib/logger'

interface UseSyncReturn {
  // État de synchronisation
  isOnline: boolean
  isSyncing: boolean
  lastSyncResult: SyncResult | null
  syncStatus: any[]
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'testing'
  
  // Méthodes de synchronisation
  syncAll: (options?: Partial<SyncOptions>) => Promise<SyncResult>
  syncTable: (table: string, options?: Partial<SyncOptions>) => Promise<SyncResult>
  testConnection: () => Promise<boolean>
  
  // Statistiques
  stats: {
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    lastSyncTime: Date | null
    averageSyncDuration: number
  }
  
  // Gestion des erreurs
  errors: string[]
  clearErrors: () => void
}

interface SyncStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  lastSyncTime: Date | null
  averageSyncDuration: number
}

export function useSupabaseSync(): UseSyncReturn {
  // État principal
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'testing'>('testing')
  const [errors, setErrors] = useState<string[]>([])
  const [stats, setStats] = useState<SyncStats>({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncTime: null,
    averageSyncDuration: 0
  })

  // Refs pour éviter les fuites mémoire
  const syncTimeoutRef = useRef<NodeJS.Timeout>()
  const statsRef = useRef<SyncStats>(stats)
  const durations = useRef<number[]>([])

  // Détecter le statut de connexion
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Tester la connexion Supabase au démarrage
  useEffect(() => {
    testConnection()
  }, [])

  // Synchronisation automatique périodique
  useEffect(() => {
    if (!isOnline || connectionStatus !== 'connected') return

    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await syncAll({ direction: 'bidirectional', batchSize: 50 })
        } catch (error) {
          logger.error('Erreur sync automatique', error)
        }
        scheduleSync() // Programmer la prochaine sync
      }, 5 * 60 * 1000) // Toutes les 5 minutes
    }

    scheduleSync()

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [isOnline, connectionStatus])

  // Charger le statut de synchronisation
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await supabaseSyncService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      logger.error('Erreur chargement sync status', error)
    }
  }, [])

  // Tester la connexion
  const testConnection = useCallback(async (): Promise<boolean> => {
    setConnectionStatus('testing')
    
    try {
      const result = await testSupabaseConnection()
      
      if (result.success) {
        setConnectionStatus('connected')
        await loadSyncStatus()
        return true
      } else {
        setConnectionStatus('error')
        setErrors(prev => [...prev, result.error || 'Erreur de connexion'])
        return false
      }
    } catch (error) {
      setConnectionStatus('error')
      setErrors(prev => [...prev, `Erreur test connexion: ${error}`])
      return false
    }
  }, [loadSyncStatus])

  // Mettre à jour les statistiques
  const updateStats = useCallback((result: SyncResult) => {
    const newStats = { ...statsRef.current }
    
    newStats.totalSyncs++
    newStats.lastSyncTime = new Date()
    
    if (result.success) {
      newStats.successfulSyncs++
    } else {
      newStats.failedSyncs++
    }
    
    // Calculer la durée moyenne (garder les 10 dernières)
    durations.current.push(result.duration)
    if (durations.current.length > 10) {
      durations.current.shift()
    }
    
    newStats.averageSyncDuration = durations.current.reduce((sum, d) => sum + d, 0) / durations.current.length
    
    statsRef.current = newStats
    setStats(newStats)
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('sync-stats', JSON.stringify(newStats))
    } catch (error) {
      logger.error('Erreur sauvegarde stats', error)
    }
  }, [])

  // Charger les statistiques depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sync-stats')
      if (stored) {
        const parsedStats = JSON.parse(stored)
        parsedStats.lastSyncTime = parsedStats.lastSyncTime ? new Date(parsedStats.lastSyncTime) : null
        setStats(parsedStats)
        statsRef.current = parsedStats
      }
    } catch (error) {
      logger.error('Erreur chargement stats', error)
    }
  }, [])

  // Synchronisation complète
  const syncAll = useCallback(async (options: Partial<SyncOptions> = {}): Promise<SyncResult> => {
    if (isSyncing) {
      throw new Error('Synchronisation déjà en cours')
    }

    if (!isOnline) {
      throw new Error('Pas de connexion internet')
    }

    if (connectionStatus !== 'connected') {
      const connected = await testConnection()
      if (!connected) {
        throw new Error('Impossible de se connecter à Supabase')
      }
    }

    setIsSyncing(true)
    setErrors([])

    try {
      logger.info('Début synchronisation complète', options)
      
      const result = await supabaseSyncService.syncAll(options)
      
      setLastSyncResult(result)
      updateStats(result)
      
      if (result.errors.length > 0) {
        setErrors(result.errors)
      }
      
      // Recharger le statut après la sync
      await loadSyncStatus()
      
      logger.info('Synchronisation complète terminée', {
        success: result.success,
        recordsSynced: result.recordsSynced,
        duration: result.duration
      })
      
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setErrors(prev => [...prev, errorMessage])
      logger.error('Erreur synchronisation complète', error)
      
      // Créer un résultat d'erreur
      const errorResult: SyncResult = {
        success: false,
        recordsSynced: 0,
        conflicts: [],
        errors: [errorMessage],
        duration: 0
      }
      
      setLastSyncResult(errorResult)
      updateStats(errorResult)
      
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, isOnline, connectionStatus, testConnection, updateStats, loadSyncStatus])

  // Synchronisation d'une table spécifique
  const syncTable = useCallback(async (
    table: string, 
    options: Partial<SyncOptions> = {}
  ): Promise<SyncResult> => {
    const tableOptions = {
      ...options,
      tables: [table]
    }
    
    return await syncAll(tableOptions)
  }, [syncAll])

  // Effacer les erreurs
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Nettoyage
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    // État
    isOnline,
    isSyncing,
    lastSyncResult,
    syncStatus,
    connectionStatus,
    
    // Méthodes
    syncAll,
    syncTable,
    testConnection,
    
    // Statistiques
    stats,
    
    // Gestion des erreurs
    errors,
    clearErrors
  }
}

// Hook pour surveiller les changements temps réel
export function useRealtimeSubscription(table: string, callback: (payload: any) => void) {
  useEffect(() => {
    // Cette fonctionnalité est déjà gérée par SupabaseSyncService
    // Mais on peut ajouter des subscriptions spécifiques si nécessaire
    
    return () => {
      // Cleanup si nécessaire
    }
  }, [table, callback])
}

// Hook pour les favoris utilisateur avec sync Supabase
export function useUserFavorites() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { syncTable } = useSupabaseSync()

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      // Charger depuis localStorage d'abord
      const stored = localStorage.getItem('user-favorites')
      if (stored) {
        setFavorites(JSON.parse(stored))
      }
      
      // Puis synchroniser avec Supabase
      await syncTable('user_favorites', { direction: 'bidirectional' })
      
    } catch (error) {
      logger.error('Erreur chargement favoris', error)
    } finally {
      setLoading(false)
    }
  }, [syncTable])

  const addFavorite = useCallback(async (favorite: any) => {
    const newFavorites = [...favorites, { ...favorite, id: Date.now() }]
    setFavorites(newFavorites)
    
    // Sauvegarder localement
    localStorage.setItem('user-favorites', JSON.stringify(newFavorites))
    
    // Synchroniser avec Supabase
    try {
      await syncTable('user_favorites', { direction: 'up' })
    } catch (error) {
      logger.error('Erreur sync ajout favori', error)
    }
  }, [favorites, syncTable])

  const removeFavorite = useCallback(async (id: number) => {
    const newFavorites = favorites.filter(f => f.id !== id)
    setFavorites(newFavorites)
    
    // Sauvegarder localement
    localStorage.setItem('user-favorites', JSON.stringify(newFavorites))
    
    // Synchroniser avec Supabase
    try {
      await syncTable('user_favorites', { direction: 'up' })
    } catch (error) {
      logger.error('Erreur sync suppression favori', error)
    }
  }, [favorites, syncTable])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    reload: loadFavorites
  }
}
