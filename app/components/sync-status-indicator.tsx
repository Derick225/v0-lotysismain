'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { useSyncStatus, useCloudSync } from '../hooks/use-cloud-sync'

interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'detailed' | 'minimal'
  showLabel?: boolean
  className?: string
}

export function SyncStatusIndicator({ 
  variant = 'compact', 
  showLabel = false,
  className = '' 
}: SyncStatusIndicatorProps) {
  const { 
    isOnline, 
    isSyncing, 
    isHealthy, 
    hasConflicts, 
    canSync, 
    lastSync, 
    errorCount 
  } = useSyncStatus()
  
  const { forceSync, syncProgress } = useCloudSync()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Déterminer l'état visuel
  const getIndicatorState = () => {
    if (!isOnline) return {
      color: 'bg-red-500',
      icon: 'WifiOff',
      label: 'Hors ligne',
      description: 'Aucune connexion internet'
    }
    
    if (isSyncing) return {
      color: 'bg-blue-500',
      icon: 'Refresh',
      label: 'Synchronisation...',
      description: 'Synchronisation en cours'
    }
    
    if (hasConflicts) return {
      color: 'bg-yellow-500',
      icon: 'AlertTriangle',
      label: 'Conflits',
      description: 'Conflits de synchronisation détectés'
    }
    
    if (errorCount > 0) return {
      color: 'bg-orange-500',
      icon: 'AlertCircle',
      label: 'Erreurs',
      description: `${errorCount} erreur(s) de synchronisation`
    }
    
    if (isHealthy) return {
      color: 'bg-green-500',
      icon: 'CheckCircle',
      label: 'Synchronisé',
      description: 'Toutes les données sont synchronisées'
    }
    
    return {
      color: 'bg-gray-500',
      icon: 'Circle',
      label: 'Inconnu',
      description: 'État de synchronisation inconnu'
    }
  }

  const state = getIndicatorState()

  // Version minimale (juste un point coloré)
  if (variant === 'minimal') {
    return (
      <div 
        className={`w-3 h-3 rounded-full ${state.color} ${className}`}
        title={state.description}
        aria-label={state.description}
      />
    )
  }

  // Version compacte avec popover
  if (variant === 'compact') {
    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${className}`}
            aria-label={`État de synchronisation: ${state.label}`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.color}`} />
              <OptimizedIcon 
                name={state.icon} 
                category="system" 
                size={14} 
                className={isSyncing ? 'animate-spin' : ''}
              />
              {showLabel && (
                <span className="text-xs font-medium">{state.label}</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="end">
          <SyncStatusPopover 
            state={state}
            isOnline={isOnline}
            isSyncing={isSyncing}
            hasConflicts={hasConflicts}
            canSync={canSync}
            lastSync={lastSync}
            errorCount={errorCount}
            syncProgress={syncProgress}
            onForceSync={forceSync}
            onClose={() => setIsPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Version détaillée
  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${state.color}`} />
        <OptimizedIcon 
          name={state.icon} 
          category="system" 
          size={16} 
          className={isSyncing ? 'animate-spin' : ''}
        />
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-sm">{state.label}</div>
        <div className="text-xs text-muted-foreground">{state.description}</div>
        {lastSync && (
          <div className="text-xs text-muted-foreground">
            Dernière sync: {lastSync}
          </div>
        )}
      </div>
      
      {isSyncing && (
        <div className="w-20">
          <Progress value={syncProgress} className="h-1" />
        </div>
      )}
      
      <AccessibleButton
        onClick={forceSync}
        disabled={!canSync}
        variant="outline"
        size="sm"
        ariaLabel="Forcer la synchronisation"
      >
        <OptimizedIcon name="Refresh" critical size={14} />
      </AccessibleButton>
    </div>
  )
}

// Contenu du popover pour la version compacte
function SyncStatusPopover({
  state,
  isOnline,
  isSyncing,
  hasConflicts,
  canSync,
  lastSync,
  errorCount,
  syncProgress,
  onForceSync,
  onClose
}: {
  state: any
  isOnline: boolean
  isSyncing: boolean
  hasConflicts: boolean
  canSync: boolean
  lastSync: string | null
  errorCount: number
  syncProgress: number
  onForceSync: () => Promise<boolean>
  onClose: () => void
}) {
  const handleForceSync = async () => {
    await onForceSync()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full ${state.color}`} />
        <div>
          <div className="font-medium">{state.label}</div>
          <div className="text-sm text-muted-foreground">{state.description}</div>
        </div>
      </div>

      {isSyncing && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression</span>
            <span className="text-sm text-muted-foreground">{Math.round(syncProgress)}%</span>
          </div>
          <Progress value={syncProgress} className="h-2" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Connexion</span>
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? "En ligne" : "Hors ligne"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Conflits</span>
          <Badge variant={hasConflicts ? "destructive" : "default"} className="text-xs">
            {hasConflicts ? "Oui" : "Non"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Erreurs</span>
          <Badge variant={errorCount > 0 ? "destructive" : "default"} className="text-xs">
            {errorCount}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Statut</span>
          <Badge variant="outline" className="text-xs">
            {isSyncing ? "Actif" : "Inactif"}
          </Badge>
        </div>
      </div>

      {lastSync && (
        <div className="text-sm">
          <span className="font-medium">Dernière synchronisation:</span>
          <div className="text-muted-foreground">{lastSync}</div>
        </div>
      )}

      <div className="flex gap-2">
        <AccessibleButton
          onClick={handleForceSync}
          disabled={!canSync}
          className="flex-1"
          size="sm"
        >
          <OptimizedIcon name="Refresh" critical size={14} className="mr-2" />
          Synchroniser
        </AccessibleButton>
        
        <AccessibleButton
          onClick={onClose}
          variant="outline"
          size="sm"
        >
          Fermer
        </AccessibleButton>
      </div>
    </div>
  )
}

// Hook pour l'indicateur de synchronisation dans la navigation
export function useSyncIndicator() {
  const { isOnline, isSyncing, hasConflicts, errorCount } = useSyncStatus()
  
  const shouldShowWarning = !isOnline || hasConflicts || errorCount > 0
  const shouldPulse = isSyncing
  
  const getNotificationCount = () => {
    let count = 0
    if (hasConflicts) count += 1
    if (errorCount > 0) count += 1
    if (!isOnline) count += 1
    return count
  }

  return {
    shouldShowWarning,
    shouldPulse,
    notificationCount: getNotificationCount(),
    isOnline,
    isSyncing,
    hasConflicts,
    errorCount
  }
}

// Composant pour la barre de navigation
export function NavSyncIndicator() {
  const { shouldShowWarning, shouldPulse, notificationCount } = useSyncIndicator()
  
  return (
    <div className="relative">
      <SyncStatusIndicator variant="compact" />
      
      {shouldShowWarning && notificationCount > 0 && (
        <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center ${shouldPulse ? 'animate-pulse' : ''}`}>
          {notificationCount}
        </div>
      )}
    </div>
  )
}
