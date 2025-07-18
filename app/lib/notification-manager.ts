'use client'

/**
 * Gestionnaire de notifications push intelligentes pour Lotysis
 * Gère les notifications de résultats, prédictions, tendances et système
 */

import { indexedDBCache } from './indexeddb-cache'
import { predictionHistory, type PredictionRecord } from './prediction-history'
import { advancedAnalytics, type SmartSuggestion } from './advanced-analytics'
import type { DrawResult } from './constants'

export interface NotificationSettings {
  enabled: boolean
  categories: {
    drawResults: boolean
    predictionAccuracy: boolean
    trendAlerts: boolean
    systemUpdates: boolean
    smartSuggestions: boolean
  }
  timing: {
    quietHours: {
      enabled: boolean
      start: string // HH:MM format
      end: string   // HH:MM format
    }
    drawDays: string[] // ['monday', 'tuesday', etc.]
    reminderBefore: number // minutes before draw
  }
  delivery: {
    sound: boolean
    vibration: boolean
    badge: boolean
    priority: 'low' | 'normal' | 'high'
  }
  filters: {
    minConfidence: number // 0-100
    favoriteDraws: string[]
    maxPerDay: number
  }
}

export interface NotificationData {
  id: string
  type: 'draw_result' | 'prediction_accuracy' | 'trend_alert' | 'system_update' | 'smart_suggestion'
  title: string
  body: string
  icon?: string
  badge?: number
  data?: Record<string, any>
  actions?: NotificationAction[]
  timestamp: string
  scheduledFor?: string
  priority: 'low' | 'normal' | 'high'
  category: string
  tags: string[]
  read: boolean
  delivered: boolean
  clicked: boolean
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationStats {
  total: number
  delivered: number
  read: number
  clicked: number
  byCategory: Record<string, number>
  byType: Record<string, number>
  engagementRate: number
  deliveryRate: number
}

class NotificationManager {
  private settings: NotificationSettings = {
    enabled: true,
    categories: {
      drawResults: true,
      predictionAccuracy: true,
      trendAlerts: true,
      systemUpdates: true,
      smartSuggestions: true
    },
    timing: {
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      },
      drawDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      reminderBefore: 30
    },
    delivery: {
      sound: true,
      vibration: true,
      badge: true,
      priority: 'normal'
    },
    filters: {
      minConfidence: 50,
      favoriteDraws: [],
      maxPerDay: 10
    }
  }

  private notificationQueue: NotificationData[] = []
  private deliveredNotifications: NotificationData[] = []
  private permission: NotificationPermission = 'default'
  private registration: ServiceWorkerRegistration | null = null
  private listeners: Set<(notification: NotificationData) => void> = new Set()

  constructor() {
    this.initialize()
  }

  /**
   * Initialiser le gestionnaire de notifications
   */
  private async initialize() {
    try {
      // Charger les paramètres
      await this.loadSettings()
      
      // Vérifier le support des notifications
      if (!('Notification' in window)) {
        console.warn('Notifications non supportées par ce navigateur')
        return
      }

      // Vérifier la permission
      this.permission = Notification.permission
      
      // Enregistrer le service worker
      if ('serviceWorker' in navigator) {
        try {
          this.registration = await navigator.serviceWorker.register('/sw.js')
          console.log('✅ Service Worker enregistré pour les notifications')
        } catch (error) {
          console.warn('Erreur enregistrement Service Worker:', error)
        }
      }

      // Charger les notifications en attente
      await this.loadPendingNotifications()
      
      // Démarrer le processeur de queue
      this.startQueueProcessor()

      console.log('✅ Gestionnaire de notifications initialisé')
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error)
    }
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    try {
      this.permission = await Notification.requestPermission()
      return this.permission === 'granted'
    } catch (error) {
      console.error('Erreur demande permission:', error)
      return false
    }
  }

  /**
   * Créer une notification
   */
  async createNotification(data: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'delivered' | 'clicked'>): Promise<string> {
    const notification: NotificationData = {
      ...data,
      id: this.generateNotificationId(),
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      clicked: false
    }

    // Vérifier les filtres
    if (!this.shouldCreateNotification(notification)) {
      console.log('Notification filtrée:', notification.title)
      return notification.id
    }

    // Ajouter à la queue
    this.notificationQueue.push(notification)
    await this.saveNotificationQueue()

    // Traiter immédiatement si possible
    await this.processQueue()

    return notification.id
  }

  /**
   * Créer une notification de résultat de tirage
   */
  async notifyDrawResult(drawName: string, result: DrawResult, predictions?: PredictionRecord[]): Promise<string> {
    if (!this.settings.categories.drawResults) return ''

    let body = `Résultats du tirage ${drawName}: ${result.gagnants.join(', ')}`
    let actions: NotificationAction[] = []

    // Vérifier les prédictions
    if (predictions && predictions.length > 0) {
      const matches = predictions.map(pred => {
        const correctNumbers = pred.predictions.filter(num => result.gagnants.includes(num))
        return { prediction: pred, matches: correctNumbers.length }
      })

      const bestMatch = matches.reduce((best, current) => 
        current.matches > best.matches ? current : best
      )

      if (bestMatch.matches > 0) {
        body += `\n🎯 Votre prédiction: ${bestMatch.matches} numéro(s) correct(s)!`
        actions.push({
          action: 'view_prediction',
          title: 'Voir la prédiction',
          icon: '/icons/prediction.png'
        })
      }
    }

    actions.push({
      action: 'view_results',
      title: 'Voir les résultats',
      icon: '/icons/results.png'
    })

    return await this.createNotification({
      type: 'draw_result',
      title: `🎲 Résultats ${drawName}`,
      body,
      icon: '/icons/lottery.png',
      priority: 'high',
      category: 'draw_results',
      tags: [drawName, 'results'],
      actions,
      data: {
        drawName,
        result,
        predictions
      }
    })
  }

  /**
   * Créer une notification de précision de prédiction
   */
  async notifyPredictionAccuracy(prediction: PredictionRecord, accuracy: number): Promise<string> {
    if (!this.settings.categories.predictionAccuracy) return ''

    const emoji = accuracy >= 80 ? '🎯' : accuracy >= 60 ? '👍' : accuracy >= 40 ? '📊' : '📈'
    const level = accuracy >= 80 ? 'Excellente' : accuracy >= 60 ? 'Bonne' : accuracy >= 40 ? 'Correcte' : 'Faible'

    return await this.createNotification({
      type: 'prediction_accuracy',
      title: `${emoji} Précision de Prédiction`,
      body: `${level} précision (${accuracy.toFixed(1)}%) pour votre prédiction ${prediction.drawName}`,
      icon: '/icons/accuracy.png',
      priority: accuracy >= 70 ? 'high' : 'normal',
      category: 'prediction_accuracy',
      tags: [prediction.drawName, 'accuracy'],
      actions: [
        {
          action: 'view_history',
          title: 'Voir l\'historique',
          icon: '/icons/history.png'
        }
      ],
      data: {
        prediction,
        accuracy
      }
    })
  }

  /**
   * Créer une notification d'alerte de tendance
   */
  async notifyTrendAlert(drawName: string, trendType: string, description: string, confidence: number): Promise<string> {
    if (!this.settings.categories.trendAlerts || confidence < this.settings.filters.minConfidence) return ''

    const emoji = trendType === 'hot_numbers' ? '🔥' : trendType === 'cold_comeback' ? '❄️' : '📈'

    return await this.createNotification({
      type: 'trend_alert',
      title: `${emoji} Tendance Détectée`,
      body: `${description} (Confiance: ${confidence}%)`,
      icon: '/icons/trend.png',
      priority: confidence >= 80 ? 'high' : 'normal',
      category: 'trend_alerts',
      tags: [drawName, trendType],
      actions: [
        {
          action: 'view_trends',
          title: 'Voir les tendances',
          icon: '/icons/analytics.png'
        }
      ],
      data: {
        drawName,
        trendType,
        confidence
      }
    })
  }

  /**
   * Créer une notification de suggestion intelligente
   */
  async notifySmartSuggestion(suggestion: SmartSuggestion): Promise<string> {
    if (!this.settings.categories.smartSuggestions || suggestion.confidence < this.settings.filters.minConfidence) return ''

    const emoji = suggestion.priority === 'high' ? '⭐' : suggestion.priority === 'medium' ? '💡' : '📝'

    return await this.createNotification({
      type: 'smart_suggestion',
      title: `${emoji} ${suggestion.title}`,
      body: `${suggestion.description} (Confiance: ${suggestion.confidence}%)`,
      icon: '/icons/suggestion.png',
      priority: suggestion.priority === 'high' ? 'high' : 'normal',
      category: 'smart_suggestions',
      tags: [suggestion.type],
      actions: [
        {
          action: 'view_suggestion',
          title: 'Voir la suggestion',
          icon: '/icons/lightbulb.png'
        }
      ],
      data: {
        suggestion
      }
    })
  }

  /**
   * Créer une notification système
   */
  async notifySystemUpdate(title: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    if (!this.settings.categories.systemUpdates) return ''

    return await this.createNotification({
      type: 'system_update',
      title: `🔔 ${title}`,
      body: message,
      icon: '/icons/system.png',
      priority,
      category: 'system_updates',
      tags: ['system'],
      actions: [
        {
          action: 'dismiss',
          title: 'OK',
          icon: '/icons/check.png'
        }
      ]
    })
  }

  /**
   * Planifier une notification
   */
  async scheduleNotification(data: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'delivered' | 'clicked'>, scheduledFor: Date): Promise<string> {
    const notification: NotificationData = {
      ...data,
      id: this.generateNotificationId(),
      timestamp: new Date().toISOString(),
      scheduledFor: scheduledFor.toISOString(),
      read: false,
      delivered: false,
      clicked: false
    }

    this.notificationQueue.push(notification)
    await this.saveNotificationQueue()

    return notification.id
  }

  /**
   * Traiter la queue de notifications
   */
  private async processQueue() {
    if (this.permission !== 'granted') return

    const now = new Date()
    const pendingNotifications = this.notificationQueue.filter(n => 
      !n.delivered && 
      (!n.scheduledFor || new Date(n.scheduledFor) <= now)
    )

    for (const notification of pendingNotifications) {
      try {
        if (this.shouldDeliverNow(notification)) {
          await this.deliverNotification(notification)
        }
      } catch (error) {
        console.error('Erreur livraison notification:', error)
      }
    }

    // Nettoyer les notifications livrées
    this.notificationQueue = this.notificationQueue.filter(n => !n.delivered)
    await this.saveNotificationQueue()
  }

  /**
   * Livrer une notification
   */
  private async deliverNotification(notification: NotificationData) {
    try {
      // Vérifier les limites quotidiennes
      const today = new Date().toDateString()
      const todayNotifications = this.deliveredNotifications.filter(n => 
        new Date(n.timestamp).toDateString() === today
      )

      if (todayNotifications.length >= this.settings.filters.maxPerDay) {
        console.log('Limite quotidienne atteinte')
        return
      }

      // Créer la notification native
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/default.png',
        badge: '/icons/badge.png',
        tag: notification.id,
        data: notification.data,
        actions: notification.actions,
        silent: !this.settings.delivery.sound,
        vibrate: this.settings.delivery.vibration ? [200, 100, 200] : undefined,
        requireInteraction: notification.priority === 'high'
      }

      let nativeNotification: Notification

      if (this.registration && 'showNotification' in this.registration) {
        // Utiliser le service worker
        await this.registration.showNotification(notification.title, options)
      } else {
        // Notification directe
        nativeNotification = new Notification(notification.title, options)
        
        nativeNotification.onclick = () => {
          this.handleNotificationClick(notification)
        }
      }

      // Marquer comme livrée
      notification.delivered = true
      notification.timestamp = new Date().toISOString()
      
      this.deliveredNotifications.push(notification)
      await this.saveDeliveredNotifications()

      // Notifier les listeners
      this.listeners.forEach(listener => {
        try {
          listener(notification)
        } catch (error) {
          console.error('Erreur listener notification:', error)
        }
      })

      console.log('✅ Notification livrée:', notification.title)
    } catch (error) {
      console.error('Erreur livraison notification:', error)
      throw error
    }
  }

  /**
   * Vérifier si une notification doit être créée
   */
  private shouldCreateNotification(notification: NotificationData): boolean {
    if (!this.settings.enabled) return false
    if (!this.settings.categories[notification.category as keyof typeof this.settings.categories]) return false
    
    // Vérifier les tirages favoris
    if (notification.data?.drawName && this.settings.filters.favoriteDraws.length > 0) {
      if (!this.settings.filters.favoriteDraws.includes(notification.data.drawName)) {
        return false
      }
    }

    return true
  }

  /**
   * Vérifier si une notification doit être livrée maintenant
   */
  private shouldDeliverNow(notification: NotificationData): boolean {
    const now = new Date()
    
    // Vérifier les heures silencieuses
    if (this.settings.timing.quietHours.enabled) {
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM
      const start = this.settings.timing.quietHours.start
      const end = this.settings.timing.quietHours.end
      
      if (this.isTimeInRange(currentTime, start, end)) {
        return false
      }
    }

    // Vérifier les jours de tirage
    const dayName = now.toLocaleDateString('en-US', { weekday: 'lowercase' })
    if (!this.settings.timing.drawDays.includes(dayName)) {
      // Permettre les notifications système même hors jours de tirage
      if (notification.type !== 'system_update') {
        return false
      }
    }

    return true
  }

  /**
   * Vérifier si une heure est dans une plage
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    const timeMinutes = this.timeToMinutes(time)
    const startMinutes = this.timeToMinutes(start)
    const endMinutes = this.timeToMinutes(end)

    if (startMinutes <= endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes
    } else {
      // Plage qui traverse minuit
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes
    }
  }

  /**
   * Convertir HH:MM en minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Gérer le clic sur une notification
   */
  private handleNotificationClick(notification: NotificationData) {
    notification.clicked = true
    this.saveDeliveredNotifications()

    // Actions spécifiques selon le type
    switch (notification.type) {
      case 'draw_result':
        window.focus()
        // Naviguer vers les résultats
        break
      case 'prediction_accuracy':
        window.focus()
        // Naviguer vers l'historique
        break
      case 'trend_alert':
        window.focus()
        // Naviguer vers les tendances
        break
      case 'smart_suggestion':
        window.focus()
        // Naviguer vers les suggestions
        break
    }
  }

  /**
   * Démarrer le processeur de queue
   */
  private startQueueProcessor() {
    // Traiter la queue toutes les minutes
    setInterval(() => {
      this.processQueue()
    }, 60000)

    // Traitement initial
    this.processQueue()
  }

  /**
   * Générer un ID unique pour les notifications
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Charger les paramètres
   */
  private async loadSettings() {
    try {
      const saved = await indexedDBCache.get<NotificationSettings>('notification_settings')
      if (saved) {
        this.settings = { ...this.settings, ...saved }
      }
    } catch (error) {
      console.warn('Erreur chargement paramètres notifications:', error)
    }
  }

  /**
   * Sauvegarder les paramètres
   */
  async updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    
    try {
      await indexedDBCache.set('notification_settings', this.settings)
    } catch (error) {
      console.error('Erreur sauvegarde paramètres notifications:', error)
    }
  }

  /**
   * Charger les notifications en attente
   */
  private async loadPendingNotifications() {
    try {
      const pending = await indexedDBCache.get<NotificationData[]>('notification_queue') || []
      this.notificationQueue = pending

      const delivered = await indexedDBCache.get<NotificationData[]>('delivered_notifications') || []
      this.deliveredNotifications = delivered
    } catch (error) {
      console.warn('Erreur chargement notifications:', error)
    }
  }

  /**
   * Sauvegarder la queue de notifications
   */
  private async saveNotificationQueue() {
    try {
      await indexedDBCache.set('notification_queue', this.notificationQueue)
    } catch (error) {
      console.error('Erreur sauvegarde queue notifications:', error)
    }
  }

  /**
   * Sauvegarder les notifications livrées
   */
  private async saveDeliveredNotifications() {
    try {
      // Garder seulement les 1000 dernières notifications
      const recent = this.deliveredNotifications.slice(-1000)
      await indexedDBCache.set('delivered_notifications', recent)
      this.deliveredNotifications = recent
    } catch (error) {
      console.error('Erreur sauvegarde notifications livrées:', error)
    }
  }

  /**
   * API publique
   */

  // Obtenir les paramètres
  getSettings(): NotificationSettings {
    return { ...this.settings }
  }

  // Obtenir la permission
  getPermission(): NotificationPermission {
    return this.permission
  }

  // Obtenir les statistiques
  getStats(): NotificationStats {
    const total = this.deliveredNotifications.length
    const read = this.deliveredNotifications.filter(n => n.read).length
    const clicked = this.deliveredNotifications.filter(n => n.clicked).length

    const byCategory: Record<string, number> = {}
    const byType: Record<string, number> = {}

    this.deliveredNotifications.forEach(n => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1
      byType[n.type] = (byType[n.type] || 0) + 1
    })

    return {
      total,
      delivered: total,
      read,
      clicked,
      byCategory,
      byType,
      engagementRate: total > 0 ? (clicked / total) * 100 : 0,
      deliveryRate: 100 // Toutes les notifications en queue sont livrées
    }
  }

  // S'abonner aux notifications
  subscribe(listener: (notification: NotificationData) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Marquer comme lue
  async markAsRead(notificationId: string): Promise<boolean> {
    const notification = this.deliveredNotifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      await this.saveDeliveredNotifications()
      return true
    }
    return false
  }

  // Obtenir les notifications récentes
  getRecentNotifications(limit: number = 50): NotificationData[] {
    return this.deliveredNotifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Nettoyer les anciennes notifications
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)

    const before = this.deliveredNotifications.length
    this.deliveredNotifications = this.deliveredNotifications.filter(n => 
      new Date(n.timestamp) > cutoff
    )
    const after = this.deliveredNotifications.length

    await this.saveDeliveredNotifications()
    return before - after
  }
}

// Instance singleton
export const notificationManager = new NotificationManager()

// Types exportés
export type { NotificationSettings, NotificationData, NotificationAction, NotificationStats }
