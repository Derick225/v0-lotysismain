'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  cloudSyncManager, 
  type SyncStatus, 
  type SyncSettings, 
  type SyncConflict 
} from '../lib/cloud-sync-manager'
import { useScreenReaderAnnouncements } from './use-accessibility'

interface UseCloudSyncReturn {
  // État de synchronisation
  status: SyncStatus
  settings: SyncSettings
  conflicts: SyncConflict[]
  
  // Actions
  forceSync: () => Promise<boolean>
  updateSettings: (newSettings: Partial<SyncSettings>) => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<boolean>
  
  // Utilitaires
  isHealthy: boolean
  hasConflicts: boolean
  canSync: boolean
  lastSyncFormatted: string | null
  syncProgress: number // 0-100
  
  // Métriques
  syncMetrics: {
    totalSyncs: number
    successRate: number
    averageSyncTime: number
    dataTransferred: number
  }
}

export function useCloudSync(): UseCloudSyncReturn {
  const [status, setStatus] = useState<SyncStatus>(cloudSyncManager.getStatus())
  const [settings, setSettings] = useState<SyncSettings>(cloudSyncManager.getSettings())
  const [conflicts, setConflicts] = useState<SyncConflict[]>(cloudSyncManager.getConflicts())
  const [syncMetrics, setSyncMetrics] = useState({
    totalSyncs: 0,
    successRate: 100,
    averageSyncTime: 0,
    dataTransferred: 0
  })

  const { announce } = useScreenReaderAnnouncements()

  // S'abonner aux changements de statut
  useEffect(() => {
    const unsubscribe = cloudSyncManager.subscribe((newStatus) => {
      setStatus(newStatus)
      
      // Annoncer les changements importants
      if (newStatus.syncInProgress !== status.syncInProgress) {
        if (newStatus.syncInProgress) {
          announce('Synchronisation en cours')
        } else {
          if (newStatus.syncErrors.length === 0) {
            announce('Synchronisation terminée avec succès')
          } else {
            announce('Synchronisation terminée avec des erreurs', 'assertive')
          }
        }
      }
      
      if (newStatus.conflictsDetected !== status.conflictsDetected && newStatus.conflictsDetected > 0) {
        announce(`${newStatus.conflictsDetected} conflit(s) de synchronisation détecté(s)`, 'assertive')
      }
    })

    return unsubscribe
  }, [status, announce])

  // Mettre à jour les conflits
  useEffect(() => {
    const updateConflicts = () => {
      setConflicts(cloudSyncManager.getConflicts())
    }

    const interval = setInterval(updateConflicts, 5000) // Vérifier toutes les 5 secondes
    return () => clearInterval(interval)
  }, [])

  // Forcer une synchronisation
  const forceSync = useCallback(async (): Promise<boolean> => {
    const startTime = Date.now()
    
    try {
      const success = await cloudSyncManager.forcSync()
      
      // Mettre à jour les métriques
      const syncTime = Date.now() - startTime
      setSyncMetrics(prev => ({
        totalSyncs: prev.totalSyncs + 1,
        successRate: ((prev.successRate * prev.totalSyncs) + (success ? 100 : 0)) / (prev.totalSyncs + 1),
        averageSyncTime: ((prev.averageSyncTime * prev.totalSyncs) + syncTime) / (prev.totalSyncs + 1),
        dataTransferred: prev.dataTransferred + (success ? 1 : 0) // Placeholder
      }))
      
      return success
    } catch (error) {
      console.error('Erreur force sync:', error)
      return false
    }
  }, [])

  // Mettre à jour les paramètres
  const updateSettings = useCallback(async (newSettings: Partial<SyncSettings>) => {
    try {
      await cloudSyncManager.updateSyncSettings(newSettings)
      setSettings(cloudSyncManager.getSettings())
      announce('Paramètres de synchronisation mis à jour')
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error)
      announce('Erreur lors de la mise à jour des paramètres', 'assertive')
    }
  }, [announce])

  // Résoudre un conflit
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<boolean> => {
    try {
      const success = await cloudSyncManager.resolveConflictManually(conflictId, resolution)
      
      if (success) {
        setConflicts(cloudSyncManager.getConflicts())
        announce(`Conflit résolu en faveur des données ${resolution === 'local' ? 'locales' : 'distantes'}`)
      } else {
        announce('Erreur lors de la résolution du conflit', 'assertive')
      }
      
      return success
    } catch (error) {
      console.error('Erreur résolution conflit:', error)
      announce('Erreur lors de la résolution du conflit', 'assertive')
      return false
    }
  }, [announce])

  // Calculer les propriétés dérivées
  const isHealthy = status.dataIntegrity === 'healthy' && status.syncErrors.length === 0
  const hasConflicts = conflicts.length > 0
  const canSync = status.isOnline && !status.syncInProgress
  
  const lastSyncFormatted = status.lastSync 
    ? new Date(status.lastSync).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  // Calculer le progrès de synchronisation (estimation)
  const syncProgress = status.syncInProgress 
    ? Math.min(95, 20 + (Date.now() % 10000) / 133) // Animation factice
    : (status.lastSync ? 100 : 0)

  return {
    // État
    status,
    settings,
    conflicts,
    
    // Actions
    forceSync,
    updateSettings,
    resolveConflict,
    
    // Utilitaires
    isHealthy,
    hasConflicts,
    canSync,
    lastSyncFormatted,
    syncProgress,
    
    // Métriques
    syncMetrics
  }
}

// Hook simplifié pour le statut de synchronisation
export function useSyncStatus() {
  const { status, isHealthy, hasConflicts, canSync, lastSyncFormatted } = useCloudSync()
  
  return {
    isOnline: status.isOnline,
    isSyncing: status.syncInProgress,
    isHealthy,
    hasConflicts,
    canSync,
    lastSync: lastSyncFormatted,
    errorCount: status.syncErrors.length
  }
}

// Hook pour les paramètres de synchronisation
export function useSyncSettings() {
  const { settings, updateSettings } = useCloudSync()
  
  const toggleAutoSync = useCallback(() => {
    updateSettings({ autoSync: !settings.autoSync })
  }, [settings.autoSync, updateSettings])
  
  const setSyncInterval = useCallback((minutes: number) => {
    updateSettings({ syncInterval: Math.max(1, Math.min(60, minutes)) })
  }, [updateSettings])
  
  const setConflictResolution = useCallback((strategy: SyncSettings['conflictResolution']) => {
    updateSettings({ conflictResolution: strategy })
  }, [updateSettings])
  
  return {
    settings,
    updateSettings,
    toggleAutoSync,
    setSyncInterval,
    setConflictResolution
  }
}

// Hook pour la gestion des conflits
export function useSyncConflicts() {
  const { conflicts, resolveConflict, hasConflicts } = useCloudSync()
  
  const resolveAllConflicts = useCallback(async (resolution: 'local' | 'remote') => {
    const results = await Promise.all(
      conflicts.map(conflict => resolveConflict(conflict.id, resolution))
    )
    
    return results.every(Boolean)
  }, [conflicts, resolveConflict])
  
  const getConflictsByType = useCallback((type: SyncConflict['type']) => {
    return conflicts.filter(conflict => conflict.type === type)
  }, [conflicts])
  
  return {
    conflicts,
    hasConflicts,
    conflictCount: conflicts.length,
    resolveConflict,
    resolveAllConflicts,
    getConflictsByType
  }
}

// Hook pour les métriques de synchronisation
export function useSyncMetrics() {
  const { syncMetrics, status } = useCloudSync()
  
  const getHealthScore = useCallback(() => {
    let score = 100
    
    // Pénalités pour les erreurs
    score -= status.syncErrors.length * 10
    
    // Pénalités pour les conflits
    score -= status.conflictsDetected * 5
    
    // Bonus pour la connectivité
    if (status.isOnline) score += 0
    else score -= 20
    
    // Bonus pour la synchronisation récente
    if (status.lastSync) {
      const hoursSinceSync = (Date.now() - new Date(status.lastSync).getTime()) / (1000 * 60 * 60)
      if (hoursSinceSync < 1) score += 10
      else if (hoursSinceSync > 24) score -= 10
    }
    
    return Math.max(0, Math.min(100, score))
  }, [status])
  
  const getDataIntegrityLevel = useCallback(() => {
    const healthScore = getHealthScore()
    
    if (healthScore >= 90) return 'excellent'
    if (healthScore >= 70) return 'good'
    if (healthScore >= 50) return 'warning'
    return 'critical'
  }, [getHealthScore])
  
  return {
    ...syncMetrics,
    healthScore: getHealthScore(),
    dataIntegrityLevel: getDataIntegrityLevel(),
    isOnline: status.isOnline,
    lastSync: status.lastSync
  }
}
