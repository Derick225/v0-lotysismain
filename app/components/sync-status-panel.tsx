"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime, formatDate } from '../lib/constants'
import { SupabaseSyncStatus } from './supabase-sync-status'

interface SyncStatusPanelProps {
  isOnline: boolean
  cacheStats: any
  lastSync: Date | null
  loading: boolean
  error: string | null
  onRefresh: (forceRefresh?: boolean) => Promise<void>
  onSyncAll: () => Promise<void>
  onClearCache: () => Promise<void>
  onExportData: () => Promise<string>
  onImportData: (data: string) => Promise<void>
  retryCount: number
  isStale: boolean
}

export function SyncStatusPanel({
  isOnline,
  cacheStats,
  lastSync,
  loading,
  error,
  onRefresh,
  onSyncAll,
  onClearCache,
  onExportData,
  onImportData,
  retryCount,
  isStale
}: SyncStatusPanelProps) {
  const { toast } = useToast()
  const [importData, setImportData] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Calcul du statut global
  const getOverallStatus = () => {
    if (loading) return { status: 'syncing', color: 'bg-blue-500', text: 'Synchronisation...' }
    if (error) return { status: 'error', color: 'bg-red-500', text: 'Erreur' }
    if (!isOnline) return { status: 'offline', color: 'bg-gray-500', text: 'Hors ligne' }
    if (isStale) return { status: 'stale', color: 'bg-yellow-500', text: 'Données obsolètes' }
    return { status: 'ok', color: 'bg-green-500', text: 'À jour' }
  }

  const overallStatus = getOverallStatus()

  // Formatage de la taille du cache
  const formatCacheSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Gestion de l'export
  const handleExport = async () => {
    try {
      const data = await onExportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lottery-cache-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Export réussi",
        description: "Les données du cache ont été exportées avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données du cache",
        variant: "destructive",
      })
    }
  }

  // Gestion de l'import
  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "Données manquantes",
        description: "Veuillez coller les données JSON à importer",
        variant: "destructive",
      })
      return
    }

    try {
      await onImportData(importData)
      setImportData('')
      setShowImportDialog(false)
      
      toast({
        title: "Import réussi",
        description: "Les données ont été importées avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Impossible d'importer les données. Vérifiez le format JSON.",
        variant: "destructive",
      })
    }
  }

  // Gestion du nettoyage du cache
  const handleClearCache = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider le cache ? Cette action est irréversible.')) {
      try {
        await onClearCache()
        toast({
          title: "Cache vidé",
          description: "Le cache a été vidé avec succès",
        })
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de vider le cache",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Statut de Synchronisation
          <Badge className={`${overallStatus.color} text-white`}>
            {overallStatus.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Statut</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            {/* Statut de connexion */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">Connexion</span>
              </div>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "En ligne" : "Hors ligne"}
              </Badge>
            </div>

            {/* Dernière synchronisation */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Dernière sync</span>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  {lastSync ? formatDateTime(lastSync.toISOString()) : 'Jamais'}
                </div>
                {isStale && (
                  <Badge variant="outline" className="text-xs">
                    Données obsolètes
                  </Badge>
                )}
              </div>
            </div>

            {/* Statut d'erreur */}
            {error && (
              <div className="flex items-start gap-2 p-3 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-red-700">Erreur</div>
                  <div className="text-sm text-red-600">{error}</div>
                  {retryCount > 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      Tentatives: {retryCount}/3
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indicateur de chargement */}
            {loading && (
              <div className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg bg-blue-50">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-blue-700">Synchronisation en cours...</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            {cacheStats ? (
              <>
                {/* Statistiques générales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {cacheStats.totalResults}
                    </div>
                    <div className="text-sm text-gray-600">Résultats en cache</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCacheSize(cacheStats.cacheSize)}
                    </div>
                    <div className="text-sm text-gray-600">Taille du cache</div>
                  </div>
                </div>

                {/* Plage de dates */}
                {cacheStats.oldestEntry && cacheStats.newestEntry && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">Plage de données</div>
                    <div className="text-sm text-gray-600">
                      Du {formatDate(cacheStats.oldestEntry)} au {formatDate(cacheStats.newestEntry)}
                    </div>
                  </div>
                )}

                {/* Répartition par source */}
                {Object.keys(cacheStats.bySource).length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">Sources des données</div>
                    <div className="space-y-1">
                      {Object.entries(cacheStats.bySource).map(([source, count]) => (
                        <div key={source} className="flex justify-between text-sm">
                          <span className="capitalize">{source}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Répartition par tirage */}
                {Object.keys(cacheStats.byDrawName).length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">Tirages en cache</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(cacheStats.byDrawName)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 10)
                        .map(([drawName, count]) => (
                        <div key={drawName} className="flex justify-between">
                          <span className="truncate">{drawName}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div>Aucune statistique de cache disponible</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="supabase" className="space-y-4">
            <SupabaseSyncStatus />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {/* Actions de synchronisation */}
            <div className="space-y-2">
              <h4 className="font-medium">Synchronisation</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => onRefresh(false)}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                <Button
                  onClick={() => onRefresh(true)}
                  disabled={loading || !isOnline}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Forcer la sync
                </Button>
                <Button
                  onClick={onSyncAll}
                  disabled={loading || !isOnline}
                  variant="secondary"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Sync complète
                </Button>
              </div>
            </div>

            {/* Actions de gestion des données */}
            <div className="space-y-2">
              <h4 className="font-medium">Gestion des données</h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Importer
                </Button>
                <Button
                  onClick={handleClearCache}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vider cache
                </Button>
              </div>
            </div>

            {/* Dialog d'import */}
            {showImportDialog && (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium">Importer des données</h4>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Collez ici les données JSON à importer..."
                  className="w-full h-32 p-2 border rounded text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Button onClick={handleImport} size="sm">
                    Importer
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowImportDialog(false)
                      setImportData('')
                    }}
                    variant="outline" 
                    size="sm"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
