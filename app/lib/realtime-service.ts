"use client"

import React from 'react'
import { supabase, LotteryResult } from '@/lib/supabase'

export interface RealtimeNotification {
  id: string
  type: 'new_result' | 'updated_result' | 'deleted_result' | 'system_update'
  title: string
  message: string
  data?: any
  timestamp: Date
  read: boolean
}

class RealtimeNotificationService {
  private notifications: RealtimeNotification[] = []
  private listeners: ((notifications: RealtimeNotification[]) => void)[] = []
  private channels: any[] = []

  constructor() {
    this.initializeChannels()
  }

  // Initialiser les canaux de notification
  private initializeChannels() {
    // Canal pour les résultats de loterie
    const lotteryChannel = supabase
      .channel('lottery_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lottery_results'
        },
        (payload) => {
          this.handleLotteryResultChange(payload)
        }
      )
      .subscribe()

    // Canal pour les modèles ML
    const mlModelChannel = supabase
      .channel('ml_models_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ml_models'
        },
        (payload) => {
          this.handleMLModelChange(payload)
        }
      )
      .subscribe()

    // Canal pour les prédictions
    const predictionsChannel = supabase
      .channel('predictions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ml_predictions'
        },
        (payload) => {
          this.handlePredictionChange(payload)
        }
      )
      .subscribe()

    this.channels = [lotteryChannel, mlModelChannel, predictionsChannel]
  }

  // Gérer les changements dans les résultats de loterie
  private handleLotteryResultChange(payload: any) {
    let notification: RealtimeNotification

    switch (payload.eventType) {
      case 'INSERT':
        notification = {
          id: crypto.randomUUID(),
          type: 'new_result',
          title: 'Nouveau tirage ajouté',
          message: `Nouveau résultat pour ${payload.new.draw_name} du ${payload.new.date}`,
          data: payload.new,
          timestamp: new Date(),
          read: false
        }
        break
      case 'UPDATE':
        notification = {
          id: crypto.randomUUID(),
          type: 'updated_result',
          title: 'Tirage mis à jour',
          message: `Le tirage ${payload.new.draw_name} a été modifié`,
          data: payload.new,
          timestamp: new Date(),
          read: false
        }
        break
      case 'DELETE':
        notification = {
          id: crypto.randomUUID(),
          type: 'deleted_result',
          title: 'Tirage supprimé',
          message: `Un tirage a été supprimé`,
          data: payload.old,
          timestamp: new Date(),
          read: false
        }
        break
      default:
        return
    }

    this.addNotification(notification)
  }

  // Gérer les changements dans les modèles ML
  private handleMLModelChange(payload: any) {
    const notification: RealtimeNotification = {
      id: crypto.randomUUID(),
      type: 'system_update',
      title: 'Modèle ML mis à jour',
      message: `Le modèle ${payload.new?.model_type || 'ML'} a été ${payload.eventType.toLowerCase()}`,
      data: payload.new || payload.old,
      timestamp: new Date(),
      read: false
    }

    this.addNotification(notification)
  }

  // Gérer les changements dans les prédictions
  private handlePredictionChange(payload: any) {
    if (payload.eventType === 'INSERT') {
      const notification: RealtimeNotification = {
        id: crypto.randomUUID(),
        type: 'system_update',
        title: 'Nouvelle prédiction',
        message: `Nouvelle prédiction générée pour ${payload.new.draw_name}`,
        data: payload.new,
        timestamp: new Date(),
        read: false
      }

      this.addNotification(notification)
    }
  }

  // Ajouter une notification
  private addNotification(notification: RealtimeNotification) {
    this.notifications.unshift(notification)
    
    // Garder seulement les 50 dernières notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }

    // Notifier tous les listeners
    this.notifyListeners()
  }

  // Ajouter un listener pour les notifications
  public addListener(callback: (notifications: RealtimeNotification[]) => void) {
    this.listeners.push(callback)
    // Envoyer immédiatement les notifications existantes
    callback(this.notifications)
  }

  // Supprimer un listener
  public removeListener(callback: (notifications: RealtimeNotification[]) => void) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // Notifier tous les listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications))
  }

  // Marquer une notification comme lue
  public markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  // Marquer toutes les notifications comme lues
  public markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  // Obtenir le nombre de notifications non lues
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  // Nettoyer les canaux (à appeler lors du démontage du composant)
  public cleanup() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.channels = []
    this.listeners = []
  }

  // Envoyer une notification personnalisée
  public addCustomNotification(
    type: RealtimeNotification['type'],
    title: string,
    message: string,
    data?: any
  ) {
    const notification: RealtimeNotification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      read: false
    }

    this.addNotification(notification)
  }
}

// Instance singleton
export const realtimeService = new RealtimeNotificationService()

// Hook React pour utiliser les notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = React.useState<RealtimeNotification[]>([])

  React.useEffect(() => {
    realtimeService.addListener(setNotifications)

    return () => {
      realtimeService.removeListener(setNotifications)
    }
  }, [])

  return {
    notifications,
    unreadCount: realtimeService.getUnreadCount(),
    markAsRead: realtimeService.markAsRead,
    markAllAsRead: realtimeService.markAllAsRead,
    addCustomNotification: realtimeService.addCustomNotification
  }
}
