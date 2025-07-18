'use client'

/**
 * Gestionnaire de synchronisation cloud avec Supabase
 * Gère la synchronisation temps réel, la résolution de conflits et la cohérence des données
 */

import { createClient } from '@supabase/supabase-js'
import { indexedDBCache } from './indexeddb-cache'
import { predictionHistory, type PredictionRecord } from './prediction-history'
import type { DrawResult } from './constants'

export interface SyncStatus {
  isOnline: boolean
  lastSync: string | null
  syncInProgress: boolean
  pendingChanges: number
  conflictsDetected: number
  syncErrors: string[]
  dataIntegrity: 'healthy' | 'warning' | 'error'
}

export interface SyncConflict {
  id: string
  type: 'prediction' | 'preference' | 'draw_result'
  localData: any
  remoteData: any
  timestamp: string
  resolution?: 'local' | 'remote' | 'merge' | 'manual'
}

export interface SyncSettings {
  autoSync: boolean
  syncInterval: number // en minutes
  conflictResolution: 'ask' | 'local_priority' | 'remote_priority' | 'timestamp_priority'
  syncOnlyOnWifi: boolean
  backgroundSync: boolean
  maxRetries: number
}

class CloudSyncManager {
  private supabase: any
  private syncStatus: SyncStatus = {
    isOnline: false,
    lastSync: null,
    syncInProgress: false,
    pendingChanges: 0,
    conflictsDetected: 0,
    syncErrors: [],
    dataIntegrity: 'healthy'
  }
  private syncSettings: SyncSettings = {
    autoSync: true,
    syncInterval: 5, // 5 minutes
    conflictResolution: 'timestamp_priority',
    syncOnlyOnWifi: false,
    backgroundSync: true,
    maxRetries: 3
  }
  private syncTimer: NodeJS.Timeout | null = null
  private listeners: Set<(status: SyncStatus) => void> = new Set()
  private conflictQueue: SyncConflict[] = []

  constructor() {
    this.initializeSupabase()
    this.setupNetworkListeners()
    this.loadSyncSettings()
  }

  /**
   * Initialiser la connexion Supabase
   */
  private async initializeSupabase() {
    try {
      // Récupérer les credentials depuis les variables d'environnement
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Credentials Supabase manquants')
      }

      this.supabase = createClient(supabaseUrl, supabaseKey)
      
      // Tester la connexion
      const { data, error } = await this.supabase.from('sync_test').select('*').limit(1)
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (normal)
        console.warn('Test connexion Supabase:', error)
      }

      this.updateSyncStatus({ isOnline: true })
      console.log('✅ Connexion Supabase établie')
    } catch (error) {
      console.error('❌ Erreur initialisation Supabase:', error)
      this.updateSyncStatus({ isOnline: false })
    }
  }

  /**
   * Configurer les listeners réseau
   */
  private setupNetworkListeners() {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine
      this.updateSyncStatus({ isOnline })
      
      if (isOnline && this.syncSettings.autoSync) {
        this.startAutoSync()
      } else {
        this.stopAutoSync()
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    // État initial
    updateOnlineStatus()
  }

  /**
   * Charger les paramètres de synchronisation
   */
  private async loadSyncSettings() {
    try {
      const settings = await indexedDBCache.get<SyncSettings>('sync_settings')
      if (settings) {
        this.syncSettings = { ...this.syncSettings, ...settings }
      }
    } catch (error) {
      console.warn('Erreur chargement paramètres sync:', error)
    }
  }

  /**
   * Sauvegarder les paramètres de synchronisation
   */
  async updateSyncSettings(newSettings: Partial<SyncSettings>) {
    this.syncSettings = { ...this.syncSettings, ...newSettings }
    
    try {
      await indexedDBCache.set('sync_settings', this.syncSettings)
      
      // Redémarrer la sync auto si nécessaire
      if (newSettings.autoSync !== undefined) {
        if (newSettings.autoSync && this.syncStatus.isOnline) {
          this.startAutoSync()
        } else {
          this.stopAutoSync()
        }
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres sync:', error)
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync() {
    this.stopAutoSync() // Arrêter le timer existant
    
    if (!this.syncSettings.autoSync || !this.syncStatus.isOnline) return

    const intervalMs = this.syncSettings.syncInterval * 60 * 1000
    this.syncTimer = setInterval(() => {
      this.performFullSync()
    }, intervalMs)

    console.log(`🔄 Sync automatique démarrée (${this.syncSettings.syncInterval}min)`)
  }

  /**
   * Arrêter la synchronisation automatique
   */
  private stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  /**
   * Effectuer une synchronisation complète
   */
  async performFullSync(): Promise<boolean> {
    if (this.syncStatus.syncInProgress) {
      console.log('⏳ Synchronisation déjà en cours')
      return false
    }

    this.updateSyncStatus({ syncInProgress: true, syncErrors: [] })

    try {
      console.log('🔄 Début synchronisation complète')

      // 1. Synchroniser les prédictions
      await this.syncPredictions()

      // 2. Synchroniser les préférences utilisateur
      await this.syncUserPreferences()

      // 3. Synchroniser les résultats de tirages (si applicable)
      await this.syncDrawResults()

      // 4. Résoudre les conflits en attente
      await this.resolveConflicts()

      this.updateSyncStatus({
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
        dataIntegrity: 'healthy'
      })

      console.log('✅ Synchronisation complète terminée')
      return true

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error)
      this.updateSyncStatus({
        syncErrors: [...this.syncStatus.syncErrors, error instanceof Error ? error.message : 'Erreur inconnue'],
        dataIntegrity: 'error'
      })
      return false

    } finally {
      this.updateSyncStatus({ syncInProgress: false })
    }
  }

  /**
   * Synchroniser les prédictions
   */
  private async syncPredictions() {
    try {
      // Récupérer les prédictions locales
      const localPredictions = await predictionHistory.getHistory()
      
      // Récupérer les prédictions distantes
      const { data: remotePredictions, error } = await this.supabase
        .from('predictions')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) throw error

      // Détecter les conflits et synchroniser
      const conflicts = this.detectPredictionConflicts(localPredictions, remotePredictions || [])
      
      if (conflicts.length > 0) {
        this.conflictQueue.push(...conflicts)
        this.updateSyncStatus({ conflictsDetected: this.conflictQueue.length })
      }

      // Uploader les nouvelles prédictions locales
      const newLocalPredictions = localPredictions.filter(local => 
        !remotePredictions?.some(remote => remote.id === local.id)
      )

      if (newLocalPredictions.length > 0) {
        const { error: uploadError } = await this.supabase
          .from('predictions')
          .insert(newLocalPredictions.map(this.formatPredictionForSupabase))

        if (uploadError) throw uploadError
      }

      // Télécharger les nouvelles prédictions distantes
      const newRemotePredictions = remotePredictions?.filter(remote => 
        !localPredictions.some(local => local.id === remote.id)
      ) || []

      for (const remotePrediction of newRemotePredictions) {
        await predictionHistory.savePrediction(this.formatPredictionFromSupabase(remotePrediction))
      }

      console.log(`📊 Prédictions sync: ${newLocalPredictions.length} up, ${newRemotePredictions.length} down`)

    } catch (error) {
      console.error('Erreur sync prédictions:', error)
      throw error
    }
  }

  /**
   * Synchroniser les préférences utilisateur
   */
  private async syncUserPreferences() {
    try {
      // Récupérer les préférences locales
      const localPrefs = await indexedDBCache.get('user_preferences') || {}
      
      // Récupérer les préférences distantes
      const { data: remotePrefs, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        // Créer l'entrée si elle n'existe pas
        const { error: insertError } = await this.supabase
          .from('user_preferences')
          .insert([{ preferences: localPrefs, updated_at: new Date().toISOString() }])

        if (insertError) throw insertError
        return
      }

      // Comparer les timestamps et synchroniser
      const localTimestamp = localPrefs.updated_at || '1970-01-01T00:00:00.000Z'
      const remoteTimestamp = remotePrefs?.updated_at || '1970-01-01T00:00:00.000Z'

      if (new Date(remoteTimestamp) > new Date(localTimestamp)) {
        // Les préférences distantes sont plus récentes
        await indexedDBCache.set('user_preferences', remotePrefs.preferences)
      } else if (new Date(localTimestamp) > new Date(remoteTimestamp)) {
        // Les préférences locales sont plus récentes
        const { error: updateError } = await this.supabase
          .from('user_preferences')
          .update({ 
            preferences: localPrefs, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', remotePrefs?.id)

        if (updateError) throw updateError
      }

      console.log('⚙️ Préférences utilisateur synchronisées')

    } catch (error) {
      console.error('Erreur sync préférences:', error)
      throw error
    }
  }

  /**
   * Synchroniser les résultats de tirages
   */
  private async syncDrawResults() {
    try {
      // Cette fonction peut être étendue pour synchroniser les résultats
      // avec des sources externes ou des mises à jour communautaires
      console.log('🎲 Sync résultats de tirages (placeholder)')
    } catch (error) {
      console.error('Erreur sync résultats:', error)
      throw error
    }
  }

  /**
   * Détecter les conflits entre prédictions locales et distantes
   */
  private detectPredictionConflicts(local: PredictionRecord[], remote: any[]): SyncConflict[] {
    const conflicts: SyncConflict[] = []

    for (const localPred of local) {
      const remotePred = remote.find(r => r.id === localPred.id)
      
      if (remotePred) {
        // Comparer les timestamps de modification
        const localTime = new Date(localPred.verificationDate || localPred.timestamp)
        const remoteTime = new Date(remotePred.updated_at || remotePred.timestamp)

        if (Math.abs(localTime.getTime() - remoteTime.getTime()) > 1000) { // Plus de 1 seconde de différence
          // Vérifier si les données sont différentes
          if (JSON.stringify(localPred) !== JSON.stringify(this.formatPredictionFromSupabase(remotePred))) {
            conflicts.push({
              id: `conflict_${localPred.id}_${Date.now()}`,
              type: 'prediction',
              localData: localPred,
              remoteData: remotePred,
              timestamp: new Date().toISOString()
            })
          }
        }
      }
    }

    return conflicts
  }

  /**
   * Résoudre les conflits en attente
   */
  private async resolveConflicts() {
    if (this.conflictQueue.length === 0) return

    for (const conflict of this.conflictQueue) {
      try {
        await this.resolveConflict(conflict)
      } catch (error) {
        console.error('Erreur résolution conflit:', error)
      }
    }

    this.conflictQueue = []
    this.updateSyncStatus({ conflictsDetected: 0 })
  }

  /**
   * Résoudre un conflit spécifique
   */
  private async resolveConflict(conflict: SyncConflict) {
    let resolution = conflict.resolution

    if (!resolution) {
      // Appliquer la stratégie de résolution automatique
      switch (this.syncSettings.conflictResolution) {
        case 'local_priority':
          resolution = 'local'
          break
        case 'remote_priority':
          resolution = 'remote'
          break
        case 'timestamp_priority':
          const localTime = new Date(conflict.localData.timestamp || conflict.localData.updated_at)
          const remoteTime = new Date(conflict.remoteData.timestamp || conflict.remoteData.updated_at)
          resolution = localTime > remoteTime ? 'local' : 'remote'
          break
        default:
          resolution = 'remote' // Par défaut
      }
    }

    // Appliquer la résolution
    switch (resolution) {
      case 'local':
        // Garder les données locales, mettre à jour le distant
        if (conflict.type === 'prediction') {
          await this.supabase
            .from('predictions')
            .upsert(this.formatPredictionForSupabase(conflict.localData))
        }
        break

      case 'remote':
        // Garder les données distantes, mettre à jour le local
        if (conflict.type === 'prediction') {
          await predictionHistory.savePrediction(this.formatPredictionFromSupabase(conflict.remoteData))
        }
        break

      case 'merge':
        // Fusionner les données (implémentation spécifique selon le type)
        // Pour l'instant, utiliser la stratégie timestamp
        await this.resolveConflict({ ...conflict, resolution: 'timestamp_priority' })
        break
    }

    console.log(`🔧 Conflit résolu: ${conflict.id} -> ${resolution}`)
  }

  /**
   * Formater une prédiction pour Supabase
   */
  private formatPredictionForSupabase(prediction: PredictionRecord): any {
    return {
      id: prediction.id,
      timestamp: prediction.timestamp,
      draw_name: prediction.drawName,
      algorithm: prediction.algorithm,
      algorithm_version: prediction.algorithmVersion,
      predictions: prediction.predictions,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      metadata: prediction.metadata,
      actual_result: prediction.actualResult,
      verified: prediction.verified,
      verification_date: prediction.verificationDate,
      performance: prediction.performance,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Formater une prédiction depuis Supabase
   */
  private formatPredictionFromSupabase(data: any): Omit<PredictionRecord, 'id' | 'timestamp' | 'verified'> {
    return {
      drawName: data.draw_name,
      algorithm: data.algorithm,
      algorithmVersion: data.algorithm_version,
      predictions: data.predictions,
      confidence: data.confidence,
      reasoning: data.reasoning,
      metadata: data.metadata,
      actualResult: data.actual_result,
      verificationDate: data.verification_date,
      performance: data.performance
    }
  }

  /**
   * Mettre à jour le statut de synchronisation
   */
  private updateSyncStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...updates }
    
    // Notifier les listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.syncStatus)
      } catch (error) {
        console.error('Erreur listener sync status:', error)
      }
    })
  }

  /**
   * API publique
   */
  
  // Obtenir le statut actuel
  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  // Obtenir les paramètres actuels
  getSettings(): SyncSettings {
    return { ...this.syncSettings }
  }

  // S'abonner aux changements de statut
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Forcer une synchronisation manuelle
  async forcSync(): Promise<boolean> {
    return await this.performFullSync()
  }

  // Obtenir les conflits en attente
  getConflicts(): SyncConflict[] {
    return [...this.conflictQueue]
  }

  // Résoudre manuellement un conflit
  async resolveConflictManually(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<boolean> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId)
    if (!conflict) return false

    try {
      await this.resolveConflict({ ...conflict, resolution })
      this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId)
      this.updateSyncStatus({ conflictsDetected: this.conflictQueue.length })
      return true
    } catch (error) {
      console.error('Erreur résolution manuelle:', error)
      return false
    }
  }

  // Nettoyer et réinitialiser
  async cleanup() {
    this.stopAutoSync()
    this.listeners.clear()
    this.conflictQueue = []
  }
}

// Instance singleton
export const cloudSyncManager = new CloudSyncManager()

// Types exportés
export type { SyncStatus, SyncConflict, SyncSettings }
