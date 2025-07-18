"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Zap,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSupabaseSync } from '../hooks/use-supabase-sync'
import { formatDateTime } from '../lib/constants'

interface SupabaseSyncStatusProps {
  className?: string
}

export function SupabaseSyncStatus({ className }: SupabaseSyncStatusProps) {
  const { toast } = useToast()
  const {
    isOnline,
    isSyncing,
    lastSyncResult,
    syncStatus,
    connectionStatus,
    syncAll,
    syncTable,
    testConnection,
    stats,
    errors,
    clearErrors
  } = useSupabaseSync()

  const [selectedTable, setSelectedTable] = useState<string>('')

  // Obtenir la couleur du statut de connexion
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      case 'testing': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  // Obtenir le texte du statut de connexion
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connecté'
      case 'disconnected': return 'Déconnecté'
      case 'error': return 'Erreur'
      case 'testing': return 'Test en cours'
      default: return 'Inconnu'
    }
  }

  // Gérer la synchronisation complète
  const handleSyncAll = async () => {
    try {
      await syncAll({ direction: 'bidirectional', resolveConflicts: true })
      toast({
        title: "Synchronisation réussie",
        description: "Toutes les données ont été synchronisées avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      })
    }
  }

  // Gérer la synchronisation d'une table
  const handleSyncTable = async (table: string) => {
    try {
      await syncTable(table, { direction: 'bidirectional' })
      toast({
        title: "Synchronisation réussie",
        description: `Table ${table} synchronisée avec succès`,
      })
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      })
    }
  }

  // Gérer le test de connexion
  const handleTestConnection = async () => {
    try {
      const success = await testConnection()
      toast({
        title: success ? "Connexion réussie" : "Connexion échouée",
        description: success 
          ? "La connexion à Supabase fonctionne correctement"
          : "Impossible de se connecter à Supabase",
        variant: success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Erreur de test",
        description: "Impossible de tester la connexion",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Synchronisation Supabase
            <Badge className={`${getConnectionStatusColor()} text-white`}>
              {getConnectionStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Statut</TabsTrigger>
              <TabsTrigger value="sync">Synchronisation</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              <TabsTrigger value="errors">Erreurs</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              {/* Statut de connexion */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">Internet</span>
                  </div>
                  <Badge variant={isOnline ? "default" : "destructive"}>
                    {isOnline ? "En ligne" : "Hors ligne"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Supabase</span>
                  </div>
                  <Badge className={getConnectionStatusColor()}>
                    {getConnectionStatusText()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Sync</span>
                  </div>
                  <Badge variant={isSyncing ? "default" : "secondary"}>
                    {isSyncing ? "En cours" : "Inactif"}
                  </Badge>
                </div>
              </div>

              {/* Dernière synchronisation */}
              {lastSyncResult && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Dernière Synchronisation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Statut:</span>
                      <div className="flex items-center gap-1">
                        {lastSyncResult.success ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>{lastSyncResult.success ? "Réussie" : "Échouée"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Enregistrements:</span>
                      <div className="font-medium">{lastSyncResult.recordsSynced}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Durée:</span>
                      <div className="font-medium">{lastSyncResult.duration}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conflits:</span>
                      <div className="font-medium">{lastSyncResult.conflicts.length}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions rapides */}
              <div className="flex gap-2">
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  size="sm"
                  disabled={connectionStatus === 'testing'}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Tester connexion
                </Button>
                <Button
                  onClick={handleSyncAll}
                  disabled={isSyncing || !isOnline || connectionStatus !== 'connected'}
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Synchroniser tout
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              {/* Statut par table */}
              <div className="space-y-2">
                <h4 className="font-medium">Statut par Table</h4>
                <div className="space-y-2">
                  {syncStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{status.table_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Dernière sync: {formatDateTime(status.last_sync)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.status === 'success' ? 'default' : 'destructive'}>
                          {status.status}
                        </Badge>
                        <Button
                          onClick={() => handleSyncTable(status.table_name)}
                          variant="outline"
                          size="sm"
                          disabled={isSyncing}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Synchronisation en cours */}
              {isSyncing && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="font-medium text-blue-700">Synchronisation en cours...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {/* Statistiques de synchronisation */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalSyncs}
                  </div>
                  <div className="text-sm text-muted-foreground">Total syncs</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.successfulSyncs}
                  </div>
                  <div className="text-sm text-muted-foreground">Réussies</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.failedSyncs}
                  </div>
                  <div className="text-sm text-muted-foreground">Échouées</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(stats.averageSyncDuration)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Durée moy.</div>
                </div>
              </div>

              {/* Taux de réussite */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Taux de Réussite
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Réussite</span>
                    <span>{stats.totalSyncs > 0 ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0}%</span>
                  </div>
                  <Progress 
                    value={stats.totalSyncs > 0 ? (stats.successfulSyncs / stats.totalSyncs) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Dernière synchronisation */}
              {stats.lastSyncTime && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Dernière Synchronisation</h4>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(stats.lastSyncTime.toISOString())}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              {/* Gestion des erreurs */}
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Erreurs de Synchronisation</h4>
                {errors.length > 0 && (
                  <Button onClick={clearErrors} variant="outline" size="sm">
                    Effacer tout
                  </Button>
                )}
              </div>

              {errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>Aucune erreur de synchronisation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Conflits de la dernière sync */}
              {lastSyncResult?.conflicts && lastSyncResult.conflicts.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium">Conflits Détectés</h5>
                  {lastSyncResult.conflicts.map((conflict, index) => (
                    <div key={index} className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="font-medium text-yellow-800">
                        Conflit {conflict.conflictType} dans {conflict.table}
                      </div>
                      <div className="text-sm text-yellow-600">
                        Timestamp: {new Date(conflict.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
