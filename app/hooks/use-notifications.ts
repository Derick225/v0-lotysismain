'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  notificationManager, 
  type NotificationSettings, 
  type NotificationData, 
  type NotificationStats 
} from '../lib/notification-manager'
import { useScreenReaderAnnouncements } from './use-accessibility'

interface UseNotificationsReturn {
  // État
  permission: NotificationPermission
  settings: NotificationSettings
  stats: NotificationStats
  recentNotifications: NotificationData[]
  
  // Actions
  requestPermission: () => Promise<boolean>
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>
  markAsRead: (notificationId: string) => Promise<boolean>
  cleanup: (olderThanDays?: number) => Promise<number>
  
  // Créateurs de notifications
  notifyDrawResult: (drawName: string, result: any, predictions?: any[]) => Promise<string>
  notifyPredictionAccuracy: (prediction: any, accuracy: number) => Promise<string>
  notifyTrendAlert: (drawName: string, trendType: string, description: string, confidence: number) => Promise<string>
  notifySmartSuggestion: (suggestion: any) => Promise<string>
  notifySystemUpdate: (title: string, message: string, priority?: 'low' | 'normal' | 'high') => Promise<string>
  
  // Utilitaires
  isEnabled: boolean
  hasPermission: boolean
  unreadCount: number
  engagementRate: number
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>(notificationManager.getPermission())
  const [settings, setSettings] = useState<NotificationSettings>(notificationManager.getSettings())
  const [stats, setStats] = useState<NotificationStats>(notificationManager.getStats())
  const [recentNotifications, setRecentNotifications] = useState<NotificationData[]>([])
  
  const { announce } = useScreenReaderAnnouncements()

  // Charger les données initiales
  useEffect(() => {
    const loadData = () => {
      setPermission(notificationManager.getPermission())
      setSettings(notificationManager.getSettings())
      setStats(notificationManager.getStats())
      setRecentNotifications(notificationManager.getRecentNotifications(20))
    }

    loadData()

    // S'abonner aux nouvelles notifications
    const unsubscribe = notificationManager.subscribe((notification) => {
      // Annoncer la nouvelle notification
      announce(`Nouvelle notification: ${notification.title}`)
      
      // Mettre à jour les données
      loadData()
    })

    // Actualiser périodiquement
    const interval = setInterval(loadData, 30000) // Toutes les 30 secondes

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [announce])

  // Demander la permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationManager.requestPermission()
      setPermission(notificationManager.getPermission())
      
      if (granted) {
        announce('Notifications activées avec succès')
      } else {
        announce('Permission de notification refusée', 'assertive')
      }
      
      return granted
    } catch (error) {
      console.error('Erreur demande permission:', error)
      announce('Erreur lors de l\'activation des notifications', 'assertive')
      return false
    }
  }, [announce])

  // Mettre à jour les paramètres
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      await notificationManager.updateSettings(newSettings)
      setSettings(notificationManager.getSettings())
      announce('Paramètres de notification mis à jour')
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error)
      announce('Erreur lors de la mise à jour des paramètres', 'assertive')
    }
  }, [announce])

  // Marquer comme lue
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const success = await notificationManager.markAsRead(notificationId)
      if (success) {
        setRecentNotifications(notificationManager.getRecentNotifications(20))
        setStats(notificationManager.getStats())
      }
      return success
    } catch (error) {
      console.error('Erreur marquage lecture:', error)
      return false
    }
  }, [])

  // Nettoyer les anciennes notifications
  const cleanup = useCallback(async (olderThanDays: number = 30): Promise<number> => {
    try {
      const deletedCount = await notificationManager.cleanup(olderThanDays)
      if (deletedCount > 0) {
        setRecentNotifications(notificationManager.getRecentNotifications(20))
        setStats(notificationManager.getStats())
        announce(`${deletedCount} notification(s) ancienne(s) supprimée(s)`)
      }
      return deletedCount
    } catch (error) {
      console.error('Erreur nettoyage notifications:', error)
      return 0
    }
  }, [announce])

  // Créateurs de notifications
  const notifyDrawResult = useCallback(async (drawName: string, result: any, predictions?: any[]) => {
    return await notificationManager.notifyDrawResult(drawName, result, predictions)
  }, [])

  const notifyPredictionAccuracy = useCallback(async (prediction: any, accuracy: number) => {
    return await notificationManager.notifyPredictionAccuracy(prediction, accuracy)
  }, [])

  const notifyTrendAlert = useCallback(async (drawName: string, trendType: string, description: string, confidence: number) => {
    return await notificationManager.notifyTrendAlert(drawName, trendType, description, confidence)
  }, [])

  const notifySmartSuggestion = useCallback(async (suggestion: any) => {
    return await notificationManager.notifySmartSuggestion(suggestion)
  }, [])

  const notifySystemUpdate = useCallback(async (title: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal') => {
    return await notificationManager.notifySystemUpdate(title, message, priority)
  }, [])

  // Calculer les propriétés dérivées
  const isEnabled = settings.enabled && permission === 'granted'
  const hasPermission = permission === 'granted'
  const unreadCount = recentNotifications.filter(n => !n.read).length
  const engagementRate = stats.engagementRate

  return {
    // État
    permission,
    settings,
    stats,
    recentNotifications,
    
    // Actions
    requestPermission,
    updateSettings,
    markAsRead,
    cleanup,
    
    // Créateurs
    notifyDrawResult,
    notifyPredictionAccuracy,
    notifyTrendAlert,
    notifySmartSuggestion,
    notifySystemUpdate,
    
    // Utilitaires
    isEnabled,
    hasPermission,
    unreadCount,
    engagementRate
  }
}

// Hook simplifié pour le statut des notifications
export function useNotificationStatus() {
  const { permission, isEnabled, unreadCount, settings } = useNotifications()
  
  return {
    permission,
    isEnabled,
    unreadCount,
    hasQuietHours: settings.timing.quietHours.enabled,
    maxPerDay: settings.filters.maxPerDay
  }
}

// Hook pour les paramètres de notifications
export function useNotificationSettings() {
  const { settings, updateSettings } = useNotifications()
  
  const toggleCategory = useCallback((category: keyof NotificationSettings['categories']) => {
    updateSettings({
      categories: {
        ...settings.categories,
        [category]: !settings.categories[category]
      }
    })
  }, [settings.categories, updateSettings])
  
  const setQuietHours = useCallback((start: string, end: string, enabled: boolean = true) => {
    updateSettings({
      timing: {
        ...settings.timing,
        quietHours: { start, end, enabled }
      }
    })
  }, [settings.timing, updateSettings])
  
  const setMaxPerDay = useCallback((max: number) => {
    updateSettings({
      filters: {
        ...settings.filters,
        maxPerDay: Math.max(1, Math.min(50, max))
      }
    })
  }, [settings.filters, updateSettings])
  
  const setMinConfidence = useCallback((confidence: number) => {
    updateSettings({
      filters: {
        ...settings.filters,
        minConfidence: Math.max(0, Math.min(100, confidence))
      }
    })
  }, [settings.filters, updateSettings])
  
  return {
    settings,
    updateSettings,
    toggleCategory,
    setQuietHours,
    setMaxPerDay,
    setMinConfidence
  }
}

// Hook pour les notifications récentes
export function useRecentNotifications(limit: number = 10) {
  const { recentNotifications, markAsRead } = useNotifications()
  
  const notifications = recentNotifications.slice(0, limit)
  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)
  
  const markAllAsRead = useCallback(async () => {
    const promises = unreadNotifications.map(n => markAsRead(n.id))
    await Promise.all(promises)
  }, [unreadNotifications, markAsRead])
  
  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount: unreadNotifications.length,
    markAsRead,
    markAllAsRead
  }
}

// Hook pour les statistiques de notifications
export function useNotificationStats() {
  const { stats } = useNotifications()
  
  const getEngagementLevel = useCallback(() => {
    if (stats.engagementRate >= 80) return 'excellent'
    if (stats.engagementRate >= 60) return 'good'
    if (stats.engagementRate >= 40) return 'average'
    return 'poor'
  }, [stats.engagementRate])
  
  const getMostActiveCategory = useCallback(() => {
    const categories = Object.entries(stats.byCategory)
    if (categories.length === 0) return null
    
    return categories.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )[0]
  }, [stats.byCategory])
  
  const getDeliveryHealth = useCallback(() => {
    if (stats.deliveryRate >= 95) return 'excellent'
    if (stats.deliveryRate >= 85) return 'good'
    if (stats.deliveryRate >= 70) return 'warning'
    return 'poor'
  }, [stats.deliveryRate])
  
  return {
    ...stats,
    engagementLevel: getEngagementLevel(),
    mostActiveCategory: getMostActiveCategory(),
    deliveryHealth: getDeliveryHealth()
  }
}

// Hook pour les notifications automatiques basées sur les événements
export function useAutoNotifications() {
  const { notifyDrawResult, notifyPredictionAccuracy, notifyTrendAlert, notifySmartSuggestion } = useNotifications()
  
  // Auto-notification pour les nouveaux résultats
  const handleNewDrawResult = useCallback(async (drawName: string, result: any, predictions?: any[]) => {
    return await notifyDrawResult(drawName, result, predictions)
  }, [notifyDrawResult])
  
  // Auto-notification pour les prédictions vérifiées
  const handlePredictionVerified = useCallback(async (prediction: any, accuracy: number) => {
    if (accuracy >= 30) { // Seuil minimum pour notifier
      return await notifyPredictionAccuracy(prediction, accuracy)
    }
    return ''
  }, [notifyPredictionAccuracy])
  
  // Auto-notification pour les nouvelles tendances
  const handleTrendDetected = useCallback(async (drawName: string, trendType: string, description: string, confidence: number) => {
    if (confidence >= 60) { // Seuil minimum pour les tendances
      return await notifyTrendAlert(drawName, trendType, description, confidence)
    }
    return ''
  }, [notifyTrendAlert])
  
  // Auto-notification pour les suggestions importantes
  const handleImportantSuggestion = useCallback(async (suggestion: any) => {
    if (suggestion.priority === 'high' && suggestion.confidence >= 70) {
      return await notifySmartSuggestion(suggestion)
    }
    return ''
  }, [notifySmartSuggestion])
  
  return {
    handleNewDrawResult,
    handlePredictionVerified,
    handleTrendDetected,
    handleImportantSuggestion
  }
}
