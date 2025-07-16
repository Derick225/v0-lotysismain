'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { useCloudSync, useSyncSettings, useSyncConflicts, useSyncMetrics } from '../hooks/use-cloud-sync'
import type { SyncConflict } from '../lib/cloud-sync-manager'

interface CloudSyncDashboardProps {
  className?: string
}

export function CloudSyncDashboard({ className }: CloudSyncDashboardProps) {
  const {
    status,
    forceSync,
    isHealthy,
    hasConflicts,
    canSync,
    lastSyncFormatted,
    syncProgress
  } = useCloudSync()

  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = () => {
    if (!status.isOnline) return 'text-red-600'
    if (status.syncInProgress) return 'text-blue-600'
    if (hasConflicts) return 'text-yellow-600'
    if (isHealthy) return 'text-green-600'
    return 'text-gray-600'
  }

  const getStatusIcon = () => {
    if (!status.isOnline) return 'WifiOff'
    if (status.syncInProgress) return 'Refresh'
    if (hasConflicts) return 'AlertTriangle'
    if (isHealthy) return 'CheckCircle'
    return 'Circle'
  }

  const getStatusText = () => {
    if (!status.isOnline) return 'Hors ligne'
    if (status.syncInProgress) return 'Synchronisation...'
    if (hasConflicts) return `${status.conflictsDetected} conflit(s)`
    if (isHealthy) return 'Synchronisé'
    return 'État inconnu'
  }

  return (
    <div className={className}>
      {/* Indicateur compact */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OptimizedIcon 
                name={getStatusIcon()} 
                category="system" 
                size={20} 
                className={`${getStatusColor()} ${status.syncInProgress ? 'animate-spin' : ''}`}
              />
              <div>
                <div className="font-medium">{getStatusText()}</div>
                {lastSyncFormatted && (
                  <div className="text-sm text-muted-foreground">
                    Dernière sync: {lastSyncFormatted}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {status.syncInProgress && (
                <div className="w-24">
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}
              
              <AccessibleButton
                onClick={() => setIsExpanded(!isExpanded)}
                variant="outline"
                size="sm"
                ariaLabel={isExpanded ? "Réduire les détails de synchronisation" : "Afficher les détails de synchronisation"}
              >
                <OptimizedIcon 
                  name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                  critical 
                  size={16} 
                />
              </AccessibleButton>
              
              <AccessibleButton
                onClick={forceSync}
                disabled={!canSync}
                variant="outline"
                size="sm"
                ariaLabel="Forcer la synchronisation"
                announceOnClick="Synchronisation forcée démarrée"
              >
                <OptimizedIcon name="Refresh" critical size={16} />
              </AccessibleButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard détaillé */}
      {isExpanded && (
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Statut</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="conflicts">Conflits</TabsTrigger>
            <TabsTrigger value="metrics">Métriques</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <SyncStatusView />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SyncSettingsView />
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            <SyncConflictsView />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <SyncMetricsView />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// Vue du statut de synchronisation
function SyncStatusView() {
  const { status, forceSync, canSync } = useCloudSync()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Activity" category="analytics" size={20} />
            État de la Synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Connexion</span>
              <Badge variant={status.isOnline ? "default" : "destructive"}>
                {status.isOnline ? "En ligne" : "Hors ligne"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Intégrité des données</span>
              <Badge variant={
                status.dataIntegrity === 'healthy' ? "default" :
                status.dataIntegrity === 'warning' ? "secondary" : "destructive"
              }>
                {status.dataIntegrity === 'healthy' ? "Saine" :
                 status.dataIntegrity === 'warning' ? "Attention" : "Erreur"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Changements en attente</span>
              <Badge variant="outline">
                {status.pendingChanges}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Conflits détectés</span>
              <Badge variant={status.conflictsDetected > 0 ? "destructive" : "default"}>
                {status.conflictsDetected}
              </Badge>
            </div>
          </div>

          {status.syncErrors.length > 0 && (
            <Alert variant="destructive">
              <OptimizedIcon name="AlertCircle" critical size={16} />
              <AlertDescription>
                <div className="font-medium mb-2">Erreurs de synchronisation:</div>
                <ul className="space-y-1">
                  {status.syncErrors.map((error, index) => (
                    <li key={index} className="text-sm">• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <AccessibleButton
              onClick={forceSync}
              disabled={!canSync}
              className="w-full md:w-auto"
              ariaLabel="Synchroniser maintenant"
              announceOnClick="Synchronisation manuelle démarrée"
            >
              <OptimizedIcon name="Refresh" critical size={16} className="mr-2" />
              Synchroniser maintenant
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Vue des paramètres de synchronisation
function SyncSettingsView() {
  const { settings, updateSettings, toggleAutoSync, setSyncInterval, setConflictResolution } = useSyncSettings()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Settings" critical size={20} />
            Paramètres de Synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Synchronisation automatique</label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement en arrière-plan
              </p>
            </div>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={toggleAutoSync}
            />
          </div>

          <div>
            <label className="font-medium mb-3 block">
              Intervalle de synchronisation: {settings.syncInterval} minutes
            </label>
            <Slider
              value={[settings.syncInterval]}
              onValueChange={([value]) => setSyncInterval(value)}
              min={1}
              max={60}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 min</span>
              <span>60 min</span>
            </div>
          </div>

          <div>
            <label className="font-medium mb-3 block">Résolution des conflits</label>
            <Select 
              value={settings.conflictResolution} 
              onValueChange={setConflictResolution}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">Demander à chaque fois</SelectItem>
                <SelectItem value="local_priority">Priorité aux données locales</SelectItem>
                <SelectItem value="remote_priority">Priorité aux données distantes</SelectItem>
                <SelectItem value="timestamp_priority">Priorité au plus récent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Synchroniser uniquement en WiFi</label>
              <p className="text-sm text-muted-foreground">
                Économiser les données mobiles
              </p>
            </div>
            <Switch
              checked={settings.syncOnlyOnWifi}
              onCheckedChange={(checked) => updateSettings({ syncOnlyOnWifi: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Synchronisation en arrière-plan</label>
              <p className="text-sm text-muted-foreground">
                Continuer la sync même quand l'app n'est pas active
              </p>
            </div>
            <Switch
              checked={settings.backgroundSync}
              onCheckedChange={(checked) => updateSettings({ backgroundSync: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Vue des conflits de synchronisation
function SyncConflictsView() {
  const { conflicts, hasConflicts, resolveConflict, resolveAllConflicts } = useSyncConflicts()

  if (!hasConflicts) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <OptimizedIcon name="CheckCircle" critical size={48} className="mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-medium mb-2">Aucun conflit détecté</h3>
          <p className="text-muted-foreground">
            Toutes les données sont synchronisées correctement.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <OptimizedIcon name="AlertTriangle" size={20} className="text-yellow-600" />
              Conflits de Synchronisation ({conflicts.length})
            </CardTitle>
            <div className="flex gap-2">
              <AccessibleButton
                onClick={() => resolveAllConflicts('local')}
                variant="outline"
                size="sm"
              >
                Tout résoudre (Local)
              </AccessibleButton>
              <AccessibleButton
                onClick={() => resolveAllConflicts('remote')}
                variant="outline"
                size="sm"
              >
                Tout résoudre (Distant)
              </AccessibleButton>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onResolve={resolveConflict}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Carte de conflit individuel
function ConflictCard({ 
  conflict, 
  onResolve 
}: { 
  conflict: SyncConflict
  onResolve: (id: string, resolution: 'local' | 'remote' | 'merge') => Promise<boolean>
}) {
  const [resolving, setResolving] = useState(false)

  const handleResolve = async (resolution: 'local' | 'remote' | 'merge') => {
    setResolving(true)
    try {
      await onResolve(conflict.id, resolution)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Conflit {conflict.type}</h4>
          <p className="text-sm text-muted-foreground">
            {new Date(conflict.timestamp).toLocaleString('fr-FR')}
          </p>
        </div>
        <Badge variant="destructive">Conflit</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="p-3 border rounded bg-blue-50">
          <h5 className="font-medium text-blue-800 mb-2">Données Locales</h5>
          <pre className="text-xs overflow-auto max-h-20">
            {JSON.stringify(conflict.localData, null, 2)}
          </pre>
        </div>
        
        <div className="p-3 border rounded bg-green-50">
          <h5 className="font-medium text-green-800 mb-2">Données Distantes</h5>
          <pre className="text-xs overflow-auto max-h-20">
            {JSON.stringify(conflict.remoteData, null, 2)}
          </pre>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <AccessibleButton
          onClick={() => handleResolve('local')}
          disabled={resolving}
          variant="outline"
          size="sm"
        >
          Garder Local
        </AccessibleButton>
        <AccessibleButton
          onClick={() => handleResolve('remote')}
          disabled={resolving}
          variant="outline"
          size="sm"
        >
          Garder Distant
        </AccessibleButton>
        <AccessibleButton
          onClick={() => handleResolve('merge')}
          disabled={resolving}
          variant="outline"
          size="sm"
        >
          Fusionner
        </AccessibleButton>
      </div>
    </div>
  )
}

// Vue des métriques de synchronisation
function SyncMetricsView() {
  const metrics = useSyncMetrics()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="BarChart3" critical size={20} />
            Métriques de Synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalSyncs}</div>
              <div className="text-sm text-muted-foreground">Synchronisations totales</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Taux de réussite</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.averageSyncTime.toFixed(0)}ms</div>
              <div className="text-sm text-muted-foreground">Temps moyen</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{metrics.healthScore}</div>
              <div className="text-sm text-muted-foreground">Score de santé</div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-3">Intégrité des Données</h4>
            <div className="flex items-center gap-3">
              <Progress value={metrics.healthScore} className="flex-1" />
              <Badge variant={
                metrics.dataIntegrityLevel === 'excellent' ? 'default' :
                metrics.dataIntegrityLevel === 'good' ? 'secondary' :
                metrics.dataIntegrityLevel === 'warning' ? 'outline' : 'destructive'
              }>
                {metrics.dataIntegrityLevel === 'excellent' ? 'Excellent' :
                 metrics.dataIntegrityLevel === 'good' ? 'Bon' :
                 metrics.dataIntegrityLevel === 'warning' ? 'Attention' : 'Critique'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
