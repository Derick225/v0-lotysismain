"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock
} from 'lucide-react'
import { useSupabaseSync } from '../hooks/use-supabase-sync'
import { useDrawData } from '../hooks/use-draw-data'

interface GlobalStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function GlobalStatusIndicator({ 
  className = "", 
  showDetails = false 
}: GlobalStatusIndicatorProps) {
  const {
    isOnline: supabaseOnline,
    connectionStatus,
    isSyncing,
    lastSyncResult,
    stats
  } = useSupabaseSync()

  const {
    isOnline: networkOnline,
    loading: dataLoading,
    error: dataError,
    lastSync
  } = useDrawData()

  // Déterminer le statut global
  const getGlobalStatus = () => {
    if (!networkOnline) {
      return {
        status: 'offline',
        color: 'bg-gray-500',
        icon: WifiOff,
        text: 'Hors ligne',
        description: 'Pas de connexion internet'
      }
    }

    if (dataError) {
      return {
        status: 'error',
        color: 'bg-red-500',
        icon: AlertCircle,
        text: 'Erreur',
        description: 'Erreur de données'
      }
    }

    if (isSyncing || dataLoading) {
      return {
        status: 'syncing',
        color: 'bg-blue-500',
        icon: RefreshCw,
        text: 'Synchronisation',
        description: 'Mise à jour en cours'
      }
    }

    if (connectionStatus === 'connected' && supabaseOnline) {
      return {
        status: 'connected',
        color: 'bg-green-500',
        icon: CheckCircle,
        text: 'Connecté',
        description: 'Tout fonctionne'
      }
    }

    if (connectionStatus === 'error') {
      return {
        status: 'warning',
        color: 'bg-yellow-500',
        icon: AlertCircle,
        text: 'Attention',
        description: 'Problème de connexion'
      }
    }

    return {
      status: 'unknown',
      color: 'bg-gray-400',
      icon: Clock,
      text: 'Inconnu',
      description: 'Statut indéterminé'
    }
  }

  const globalStatus = getGlobalStatus()
  const StatusIcon = globalStatus.icon

  if (!showDetails) {
    // Version compacte - juste un indicateur
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${globalStatus.color}`} />
        <StatusIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <Badge variant="outline" className="text-xs">
          {globalStatus.text}
        </Badge>
      </div>
    )
  }

  // Version détaillée
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Statut principal */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
        <Badge className={`${globalStatus.color} text-white`}>
          {globalStatus.text}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {globalStatus.description}
        </span>
      </div>

      {/* Détails de connexion */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          <span className={networkOnline ? 'text-green-600' : 'text-red-600'}>
            Internet: {networkOnline ? 'OK' : 'KO'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
            Supabase: {connectionStatus === 'connected' ? 'OK' : 'KO'}
          </span>
        </div>
      </div>

      {/* Statistiques de sync */}
      {stats.totalSyncs > 0 && (
        <div className="text-xs text-muted-foreground">
          <div>Syncs: {stats.successfulSyncs}/{stats.totalSyncs}</div>
          {stats.lastSyncTime && (
            <div>Dernière: {stats.lastSyncTime.toLocaleTimeString()}</div>
          )}
        </div>
      )}

      {/* Erreurs récentes */}
      {dataError && (
        <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
          {dataError}
        </div>
      )}

      {/* Résultat de la dernière sync */}
      {lastSyncResult && !lastSyncResult.success && (
        <div className="text-xs text-yellow-600 bg-yellow-50 p-1 rounded">
          Sync partielle: {lastSyncResult.errors.length} erreur(s)
        </div>
      )}
    </div>
  )
}

// Version pour la barre de statut
export function StatusBar() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3">
        <GlobalStatusIndicator showDetails={true} />
      </div>
    </div>
  )
}

// Version pour le header
export function HeaderStatus() {
  return (
    <GlobalStatusIndicator className="ml-auto" showDetails={false} />
  )
}
