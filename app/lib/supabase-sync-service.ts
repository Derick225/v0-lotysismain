"use client"

import { supabase, supabaseAdmin } from "@/lib/supabase"
import { enhancedApiService } from "./enhanced-api-service"
import { type DrawResult } from "./constants"
import logger from "./logger"
import { RealtimeChannel } from "@supabase/supabase-js"

interface SyncConflict {
  table: string
  localRecord: any
  remoteRecord: any
  conflictType: 'update' | 'delete' | 'insert'
  timestamp: number
}

interface SyncResult {
  success: boolean
  recordsSynced: number
  conflicts: SyncConflict[]
  errors: string[]
  duration: number
}

interface SyncOptions {
  direction: 'up' | 'down' | 'bidirectional'
  resolveConflicts: boolean
  batchSize: number
  tables: string[]
}

export class SupabaseSyncService {
  private static instance: SupabaseSyncService
  private realtimeChannels: Map<string, RealtimeChannel> = new Map()
  private syncInProgress = false
  private lastSyncTimestamp: Map<string, number> = new Map()
  private conflictResolver: ConflictResolver

  private constructor() {
    this.conflictResolver = new ConflictResolver()
    this.initializeRealtimeSubscriptions()
  }

  static getInstance(): SupabaseSyncService {
    if (!SupabaseSyncService.instance) {
      SupabaseSyncService.instance = new SupabaseSyncService()
    }
    return SupabaseSyncService.instance
  }

  // Initialiser les subscriptions temps réel
  private initializeRealtimeSubscriptions(): void {
    const tables = ['lottery_results', 'user_favorites', 'notification_settings', 'predictions']
    
    tables.forEach(table => {
      const channel = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table }, 
          (payload) => this.handleRealtimeChange(table, payload)
        )
        .subscribe((status) => {
          logger.info(`Realtime subscription for ${table}: ${status}`)
        })
      
      this.realtimeChannels.set(table, channel)
    })
  }

  // Gérer les changements temps réel
  private async handleRealtimeChange(table: string, payload: any): Promise<void> {
    try {
      logger.info(`Realtime change detected in ${table}`, { 
        eventType: payload.eventType,
        recordId: payload.new?.id || payload.old?.id 
      })

      switch (payload.eventType) {
        case 'INSERT':
          await this.handleRealtimeInsert(table, payload.new)
          break
        case 'UPDATE':
          await this.handleRealtimeUpdate(table, payload.new, payload.old)
          break
        case 'DELETE':
          await this.handleRealtimeDelete(table, payload.old)
          break
      }
    } catch (error) {
      logger.error(`Error handling realtime change for ${table}`, error)
    }
  }

  // Synchronisation complète
  async syncAll(options: Partial<SyncOptions> = {}): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error("Synchronisation déjà en cours")
    }

    this.syncInProgress = true
    const startTime = Date.now()
    
    const defaultOptions: SyncOptions = {
      direction: 'bidirectional',
      resolveConflicts: true,
      batchSize: 100,
      tables: ['lottery_results', 'user_favorites', 'notification_settings', 'predictions'],
      ...options
    }

    try {
      logger.info("Début de la synchronisation complète", defaultOptions)

      let totalRecordsSynced = 0
      const allConflicts: SyncConflict[] = []
      const allErrors: string[] = []

      for (const table of defaultOptions.tables) {
        try {
          const result = await this.syncTable(table, defaultOptions)
          totalRecordsSynced += result.recordsSynced
          allConflicts.push(...result.conflicts)
          allErrors.push(...result.errors)
        } catch (error) {
          const errorMessage = `Erreur lors de la sync de ${table}: ${error}`
          allErrors.push(errorMessage)
          logger.error(errorMessage, error)
        }
      }

      const duration = Date.now() - startTime
      
      // Mettre à jour le statut de synchronisation
      await this.updateSyncStatus('all_tables', {
        status: allErrors.length === 0 ? 'success' : 'error',
        records_synced: totalRecordsSynced,
        error_message: allErrors.length > 0 ? allErrors.join('; ') : null
      })

      const result: SyncResult = {
        success: allErrors.length === 0,
        recordsSynced: totalRecordsSynced,
        conflicts: allConflicts,
        errors: allErrors,
        duration
      }

      logger.info("Synchronisation complète terminée", result)
      return result

    } finally {
      this.syncInProgress = false
    }
  }

  // Synchroniser une table spécifique
  private async syncTable(table: string, options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsSynced = 0
    const conflicts: SyncConflict[] = []
    const errors: string[] = []

    try {
      switch (options.direction) {
        case 'up':
          recordsSynced = await this.syncUp(table, options)
          break
        case 'down':
          recordsSynced = await this.syncDown(table, options)
          break
        case 'bidirectional':
          const upResult = await this.syncUp(table, options)
          const downResult = await this.syncDown(table, options)
          recordsSynced = upResult + downResult
          break
      }

      // Détecter et résoudre les conflits si nécessaire
      if (options.resolveConflicts) {
        const detectedConflicts = await this.detectConflicts(table)
        conflicts.push(...detectedConflicts)
        
        for (const conflict of detectedConflicts) {
          try {
            await this.conflictResolver.resolve(conflict)
          } catch (error) {
            errors.push(`Erreur résolution conflit: ${error}`)
          }
        }
      }

    } catch (error) {
      errors.push(`Erreur sync table ${table}: ${error}`)
    }

    return {
      success: errors.length === 0,
      recordsSynced,
      conflicts,
      errors,
      duration: Date.now() - startTime
    }
  }

  // Synchronisation ascendante (local vers Supabase)
  private async syncUp(table: string, options: SyncOptions): Promise<number> {
    logger.info(`Synchronisation ascendante pour ${table}`)
    
    switch (table) {
      case 'lottery_results':
        return await this.syncLotteryResultsUp(options)
      case 'user_favorites':
        return await this.syncUserFavoritesUp(options)
      case 'notification_settings':
        return await this.syncNotificationSettingsUp(options)
      default:
        logger.warn(`Table ${table} non supportée pour sync up`)
        return 0
    }
  }

  // Synchronisation descendante (Supabase vers local)
  private async syncDown(table: string, options: SyncOptions): Promise<number> {
    logger.info(`Synchronisation descendante pour ${table}`)
    
    switch (table) {
      case 'lottery_results':
        return await this.syncLotteryResultsDown(options)
      case 'predictions':
        return await this.syncPredictionsDown(options)
      default:
        logger.warn(`Table ${table} non supportée pour sync down`)
        return 0
    }
  }

  // Synchronisation des résultats de loterie (up)
  private async syncLotteryResultsUp(options: SyncOptions): Promise<number> {
    try {
      // Récupérer les données locales depuis IndexedDB
      const localResults = await enhancedApiService.getCacheStats()
      
      if (!localResults || localResults.totalResults === 0) {
        return 0
      }

      // Récupérer les données détaillées du cache
      const cacheData = await enhancedApiService.exportCacheData()
      const parsedData = JSON.parse(cacheData)
      
      if (!parsedData.results || !Array.isArray(parsedData.results)) {
        return 0
      }

      let syncedCount = 0
      const batchSize = options.batchSize

      // Traiter par batch
      for (let i = 0; i < parsedData.results.length; i += batchSize) {
        const batch = parsedData.results.slice(i, i + batchSize)
        
        try {
          // Préparer les données pour Supabase
          const supabaseData = batch.map((result: any) => ({
            draw_name: result.draw_name,
            date: result.date,
            gagnants: result.gagnants,
            machine: result.machine,
            source: result.source || 'cache'
          }))

          // Utiliser la fonction batch pour l'insertion
          const { data, error } = await supabase.rpc('batch_insert_lottery_results', {
            results: supabaseData
          })

          if (error) {
            logger.error(`Erreur batch insert lottery_results`, error)
          } else {
            syncedCount += data || batch.length
          }

        } catch (error) {
          logger.error(`Erreur traitement batch lottery_results`, error)
        }
      }

      return syncedCount

    } catch (error) {
      logger.error("Erreur sync lottery_results up", error)
      return 0
    }
  }

  // Synchronisation des résultats de loterie (down)
  private async syncLotteryResultsDown(options: SyncOptions): Promise<number> {
    try {
      const lastSync = this.lastSyncTimestamp.get('lottery_results') || 0
      const lastSyncDate = new Date(lastSync).toISOString()

      // Récupérer les données modifiées depuis la dernière sync
      const { data: remoteResults, error } = await supabase
        .from('lottery_results')
        .select('*')
        .gte('updated_at', lastSyncDate)
        .order('updated_at', { ascending: true })
        .limit(options.batchSize)

      if (error) {
        throw error
      }

      if (!remoteResults || remoteResults.length === 0) {
        return 0
      }

      // Convertir au format local et mettre en cache
      const localFormat: DrawResult[] = remoteResults.map(result => ({
        id: result.id,
        draw_name: result.draw_name,
        date: result.date,
        gagnants: result.gagnants,
        machine: result.machine,
        created_at: result.created_at
      }))

      // Mettre à jour le cache local
      await enhancedApiService.cacheResults(localFormat, 'external')

      // Mettre à jour le timestamp de dernière sync
      this.lastSyncTimestamp.set('lottery_results', Date.now())

      return remoteResults.length

    } catch (error) {
      logger.error("Erreur sync lottery_results down", error)
      return 0
    }
  }

  // Synchronisation des favoris utilisateur (up)
  private async syncUserFavoritesUp(options: SyncOptions): Promise<number> {
    try {
      // Récupérer les favoris depuis le localStorage
      const localFavorites = this.getLocalFavorites()
      
      if (localFavorites.length === 0) {
        return 0
      }

      let syncedCount = 0

      for (const favorite of localFavorites) {
        try {
          const { error } = await supabase
            .from('user_favorites')
            .upsert({
              user_id: supabase.auth.getUser().then(u => u.data.user?.id),
              draw_name: favorite.draw_name,
              numbers: favorite.numbers,
              name: favorite.name,
              description: favorite.description,
              is_active: favorite.is_active
            }, {
              onConflict: 'user_id,draw_name,name'
            })

          if (!error) {
            syncedCount++
          }
        } catch (error) {
          logger.error(`Erreur sync favorite`, error)
        }
      }

      return syncedCount

    } catch (error) {
      logger.error("Erreur sync user_favorites up", error)
      return 0
    }
  }

  // Synchronisation des paramètres de notification (up)
  private async syncNotificationSettingsUp(options: SyncOptions): Promise<number> {
    try {
      // Récupérer les paramètres depuis le localStorage
      const localSettings = this.getLocalNotificationSettings()
      
      if (!localSettings) {
        return 0
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: supabase.auth.getUser().then(u => u.data.user?.id),
          ...localSettings
        }, {
          onConflict: 'user_id'
        })

      return error ? 0 : 1

    } catch (error) {
      logger.error("Erreur sync notification_settings up", error)
      return 0
    }
  }

  // Synchronisation des prédictions (down)
  private async syncPredictionsDown(options: SyncOptions): Promise<number> {
    try {
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options.batchSize)

      if (error || !predictions) {
        return 0
      }

      // Stocker les prédictions dans le cache local
      // (implémentation dépendante du système de cache des prédictions)
      
      return predictions.length

    } catch (error) {
      logger.error("Erreur sync predictions down", error)
      return 0
    }
  }

  // Détecter les conflits entre local et distant
  private async detectConflicts(table: string): Promise<SyncConflict[]> {
    // Implémentation simplifiée - à étendre selon les besoins
    return []
  }

  // Gérer les changements temps réel
  private async handleRealtimeInsert(table: string, record: any): Promise<void> {
    logger.info(`Realtime insert in ${table}`, { id: record.id })
    
    if (table === 'lottery_results') {
      // Mettre à jour le cache local avec le nouveau résultat
      const drawResult: DrawResult = {
        id: record.id,
        draw_name: record.draw_name,
        date: record.date,
        gagnants: record.gagnants,
        machine: record.machine,
        created_at: record.created_at
      }
      
      await enhancedApiService.cacheResults([drawResult], 'external')
    }
  }

  private async handleRealtimeUpdate(table: string, newRecord: any, oldRecord: any): Promise<void> {
    logger.info(`Realtime update in ${table}`, { id: newRecord.id })
    // Implémentation similaire à handleRealtimeInsert
  }

  private async handleRealtimeDelete(table: string, record: any): Promise<void> {
    logger.info(`Realtime delete in ${table}`, { id: record.id })
    // Gérer la suppression dans le cache local
  }

  // Mettre à jour le statut de synchronisation
  private async updateSyncStatus(tableName: string, status: Partial<any>): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_status')
        .upsert({
          table_name: tableName,
          last_sync: new Date().toISOString(),
          ...status
        }, {
          onConflict: 'table_name'
        })

      if (error) {
        logger.error(`Erreur mise à jour sync_status pour ${tableName}`, error)
      }
    } catch (error) {
      logger.error(`Erreur updateSyncStatus`, error)
    }
  }

  // Utilitaires pour récupérer les données locales
  private getLocalFavorites(): any[] {
    try {
      const stored = localStorage.getItem('user-favorites')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private getLocalNotificationSettings(): any | null {
    try {
      const stored = localStorage.getItem('notification-config')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  // Obtenir le statut de synchronisation
  async getSyncStatus(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .order('last_sync', { ascending: false })

      return error ? [] : (data || [])
    } catch (error) {
      logger.error("Erreur getSyncStatus", error)
      return []
    }
  }

  // Nettoyer les ressources
  dispose(): void {
    this.realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.realtimeChannels.clear()
    logger.info("SupabaseSyncService disposed")
  }
}

// Classe pour résoudre les conflits
class ConflictResolver {
  async resolve(conflict: SyncConflict): Promise<void> {
    logger.info("Résolution de conflit", conflict)
    
    switch (conflict.conflictType) {
      case 'update':
        // Stratégie: le plus récent gagne
        await this.resolveUpdateConflict(conflict)
        break
      case 'delete':
        // Stratégie: confirmer la suppression
        await this.resolveDeleteConflict(conflict)
        break
      case 'insert':
        // Stratégie: merger si possible
        await this.resolveInsertConflict(conflict)
        break
    }
  }

  private async resolveUpdateConflict(conflict: SyncConflict): Promise<void> {
    // Implémentation de résolution pour les mises à jour
    logger.info("Résolution conflit update", conflict)
  }

  private async resolveDeleteConflict(conflict: SyncConflict): Promise<void> {
    // Implémentation de résolution pour les suppressions
    logger.info("Résolution conflit delete", conflict)
  }

  private async resolveInsertConflict(conflict: SyncConflict): Promise<void> {
    // Implémentation de résolution pour les insertions
    logger.info("Résolution conflit insert", conflict)
  }
}

// Instance singleton
export const supabaseSyncService = SupabaseSyncService.getInstance()

// Export des types
export type { SyncConflict, SyncResult, SyncOptions }
