'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { cloudSyncManager, type SyncStatus } from '../lib/cloud-sync-manager'
import { useScreenReaderAnnouncements } from '../hooks/use-accessibility'

interface SyncContextType {
  isInitialized: boolean
  status: SyncStatus
  error: string | null
}

const SyncContext = createContext<SyncContextType>({
  isInitialized: false,
  status: {
    isOnline: false,
    lastSync: null,
    syncInProgress: false,
    pendingChanges: 0,
    conflictsDetected: 0,
    syncErrors: [],
    dataIntegrity: 'healthy'
  },
  error: null
})

interface SyncProviderProps {
  children: ReactNode
  enableAutoSync?: boolean
  showNotifications?: boolean
}

export function SyncProvider({ 
  children, 
  enableAutoSync = true,
  showNotifications = true 
}: SyncProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [status, setStatus] = useState<SyncStatus>(cloudSyncManager.getStatus())
  const [error, setError] = useState<string | null>(null)
  
  const { announce } = useScreenReaderAnnouncements()

  useEffect(() => {
    let mounted = true

    const initializeSync = async () => {
      try {
        // S'abonner aux changements de statut
        const unsubscribe = cloudSyncManager.subscribe((newStatus) => {
          if (!mounted) return
          
          setStatus(newStatus)
          
          // Notifications pour les utilisateurs de lecteurs d'écran
          if (showNotifications) {
            if (newStatus.syncInProgress !== status.syncInProgress) {
              if (newStatus.syncInProgress) {
                announce('Synchronisation cloud démarrée')
              } else if (newStatus.syncErrors.length === 0) {
                announce('Synchronisation cloud terminée avec succès')
              } else {
                announce('Synchronisation cloud terminée avec des erreurs', 'assertive')
              }
            }
            
            if (newStatus.conflictsDetected > status.conflictsDetected) {
              announce(`${newStatus.conflictsDetected} nouveau(x) conflit(s) de synchronisation`, 'assertive')
            }
          }
        })

        // Effectuer une synchronisation initiale si activée
        if (enableAutoSync && navigator.onLine) {
          try {
            await cloudSyncManager.forcSync()
          } catch (syncError) {
            console.warn('Erreur synchronisation initiale:', syncError)
            // Ne pas bloquer l'initialisation pour une erreur de sync
          }
        }

        if (mounted) {
          setIsInitialized(true)
          setError(null)
        }

        return unsubscribe
      } catch (initError) {
        console.error('Erreur initialisation sync:', initError)
        if (mounted) {
          setError(initError instanceof Error ? initError.message : 'Erreur d\'initialisation')
          setIsInitialized(true) // Permettre à l'app de continuer même en cas d'erreur
        }
      }
    }

    const cleanup = initializeSync()

    return () => {
      mounted = false
      cleanup.then(unsubscribe => {
        if (unsubscribe) unsubscribe()
      }).catch(console.error)
    }
  }, [enableAutoSync, showNotifications, announce, status.syncInProgress, status.conflictsDetected])

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      cloudSyncManager.cleanup()
    }
  }, [])

  const contextValue: SyncContextType = {
    isInitialized,
    status,
    error
  }

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  )
}

// Hook pour utiliser le contexte de synchronisation
export function useSyncContext() {
  const context = useContext(SyncContext)
  
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider')
  }
  
  return context
}

// Composant d'initialisation de la synchronisation
export function SyncInitializer({ children }: { children: ReactNode }) {
  const { isInitialized, error } = useSyncContext()
  
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <h2 className="text-lg font-medium">Initialisation de la synchronisation</h2>
            <p className="text-muted-foreground">Configuration de la synchronisation cloud...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-medium">Erreur de synchronisation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              L'application continuera de fonctionner en mode local.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

// Hook pour vérifier si la synchronisation est disponible
export function useSyncAvailability() {
  const { isInitialized, error, status } = useSyncContext()
  
  return {
    isAvailable: isInitialized && !error,
    isOnline: status.isOnline,
    canSync: isInitialized && !error && status.isOnline && !status.syncInProgress,
    hasError: !!error,
    error
  }
}

// Composant d'alerte pour les problèmes de synchronisation
export function SyncAlert() {
  const { status, error } = useSyncContext()
  const [dismissed, setDismissed] = useState(false)
  
  if (dismissed) return null
  
  const shouldShowAlert = error || !status.isOnline || status.syncErrors.length > 0 || status.conflictsDetected > 0
  
  if (!shouldShowAlert) return null
  
  const getAlertType = () => {
    if (error || status.syncErrors.length > 0) return 'error'
    if (status.conflictsDetected > 0) return 'warning'
    if (!status.isOnline) return 'info'
    return 'info'
  }
  
  const getAlertMessage = () => {
    if (error) return `Erreur de synchronisation: ${error}`
    if (status.syncErrors.length > 0) return `${status.syncErrors.length} erreur(s) de synchronisation`
    if (status.conflictsDetected > 0) return `${status.conflictsDetected} conflit(s) de synchronisation détecté(s)`
    if (!status.isOnline) return 'Mode hors ligne - La synchronisation reprendra automatiquement'
    return 'Problème de synchronisation détecté'
  }
  
  const alertType = getAlertType()
  const alertMessage = getAlertMessage()
  
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border ${
      alertType === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
      alertType === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
      'bg-blue-50 border-blue-200 text-blue-800'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {alertType === 'error' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {alertType === 'warning' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {alertType === 'info' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">{alertMessage}</p>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 ml-2 text-current hover:opacity-70"
          aria-label="Fermer l'alerte"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
