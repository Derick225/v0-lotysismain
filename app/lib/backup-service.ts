import { LotteryResultService, supabase, LotteryResult } from '../../lib/supabase'
import { AuditService } from './logger'

// Types pour les modèles ML
export interface MLModel {
  id: number
  name: string
  type: 'lstm' | 'cnn' | 'ensemble' | 'pattern'
  data: any
  metadata: any
  performance_metrics: any
  created_at: string
  updated_at: string
}

export interface MLPrediction {
  id: number
  model_id: number
  draw_name: string
  predicted_numbers: number[]
  confidence_score: number
  created_at: string
  actual_result?: number[]
  is_correct?: boolean
}

export interface BackupData {
  version: string
  timestamp: Date
  lottery_results: LotteryResult[]
  ml_models: MLModel[]
  ml_predictions: MLPrediction[]
  settings: Record<string, string>
  metadata: {
    total_records: number
    backup_size: string
    created_by: string
  }
}

export class BackupService {
  
  // Créer une sauvegarde complète
  static async createFullBackup(userId: string = 'admin'): Promise<BackupData> {
    try {
      // Log de l'action
      await AuditService.logAction({
        action: 'CREATE_BACKUP',
        user_id: userId,
        resource_type: 'system',
        details: { type: 'full_backup' }
      })

      // Récupérer toutes les données
      const [lotteryResults, mlModels, predictions] = await Promise.all([
        LotteryResultService.getResults({ limit: 10000 }), // Limite de sécurité
        this.getAllMLModels(),
        this.getAllPredictions()
      ])

      // Récupérer les paramètres de configuration
      const settings = this.getSystemSettings()

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date(),
        lottery_results: lotteryResults,
        ml_models: mlModels,
        ml_predictions: predictions,
        settings,
        metadata: {
          total_records: lotteryResults.length + mlModels.length + predictions.length,
          backup_size: this.calculateSize(lotteryResults, mlModels, predictions),
          created_by: userId
        }
      }

      return backupData
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error)
      throw error
    }
  }

  // Exporter la sauvegarde au format JSON
  static async exportBackup(backupData: BackupData): Promise<Blob> {
    try {
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      return blob
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      throw error
    }
  }

  // Télécharger la sauvegarde
  static async downloadBackup(backupData: BackupData, filename?: string) {
    try {
      const blob = await this.exportBackup(backupData)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const defaultFilename = `lotysis-backup-${new Date().toISOString().split('T')[0]}.json`
      link.download = filename || defaultFilename
      link.href = url
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      throw error
    }
  }

  // Valider un fichier de sauvegarde
  static validateBackupFile(fileContent: string): { valid: boolean; error?: string; data?: BackupData } {
    try {
      const data = JSON.parse(fileContent) as BackupData
      
      // Vérifications de base
      if (!data.version || !data.timestamp || !data.lottery_results) {
        return { valid: false, error: 'Format de sauvegarde invalide' }
      }

      if (!Array.isArray(data.lottery_results)) {
        return { valid: false, error: 'Les résultats de loterie doivent être un tableau' }
      }

      // Vérifier la version de compatibilité
      if (data.version !== '1.0.0') {
        return { valid: false, error: `Version non supportée: ${data.version}` }
      }

      return { valid: true, data }
    } catch (error) {
      return { valid: false, error: 'Fichier JSON invalide' }
    }
  }

  // Restaurer depuis une sauvegarde
  static async restoreFromBackup(
    backupData: BackupData, 
    options: {
      restoreLotteryResults?: boolean
      restoreMLModels?: boolean
      restorePredictions?: boolean
      restoreSettings?: boolean
      overwriteExisting?: boolean
    } = {},
    userId: string = 'admin'
  ): Promise<{ success: boolean; details: any }> {
    try {
      // Log de l'action
      await AuditService.logAction({
        action: 'RESTORE_BACKUP',
        user_id: userId,
        resource_type: 'system',
        details: { 
          backup_timestamp: backupData.timestamp,
          options 
        }
      })

      const results = {
        lottery_results: 0,
        ml_models: 0,
        ml_predictions: 0,
        settings: false,
        errors: [] as string[]
      }

      // Restaurer les résultats de loterie
      if (options.restoreLotteryResults !== false && backupData.lottery_results) {
        try {
          for (const result of backupData.lottery_results) {
            // Supprimer les champs auto-générés
            const { id, created_at, updated_at, ...cleanResult } = result
            
            if (options.overwriteExisting) {
              // Vérifier si existe déjà
              const existing = await this.findExistingResult(cleanResult)
              if (existing) {
                await LotteryResultService.updateResult(existing.id, cleanResult)
              } else {
                await LotteryResultService.addResult(cleanResult)
              }
            } else {
              await LotteryResultService.addResult(cleanResult)
            }
            results.lottery_results++
          }
        } catch (error) {
          results.errors.push(`Erreur restauration résultats: ${error}`)
        }
      }

      // Restaurer les modèles ML
      if (options.restoreMLModels !== false && backupData.ml_models) {
        try {
          for (const model of backupData.ml_models) {
            const { id, created_at, ...cleanModel } = model
            await MLModelService.saveModel(cleanModel)
            results.ml_models++
          }
        } catch (error) {
          results.errors.push(`Erreur restauration modèles: ${error}`)
        }
      }

      // Restaurer les prédictions
      if (options.restorePredictions !== false && backupData.ml_predictions) {
        try {
          for (const prediction of backupData.ml_predictions) {
            const { id, prediction_date, ...cleanPrediction } = prediction
            await PredictionService.savePrediction(cleanPrediction)
            results.ml_predictions++
          }
        } catch (error) {
          results.errors.push(`Erreur restauration prédictions: ${error}`)
        }
      }

      // Restaurer les paramètres
      if (options.restoreSettings !== false && backupData.settings) {
        try {
          await this.restoreSystemSettings(backupData.settings)
          results.settings = true
        } catch (error) {
          results.errors.push(`Erreur restauration paramètres: ${error}`)
        }
      }

      return { success: results.errors.length === 0, details: results }
    } catch (error) {
      console.error('Erreur lors de la restauration:', error)
      throw error
    }
  }

  // Créer une sauvegarde incrémentale (seulement les nouveaux éléments)
  static async createIncrementalBackup(
    lastBackupDate: Date,
    userId: string = 'admin'
  ): Promise<BackupData> {
    try {
      // Log de l'action
      await AuditService.logAction({
        action: 'CREATE_INCREMENTAL_BACKUP',
        user_id: userId,
        resource_type: 'system',
        details: { since: lastBackupDate }
      })

      const startDate = lastBackupDate.toISOString().split('T')[0]
      
      // Récupérer seulement les données modifiées
      const [lotteryResults] = await Promise.all([
        LotteryResultService.getResults({ start_date: startDate })
      ])

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date(),
        lottery_results: lotteryResults,
        ml_models: [], // Les modèles ML ne sont pas versionnés par date
        ml_predictions: [],
        settings: {},
        metadata: {
          total_records: lotteryResults.length,
          backup_size: this.calculateSize(lotteryResults, [], []),
          created_by: userId
        }
      }

      return backupData
    } catch (error) {
      console.error('Erreur lors de la sauvegarde incrémentale:', error)
      throw error
    }
  }

  // Méthodes utilitaires privées
  private static async getAllMLModels() {
    try {
      // Récupération des modèles ML depuis Supabase
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erreur récupération modèles ML:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Erreur getAllMLModels:', error)
      return []
    }
  }

  private static async getAllPredictions() {
    try {
      // Récupération des prédictions depuis Supabase
      const { data, error } = await supabase
        .from('ml_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Limite pour éviter les exports trop volumineux
      
      if (error) {
        console.error('Erreur récupération prédictions:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Erreur getAllPredictions:', error)
      return []
    }
  }

  private static getSystemSettings() {
    // Récupération des paramètres système depuis le localStorage
    return {
      api_url: localStorage.getItem('api_url') || 'https://lotobonheur.ci/api/results',
      sync_interval: localStorage.getItem('sync_interval') || '30',
      prediction_depth: localStorage.getItem('prediction_depth') || '100',
      confidence_threshold: localStorage.getItem('confidence_threshold') || '60',
      theme: localStorage.getItem('theme') || 'light',
      language: localStorage.getItem('language') || 'fr',
      notifications_enabled: localStorage.getItem('notifications_enabled') || 'true'
    }
  }

  private static async restoreSystemSettings(settings: Record<string, string>) {
    try {
      // Restauration des paramètres système
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, value.toString())
        }
      })
      
      // Déclencher un événement pour notifier les composants du changement
      window.dispatchEvent(new CustomEvent('settings-restored', { detail: settings }))
    } catch (error) {
      console.error('Erreur restoration paramètres:', error)
      throw error
    }
  }

  private static calculateSize(results: LotteryResult[], models: MLModel[], predictions: MLPrediction[]): string {
    try {
      const totalSize = JSON.stringify({ results, models, predictions }).length
      const sizeInKB = Math.round(totalSize / 1024)
      const sizeInMB = Math.round(sizeInKB / 1024)
      
      if (sizeInMB > 0) return `${sizeInMB} MB`
      if (sizeInKB > 0) return `${sizeInKB} KB`
      return `${totalSize} bytes`
    } catch (error) {
      console.error('Erreur calcul taille:', error)
      return '0 bytes'
    }
  }

  private static async findExistingResult(result: LotteryResult) {
    try {
      // Recherche d'un résultat existant basé sur draw_name et date
      const { data, error } = await supabase
        .from('lottery_results')
        .select('*')
        .eq('draw_name', result.draw_name)
        .eq('date', result.date)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur recherche résultat existant:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Erreur findExistingResult:', error)
      return null
    }
  }
}
