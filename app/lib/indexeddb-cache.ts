'use client'

/**
 * Service de cache IndexedDB pour Lotysis
 * Gère le stockage local des données de loterie pour le mode hors ligne
 */

import { DrawResult } from './constants'

interface CacheEntry<T = any> {
  id: string
  data: T
  timestamp: number
  expiresAt: number
  version: string
  metadata?: Record<string, any>
}

interface CacheStats {
  totalEntries: number
  totalSize: number
  oldestEntry: number
  newestEntry: number
  hitRate: number
  missRate: number
}

interface SyncStatus {
  lastSync: Date | null
  pendingSync: boolean
  syncErrors: string[]
  totalSynced: number
}

class IndexedDBCache {
  private dbName = 'lotysis-cache'
  private dbVersion = 2
  private db: IDBDatabase | null = null
  private isInitialized = false
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    oldestEntry: 0,
    newestEntry: 0,
    hitRate: 0,
    missRate: 0
  }
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingSync: false,
    syncErrors: [],
    totalSynced: 0
  }

  // Stores disponibles
  private stores = {
    DRAW_RESULTS: 'draw_results',
    PREDICTIONS: 'predictions',
    STATISTICS: 'statistics',
    USER_PREFERENCES: 'user_preferences',
    SYNC_QUEUE: 'sync_queue'
  }

  /**
   * Initialiser la base de données IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Vérifier si IndexedDB est disponible
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Erreur ouverture IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        console.log('IndexedDB initialisé avec succès')
        this.updateStats()
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store pour les résultats de tirage
        if (!db.objectStoreNames.contains(this.stores.DRAW_RESULTS)) {
          const drawStore = db.createObjectStore(this.stores.DRAW_RESULTS, { keyPath: 'id' })
          drawStore.createIndex('draw_name', 'draw_name', { unique: false })
          drawStore.createIndex('date', 'date', { unique: false })
          drawStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store pour les prédictions
        if (!db.objectStoreNames.contains(this.stores.PREDICTIONS)) {
          const predStore = db.createObjectStore(this.stores.PREDICTIONS, { keyPath: 'id' })
          predStore.createIndex('draw_name', 'draw_name', { unique: false })
          predStore.createIndex('algorithm', 'algorithm', { unique: false })
          predStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store pour les statistiques
        if (!db.objectStoreNames.contains(this.stores.STATISTICS)) {
          const statsStore = db.createObjectStore(this.stores.STATISTICS, { keyPath: 'id' })
          statsStore.createIndex('type', 'type', { unique: false })
          statsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store pour les préférences utilisateur
        if (!db.objectStoreNames.contains(this.stores.USER_PREFERENCES)) {
          db.createObjectStore(this.stores.USER_PREFERENCES, { keyPath: 'id' })
        }

        // Store pour la queue de synchronisation
        if (!db.objectStoreNames.contains(this.stores.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(this.stores.SYNC_QUEUE, { keyPath: 'id' })
          syncStore.createIndex('priority', 'priority', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Stocker des données dans le cache
   */
  async set<T>(
    store: string,
    key: string,
    data: T,
    ttl: number = 24 * 60 * 60 * 1000, // 24h par défaut
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.ensureInitialized()

    const entry: CacheEntry<T> = {
      id: key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      version: '1.0',
      metadata
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.put(entry)

      request.onsuccess = () => {
        this.updateStats()
        resolve()
      }

      request.onerror = () => {
        console.error('Erreur stockage cache:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Récupérer des données du cache
   */
  async get<T>(store: string, key: string): Promise<T | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.get(key)

      request.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = request.result

        if (!entry) {
          this.stats.missRate++
          resolve(null)
          return
        }

        // Vérifier l'expiration
        if (entry.expiresAt < Date.now()) {
          this.delete(store, key) // Nettoyer l'entrée expirée
          this.stats.missRate++
          resolve(null)
          return
        }

        this.stats.hitRate++
        resolve(entry.data)
      }

      request.onerror = () => {
        console.error('Erreur lecture cache:', request.error)
        this.stats.missRate++
        reject(request.error)
      }
    })
  }

  /**
   * Supprimer une entrée du cache
   */
  async delete(store: string, key: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.delete(key)

      request.onsuccess = () => {
        this.updateStats()
        resolve()
      }

      request.onerror = () => {
        console.error('Erreur suppression cache:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Récupérer toutes les entrées d'un store
   */
  async getAll<T>(store: string, limit?: number): Promise<T[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.getAll(limit)

      request.onsuccess = () => {
        const entries: CacheEntry<T>[] = request.result
        const validEntries = entries
          .filter(entry => entry.expiresAt > Date.now())
          .map(entry => entry.data)

        resolve(validEntries)
      }

      request.onerror = () => {
        console.error('Erreur lecture toutes entrées:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Nettoyer les entrées expirées
   */
  async cleanup(): Promise<number> {
    await this.ensureInitialized()
    let deletedCount = 0

    for (const storeName of Object.values(this.stores)) {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.openCursor()

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result
            if (cursor) {
              const entry: CacheEntry = cursor.value
              if (entry.expiresAt < Date.now()) {
                cursor.delete()
                deletedCount++
              }
              cursor.continue()
            } else {
              resolve()
            }
          }

          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error(`Erreur nettoyage store ${storeName}:`, error)
      }
    }

    this.updateStats()
    return deletedCount
  }

  /**
   * Vider complètement le cache
   */
  async clear(): Promise<void> {
    await this.ensureInitialized()

    for (const storeName of Object.values(this.stores)) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    this.updateStats()
  }

  /**
   * Obtenir les statistiques du cache
   */
  async getStats(): Promise<CacheStats> {
    await this.updateStats()
    return { ...this.stats }
  }

  /**
   * Obtenir le statut de synchronisation
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Marquer le début d'une synchronisation
   */
  startSync(): void {
    this.syncStatus.pendingSync = true
    this.syncStatus.syncErrors = []
  }

  /**
   * Marquer la fin d'une synchronisation
   */
  endSync(success: boolean, error?: string): void {
    this.syncStatus.pendingSync = false
    this.syncStatus.lastSync = new Date()
    
    if (success) {
      this.syncStatus.totalSynced++
    } else if (error) {
      this.syncStatus.syncErrors.push(error)
    }
  }

  /**
   * Méthodes spécialisées pour les données de loterie
   */

  // Stocker les résultats de tirage
  async setDrawResults(drawName: string, results: DrawResult[]): Promise<void> {
    const key = `draw_results_${drawName}`
    await this.set(this.stores.DRAW_RESULTS, key, results, 24 * 60 * 60 * 1000, { drawName })
  }

  // Récupérer les résultats de tirage
  async getDrawResults(drawName: string): Promise<DrawResult[] | null> {
    const key = `draw_results_${drawName}`
    return this.get<DrawResult[]>(this.stores.DRAW_RESULTS, key)
  }

  // Stocker les prédictions
  async setPredictions(drawName: string, predictions: any[]): Promise<void> {
    const key = `predictions_${drawName}_${Date.now()}`
    await this.set(this.stores.PREDICTIONS, key, predictions, 7 * 24 * 60 * 60 * 1000, { drawName })
  }

  // Récupérer les prédictions
  async getPredictions(drawName: string): Promise<any[] | null> {
    // Récupérer la prédiction la plus récente
    const allPredictions = await this.getAll<any>(this.stores.PREDICTIONS)
    const drawPredictions = allPredictions.filter(p => p.metadata?.drawName === drawName)
    return drawPredictions.length > 0 ? drawPredictions[0] : null
  }

  /**
   * Méthodes privées
   */

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private async updateStats(): Promise<void> {
    if (!this.db) return

    try {
      let totalEntries = 0
      let oldestEntry = Date.now()
      let newestEntry = 0

      for (const storeName of Object.values(this.stores)) {
        const transaction = this.db.transaction([storeName], 'readonly')
        const objectStore = transaction.objectStore(storeName)
        const countRequest = objectStore.count()

        await new Promise<void>((resolve) => {
          countRequest.onsuccess = () => {
            totalEntries += countRequest.result
            resolve()
          }
          countRequest.onerror = () => resolve()
        })

        // Obtenir les timestamps min/max
        if (objectStore.indexNames.contains('timestamp')) {
          const index = objectStore.index('timestamp')
          
          const oldestRequest = index.openCursor(null, 'next')
          await new Promise<void>((resolve) => {
            oldestRequest.onsuccess = () => {
              const cursor = oldestRequest.result
              if (cursor) {
                oldestEntry = Math.min(oldestEntry, cursor.value.timestamp)
              }
              resolve()
            }
            oldestRequest.onerror = () => resolve()
          })

          const newestRequest = index.openCursor(null, 'prev')
          await new Promise<void>((resolve) => {
            newestRequest.onsuccess = () => {
              const cursor = newestRequest.result
              if (cursor) {
                newestEntry = Math.max(newestEntry, cursor.value.timestamp)
              }
              resolve()
            }
            newestRequest.onerror = () => resolve()
          })
        }
      }

      this.stats.totalEntries = totalEntries
      this.stats.oldestEntry = oldestEntry
      this.stats.newestEntry = newestEntry
    } catch (error) {
      console.error('Erreur mise à jour stats:', error)
    }
  }
}

// Instance singleton
export const indexedDBCache = new IndexedDBCache()

// Types exportés
export type { CacheEntry, CacheStats, SyncStatus }
