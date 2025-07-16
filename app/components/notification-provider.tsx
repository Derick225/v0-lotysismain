'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { notificationManager } from '../lib/notification-manager'
import { useAutoNotifications } from '../hooks/use-notifications'
import { useScreenReaderAnnouncements } from '../hooks/use-accessibility'

interface NotificationContextType {
  isInitialized: boolean
  hasPermission: boolean
  error: string | null
}

const NotificationContext = createContext<NotificationContextType>({
  isInitialized: false,
  hasPermission: false,
  error: null
})

interface NotificationProviderProps {
  children: ReactNode
  autoRequest?: boolean
  enableAutoNotifications?: boolean
}

export function NotificationProvider({ 
  children, 
  autoRequest = false,
  enableAutoNotifications = true 
}: NotificationProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { announce } = useScreenReaderAnnouncements()
  const autoNotifications = useAutoNotifications()

  useEffect(() => {
    let mounted = true

    const initializeNotifications = async () => {
      try {
        // Vérifier le support des notifications
        if (!('Notification' in window)) {
          throw new Error('Les notifications ne sont pas supportées par ce navigateur')
        }

        // Vérifier la permission actuelle
        const currentPermission = notificationManager.getPermission()
        setHasPermission(currentPermission === 'granted')

        // Demander la permission automatiquement si configuré
        if (autoRequest && currentPermission === 'default') {
          const granted = await notificationManager.requestPermission()
          setHasPermission(granted)
          
          if (granted) {
            announce('Notifications activées avec succès')
          }
        }

        // Configurer les notifications automatiques
        if (enableAutoNotifications) {
          setupAutoNotifications()
        }

        if (mounted) {
          setIsInitialized(true)
          setError(null)
        }

      } catch (initError) {
        console.error('Erreur initialisation notifications:', initError)
        if (mounted) {
          setError(initError instanceof Error ? initError.message : 'Erreur d\'initialisation')
          setIsInitialized(true) // Permettre à l'app de continuer
        }
      }
    }

    const setupAutoNotifications = () => {
      // Écouter les événements personnalisés pour les notifications automatiques
      
      // Nouveaux résultats de tirage
      window.addEventListener('newDrawResult', (event: any) => {
        const { drawName, result, predictions } = event.detail
        autoNotifications.handleNewDrawResult(drawName, result, predictions)
      })

      // Prédiction vérifiée
      window.addEventListener('predictionVerified', (event: any) => {
        const { prediction, accuracy } = event.detail
        autoNotifications.handlePredictionVerified(prediction, accuracy)
      })

      // Nouvelle tendance détectée
      window.addEventListener('trendDetected', (event: any) => {
        const { drawName, trendType, description, confidence } = event.detail
        autoNotifications.handleTrendDetected(drawName, trendType, description, confidence)
      })

      // Suggestion importante
      window.addEventListener('importantSuggestion', (event: any) => {
        const { suggestion } = event.detail
        autoNotifications.handleImportantSuggestion(suggestion)
      })
    }

    initializeNotifications()

    return () => {
      mounted = false
      
      // Nettoyer les listeners
      window.removeEventListener('newDrawResult', () => {})
      window.removeEventListener('predictionVerified', () => {})
      window.removeEventListener('trendDetected', () => {})
      window.removeEventListener('importantSuggestion', () => {})
    }
  }, [autoRequest, enableAutoNotifications, announce, autoNotifications])

  const contextValue: NotificationContextType = {
    isInitialized,
    hasPermission,
    error
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook pour utiliser le contexte de notifications
export function useNotificationContext() {
  const context = useContext(NotificationContext)
  
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  
  return context
}

// Composant d'initialisation des notifications
export function NotificationInitializer({ children }: { children: ReactNode }) {
  const { isInitialized, error } = useNotificationContext()
  
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <h2 className="text-lg font-medium">Initialisation des notifications</h2>
            <p className="text-muted-foreground">Configuration du système de notifications...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-yellow-500">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-medium">Notifications non disponibles</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              L'application continuera de fonctionner normalement.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

// Hook pour vérifier la disponibilité des notifications
export function useNotificationAvailability() {
  const { isInitialized, hasPermission, error } = useNotificationContext()
  
  return {
    isAvailable: isInitialized && !error,
    hasPermission,
    canNotify: isInitialized && hasPermission && !error,
    hasError: !!error,
    error
  }
}

// Fonctions utilitaires pour déclencher des notifications automatiques
export const notificationTriggers = {
  // Déclencher une notification de nouveau résultat
  triggerNewDrawResult: (drawName: string, result: any, predictions?: any[]) => {
    window.dispatchEvent(new CustomEvent('newDrawResult', {
      detail: { drawName, result, predictions }
    }))
  },

  // Déclencher une notification de prédiction vérifiée
  triggerPredictionVerified: (prediction: any, accuracy: number) => {
    window.dispatchEvent(new CustomEvent('predictionVerified', {
      detail: { prediction, accuracy }
    }))
  },

  // Déclencher une notification de tendance détectée
  triggerTrendDetected: (drawName: string, trendType: string, description: string, confidence: number) => {
    window.dispatchEvent(new CustomEvent('trendDetected', {
      detail: { drawName, trendType, description, confidence }
    }))
  },

  // Déclencher une notification de suggestion importante
  triggerImportantSuggestion: (suggestion: any) => {
    window.dispatchEvent(new CustomEvent('importantSuggestion', {
      detail: { suggestion }
    }))
  }
}

// Composant pour les notifications toast en temps réel
export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<any[]>([])

  useEffect(() => {
    // S'abonner aux nouvelles notifications
    const unsubscribe = notificationManager.subscribe((notification) => {
      // Ajouter le toast
      setToasts(prev => [...prev, { ...notification, id: Date.now() }])
      
      // Supprimer automatiquement après 5 secondes
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notification.id))
      }, 5000)
    })

    return unsubscribe
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </div>
  )
}

// Composant de toast individuel
function NotificationToast({ 
  notification, 
  onDismiss 
}: { 
  notification: any
  onDismiss: () => void
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'draw_result': return '🎲'
      case 'prediction_accuracy': return '🎯'
      case 'trend_alert': return '📈'
      case 'smart_suggestion': return '💡'
      case 'system_update': return '🔔'
      default: return '📢'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'draw_result': return 'border-blue-500 bg-blue-50'
      case 'prediction_accuracy': return 'border-green-500 bg-green-50'
      case 'trend_alert': return 'border-orange-500 bg-orange-50'
      case 'smart_suggestion': return 'border-purple-500 bg-purple-50'
      case 'system_update': return 'border-gray-500 bg-gray-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  return (
    <div className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${getTypeColor(notification.type)} animate-slide-in-right`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">
          {getTypeIcon(notification.type)}
        </span>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
          <p className="text-sm text-muted-foreground">{notification.body}</p>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer la notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
