'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { getNumberColor } from '../lib/constants'
import { usePredictionHistory, usePredictionStats } from '../hooks/use-prediction-history'
import type { PredictionRecord, PredictionPerformance } from '../lib/prediction-history'

interface PredictionHistoryDashboardProps {
  className?: string
}

export function PredictionHistoryDashboard({ className }: PredictionHistoryDashboardProps) {
  const {
    history,
    analytics,
    loading,
    error,
    applyFilters,
    clearFilters,
    activeFilters,
    hasFilters,
    deletePrediction,
    exportHistory,
    cleanupHistory,
    getAlgorithmPerformance,
    getRecentPerformance
  } = usePredictionHistory()

  const stats = usePredictionStats()
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionRecord | null>(null)
  const [filterDrawName, setFilterDrawName] = useState('')
  const [filterAlgorithm, setFilterAlgorithm] = useState('')
  const [filterVerified, setFilterVerified] = useState<string>('')

  // Données pour les filtres
  const availableDrawNames = useMemo(() => {
    const names = new Set(history.map(p => p.drawName))
    return Array.from(names).sort()
  }, [history])

  const availableAlgorithms = useMemo(() => {
    const algorithms = new Set(history.map(p => p.algorithm))
    return Array.from(algorithms).sort()
  }, [history])

  // Appliquer les filtres
  const handleApplyFilters = () => {
    const filters: any = {}
    if (filterDrawName) filters.drawName = filterDrawName
    if (filterAlgorithm) filters.algorithm = filterAlgorithm
    if (filterVerified) filters.verified = filterVerified === 'true'
    
    applyFilters(filters)
  }

  // Effacer les filtres
  const handleClearFilters = () => {
    setFilterDrawName('')
    setFilterAlgorithm('')
    setFilterVerified('')
    clearFilters()
  }

  // Exporter les données
  const handleExport = async (format: 'json' | 'csv') => {
    const data = await exportHistory(format)
    if (data) {
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `predictions-history.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Nettoyer l'historique
  const handleCleanup = async () => {
    const deletedCount = await cleanupHistory(90)
    if (deletedCount > 0) {
      alert(`${deletedCount} prédictions anciennes supprimées`)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <OptimizedIcon name="Loader" critical size={48} className="mx-auto mb-4 animate-spin" />
          <p>Chargement de l'historique des prédictions...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <OptimizedIcon name="AlertCircle" critical size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Prédictions</CardTitle>
                <OptimizedIcon name="Brain" critical size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Toutes les prédictions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vérifiées</CardTitle>
                <OptimizedIcon name="Check" critical size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.verified}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.verificationRate.toFixed(1)}% du total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Précision Moyenne</CardTitle>
                <OptimizedIcon name="Target" category="analytics" size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Sur les prédictions vérifiées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tendance Récente</CardTitle>
                <OptimizedIcon 
                  name={stats.recent.trend === 'improving' ? 'TrendingUp' : 
                        stats.recent.trend === 'declining' ? 'TrendingDown' : 'Minus'} 
                  critical 
                  size={16} 
                  className={`${
                    stats.recent.trend === 'improving' ? 'text-green-600' :
                    stats.recent.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recent.accuracy.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.recent.predictions} prédictions (30j)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performances par algorithme */}
          {analytics && Object.keys(analytics.algorithmStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <OptimizedIcon name="BarChart3" critical size={20} />
                  Performances par Algorithme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.algorithmStats).map(([algorithm, stats]) => (
                    <div key={algorithm} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{algorithm}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stats.count} prédictions • Meilleur score: {stats.bestScore.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{stats.averageAccuracy.toFixed(1)}%</div>
                        <Progress value={stats.averageAccuracy} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Filter" category="interface" size={20} />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tirage</label>
                  <Select value={filterDrawName} onValueChange={setFilterDrawName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les tirages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les tirages</SelectItem>
                      {availableDrawNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Algorithme</label>
                  <Select value={filterAlgorithm} onValueChange={setFilterAlgorithm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les algorithmes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les algorithmes</SelectItem>
                      {availableAlgorithms.map(algo => (
                        <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Statut</label>
                  <Select value={filterVerified} onValueChange={setFilterVerified}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="true">Vérifiées</SelectItem>
                      <SelectItem value="false">Non vérifiées</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <AccessibleButton onClick={handleApplyFilters} className="flex-1">
                    Appliquer
                  </AccessibleButton>
                  {hasFilters && (
                    <AccessibleButton onClick={handleClearFilters} variant="outline">
                      Effacer
                    </AccessibleButton>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des prédictions */}
          <div className="space-y-4">
            {history.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <OptimizedIcon name="Search" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Aucune prédiction trouvée</h3>
                  <p className="text-muted-foreground">
                    {hasFilters ? 'Aucune prédiction ne correspond aux filtres appliqués.' : 'Aucune prédiction enregistrée.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              history.map((prediction) => (
                <PredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  onSelect={() => setSelectedPrediction(prediction)}
                  onDelete={() => deletePrediction(prediction.id)}
                  isSelected={selectedPrediction?.id === prediction.id}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <AnalyticsView analytics={analytics} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <OptimizedIcon name="BarChart3" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Analytics en cours de calcul</h3>
                <p className="text-muted-foreground">
                  Les analytics seront disponibles une fois que des prédictions auront été vérifiées.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Settings" critical size={20} />
                Gestion de l'Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Exporter l'historique</h4>
                  <p className="text-sm text-muted-foreground">
                    Télécharger toutes les prédictions au format JSON ou CSV
                  </p>
                </div>
                <div className="flex gap-2">
                  <AccessibleButton onClick={() => handleExport('json')} variant="outline">
                    JSON
                  </AccessibleButton>
                  <AccessibleButton onClick={() => handleExport('csv')} variant="outline">
                    CSV
                  </AccessibleButton>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Nettoyer l'historique</h4>
                  <p className="text-sm text-muted-foreground">
                    Supprimer les prédictions de plus de 90 jours
                  </p>
                </div>
                <AccessibleButton onClick={handleCleanup} variant="destructive">
                  Nettoyer
                </AccessibleButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Détails de la prédiction sélectionnée */}
      {selectedPrediction && (
        <PredictionDetailsModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}
    </div>
  )
}

// Composant pour une carte de prédiction
function PredictionCard({ 
  prediction, 
  onSelect, 
  onDelete, 
  isSelected 
}: {
  prediction: PredictionRecord
  onSelect: () => void
  onDelete: () => void
  isSelected: boolean
}) {
  const getPerformanceBadge = (performance?: PredictionPerformance) => {
    if (!performance) return null
    
    const variants = {
      excellent: 'default',
      good: 'secondary',
      average: 'outline',
      poor: 'destructive'
    } as const
    
    return (
      <Badge variant={variants[performance.rank]}>
        {performance.accuracy.toFixed(1)}% • {performance.rank}
      </Badge>
    )
  }

  return (
    <Card 
      className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium">{prediction.drawName}</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(prediction.timestamp).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {prediction.verified ? (
              getPerformanceBadge(prediction.performance)
            ) : (
              <Badge variant="outline">Non vérifié</Badge>
            )}
            <AccessibleButton
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              variant="ghost"
              size="sm"
              ariaLabel="Supprimer la prédiction"
            >
              <OptimizedIcon name="Trash2" category="actions" size={16} />
            </AccessibleButton>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary">{prediction.algorithm}</Badge>
          <span className="text-sm text-muted-foreground">
            Confiance: {prediction.confidence}%
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          {prediction.predictions.map((num, idx) => (
            <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getNumberColor(num)}`}>
              {num}
            </div>
          ))}
        </div>

        {prediction.verified && prediction.actualResult && (
          <div>
            <p className="text-sm font-medium mb-2">Résultat réel:</p>
            <div className="flex gap-2">
              {prediction.actualResult.map((num, idx) => (
                <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getNumberColor(num)} ${
                  prediction.predictions.includes(num) ? 'ring-2 ring-green-500' : 'opacity-50'
                }`}>
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Composant pour les analytics
function AnalyticsView({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Corrélation Confiance/Précision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.confidenceCorrelation).map(([level, data]: [string, any]) => (
              <div key={level} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium capitalize">{level.replace('Confidence', ' Confiance')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {data.predictions} prédictions
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold">{data.accuracy.toFixed(1)}%</div>
                  <Progress value={data.accuracy} className="w-20 h-2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Modal pour les détails d'une prédiction
function PredictionDetailsModal({ 
  prediction, 
  onClose 
}: { 
  prediction: PredictionRecord
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Détails de la Prédiction</CardTitle>
            <AccessibleButton onClick={onClose} variant="ghost" size="sm">
              <OptimizedIcon name="X" critical size={16} />
            </AccessibleButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Informations Générales</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Tirage:</strong> {prediction.drawName}</div>
                <div><strong>Algorithme:</strong> {prediction.algorithm}</div>
                <div><strong>Version:</strong> {prediction.algorithmVersion}</div>
                <div><strong>Confiance:</strong> {prediction.confidence}%</div>
                <div><strong>Date:</strong> {new Date(prediction.timestamp).toLocaleString('fr-FR')}</div>
              </div>
            </div>

            {prediction.performance && (
              <div>
                <h4 className="font-medium mb-2">Performances</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Précision:</strong> {prediction.performance.accuracy}%</div>
                  <div><strong>Score:</strong> {prediction.performance.score}</div>
                  <div><strong>Rang:</strong> {prediction.performance.rank}</div>
                  <div><strong>Correspondances:</strong> {prediction.performance.exactMatches}/{prediction.performance.totalPredicted}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Prédictions</h4>
            <div className="flex gap-2">
              {prediction.predictions.map((num, idx) => (
                <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(num)}`}>
                  {num}
                </div>
              ))}
            </div>
          </div>

          {prediction.actualResult && (
            <div>
              <h4 className="font-medium mb-2">Résultat Réel</h4>
              <div className="flex gap-2">
                {prediction.actualResult.map((num, idx) => (
                  <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(num)} ${
                    prediction.predictions.includes(num) ? 'ring-2 ring-green-500' : ''
                  }`}>
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}

          {prediction.reasoning.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Raisonnement</h4>
              <ul className="space-y-1 text-sm">
                {prediction.reasoning.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <OptimizedIcon name="Check" critical size={12} className="mt-1 text-green-600" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
