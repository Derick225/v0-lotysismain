"use client"

import React from 'react'
import { DRAW_SCHEDULE } from './constants'
import logger from './logger'

interface NotificationConfig {
  enabled: boolean
  drawNames: string[]
  reminderMinutes: number
  soundEnabled: boolean
  vibrationEnabled: boolean
}

interface ScheduledNotification {
  id: string
  drawName: string
  scheduledTime: Date
  message: string
  type: 'reminder' | 'result' | 'prediction'
}

export class NotificationService {
  private static instance: NotificationService
  private config: NotificationConfig
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map()
  private permission: NotificationPermission = 'default'

  private constructor() {
    this.config = this.loadConfig()
    this.initializePermissions()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Initialisation des permissions
  private async initializePermissions() {
    if ('Notification' in window) {
      this.permission = Notification.permission
      
      if (this.permission === 'default') {
        // Demander la permission de manière non intrusive
        logger.info('Notification permission not granted yet')
      }
    } else {
      logger.warn('Notifications not supported in this browser')
    }
  }

  // Demander la permission pour les notifications
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported')
      return false
    }

    try {
      this.permission = await Notification.requestPermission()
      
      if (this.permission === 'granted') {
        logger.info('Notification permission granted')
        this.scheduleUpcomingDraws()
        return true
      } else {
        logger.warn('Notification permission denied')
        return false
      }
    } catch (error) {
      logger.error('Error requesting notification permission', error)
      return false
    }
  }

  // Configuration des notifications
  updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
    
    if (this.config.enabled && this.permission === 'granted') {
      this.scheduleUpcomingDraws()
    } else {
      this.clearAllScheduledNotifications()
    }
  }

  getConfig(): NotificationConfig {
    return { ...this.config }
  }

  // Programmer les notifications pour les tirages à venir
  private scheduleUpcomingDraws() {
    if (!this.config.enabled || this.permission !== 'granted') {
      return
    }

    this.clearAllScheduledNotifications()

    const now = new Date()
    const today = now.getDay() // 0 = Dimanche, 1 = Lundi, etc.
    
    // Programmer pour les 7 prochains jours
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now)
      targetDate.setDate(now.getDate() + dayOffset)
      
      const dayName = this.getDayName(targetDate.getDay())
      const daySchedule = DRAW_SCHEDULE[dayName]
      
      if (!daySchedule) continue

      Object.entries(daySchedule).forEach(([time, drawName]) => {
        if (!this.config.drawNames.includes(drawName)) return

        const [hours, minutes] = time.split(':').map(Number)
        const drawTime = new Date(targetDate)
        drawTime.setHours(hours, minutes, 0, 0)

        // Programmer la notification de rappel
        const reminderTime = new Date(drawTime.getTime() - this.config.reminderMinutes * 60 * 1000)
        
        if (reminderTime > now) {
          this.scheduleNotification({
            id: `reminder-${drawName}-${drawTime.getTime()}`,
            drawName,
            scheduledTime: reminderTime,
            message: `Rappel: Tirage ${drawName} dans ${this.config.reminderMinutes} minutes`,
            type: 'reminder'
          })
        }
      })
    }
  }

  // Programmer une notification spécifique
  private scheduleNotification(notification: ScheduledNotification) {
    const delay = notification.scheduledTime.getTime() - Date.now()
    
    if (delay <= 0) return

    const timeoutId = setTimeout(() => {
      this.showNotification(notification)
      this.scheduledNotifications.delete(notification.id)
    }, delay)

    this.scheduledNotifications.set(notification.id, notification)
    
    logger.info(`Scheduled notification for ${notification.drawName} at ${notification.scheduledTime}`)
  }

  // Afficher une notification
  private async showNotification(notification: ScheduledNotification) {
    if (this.permission !== 'granted') return

    try {
      const options: NotificationOptions = {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: notification.drawName,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'Voir les résultats'
          },
          {
            action: 'dismiss',
            title: 'Ignorer'
          }
        ],
        data: {
          drawName: notification.drawName,
          type: notification.type,
          timestamp: Date.now()
        }
      }

      if (this.config.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }

      const notif = new Notification(`Lotysis - ${notification.drawName}`, options)
      
      notif.onclick = () => {
        window.focus()
        // Naviguer vers le tirage spécifique
        const event = new CustomEvent('notification-click', {
          detail: { drawName: notification.drawName }
        })
        window.dispatchEvent(event)
        notif.close()
      }

      // Auto-fermer après 10 secondes
      setTimeout(() => notif.close(), 10000)

    } catch (error) {
      logger.error('Error showing notification', error)
    }
  }

  // Notification immédiate pour les résultats
  async notifyResult(drawName: string, numbers: number[], isWin: boolean = false) {
    if (this.permission !== 'granted' || !this.config.enabled) return

    const message = isWin 
      ? `🎉 Félicitations! Vous avez gagné au tirage ${drawName}!`
      : `Résultats du tirage ${drawName}: ${numbers.join(', ')}`

    await this.showNotification({
      id: `result-${drawName}-${Date.now()}`,
      drawName,
      scheduledTime: new Date(),
      message,
      type: 'result'
    })
  }

  // Notification pour les prédictions
  async notifyPrediction(drawName: string, numbers: number[], confidence: number) {
    if (this.permission !== 'granted' || !this.config.enabled) return

    const message = `Nouvelle prédiction pour ${drawName}: ${numbers.join(', ')} (${confidence}% de confiance)`

    await this.showNotification({
      id: `prediction-${drawName}-${Date.now()}`,
      drawName,
      scheduledTime: new Date(),
      message,
      type: 'prediction'
    })
  }

  // Vérifier si les notifications sont supportées
  isSupported(): boolean {
    return 'Notification' in window
  }

  // Obtenir le statut des permissions
  getPermissionStatus(): NotificationPermission {
    return this.permission
  }

  // Obtenir les notifications programmées
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
  }

  // Annuler toutes les notifications programmées
  private clearAllScheduledNotifications() {
    this.scheduledNotifications.clear()
    logger.info('Cleared all scheduled notifications')
  }

  // Annuler une notification spécifique
  cancelNotification(id: string) {
    this.scheduledNotifications.delete(id)
  }

  // Utilitaires
  private getDayName(dayIndex: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    return days[dayIndex]
  }

  private loadConfig(): NotificationConfig {
    try {
      const stored = localStorage.getItem('notification-config')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      logger.error('Error loading notification config', error)
    }

    // Configuration par défaut
    return {
      enabled: false,
      drawNames: [],
      reminderMinutes: 15,
      soundEnabled: true,
      vibrationEnabled: true
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem('notification-config', JSON.stringify(this.config))
    } catch (error) {
      logger.error('Error saving notification config', error)
    }
  }

  // Test de notification
  async testNotification() {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission()
      if (!granted) return false
    }

    await this.showNotification({
      id: 'test-notification',
      drawName: 'Test',
      scheduledTime: new Date(),
      message: 'Ceci est une notification de test. Les notifications fonctionnent correctement!',
      type: 'reminder'
    })

    return true
  }

  // Statistiques des notifications
  getStats(): {
    isSupported: boolean
    permission: NotificationPermission
    enabled: boolean
    scheduledCount: number
    configuredDraws: number
  } {
    return {
      isSupported: this.isSupported(),
      permission: this.permission,
      enabled: this.config.enabled,
      scheduledCount: this.scheduledNotifications.size,
      configuredDraws: this.config.drawNames.length
    }
  }
}

// Instance singleton
export const notificationService = NotificationService.getInstance()

// Hook pour utiliser le service de notifications
export function useNotifications() {
  const [config, setConfig] = React.useState(notificationService.getConfig())
  const [stats, setStats] = React.useState(notificationService.getStats())

  const updateConfig = (newConfig: Partial<NotificationConfig>) => {
    notificationService.updateConfig(newConfig)
    setConfig(notificationService.getConfig())
    setStats(notificationService.getStats())
  }

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission()
    setStats(notificationService.getStats())
    return granted
  }

  const testNotification = async () => {
    return await notificationService.testNotification()
  }

  return {
    config,
    stats,
    updateConfig,
    requestPermission,
    testNotification,
    notifyResult: notificationService.notifyResult.bind(notificationService),
    notifyPrediction: notificationService.notifyPrediction.bind(notificationService)
  }
}

// Export des types
export type { NotificationConfig, ScheduledNotification }
