'use client'

import { useOfflineCache } from '../hooks/use-offline-cache'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AppIcon } from './ui/icon-provider'
import { formatDateTime } from '../lib/constants'

export function OfflineIndicator() {
  const {
    isOnline,
    cacheReady,
    cacheStats,
    syncStatus,
    clearCache,
    cleanupCache,
    refreshStats
  } = useOfflineCache()

  // Indicateur en haut de page si hors ligne
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <AppIcon name="wifi" size={16} className="animate-pulse" />
          <span className="text-sm font-medium">
            Mode hors ligne - Les données peuvent ne pas être à jour
          </span>
          {syncStatus.pendingSync && (
            <AppIcon name="refresh" size={16} className="animate-spin" />
          )}
        </div>
      </div>
    )
  }

  return null
}

export function CacheStatusPanel() {
  const {
    isOnline,
    cacheReady,
    cacheStats,
    syncStatus,
    clearCache,
    cleanupCache,
    refreshStats
  } = useOfflineCache()

  if (!cacheReady) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AppIcon name="refresh" size={16} className="animate-spin" />
            <span className="text-sm text-muted-foreground">
              Initialisation du cache...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleCleanup = async () => {
    const deletedCount = await cleanupCache()
    if (deletedCount > 0) {
      alert(`${deletedCount} entrées expirées supprimées`)
    } else {
      alert('Aucune entrée expirée trouvée')
    }
  }

  const handleClearCache = async () => {
    if (confirm('Êtes-vous sûr de vouloir vider complètement le cache ?')) {
      await clearCache()
      alert('Cache vidé avec succès')
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Statut de connexion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon 
              name={isOnline ? "wifi" : "wifiOff"} 
              size={16} 
              className={isOnline ? "text-green-500" : "text-red-500"} 
            />
            <span className="font-medium">
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Connecté' : 'Déconnecté'}
          </Badge>
        </div>

        {/* Statut de synchronisation */}
        {syncStatus.lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Dernière sync:
            </span>
            <span className="text-sm">
              {formatDateTime(syncStatus.lastSync.toISOString())}
            </span>
          </div>
        )}

        {syncStatus.pendingSync && (
          <div className="flex items-center gap-2">
            <AppIcon name="refresh" size={16} className="animate-spin" />
            <span className="text-sm text-muted-foreground">
              Synchronisation en cours...
            </span>
          </div>
        )}

        {/* Statistiques du cache */}
        {cacheStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Entrées en cache:
              </span>
              <span className="text-sm font-medium">
                {cacheStats.totalEntries}
              </span>
            </div>

            {cacheStats.totalEntries > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Taux de réussite:
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round((cacheStats.hitRate / (cacheStats.hitRate + cacheStats.missRate)) * 100) || 0}%
                  </span>
                </div>

                <Progress 
                  value={Math.round((cacheStats.hitRate / (cacheStats.hitRate + cacheStats.missRate)) * 100) || 0}
                  className="h-2"
                />
              </>
            )}
          </div>
        )}

        {/* Erreurs de synchronisation */}
        {syncStatus.syncErrors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AppIcon name="alert" size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">
                Erreurs de synchronisation:
              </span>
            </div>
            <div className="space-y-1">
              {syncStatus.syncErrors.slice(-3).map((error, index) => (
                <div key={index} className="text-xs text-red-500 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            className="flex-1"
          >
            <AppIcon name="refresh" size={14} className="mr-1" />
            Actualiser
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            className="flex-1"
          >
            <AppIcon name="trash" size={14} className="mr-1" />
            Nettoyer
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCache}
            className="flex-1"
          >
            <AppIcon name="x" size={14} className="mr-1" />
            Vider
          </Button>
        </div>

        {/* Informations techniques */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Informations techniques
          </summary>
          <div className="mt-2 space-y-1">
            <div>Cache prêt: {cacheReady ? 'Oui' : 'Non'}</div>
            <div>Synchronisations: {syncStatus.totalSynced}</div>
            {cacheStats && (
              <>
                <div>Hits: {cacheStats.hitRate}</div>
                <div>Miss: {cacheStats.missRate}</div>
                <div>Taille: {Math.round(cacheStats.totalSize / 1024)} KB</div>
              </>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

export function OfflineDataBanner({ show = false }: { show?: boolean }) {
  if (!show) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <AppIcon name="info" size={16} className="text-blue-500" />
        <span className="text-sm text-blue-700">
          Données chargées depuis le cache local. 
          Reconnectez-vous pour obtenir les dernières mises à jour.
        </span>
      </div>
    </div>
  )
}
